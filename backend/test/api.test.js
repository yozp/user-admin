const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { once } = require('events');
const { spawn } = require('child_process');
const test = require('node:test');

const backendRoot = path.join(__dirname, '..');
const dbPath = path.join(
  os.tmpdir(),
  `user-admin-${process.pid}-${Date.now()}.db`
);

process.env.JWT_SECRET = 'test-secret-value';
process.env.DB_PATH = dbPath;
process.env.CORS_ORIGIN = 'https://user.admin.top';
process.env.NODE_ENV = 'test';
delete process.env.PORT;

const { createApp, DEFAULT_PORT } = require('../src/server');
const { closeDb } = require('../src/db');

function removeDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
}

async function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  return {
    server,
    base: `http://127.0.0.1:${address.port}`,
  };
}

async function api(base, urlPath, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data, headers: res.headers };
}

test('default listen port is 8128', () => {
  assert.strictEqual(DEFAULT_PORT, 8128);
});

test('auth and user CRUD', async () => {
  const { server, base } = await listen(createApp());
  try {
    const health = await api(base, '/api/health');
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(health.data, { ok: true });

    const missing = await api(base, '/api/users');
    assert.strictEqual(missing.status, 401);

    const invalid = await api(base, '/api/users', { token: 'not-a-token' });
    assert.strictEqual(invalid.status, 401);

    const created = await api(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'ada', password: 'secret-1' },
    });
    assert.strictEqual(created.status, 201);
    assert.deepStrictEqual(created.data, { id: 1, username: 'ada' });

    const duplicate = await api(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'Ada', password: 'secret-2' },
    });
    assert.strictEqual(duplicate.status, 409);
    assert.strictEqual(duplicate.data.error, '用户名已存在');

    const badLogin = await api(base, '/api/auth/login', {
      method: 'POST',
      body: { username: 'ada', password: 'wrong' },
    });
    assert.strictEqual(badLogin.status, 401);

    const login = await api(base, '/api/auth/login', {
      method: 'POST',
      body: { username: 'ada', password: 'secret-1' },
    });
    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.data.user.username, 'ada');
    assert.ok(login.data.token);
    const token = login.data.token;

    const cors = await fetch(`${base}/api/users`, {
      headers: {
        Origin: 'https://user.admin.top',
        Authorization: `Bearer ${token}`,
      },
    });
    assert.strictEqual(
      cors.headers.get('access-control-allow-origin'),
      'https://user.admin.top'
    );

    const blocked = await fetch(`${base}/api/health`, {
      headers: { Origin: 'https://evil.example' },
    });
    assert.strictEqual(blocked.headers.get('access-control-allow-origin'), null);

    const list = await api(base, '/api/users', { token });
    assert.strictEqual(list.status, 200);
    assert.deepStrictEqual(list.data, [{ id: 1, username: 'ada' }]);

    const second = await api(base, '/api/users', {
      method: 'POST',
      token,
      body: { username: 'grace', password: 'secret-3' },
    });
    assert.strictEqual(second.status, 201);
    assert.deepStrictEqual(second.data, { id: 2, username: 'grace' });

    const conflict = await api(base, '/api/users', {
      method: 'POST',
      token,
      body: { username: 'grace', password: 'secret-4' },
    });
    assert.strictEqual(conflict.status, 409);

    const updated = await api(base, '/api/users/2', {
      method: 'PUT',
      token,
      body: { password: 'secret-5' },
    });
    assert.strictEqual(updated.status, 200);
    assert.deepStrictEqual(updated.data, { id: 2, username: 'grace' });

    const renamed = await api(base, '/api/users/2', {
      method: 'PUT',
      token,
      body: { username: 'graceh' },
    });
    assert.strictEqual(renamed.status, 200);
    assert.strictEqual(renamed.data.username, 'graceh');

    const oldPassword = await api(base, '/api/auth/login', {
      method: 'POST',
      body: { username: 'graceh', password: 'secret-3' },
    });
    assert.strictEqual(oldPassword.status, 401);
    const newPassword = await api(base, '/api/auth/login', {
      method: 'POST',
      body: { username: 'graceh', password: 'secret-5' },
    });
    assert.strictEqual(newPassword.status, 200);

    const removed = await api(base, '/api/users/2', { method: 'DELETE', token });
    assert.strictEqual(removed.status, 204);
    assert.strictEqual(removed.data, null);

    const after = await api(base, '/api/users', { token });
    assert.deepStrictEqual(after.data, [{ id: 1, username: 'ada' }]);

    const missingUser = await api(base, '/api/users/2', { method: 'DELETE', token });
    assert.strictEqual(missingUser.status, 404);

    const stale = await api(base, '/api/users', { token: newPassword.data.token });
    assert.strictEqual(stale.status, 401);
  } finally {
    server.close();
    await once(server, 'close');
    closeDb();
    removeDb();
  }
});

test('npm start listens on 8128', async () => {
  const startDb = path.join(os.tmpdir(), `user-admin-start-${process.pid}.db`);
  const env = { ...process.env, JWT_SECRET: 'test-secret-value', DB_PATH: startDb };
  delete env.PORT;

  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: backendRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    const deadline = Date.now() + 10000;
    while (!output.includes('listening on') && Date.now() < deadline) {
      if (child.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.match(output, /0\.0\.0\.0:8128/);

    const health = await fetch('http://127.0.0.1:8128/api/health');
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(await health.json(), { ok: true });
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(startDb + suffix, { force: true });
    }
  }
});
