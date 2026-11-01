const express = require('express');
const bcrypt = require('bcrypt');
const {
  createUser,
  findById,
  findByUsername,
  listUsers,
  updateUser,
  deleteUser,
  isUniqueViolation,
  toPublicUser,
} = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 10;

router.use(requireAuth);

function parseId(raw) {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

router.get('/', (req, res) => {
  res.json(listUsers());
});

router.post('/', async (req, res, next) => {
  try {
    const username =
      typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    if (username.length > 64) {
      return res.status(400).json({ error: '用户名长度不能超过 64 个字符' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: '密码长度不能超过 128 个字符' });
    }
    if (findByUsername(username)) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = createUser(username, passwordHash);
    return res.status(201).json(user);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: '用户 id 不合法' });
    }
    const existing = findById(id);
    if (!existing) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const hasUsername = Object.prototype.hasOwnProperty.call(req.body || {}, 'username');
    const hasPassword = Object.prototype.hasOwnProperty.call(req.body || {}, 'password');
    if (!hasUsername && !hasPassword) {
      return res.status(400).json({ error: '请提供要更新的用户名或密码' });
    }

    const fields = {};
    if (hasUsername) {
      const username =
        typeof req.body.username === 'string' ? req.body.username.trim() : '';
      if (!username) {
        return res.status(400).json({ error: '用户名不能为空' });
      }
      if (username.length > 64) {
        return res.status(400).json({ error: '用户名长度不能超过 64 个字符' });
      }
      const taken = findByUsername(username);
      if (taken && taken.id !== id) {
        return res.status(409).json({ error: '用户名已存在' });
      }
      fields.username = username;
    }
    if (hasPassword) {
      const password = req.body.password;
      if (typeof password !== 'string' || !password) {
        return res.status(400).json({ error: '密码不能为空' });
      }
      if (password.length > 128) {
        return res.status(400).json({ error: '密码长度不能超过 128 个字符' });
      }
      fields.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    updateUser(id, fields);
    return res.json(toPublicUser(findById(id)));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    return next(err);
  }
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: '用户 id 不合法' });
  }
  const changes = deleteUser(id);
  if (!changes) {
    return res.status(404).json({ error: '用户不存在' });
  }
  return res.status(204).end();
});

module.exports = router;
