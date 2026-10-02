import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'smart-building-token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(token));

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setUser(data.user))
      .catch(() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); })
      .finally(() => setChecking(false));
  }, [token]);

  async function login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token); setUser(data.user);
  }

  function logout() { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); }
  const value = useMemo(() => ({ token, user, checking, login, logout }), [token, user, checking]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
