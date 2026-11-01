# user-admin

Simple user admin (login/register/CRUD)

## 前端（Vue 3 + Vite）

见 [frontend/README.md](./frontend/README.md)。

```bash
cd frontend
npm install
npm run dev
```

本地开发需后端监听 **8128** 端口；前端通过 Vite 代理访问 `/api`。

生产构建：

```bash
cd frontend
npm run build
```

默认 `VITE_API_BASE=/api`，与 nginx 将 `/api` 反代到后端的方式一致。
