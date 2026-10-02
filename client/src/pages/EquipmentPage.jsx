import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const blank = { name: '', type: '', location: '', status: 'operational', buildingId: '' };
export default function EquipmentPage() {
  const { token } = useAuth(); const [items, setItems] = useState([]); const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const authHeaders = { Authorization: `Bearer ${token}` };
  const load = useCallback(async () => {
    try { const response = await fetch(`/api/equipment?search=${encodeURIComponent(search)}&status=${status}`, { headers: authHeaders }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setItems(data.equipment); setBuildings(data.buildings); }
    catch (err) { setError(err.message); }
  }, [token, search, status]);
  useEffect(() => { const timer = setTimeout(load, 180); return () => clearTimeout(timer); }, [load]);
  function startEdit(item) { setEditing(item.id); setForm({ name: item.name, type: item.type, location: item.location, status: item.status, buildingId: item.buildingId }); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function cancel() { setEditing(null); setForm(blank); }
  async function save(event) {
    event.preventDefault(); setError(''); setMessage('');
    const response = await fetch(editing ? `/api/equipment/${editing}` : '/api/equipment', { method: editing ? 'PUT' : 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json();
    if (!response.ok) return setError(data.message); setMessage(data.message); cancel(); load();
  }
  async function remove(item) {
    if (!window.confirm(`Remove ${item.name}?`)) return;
    const response = await fetch(`/api/equipment/${item.id}`, { method: 'DELETE', headers: authHeaders }); const data = await response.json();
    if (!response.ok) return setError(data.message); setMessage(data.message); load();
  }
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">ADMINISTRATOR · ASSET REGISTER</p><h1>Building equipment</h1><p>Add equipment and keep its latest operating condition up to date.</p></div></div>
    {error && <div className="form-error">{error}</div>}{message && <div className="success-message">{message}</div>}
    <form className="panel equipment-form" onSubmit={save}><div><h2>{editing ? 'Edit equipment' : 'Add equipment'}</h2><p>{editing ? 'Update the selected asset.' : 'Register a new building asset.'}</p></div><label>Name<input required maxLength="100" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Equipment name" /></label><label>Type<input required maxLength="50" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} placeholder="HVAC, lift, pump…" /></label><label>Location<input required maxLength="100" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Floor or room" /></label><label>Building<select required value={form.buildingId} onChange={e=>setForm({...form,buildingId:e.target.value})}><option value="">Select building</option>{buildings.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="operational">Operational</option><option value="warning">Warning</option><option value="offline">Offline</option></select></label><div className="form-buttons"><button className="primary-button">{editing ? 'Save changes' : 'Add equipment'}</button>{editing && <button type="button" className="secondary-button" onClick={cancel}>Cancel</button>}</div></form>
    <div className="list-tools"><label className="search-box">Search equipment<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, type or location" /></label><label>Status filter<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="operational">Operational</option><option value="warning">Warning</option><option value="offline">Offline</option></select></label><span>{items.length} result{items.length===1?'':'s'}</span></div>
    <div className="equipment-cards">{items.map(item=><article className="panel equipment-detail" key={item.id}><div className="equipment-detail-head"><div className="equipment-symbol">{item.type.slice(0,2).toUpperCase()}</div><span className={`status ${item.status}`}>{item.status}</span></div><h2>{item.name}</h2><p>{item.type}</p><dl><div><dt>Building</dt><dd>{item.building}</dd></div><div><dt>Location</dt><dd>{item.location}</dd></div><div><dt>Last checked</dt><dd>{item.lastCheckedAt ? new Date(item.lastCheckedAt+'Z').toLocaleString() : 'Not checked'}</dd></div></dl><div className="card-actions"><button onClick={()=>startEdit(item)}>Edit</button><button className="danger-button" onClick={()=>remove(item)}>Remove</button></div></article>)}</div>
  </section>;
}
