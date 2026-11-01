# 用户管理后端

Node.js + Express + SQLite（better-sqlite3）+ JWT + bcrypt。默认端口 **8128**。

浏览器只访问 `https://user.admin.top`。由反向代理把 `/api` 转到本服务，前端无需知道上游端口。本地开发时，Vite 已将 `/api` 代理到 `http://localhost:8128`。

## 安装与启动

```bash
cd backend
cp .env.example .env
npm install
npm start
```

开发时自动重载：

```bash
npm run dev
```

`npm start` 在未设置 `PORT` 时监听 `0.0.0.0:8128`。

```bash
npm test
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `JWT_SECRET` | 签发令牌的密钥。生产环境必须改成足够长的随机字符串 | `change-me-to-a-long-random-string` |
| `PORT` | 监听端口 | `8128` |
| `DB_PATH` | SQLite 文件路径，相对路径相对于 `backend/` | `data/users.db` |
| `CORS_ORIGIN` | 允许的浏览器来源，逗号分隔 | `https://user.admin.top` |

`NODE_ENV=production` 且 `JWT_SECRET` 为空或仍是示例值时，进程会拒绝启动。

数据库文件、`data/` 和 `.env` 已在 `backend/.gitignore` 中忽略。

## 反向代理

同一站点同时提供前端静态文件和 API 时，可按下面方式转发（监听本机 8128）：

```nginx
server {
    server_name user.admin.top;

    location /api/ {
        proxy_pass http://127.0.0.1:8128;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

服务已 `trust proxy`，并默认允许来源 `https://user.admin.top`。同源反代不依赖 CORS；若前端与 API 不同源，把来源写入 `CORS_ORIGIN`。

## API

成功的注册和用户对象只包含 `id` 与 `username`。错误响应为 `{ "error": "..." }`。除注册和登录外，请求头需要 `Authorization: Bearer <token>`。缺少或无效令牌返回 **401**。删除为物理删除。

### 注册

```bash
curl -sS -D - -o /tmp/body.json \
  -H 'Content-Type: application/json' \
  -d '{"username":"ada","password":"secret-1"}' \
  http://127.0.0.1:8128/api/auth/register
cat /tmp/body.json
```

- 201 `{ "id": 1, "username": "ada" }`
- 409 用户名已存在（大小写不敏感）

### 登录

```bash
curl -sS -H 'Content-Type: application/json' \
  -d '{"username":"ada","password":"secret-1"}' \
  http://127.0.0.1:8128/api/auth/login
```

- 200 `{ "token": "<jwt>", "user": { "id": 1, "username": "ada" } }`

### 用户

```bash
TOKEN="<上一步返回的 token>"

curl -sS -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8128/api/users

curl -sS -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"username":"grace","password":"secret-3"}' \
  http://127.0.0.1:8128/api/users

curl -sS -X PUT -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"password":"secret-5"}' \
  http://127.0.0.1:8128/api/users/2

curl -sS -D - -o /dev/null -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8128/api/users/2
```

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/users` | 用户数组 `[{id, username}, ...]` |
| `POST` | `/api/users` | 创建用户，201 `{id, username}`，重名 409 |
| `PUT` | `/api/users/:id` | 更新 `username` 和/或 `password` |
| `DELETE` | `/api/users/:id` | 物理删除，204 |

健康检查：`GET /api/health` → `{ "ok": true }`。
