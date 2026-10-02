import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Administrator authentication is required.' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-only-secret-change-me'); next(); }
  catch { return res.status(401).json({ message: 'Your session is invalid or has expired.' }); }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator permission is required for this action.' });
  next();
}
