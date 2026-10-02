import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function RequestDetails({ request, onClose }) {
  const stages = [
    { label: 'Request submitted', detail: formatDate(request.createdAt), done: true },
    { label: 'Work in progress', detail: request.status === 'open' ? 'Waiting for an administrator' : 'Maintenance work started', done: request.status !== 'open' },
    { label: 'Completed', detail: request.completedAt ? formatDate(request.completedAt) : 'Not completed yet', done: request.status === 'completed' },
  ];
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-details-title"><button className="modal-close" onClick={onClose} aria-label="Close details">×</button><span className="ticket-code">{request.ticketCode}</span><h2 id="request-details-title">{request.title}</h2><p className="modal-subtitle">{request.equipmentName} · {request.building} · {request.location}</p><div className="request-detail-grid"><div><small>Priority</small><strong>{request.priority}</strong></div><div><small>Status</small><strong>{request.status}</strong></div><div><small>Requested by</small><strong>{request.requestedBy}</strong></div><div><small>Requested</small><strong>{formatDate(request.createdAt)}</strong></div></div><div className="detail-description"><h3>Problem description</h3><p>{request.description}</p></div><div className="status-timeline"><h3>Status timeline</h3>{stages.map(stage => <div className={stage.done ? 'timeline-step done' : 'timeline-step'} key={stage.label}><i>{stage.done ? '✓' : ''}</i><div><strong>{stage.label}</strong><small>{stage.detail}</small></div></div>)}</div>{request.resolutionNotes && <div className="resolution-box"><h3>Resolution notes</h3><p>{request.resolutionNotes}</p></div>}</section></div>;
}

export default function MaintenancePage() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]); const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState({ equipmentId: '', title: '', description: '', priority: 'medium' });
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const [ticketQuery, setTicketQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const load = useCallback(async () => {
    try {
      const [requestResponse, equipmentResponse] = await Promise.all([fetch('/api/maintenance', { headers }), fetch('/api/maintenance/equipment-options', { headers })]);
      if (!requestResponse.ok || !equipmentResponse.ok) throw new Error('Maintenance information could not be loaded.');
      setRequests((await requestResponse.json()).requests); setEquipment((await equipmentResponse.json()).equipment);
    } catch (err) { setError(err.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    const response = await fetch('/api/maintenance', { method: 'POST', headers, body: JSON.stringify(form) }); const data = await response.json();
    if (!response.ok) return setError(data.message); setMessage(data.message); setForm({ equipmentId: '', title: '', description: '', priority: 'medium' }); load();
  }
  async function updateStatus(id, status) {
    const resolutionNotes = status === 'completed' ? window.prompt('Enter the work completed or resolution notes:') : '';
    if (status === 'completed' && !resolutionNotes) return;
    const response = await fetch(`/api/maintenance/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status, resolutionNotes }) }); const data = await response.json();
    if (!response.ok) return setError(data.message); setMessage(data.message); load();
  }
  const filteredRequests = requests.filter(item => {
    const requestDate = String(item.createdAt || '').slice(0, 10);
    const searchText = `${item.ticketCode} ${item.title} ${item.equipmentName}`.toLowerCase();
    return (!dateFrom || requestDate >= dateFrom) && (!dateTo || requestDate <= dateTo) && (!ticketQuery || searchText.includes(ticketQuery.trim().toLowerCase()));
  });
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">{user?.role === 'admin' ? 'ADMINISTRATOR · MAINTENANCE' : 'STUDENT · MAINTENANCE'}</p><h1>Maintenance requests</h1><p>Create requests and track work that still needs attention.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}{message && <div className="success-message" role="status">{message}</div>}
    <div className="maintenance-grid"><form className="panel request-form" onSubmit={submit}><h2>{user?.role === 'student' ? 'Report an equipment problem' : 'New request'}</h2><label>Equipment<select required value={form.equipmentId} onChange={e => setForm({...form, equipmentId: e.target.value})}><option value="">Select equipment</option>{equipment.map(item => <option key={item.id} value={item.id}>{item.name} — {item.location}</option>)}</select></label><label>Request title<input required maxLength="100" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Example: Inspect unusual noise" /></label><label>Description<textarea required maxLength="500" rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the problem clearly" /></label><label>Priority<select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><button className="primary-button">Create maintenance request</button></form>
      <article className="panel"><div className="panel-header"><div><h2>{user?.role === 'student' ? 'My requests' : 'Active requests'}</h2><p>{filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'} shown</p></div></div><div className="request-date-filter"><label className="ticket-search">Ticket or title<input type="search" placeholder="e.g. REQ-2026-0001" value={ticketQuery} onChange={event => setTicketQuery(event.target.value)}/></label><label>From date<input type="date" value={dateFrom} max={dateTo || undefined} onChange={event => setDateFrom(event.target.value)}/></label><label>To date<input type="date" value={dateTo} min={dateFrom || undefined} onChange={event => setDateTo(event.target.value)}/></label>{(ticketQuery || dateFrom || dateTo) && <button onClick={() => { setTicketQuery(''); setDateFrom(''); setDateTo(''); }}>Clear filters</button>}</div><div className="request-list">{filteredRequests.length === 0 && <p className="muted">No active requests match the selected filters.</p>}{filteredRequests.map(item => <section className="request-item" key={item.id}><div className="request-title"><div><span className="ticket-code">{item.ticketCode}</span><strong>{item.title}</strong><small>{item.equipmentName} · {item.location}</small><time dateTime={item.createdAt}>Requested: {formatDate(item.createdAt)}</time></div><span className={`priority ${item.priority}`}>{item.priority}</span></div><p>{item.description}</p><div className="request-actions"><span className={`status ${item.status.replace(' ', '-')}`}>{item.status}</span><button onClick={() => setSelectedRequest(item)}>View details</button>{user?.role === 'admin' && <>{item.status === 'open' && <button onClick={() => updateStatus(item.id, 'in progress')}>Start work</button>}<button onClick={() => updateStatus(item.id, 'completed')}>Mark completed</button></>}</div></section>)}</div></article>
    </div>{selectedRequest && <RequestDetails request={selectedRequest} onClose={() => setSelectedRequest(null)}/>}</section>;
}
