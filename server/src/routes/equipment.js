import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const validStatuses = ['operational', 'warning', 'offline'];

function equipmentInput(body) {
  return {
    name: String(body.name || '').trim(), type: String(body.type || '').trim(),
    location: String(body.location || '').trim(), status: String(body.status || '').toLowerCase(),
    buildingId: Number(body.buildingId),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const search = `%${String(req.query.search || '').trim()}%`;
    const status = String(req.query.status || 'all');
    const equipment = await db.all(`SELECT e.id, e.name, e.type, e.location, e.status, e.last_checked_at AS lastCheckedAt, e.building_id AS buildingId, b.name AS building FROM equipment e JOIN buildings b ON b.id=e.building_id WHERE (e.name LIKE ? OR e.type LIKE ? OR e.location LIKE ?) AND (? = 'all' OR e.status = ?) ORDER BY e.name`, search, search, search, status, status);
    const buildings = await db.all('SELECT id, name FROM buildings ORDER BY name');
    res.json({ equipment, buildings });
  } catch (error) { next(error); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = equipmentInput(req.body);
    if (!input.name || !input.type || !input.location || !Number.isInteger(input.buildingId) || !validStatuses.includes(input.status)) return res.status(400).json({ message: 'Complete all equipment fields with valid information.' });
    const db = await getDatabase();
    const building = await db.get('SELECT id FROM buildings WHERE id=?', input.buildingId);
    if (!building) return res.status(404).json({ message: 'The selected building was not found.' });
    const result = await db.run('INSERT INTO equipment (building_id,name,type,location,status,last_checked_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)', input.buildingId, input.name, input.type, input.location, input.status);
    res.status(201).json({ id: result.lastID, message: 'Equipment added successfully.' });
  } catch (error) { next(error); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id); const input = equipmentInput(req.body);
    if (!Number.isInteger(id) || !input.name || !input.type || !input.location || !Number.isInteger(input.buildingId) || !validStatuses.includes(input.status)) return res.status(400).json({ message: 'Complete all equipment fields with valid information.' });
    const db = await getDatabase();
    const result = await db.run('UPDATE equipment SET building_id=?,name=?,type=?,location=?,status=?,last_checked_at=CURRENT_TIMESTAMP WHERE id=?', input.buildingId, input.name, input.type, input.location, input.status, id);
    if (!result.changes) return res.status(404).json({ message: 'Equipment was not found.' });
    res.json({ message: 'Equipment updated successfully.' });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id); const db = await getDatabase();
    const linked = await db.get('SELECT COUNT(*) AS count FROM maintenance_requests WHERE equipment_id=?', id);
    if (linked?.count) return res.status(409).json({ message: 'This equipment has maintenance records and cannot be deleted. Set it to offline instead.' });
    const result = await db.run('DELETE FROM equipment WHERE id=?', id);
    if (!result.changes) return res.status(404).json({ message: 'Equipment was not found.' });
    res.json({ message: 'Equipment removed.' });
  } catch (error) { next(error); }
});
export default router;
