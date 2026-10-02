import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const statusRows = await db.all('SELECT status, COUNT(*) AS count FROM equipment GROUP BY status');
    const equipment = { total: 0, operational: 0, warning: 0, offline: 0 };
    statusRows.forEach(row => { equipment[row.status] = row.count; equipment.total += row.count; });
    const maintenance = await db.get("SELECT COUNT(*) AS count FROM maintenance_requests WHERE status != 'completed'");
    const maintenanceRows = await db.all('SELECT priority, status, created_at AS createdAt, completed_at AS completedAt FROM maintenance_requests');
    const requestPriorities = { low: 0, medium: 0, high: 0 };
    maintenanceRows.filter(row => row.status !== 'completed').forEach(row => { requestPriorities[row.priority] += 1; });
    const completedByMonth = {};
    maintenanceRows.filter(row => row.completedAt).forEach(row => { const month = String(row.completedAt).slice(0, 7); completedByMonth[month] = (completedByMonth[month] || 0) + 1; });
    const sensors = await db.all(`SELECT sr.sensor_type AS type, sr.value, sr.unit, sr.location, b.name AS building FROM sensor_readings sr INNER JOIN (SELECT sensor_type, MAX(id) id FROM sensor_readings GROUP BY sensor_type) latest ON latest.id = sr.id JOIN buildings b ON b.id = sr.building_id ORDER BY sr.id`);
    const recentEquipment = await db.all('SELECT e.id, e.name, e.type, e.location, e.status, b.name AS building FROM equipment e JOIN buildings b ON b.id = e.building_id ORDER BY e.last_checked_at DESC LIMIT 5');
    res.json({ equipment, openMaintenance: maintenance.count, sensors, recentEquipment, requestPriorities, completedByMonth: Object.entries(completedByMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, count]) => ({ month, count })), generatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const notifications = [];
    const problemEquipment = await db.all("SELECT id, name, status, location FROM equipment WHERE status != 'operational' ORDER BY id DESC LIMIT 5");
    problemEquipment.forEach(item => notifications.push({ id: `equipment-${item.id}`, level: item.status === 'offline' ? 'critical' : 'warning', title: `${item.name} is ${item.status}`, detail: item.location, link: req.user.role === 'admin' ? '/equipment' : '/' }));
    const ownerCondition = req.user.role === 'admin' ? '' : ' AND requested_by = ?';
    const urgent = await db.all(`SELECT id, title, created_at AS createdAt FROM maintenance_requests WHERE status != 'completed' AND priority = 'high'${ownerCondition} ORDER BY created_at DESC LIMIT 5`, ...(req.user.role === 'admin' ? [] : [req.user.email]));
    urgent.forEach(item => notifications.push({ id: `request-${item.id}`, level: 'warning', title: `High-priority ticket REQ-${String(item.createdAt).slice(0, 4)}-${String(item.id).padStart(4, '0')}`, detail: item.title, link: '/maintenance' }));
    res.json({ notifications, count: notifications.length });
  } catch (error) { next(error); }
});
export default router;
