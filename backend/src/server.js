const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const { assertJwtConfig } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const DEFAULT_PORT = 8128;

function allowedOrigins() {
  const raw = process.env.CORS_ORIGIN || 'https://user.admin.top';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsOptions() {
  const allowed = allowedOrigins();
  return {
    origin(origin, callback) {
      // 无 Origin：curl、同源反代、服务端调用。浏览器跨域则必须命中 CORS_ORIGIN。
      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
}

function createApp() {
  const app = express();
  // 前面是 user.admin.top 的反向代理时，信任一层转发头。
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: '未找到接口' });
  });

  app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
      res.status(400).json({ error: '请求体不是合法 JSON' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  return app;
}

function resolvePort() {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必须是 1 到 65535 的整数');
  }
  return port;
}

function start() {
  assertJwtConfig();
  getDb();
  const port = resolvePort();
  const server = createApp().listen(port, '0.0.0.0', () => {
    console.log(`user-admin API listening on http://0.0.0.0:${port}`);
  });
  server.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
  return server;
}

if (require.main === module) {
  try {
    start();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

module.exports = { createApp, start, DEFAULT_PORT, resolvePort };
