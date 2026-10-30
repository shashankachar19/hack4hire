// ============================================================================
// DispatchGrid — Express Application Entry Point
// Starts the HTTP server with all middleware and route handlers.
//
// Architecture:
//   Request → CORS → JSON Parser → Routes → Error Handler → Response
//
// Default port: 3001 (configurable via PORT env var)
// ============================================================================

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (_e) {}

import routes from './routes';
import { globalErrorHandler } from './middleware/errorHandler';

const app = express();

// ============================================================================
// Global Middleware
// ============================================================================

// Enable CORS for web client
app.use(cors());

// Parse JSON request bodies (with a reasonable size limit)
app.use(express.json({ limit: '1mb' }));

// ============================================================================
// Health Check
// ============================================================================

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'DispatchGrid',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api', routes);

// ============================================================================
// Serve Static Frontend Assets (Production / Container deployment)
// ============================================================================

const possibleDistPaths = [
  process.env.CLIENT_DIST,
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../public'),
  path.join(process.cwd(), 'client-dist'),
  path.join(process.cwd(), '../client/dist'),
].filter(Boolean) as string[];

const staticClientPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (staticClientPath) {
  app.use(express.static(staticClientPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticClientPath, 'index.html'));
  });
}

// ============================================================================
// Global Error Handler (must be registered AFTER all routes)
// ============================================================================

app.use(globalErrorHandler);

// ============================================================================
// Start Server
// ============================================================================

const PORT = parseInt(process.env.PORT || '3001', 10);

if (process.env.NODE_ENV !== 'test' && !process.env.DISABLE_SERVER_LISTEN) {
  app.listen(PORT, () => {
    console.log(`[DispatchGrid] Server running on http://localhost:${PORT}`);
    console.log(`[DispatchGrid] Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
