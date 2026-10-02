import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import maintenanceRoutes from './routes/maintenance.js';
import equipmentRoutes from './routes/equipment.js';
import environmentRoutes from './routes/environment.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Smart Building API' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/environment', environmentRoutes);
  app.use(notFound); app.use(errorHandler);
  return app;
}

// Vercel loads an Express service from its default export.  Keeping the named
// factory also lets the local server create the same app during development.
export default createApp();
