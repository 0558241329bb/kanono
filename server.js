import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import setupChatHandler from './socket/chatHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import lawyerRoutes from './routes/lawyers.js';
import appointmentRoutes from './routes/appointments.js';
import messageRoutes from './routes/messages.js';
import complaintRoutes from './routes/complaints.js';
import notificationRoutes from './routes/notifications.js';
import { ensureDatabaseReady } from './config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await ensureDatabaseReady();

  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    pingTimeout: 60000,
    connectTimeout: 45000,
  });

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Initialize Socket.io
  setupChatHandler(io);
  app.set('io', io);

  // Api Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/lawyers', lawyerRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LGS Backend running smoothly.' });
  });

  // Vite development server integration
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (e) {
       console.log('Vite not found or failed to load. Skipping Vite dev server.');
    }
  } else {
    // Production: serve static assets if any (React app)
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
