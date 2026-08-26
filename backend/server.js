require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const auditRoutes = require('./routes/auditRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const agentRoutes = require('./routes/agentRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const visionRoutes = require('./routes/visionRoutes');
const decisionRoutes = require('./routes/decisionRoutes');
const mcpRoutes = require('./routes/mcpRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const httpServer = createServer(app);

// ─── CORS Origins ─────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
];
// Add FRONTEND_URL from env (strip any accidental quotes)
if (process.env.FRONTEND_URL) {
  const cleanUrl = process.env.FRONTEND_URL.replace(/[\'"]/g, '').trim();
  allowedOrigins.push(cleanUrl);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile, curl, etc) or matching origins
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now — tighten in production
    }
  },
  credentials: true,
};

// ─── Socket.io for real-time agent activity ───────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`Client disconnected: ${socket.id}`));
  socket.on('join_org', (orgId) => socket.join(`org:${orgId}`));
});

// ─── Security & Middleware ────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/decision', decisionRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'aibos-backend', timestamp: new Date() }));

// 404 handler
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    // Redis is optional — failure won't crash the server
    try {
      await connectRedis();
    } catch (redisErr) {
      logger.warn(`Redis startup warning: ${redisErr.message}. Continuing without Redis.`);
    }
    httpServer.listen(PORT, () => {
      logger.info(`🚀 AIBOS Backend running on port ${PORT}`);
      logger.info(`📡 WebSocket server active`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
