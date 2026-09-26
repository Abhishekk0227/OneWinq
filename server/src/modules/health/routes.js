import { Router } from 'express';
import { getDatabaseStatus } from '../../infrastructure/database/connection.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

// ---------------------------------------------------------------------------
// Health endpoints
//
// GET /health         — basic "I'm alive" with version info
// GET /health/live    — liveness: process is healthy (never checks external deps)
// GET /health/ready   — readiness: all required deps (MongoDB) are connected
// ---------------------------------------------------------------------------

const router = Router();

const startTime = new Date();

router.get('/', (_req, res) => {
  return sendSuccess(res, {
    message: 'OneWinq API is running',
    data: {
      name: 'onewinq-server',
      version: '0.1.0',
      uptime: process.uptime(),
      startedAt: startTime.toISOString(),
    },
  });
});

router.get('/live', (_req, res) => {
  // Liveness: only checks if the Node.js process itself is responsive.
  // Must NOT fail due to a downstream dependency being temporarily unavailable.
  return sendSuccess(res, { message: 'Alive', data: { status: 'ok' } });
});

router.get('/ready', (_req, res) => {
  // Readiness: checks all required dependencies.
  // A readiness failure signals to the load-balancer/orchestrator to stop sending traffic.
  const db = getDatabaseStatus();
  const isReady = db.readyState === 1; // 1 = connected

  const data = {
    status: isReady ? 'ready' : 'not_ready',
    dependencies: {
      database: db.state,
    },
  };

  if (isReady) {
    return sendSuccess(res, { message: 'Ready', data });
  }

  return res.status(HTTP.SERVICE_UNAVAILABLE).json({
    success: false,
    error: {
      code: 'NOT_READY',
      message: 'Service is not ready',
      details: data,
    },
  });
});

export default router;
