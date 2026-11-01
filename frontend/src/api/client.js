import { clearAuth, getToken } from '../lib/auth.js'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * @param {string} path 以 / 开头的路径，如 /auth/login
 * @param {{ method?: string, body?: unknown, auth?: boolean }} [options]
 */
export async function request(path, options = {}) {
  const { method = 'GET', body, auth = true } = options
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearAuth()
    }
    const message =
      (typeof data === 'object' && data && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      res.statusText ||
      '请求失败'
    throw new ApiError(message, res.status, data)
  }

  return data
}
