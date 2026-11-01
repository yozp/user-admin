import { request } from './client.js'

export function register(username, password) {
  return request('/auth/register', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
}
