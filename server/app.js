import express from 'express';
import {
  helmetMiddleware,
  corsMiddleware,
  cookieMiddleware,
  jsonBodyParser,
  urlencodedBodyParser,
  bodyParseErrorHandler,
} from './src/middleware/security.js';
import { requestId } from './src/middleware/requestId.js';
import { requestLogger } from './src/middleware/requestLogger.js';
import { globalRateLimiter } from './src/middleware/rateLimiter.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { sendError } from './src/shared/response.js';
import { HTTP, ERROR_CODE } from './src/config/constants.js';

// Module routers
import healthRouter from './src/modules/health/routes.js';
import authRouter from './src/modules/auth/auth.routes.js';
import userRouter from './src/modules/users/user.routes.js';
import professionsRouter from './src/modules/professions/profession.routes.js';
import profileRouter, { publicProfileRouter } from './src/modules/profiles/profile.routes.js';
import profileTemplateRouter from './src/modules/profiles/profileTemplate.routes.js';
import connectionsRouter from './src/modules/connections/connection.routes.js';
import discoveryRouter from './src/modules/discovery/discovery.routes.js';
import conversationRouter from './src/modules/conversations/conversation.routes.js';
import { notificationRoutes } from './src/modules/notifications/notification.routes.js';
import { initNotificationListeners } from './src/modules/notifications/notification.listeners.js';
import path from 'path';
import fs from 'fs';
import { config } from './src/config/env.js';
import { cardRoutes } from './src/modules/cards/card.routes.js';
import { cardController } from './src/modules/cards/card.controller.js';
import { orderRoutes } from './src/modules/cards/order.routes.js';
import { mediaRoutes } from './src/modules/media/media.routes.js';
import { analyticsRoutes } from './src/modules/analytics/analytics.routes.js';
import { initAnalyticsListeners } from './src/modules/analytics/analytics.listeners.js';
import subscriptionRouter from './src/modules/subscriptions/subscription.routes.js';
import { initSubscriptionListeners } from './src/modules/subscriptions/subscription.listeners.js';
import moderationRouter from './src/modules/moderation/moderation.routes.js';
import supportRouter from './src/modules/support/support.routes.js';
import adminRouter from './src/modules/admin/admin.routes.js';
import privacyRouter from './src/modules/privacy/privacy.routes.js';
import { postRoutes } from './src/modules/posts/post.routes.js';
import { paymentRoutes } from './src/modules/payments/index.js';
import organizationRouter from './src/modules/organizations/organization.routes.js';
import { organizationController } from './src/modules/organizations/organization.controller.js';
import jobRoutes from './src/modules/jobs/job.routes.js';
import { jobController } from './src/modules/jobs/job.controller.js';
import { authenticate } from './src/middleware/authenticate.js';

// ---------------------------------------------------------------------------
// Express application factory.
// Separating app from server.js makes it easy to import in tests.
// ---------------------------------------------------------------------------

const app = express();

// Trust the first proxy (needed for accurate req.ip behind nginx/load-balancer)
app.set('trust proxy', 1);

// Disable X-Powered-By (Helmet also does this, but belt-and-suspenders)
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Middleware stack — ORDER MATTERS
// ---------------------------------------------------------------------------

// 1. Request ID — must be first so all subsequent logs include it
app.use(requestId);

// 2. Request logger
app.use(requestLogger);

// 3. Security headers
app.use(helmetMiddleware);

// 4. CORS (before any route handles the request)
app.use(corsMiddleware);

// 5. Body parsers
app.use(jsonBodyParser);
app.use(urlencodedBodyParser);

// 6. Cookie parser
app.use(cookieMiddleware);

// 7. Convert body-parse errors into our error format
app.use(bodyParseErrorHandler);

// 8. Global rate limiter (applied to ALL routes)
app.use(globalRateLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Root welcome endpoint
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'OneWinq API Server is running',
    version: '0.1.0',
    health: '/health',
    apiV1: '/api/v1',
  });
});

// Health checks (no /api/v1 prefix — load balancers need predictable paths)
app.use('/health', healthRouter);

// API v1 — modules mounted here as they are implemented
const apiRouter = express.Router();
apiRouter.use('/health', healthRouter);
app.use('/api/v1', apiRouter);

// Auth module
apiRouter.use('/auth', authRouter);

// Users module
apiRouter.use('/users', userRouter);

// Professions module
apiRouter.use('/professions', professionsRouter);

// Profiles module (authenticated)
apiRouter.use('/profiles', profileRouter);

// Profile Templates module
apiRouter.use('/profile-templates', profileTemplateRouter);

// Public profile module
apiRouter.use('/public', publicProfileRouter);

// Connections module
apiRouter.use('/connections', connectionsRouter);

// Discovery module
apiRouter.use('/discovery', discoveryRouter);

// Conversations module
apiRouter.use('/conversations', conversationRouter);

// Notifications module
apiRouter.use('/notifications', notificationRoutes);

// Cards module (NFC / QR)
apiRouter.use('/cards', cardRoutes);

// Hardware Orders module
apiRouter.use('/orders', orderRoutes);

// Payments & Checkout module (Modular Razorpay payments)
apiRouter.use('/payments', paymentRoutes);

// Media module (Presigned upload & storage)
apiRouter.use('/media', mediaRoutes);

// Analytics module
apiRouter.use('/analytics', analyticsRoutes);

// Subscriptions & Monetization module
apiRouter.use('/subscriptions', subscriptionRouter);

// Moderation & Abuse reporting module
apiRouter.use('/reports', moderationRouter);

// Support Ticketing module
apiRouter.use('/support', supportRouter);

// Administration & Backoffice module
apiRouter.use('/admin', adminRouter);

// Privacy & GDPR/DPDP module
apiRouter.use('/privacy', privacyRouter);

// Posts & Social Feed module
apiRouter.use('/posts', postRoutes);

// Organizations & Multi-tenancy module
apiRouter.use('/organizations', organizationRouter);

// Jobs & Recruitment module
apiRouter.use('/jobs', jobRoutes);

// Convenient User Context Aliases
apiRouter.get('/me/organizations', authenticate, (req, res, next) =>
  organizationController.getMyOrganizations(req, res, next),
);
apiRouter.get('/me/applications', authenticate, (req, res, next) =>
  jobController.getMyApplications(req, res, next),
);

// Root vanity NFC tap endpoint (/c/:cardUid)
app.get('/c/:cardUid', cardController.resolveTap);

// Serve local uploads statically with cross-origin headers
const uploadsStaticDir = fs.existsSync(path.resolve(process.cwd(), 'server', 'uploads'))
  ? path.resolve(process.cwd(), 'server', 'uploads')
  : path.resolve(process.cwd(), config.storage?.localDir || 'uploads');

app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(uploadsStaticDir),
);

// Initialize background event listeners
initNotificationListeners();
initAnalyticsListeners();
initSubscriptionListeners();

// ---------------------------------------------------------------------------
// 404 handler — must be after all routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  return sendError(res, {
    message: `Cannot ${req.method} ${req.originalUrl}`,
    code: ERROR_CODE.NOT_FOUND,
    statusCode: HTTP.NOT_FOUND,
  });
});

// ---------------------------------------------------------------------------
// Centralized error handler — must be LAST
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
