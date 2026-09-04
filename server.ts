import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/routes.ts';
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
  const PORT = 3000;

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

  // Body parser middleware with strict limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
  app.use('/api', apiRouter);

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
