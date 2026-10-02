import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const names = { temperature: 'Temperature', humidity: 'Humidity', 'air quality': 'Air quality', energy: 'Energy use' };
const units = { temperature: '°C', humidity: '%', 'air quality': 'ppm', energy: 'kW' };
const startingValues = { temperature: 22, humidity: 45, 'air quality': 420, energy: 35 };
const formatReading = (value) => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(1)).toString() : '—';

function ReadingChart({ readings, min, max, unit }) {
  if (!readings.length) return <div className="chart-empty">No readings</div>;
  const width = 460, height = 130, pad = 12, span = Math.max(1, max - min);
  const points = readings.map((item, index) => `${pad + (index * (width - pad * 2)) / Math.max(1, readings.length - 1)},${height - pad - ((item.value - min) / span) * (height - pad * 2)}`).join(' ');
  const gradientId = `fill-${unit.replace(/[^a-z]/gi, '')}`;
  return <div className="mini-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Recent readings in ${unit}`}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#43c9e8" stopOpacity=".45"/><stop offset="1" stopColor="#63d36f" stopOpacity=".04"/></linearGradient></defs><polygon points={`${pad},${height-pad} ${points} ${width-pad},${height-pad}`} fill={`url(#${gradientId})`}/><polyline points={points} fill="none" stroke="#24a7c1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{readings.map((item,index)=><circle key={item.id} cx={pad+(index*(width-pad*2))/Math.max(1,readings.length-1)} cy={height-pad-((item.value-min)/span)*(height-pad*2)} r="3.5" fill="#eaff9d" stroke="#16849d" strokeWidth="2"><title>{formatReading(item.value)}{unit}</title></circle>)}</svg><div className="chart-scale"><span>{formatReading(min)}{unit}</span><span>Most recent readings</span><span>{formatReading(max)}{unit}</span></div></div>;
}

export default function EnvironmentPage() {
  const { token, user } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ buildingId: '', type: 'temperature', location: '', initialValue: 22 });

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/environment', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSensors(data.sensors);
      setBuildings(data.buildings || []);
    } catch (err) { setError(err.message); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function simulate() {
    setLoading(true); setError('');
    const response = await fetch('/api/environment/simulate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.message);
    setMessage(data.message); load();
  }

  async function addSensor(event) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    const response = await fetch('/api/environment', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.message);
    setMessage(data.message); setShowForm(false); setForm({ buildingId: '', type: 'temperature', location: '', initialValue: 22 }); load();
  }

  async function removeSensor(sensor) {
    if (!window.confirm(`Remove the ${names[sensor.type]} sensor from ${sensor.location}? Its simulated history will also be removed.`)) return;
    setError(''); setMessage('');
    const response = await fetch('/api/environment', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ buildingId: sensor.buildingId, type: sensor.type, location: sensor.location }) });
    const data = await response.json();
    if (!response.ok) return setError(data.message);
    setMessage(data.message); load();
  }

  const visibleSensors = sensors.filter(sensor => buildingFilter === 'all' || String(sensor.buildingId) === buildingFilter);

  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">SIMULATED BUILDING DATA</p><h1>Environmental sensors</h1><p>See which building and room each monitoring sensor belongs to.</p></div>{user?.role === 'admin' && <div className="sensor-heading-actions"><button className="secondary-button compact-button" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cancel' : '+ Add sensor'}</button><button className="primary-button compact-button" onClick={simulate} disabled={loading}>{loading ? 'Recording…' : 'Generate new readings'}</button></div>}</div>
    {error && <div className="form-error">{error}</div>}{message && <div className="success-message">{message}</div>}
    {user?.role === 'admin' && showForm && <form className="panel sensor-form" onSubmit={addSensor}><div><h2>Add a new sensor</h2><p>Register a simulated sensor in a campus building.</p></div><label>Building<select required value={form.buildingId} onChange={event => setForm({ ...form, buildingId: event.target.value })}><option value="">Choose building</option>{buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Sensor type<select value={form.type} onChange={event => { const type = event.target.value; setForm({ ...form, type, initialValue: startingValues[type] }); }}>{Object.keys(names).map(type => <option key={type} value={type}>{names[type]} ({units[type]})</option>)}</select></label><label>Room / location<input required maxLength="100" placeholder="e.g. Library first floor" value={form.location} onChange={event => setForm({ ...form, location: event.target.value })}/></label><label>Initial reading<input required type="number" step="0.1" value={form.initialValue} onChange={event => setForm({ ...form, initialValue: event.target.value })}/></label><button className="primary-button compact-button" disabled={loading}>{loading ? 'Adding…' : 'Add sensor'}</button></form>}
    <div className="building-filter"><label>Building<select value={buildingFilter} onChange={event => setBuildingFilter(event.target.value)}><option value="all">All campus buildings</option>{buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><span>{visibleSensors.length} sensor types shown</span></div>
    <div className="environment-grid">{visibleSensors.map(sensor => { const latest = sensor.readings.at(-1); return <article className="panel environment-panel" key={sensor.key}><div className="environment-head"><div><span>{names[sensor.type]}</span><strong>{formatReading(latest?.value)}<small>{sensor.unit}</small></strong><p><b>{sensor.building}</b> · {sensor.location}</p></div><div className="sensor-card-controls"><span className={latest?.value >= sensor.min && latest?.value <= sensor.max ? 'condition good' : 'condition alert'}>{latest?.value >= sensor.min && latest?.value <= sensor.max ? 'Normal' : 'Check'}</span>{user?.role === 'admin' && <button className="sensor-delete" onClick={() => removeSensor(sensor)} aria-label={`Remove ${names[sensor.type]} sensor`}>Remove</button>}</div></div><ReadingChart readings={sensor.readings} min={sensor.min} max={sensor.max} unit={sensor.unit}/><small className="updated-time">Latest: {latest?.recordedAt ? new Date(latest.recordedAt + 'Z').toLocaleString() : 'No reading'}</small></article>; })}</div>
    {!visibleSensors.length && <div className="panel compact-empty"><h2>No sensors found</h2><p>This building does not have simulated sensor readings yet.</p></div>}
    <p className="prototype-note">These values are simulated. A future production version could receive the same data from real IoT sensors installed in each building.</p>
  </section>;
}
