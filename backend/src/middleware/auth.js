const jwt = require('jsonwebtoken');
const { findById } = require('../db');

const PLACEHOLDER_SECRETS = new Set([
  'change-me',
  'change-me-to-a-long-random-string',
  'dev-only-insecure-secret',
]);

const DEV_SECRET = 'dev-only-insecure-secret';

function jwtSecretConfig() {
  const secret = (process.env.JWT_SECRET || '').trim();
  const missing = !secret || PLACEHOLDER_SECRETS.has(secret);
  return { secret: missing ? DEV_SECRET : secret, missing };
}

function getJwtSecret() {
  return jwtSecretConfig().secret;
}

function assertJwtConfig() {
  const { missing } = jwtSecretConfig();
  if (!missing) return;
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'JWT_SECRET must be set to a long random value when NODE_ENV=production'
    );
    process.exit(1);
  }
  console.warn(
    '[user-admin] JWT_SECRET 未设置或仍是示例值，当前使用仅供本地开发的密钥'
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const match = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header) : null;
  if (!match) {
    return res.status(401).json({ error: '缺少访问令牌' });
  }

  try {
    const payload = jwt.verify(match[1], getJwtSecret(), {
      algorithms: ['HS256'],
    });
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(401).json({ error: '令牌无效或已过期' });
    }
    const user = findById(id);
    if (!user) {
      return res.status(401).json({ error: '令牌无效或已过期' });
    }
    req.user = { id: user.id, username: user.username };
    return next();
  } catch {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

module.exports = { requireAuth, getJwtSecret, assertJwtConfig };
