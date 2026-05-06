require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const RedisStore = require('rate-limit-redis').default;

const { initializeDatabase } = require('./src/config/database');
const { redisClient, initializeRedis } = require('./src/config/redis');
const swaggerSpec = require('./src/config/swagger');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const bankRoutes = require('./src/routes/bankRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

let dbReady = false;

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && redisClient.isOpen
    ? { store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }) }
    : {}),
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
});
app.use('/api/', limiter);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ─── Swagger Documentation ───────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'BMS API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a3c5e; }',
  swaggerOptions: { persistAuthorization: true },
}));

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Root Endpoint ───────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the Bank Management System API',
    documentation: `${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api-docs`,
    health: `${process.env.API_BASE_URL || `http://localhost:${PORT}`}/health`,
    version: '1.2.0',
  });
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    database: dbReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString(),
    service: 'Bank Management System API',
    version: '1.2.0',
  });
});

// ─── DB Guard Middleware ─────────────────────────────────────────────────────
app.use('/api/', (req, res, next) => {
  if (!dbReady && process.env.NODE_ENV !== 'test') {
    return res.status(503).json({
      success: false,
      message: 'Database is still connecting. Please retry in a few seconds.',
      error: 'DATABASE_NOT_READY',
    });
  }
  next();
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/banks', bankRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: 'NOT_FOUND',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[GlobalError]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    error: 'INTERNAL_ERROR',
  });
});

// ─── Background DB Connector ──────────────────────────────────────────────────
const connectDBInBackground = async () => {
  while (true) {
    try {
      await initializeDatabase();
      dbReady = true;
      console.log('\n✅  Database ready — all API endpoints are now active.\n');
      return;
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
          dbReady = true;
          return;
      }
      const msg = err.message || err.code || 'ETIMEDOUT';
      console.error(`[DB] Connection failed (${msg}). Retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`\n🏦  Bank Management System API`);
        console.log(`🚀  Server running on port ${PORT}`);
        console.log(`📚  Swagger docs : http://localhost:${PORT}/api-docs`);
        console.log(`❤️   Health check : http://localhost:${PORT}/health`);
        console.log(`⏳  Connecting to database in background...\n`);
    });

    initializeRedis().catch((err) =>
        console.error('[Redis] Startup error:', err.message)
    );

    connectDBInBackground();
}

module.exports = app;
