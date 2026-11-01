import { request } from './client.js'

export function listUsers() {
  return request('/users')
}

export function createUser(username, password) {
  return request('/users', {
    method: 'POST',
    body: { username, password },
  })
}

export function updateUser(id, payload) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteUser(id) {
  return request(`/users/${id}`, {
    method: 'DELETE',
  })
}
