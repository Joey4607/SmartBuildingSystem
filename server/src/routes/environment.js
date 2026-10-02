import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const definitions = {
  temperature: { unit: '°C', min: 18, max: 27 }, humidity: { unit: '%', min: 35, max: 65 },
  'air quality': { unit: 'ppm', min: 350, max: 800 }, energy: { unit: 'kW', min: 20, max: 60 },
};

router.get('/', async (req, res, next) => {
  try {
    const db = await getDatabase();
    const readings = await db.all('SELECT sr.id, sr.sensor_type AS type, sr.value, sr.unit, sr.location, sr.building_id AS buildingId, b.name AS building, sr.recorded_at AS recordedAt FROM sensor_readings sr JOIN buildings b ON b.id = sr.building_id ORDER BY sr.recorded_at DESC, sr.id DESC LIMIT 80');
    const sensorGroups = new Map();
    for (const reading of readings) {
      const key = `${reading.buildingId}:${reading.type}:${reading.location}`;
      if (!sensorGroups.has(key)) sensorGroups.set(key, { key, type: reading.type, ...definitions[reading.type], buildingId: reading.buildingId, building: reading.building, location: reading.location, readings: [] });
      const group = sensorGroups.get(key);
      if (group.readings.length < 12) group.readings.unshift(reading);
    }
    const grouped = [...sensorGroups.values()];
    const buildings = await db.all('SELECT id, name FROM buildings ORDER BY name');
    res.json({ sensors: grouped, buildings });
  } catch (error) { next(error); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { buildingId, type, location, initialValue } = req.body;
    const definition = definitions[type];
    const value = Number(initialValue);
    if (!Number.isInteger(Number(buildingId)) || !definition || !String(location || '').trim() || !Number.isFinite(value)) return res.status(400).json({ message: 'Building, sensor type, location and initial value are required.' });
    const db = await getDatabase();
    const building = await db.get('SELECT id FROM buildings WHERE id=?', Number(buildingId));
    if (!building) return res.status(404).json({ message: 'The selected building was not found.' });
    const existing = await db.get('SELECT id FROM sensor_readings WHERE building_id=? AND sensor_type=? AND location=? LIMIT 1', Number(buildingId), type, String(location).trim());
    if (existing) return res.status(409).json({ message: 'A sensor of this type already exists at that location.' });
    await db.run('INSERT INTO sensor_readings (building_id,sensor_type,value,unit,location) VALUES (?,?,?,?,?)', Number(buildingId), type, value, definition.unit, String(location).trim());
    res.status(201).json({ message: 'Sensor added successfully.' });
  } catch (error) { next(error); }
});

router.delete('/', requireAdmin, async (req, res, next) => {
  try {
    const { buildingId, type, location } = req.body;
    if (!buildingId || !definitions[type] || !location) return res.status(400).json({ message: 'A valid sensor is required.' });
    const db = await getDatabase();
    const result = await db.run('DELETE FROM sensor_readings WHERE building_id=? AND sensor_type=? AND location=?', Number(buildingId), type, location);
    if (!result.changes) return res.status(404).json({ message: 'Sensor not found.' });
    res.json({ message: 'Sensor and its simulated readings were removed.' });
  } catch (error) { next(error); }
});

router.post('/simulate', requireAdmin, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const registeredSensors = await db.all('SELECT building_id AS buildingId, sensor_type AS type, location FROM sensor_readings GROUP BY building_id, sensor_type, location');
    if (!registeredSensors.length) return res.status(409).json({ message: 'Add a sensor before generating readings.' });
    for (const sensor of registeredSensors) {
      const definition = definitions[sensor.type];
      const previous = await db.get('SELECT value FROM sensor_readings WHERE building_id=? AND sensor_type=? AND location=? ORDER BY id DESC LIMIT 1', sensor.buildingId, sensor.type, sensor.location);
      const type = sensor.type;
      const range = type === 'air quality' ? 32 : type === 'energy' ? 5 : 2;
      const value = Math.max(definition.min, Math.min(definition.max, Number((Number(previous?.value || definition.min) + (Math.random() - .5) * range).toFixed(1))));
      await db.run('INSERT INTO sensor_readings (building_id,sensor_type,value,unit,location) VALUES (?,?,?,?,?)', sensor.buildingId, type, value, definition.unit, sensor.location);
    }
    res.status(201).json({ message: 'New simulated sensor readings recorded.' });
  } catch (error) { next(error); }
});
export default router;
