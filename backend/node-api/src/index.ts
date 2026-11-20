import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import meetingRoutes from './routes/meetings.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';
import assignmentRoutes from './routes/assignments.js';
import workspaceRoutes from './routes/workspaces.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ---- Middleware ----

app.use(helmet());

// Accept requests from the web frontend AND from native mobile apps.
// Native React Native apps do NOT send an Origin header, so CORS
// only applies to browser requests. We dynamically accept the LAN IP
// for the case where Expo's web preview or a browser hits the API.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (native apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow the web frontend and LAN addresses
      const allowed = [
        FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://localhost:8085',
        'http://localhost:19006',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8082',
        'http://127.0.0.1:8085',
      ];
      // Dynamically allow any LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x, etc.)
      if (
        allowed.some(a => origin.startsWith(a)) ||
        /^https?:\/\/192\.168\./.test(origin) ||
        /^https?:\/\/10\./.test(origin) ||
        /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(origin)
      ) {
        return callback(null, true);
      }
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Routes ----

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    error: null,
    status: 200,
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// Meeting routes
app.use('/api/meetings', meetingRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/workspaces', workspaceRoutes);


// ---- 404 handler ----

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    data: null,
    error: 'Route not found',
    status: 404,
  });
});

// ---- Global error handler ----

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    status: 500,
  });
});

// ---- Start server ----

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ⚡ FlowTask API running on http://0.0.0.0:${PORT}
  📋 Health check:      http://localhost:${PORT}/api/health
  🌐 LAN access:       http://<your-ip>:${PORT}
  🔐 Auth routes:       http://localhost:${PORT}/api/auth/*
  ✅ Task routes:       http://localhost:${PORT}/api/tasks/*
  `);
});

export default app;
