import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const fallback = { equipment: { total: 0, operational: 0, warning: 0, offline: 0 }, openMaintenance: 0, sensors: [], recentEquipment: [], requestPriorities: { low: 0, medium: 0, high: 0 }, completedByMonth: [] };

export default function DashboardPage() {
  const { token, user } = useAuth(); const [data, setData] = useState(fallback); const [error, setError] = useState('');
  useEffect(() => { fetch('/api/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } }).then(async r => { if (!r.ok) throw new Error('Dashboard data could not be loaded.'); return r.json(); }).then(setData).catch(e => setError(e.message)); }, [token]);
  const cards = [['Total equipment', data.equipment.total, 'Across all buildings', 'blue'], ['Operational', data.equipment.operational, 'Working normally', 'green'], ['Attention needed', data.equipment.warning, 'Warning or offline', 'amber'], ['Open requests', data.openMaintenance, 'Maintenance queue', 'purple']];
  const operationalPercent = data.equipment.total ? Math.round((data.equipment.operational / data.equipment.total) * 100) : 0;
  const maxPriority = Math.max(1, ...Object.values(data.requestPriorities || {}));
  const maxCompleted = Math.max(1, ...(data.completedByMonth || []).map(item => item.count));
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">MONITORING OVERVIEW</p><h1>Good morning, {user?.name?.split(' ')[0] || 'Admin'}</h1><p>Here is the latest simulated status across the campus.</p></div><button className="secondary-button" onClick={() => location.reload()}>Refresh data</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="metric-grid">{cards.map(([label, value, note, colour]) => <article className={`metric-card ${colour}`} key={label}><div className="metric-icon">●</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>)}</div>
    <div className="dashboard-grid">
      <article className="panel"><div className="panel-header"><div><h2>Equipment status</h2><p>Recent equipment checks</p></div><a href="/equipment">View all</a></div><div className="equipment-list">{data.recentEquipment.map(item => <div className="equipment-row" key={item.id}><div className="equipment-symbol">{item.type?.slice(0, 2).toUpperCase()}</div><div><strong>{item.name}</strong><small>{item.building} · {item.location}</small></div><span className={`status ${item.status}`}>{item.status}</span></div>)}</div></article>
      <article className="panel"><div className="panel-header"><div><h2>Environment</h2><p>Latest sensor readings by building</p></div><a href="/environment">View sensors</a></div><div className="sensor-grid">{data.sensors.map(sensor => <div className="sensor-card" key={sensor.type}><span>{sensor.type}</span><strong>{sensor.value}<small>{sensor.unit}</small></strong><p><b>{sensor.building}</b> · {sensor.location}</p></div>)}</div></article>
    </div>
    <div className="analytics-grid">
      <article className="panel chart-panel"><div className="panel-header"><div><h2>Equipment reliability</h2><p>Current operational rate</p></div></div><div className="donut-row"><div className="donut-chart" style={{ '--percent': operationalPercent }}><strong>{operationalPercent}%</strong></div><div className="chart-legend"><span><i className="legend-green"/>Operational: {data.equipment.operational}</span><span><i className="legend-amber"/>Warning: {data.equipment.warning}</span><span><i className="legend-red"/>Offline: {data.equipment.offline}</span></div></div></article>
      <article className="panel chart-panel"><div className="panel-header"><div><h2>Requests by priority</h2><p>Active maintenance workload</p></div></div><div className="bar-chart">{['high', 'medium', 'low'].map(priority => <div className="bar-row" key={priority}><span>{priority}</span><div><i className={priority} style={{ width: `${((data.requestPriorities?.[priority] || 0) / maxPriority) * 100}%` }}/></div><strong>{data.requestPriorities?.[priority] || 0}</strong></div>)}</div></article>
      <article className="panel chart-panel"><div className="panel-header"><div><h2>Completed work</h2><p>Tickets completed by month</p></div></div>{data.completedByMonth?.length ? <div className="month-chart">{data.completedByMonth.map(item => <div key={item.month}><strong>{item.count}</strong><i style={{ height: `${Math.max(12, (item.count / maxCompleted) * 100)}%` }}/><span>{new Date(`${item.month}-01T00:00:00`).toLocaleDateString([], { month: 'short' })}</span></div>)}</div> : <div className="chart-no-data">Completed tickets will appear here.</div>}</article>
    </div>
  </section>;
}
