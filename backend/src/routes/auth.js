const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findByUsername, isUniqueViolation } = require('../db');
const { getJwtSecret } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 10;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-not-used', BCRYPT_ROUNDS);

function readCredentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { username, password };
}

function validateCredentials(username, password) {
  if (!username || !password) {
    return '请提供用户名和密码';
  }
  if (username.length > 64) {
    return '用户名长度不能超过 64 个字符';
  }
  if (password.length > 128) {
    return '密码长度不能超过 128 个字符';
  }
  return null;
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = readCredentials(req.body);
    const invalid = validateCredentials(username, password);
    if (invalid) {
      return res.status(400).json({ error: invalid });
    }
    if (findByUsername(username)) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = createUser(username, passwordHash);
    return res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = readCredentials(req.body);
    const invalid = validateCredentials(username, password);
    if (invalid) {
      return res.status(400).json({ error: invalid });
    }

    const user = findByUsername(username);
    const matches = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_HASH
    );
    if (!user || !matches) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      getJwtSecret(),
      { expiresIn: '7d', algorithm: 'HS256' }
    );
    return res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
