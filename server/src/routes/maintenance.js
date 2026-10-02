import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function ticketCode(request) {
  const year = String(request.createdAt || new Date().getFullYear()).slice(0, 4);
  return `REQ-${year}-${String(request.id).padStart(4, '0')}`;
}

router.get('/', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const status = req.query.status === 'completed' ? 'completed' : 'active';
    const condition = status === 'completed' ? "mr.status = 'completed'" : "mr.status != 'completed'";
    if (status === 'completed' && req.user.role !== 'admin') return res.status(403).json({ message: 'Maintenance history is available to administrators only.' });
    const ownerCondition = req.user.role === 'admin' ? '' : ' AND mr.requested_by = ?';
    const requests = await db.all(`SELECT mr.id, mr.title, mr.description, mr.priority, mr.status, mr.requested_by AS requestedBy, mr.created_at AS createdAt, mr.completed_at AS completedAt, mr.resolution_notes AS resolutionNotes, e.name AS equipmentName, e.location, b.name AS building FROM maintenance_requests mr JOIN equipment e ON e.id = mr.equipment_id JOIN buildings b ON b.id = e.building_id WHERE ${condition}${ownerCondition} ORDER BY mr.created_at DESC`, ...(req.user.role === 'admin' ? [] : [req.user.email]));
    res.json({ requests: requests.map(request => ({ ...request, ticketCode: ticketCode(request) })) });
  } catch (error) { next(error); }
});

router.get('/equipment-options', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const equipment = await db.all('SELECT id, name, location FROM equipment ORDER BY name');
    res.json({ equipment });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const equipmentId = Number(req.body.equipmentId);
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const priority = String(req.body.priority || 'medium').toLowerCase();
    if (!Number.isInteger(equipmentId) || !title || !description || !['low', 'medium', 'high'].includes(priority)) return res.status(400).json({ message: 'Enter valid equipment, title, description and priority details.' });
    const db = await getDatabase();
    const equipment = await db.get('SELECT id FROM equipment WHERE id = ?', equipmentId);
    if (!equipment) return res.status(404).json({ message: 'The selected equipment was not found.' });
    const result = await db.run('INSERT INTO maintenance_requests (equipment_id, title, description, priority, requested_by) VALUES (?, ?, ?, ?, ?)', equipmentId, title, description, priority, req.user.email);
    const createdAt = new Date().toISOString();
    res.status(201).json({ id: result.lastID, ticketCode: ticketCode({ id: result.lastID, createdAt }), message: `Maintenance request ${ticketCode({ id: result.lastID, createdAt })} created.` });
  } catch (error) { next(error); }
});

router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id); const status = String(req.body.status || '').toLowerCase();
    const resolutionNotes = String(req.body.resolutionNotes || '').trim();
    if (!Number.isInteger(id) || !['open', 'in progress', 'completed'].includes(status)) return res.status(400).json({ message: 'Choose a valid maintenance status.' });
    if (status === 'completed' && !resolutionNotes) return res.status(400).json({ message: 'Add resolution notes before completing a request.' });
    const db = await getDatabase();
    const result = await db.run("UPDATE maintenance_requests SET status = ?, resolution_notes = CASE WHEN ? = 'completed' THEN ? ELSE resolution_notes END, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?", status, status, resolutionNotes, status, id);
    if (!result.changes) return res.status(404).json({ message: 'Maintenance request not found.' });
    res.json({ message: status === 'completed' ? 'Request completed and moved to maintenance history.' : 'Maintenance status updated.' });
  } catch (error) { next(error); }
});

export default router;
