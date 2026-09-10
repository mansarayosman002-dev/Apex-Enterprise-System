import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/routes.ts';
import { aiRouter } from './src/ai/ai.routes.ts';
import { notificationRouter } from './src/notifications/notification.routes.ts';
import { NotificationQueue } from './src/notifications/notification.queue.ts';
import { runDatabaseSeed } from './src/server/seed.ts';

dotenv.config();

// Simple in-memory rate limiting map to mitigate brute-force attacks on auth and scanner
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function rateLimiter(windowMs: number, maxRequests: number, message = 'Too many requests. Please slow down.') {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// Clean up stale rate limiter entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitStore.entries()) {
    if (now > val.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  // Security: Disable X-Powered-By header
  app.disable('x-powered-by');

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parser middleware with generous limits for photo uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Static uploads directory serving for employee photos and documents (no-cache to ensure immediate updates)
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'public', 'uploads'), {
      etag: true,
      lastModified: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      },
    })
  );

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Smart Employee Attendance and Payroll Management System',
      securityStatus: 'enforced',
      timestamp: new Date().toISOString(),
    });
  });

  // Auth rate limiting
  app.use('/api/auth/login', rateLimiter(60 * 1000, 15, 'Too many login attempts. Please try again after a minute.'));
  app.use('/api/auth/change-password', rateLimiter(60 * 1000, 10, 'Too many password update requests. Please wait.'));
  app.use('/api/attendance/scan', rateLimiter(10 * 1000, 20, 'Rapid scan limit reached. Please wait a few seconds.'));

  // Mount API router
  app.use('/api', notificationRouter);
  app.use('/api', apiRouter);
  app.use('/api/ai', aiRouter);

  // Start background notification queue processor
  NotificationQueue.startWorker();

  // Centralized Error Handler (Never expose stack traces or raw database internals)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: err.message && !err.message.includes('at ') ? err.message : 'An internal server error occurred.',
    });
  });

  // Auto-seed initial defaults on server startup
  try {
    await runDatabaseSeed(false);
  } catch (seedErr) {
    console.error('Initial database seed error:', seedErr);
  }

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Attendance & Payroll System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
