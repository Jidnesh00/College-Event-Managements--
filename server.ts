import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase, getDbInfo } from './backend/config/db.js';
import authRoutes from './backend/routes/authRoutes.js';
import eventRoutes from './backend/routes/eventRoutes.js';
import registrationRoutes from './backend/routes/registrationRoutes.js';
import categoryRoutes from './backend/routes/categoryRoutes.js';
import adminRoutes from './backend/routes/adminRoutes.js';
import notificationRoutes from './backend/routes/notificationRoutes.js';
import studentRoutes from './backend/routes/studentRoutes.js';
import { initWebSocketServer } from './backend/services/websocketService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize Real-Time WebSocket Server
  initWebSocketServer(server);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Relational Database (MySQL or Embedded SQL)
  try {
    await initDatabase();
  } catch (err) {
    console.error('[Database Init Error]:', err);
  }

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/student', studentRoutes);

  // System & Database diagnostic endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      database: getDbInfo(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware in development vs Static files in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] CampusPulse full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Failure]:', err);
  process.exit(1);
});
