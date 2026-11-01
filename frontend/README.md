# 用户管理前端

Vue 3 + Vite + Vue Router 单页应用，对接 Express JWT 后端（默认 `http://localhost:8128`）。

## 功能

- 登录 / 注册
- 用户列表、创建、修改密码、删除（带确认）
- JWT 保存在 `localStorage`，请求头携带 `Authorization: Bearer <token>`
- 未登录访问 `/users` 会重定向到登录页

## 开发

```bash
cd frontend
npm install
npm run dev
```

开发服务器默认 `http://localhost:5173`。Vite 将 `/api` 代理到 `http://localhost:8128`，请先启动后端。

## 环境变量

复制示例并按需修改：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认 |
|------|------|------|
| `VITE_API_BASE` | 生产环境 API 前缀 | `/api`（由 nginx 反代到后端） |

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物在 `dist/`。生产部署时通常由 nginx 提供静态文件，并将 `/api` 转发到后端服务。

## 路由

| 路径 | 说明 |
|------|------|
| `/login` | 登录 |
| `/register` | 注册 |
| `/users` | 用户管理（需登录） |
