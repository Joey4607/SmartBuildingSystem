import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate(); const location = useLocation();
  const [form, setForm] = useState({ email: 'admin@smartcampus.local', password: '' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  if (token) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate(location.state?.from?.pathname || '/', { replace: true }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  return <main className="login-page">
    <section className="login-intro"><div className="brand light"><span className="brand-mark">SB</span><strong>Smart Building Monitor</strong></div><div><p className="eyebrow">CET333 PRODUCT DEVELOPMENT</p><h1>A clearer view of your campus building.</h1><p>Monitor equipment, environmental conditions and maintenance activity from one responsive dashboard.</p></div><small>Prototype system · Simulated monitoring data</small></section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}><p className="eyebrow">ADMINISTRATOR ACCESS</p><h2>Welcome back</h2><p>Enter your secure account details to open the monitoring dashboard.</p>
      <label>Email address<input type="email" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Password<input type="password" required minLength="8" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}</button>
      <p className="login-help">Administrator and student accounts use separate protected access.</p>
    </form></section>
  </main>;
}
