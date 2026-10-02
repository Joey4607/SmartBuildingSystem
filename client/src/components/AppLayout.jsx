import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const allLinks = [['/', 'Dashboard', '🏠'], ['/equipment', 'Equipment', '⚙'], ['/environment', 'Sensors', '🌡'], ['/maintenance', 'Requests', '🔧'], ['/history', 'History', '🕘']];

export default function AppLayout() {
  const { token, user, logout } = useAuth();
  const links = user?.role === 'admin' ? allLinks : allLinks.filter(([to]) => !['/equipment', '/history'].includes(to));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('smart-building-theme') === 'dark');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('smart-building-theme', darkMode ? 'dark' : 'light');
    return () => delete document.documentElement.dataset.theme;
  }, [darkMode]);

  useEffect(() => {
    fetch('/api/dashboard/notifications', { headers: { Authorization: `Bearer ${token}` } }).then(response => response.ok ? response.json() : { notifications: [] }).then(data => setNotifications(data.notifications || [])).catch(() => setNotifications([]));
  }, [token]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">SB</span><div><strong>Smart Building</strong><small>Campus monitor</small></div></div>
      <nav aria-label="Main navigation">{links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'}><span>{icon}</span>{label}</NavLink>)}</nav>
      <div className="sidebar-footer"><small>Signed in as {user?.role}</small><strong>{user?.name || 'User'}</strong><button className="text-button" onClick={logout}>Sign out</button></div>
    </aside>
    <main className="main-content"><header className="topbar"><div><small>SMART CAMPUS</small><strong>Innovation Hub · {user?.role === 'admin' ? 'Administrator portal' : 'Student portal'}</strong></div><div className="topbar-actions"><span className="secure-badge" title="This page requires an authenticated session">🔒 {user?.role === 'admin' ? 'Admin protected' : 'Student account'}</span><div className="notification-wrap"><button className="notification-button" type="button" onClick={() => setNotificationsOpen(value => !value)} aria-label={`${notifications.length} notifications`} aria-expanded={notificationsOpen}>🔔{notifications.length > 0 && <span>{notifications.length}</span>}</button>{notificationsOpen && <div className="notification-menu"><div className="notification-menu-head"><strong>Notifications</strong><small>{notifications.length} active alert{notifications.length === 1 ? '' : 's'}</small></div>{notifications.length === 0 ? <p className="notification-empty">Everything looks normal.</p> : notifications.map(item => <Link key={item.id} to={item.link} onClick={() => setNotificationsOpen(false)} className="notification-item"><i className={item.level}/><span><strong>{item.title}</strong><small>{item.detail}</small></span></Link>)}</div>}</div><button className="theme-toggle" type="button" onClick={() => setDarkMode(value => !value)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} aria-pressed={darkMode}><span aria-hidden="true">{darkMode ? '☀' : '☾'}</span><span className="theme-label">{darkMode ? 'Light' : 'Dark'} mode</span></button></div></header><Outlet /></main>
  </div>;
}
