<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../api/users.js'
import { clearAuth, getStoredUser } from '../lib/auth.js'

const router = useRouter()
const currentUser = ref(getStoredUser())

const users = ref([])
const listLoading = ref(false)
const listError = ref('')

const createUsername = ref('')
const createPassword = ref('')
const createLoading = ref(false)
const createError = ref('')

const editingId = ref(null)
const editPassword = ref('')
const editLoading = ref(false)
const editError = ref('')

const deletingId = ref(null)

async function loadUsers() {
  listError.value = ''
  listLoading.value = true
  try {
    const data = await listUsers()
    users.value = Array.isArray(data) ? data : []
  } catch (e) {
    users.value = []
    listError.value = e.message || '加载用户列表失败'
    if (e.status === 401) {
      await router.replace({ name: 'login', query: { redirect: '/users' } })
    }
  } finally {
    listLoading.value = false
  }
}

onMounted(() => {
  loadUsers()
})

function logout() {
  clearAuth()
  router.push('/login')
}

async function onCreate() {
  createError.value = ''
  const name = createUsername.value.trim()
  if (!name || !createPassword.value) {
    createError.value = '请填写用户名和密码'
    return
  }
  createLoading.value = true
  try {
    await createUser(name, createPassword.value)
    createUsername.value = ''
    createPassword.value = ''
    await loadUsers()
  } catch (e) {
    createError.value = e.message || '创建失败'
  } finally {
    createLoading.value = false
  }
}

function startEdit(user) {
  editingId.value = user.id
  editPassword.value = ''
  editError.value = ''
}

function cancelEdit() {
  editingId.value = null
  editPassword.value = ''
  editError.value = ''
}

async function submitEdit(user) {
  editError.value = ''
  if (!editPassword.value) {
    editError.value = '请输入新密码'
    return
  }
  editLoading.value = true
  try {
    await updateUser(user.id, { password: editPassword.value })
    cancelEdit()
    await loadUsers()
  } catch (e) {
    editError.value = e.message || '更新失败'
  } finally {
    editLoading.value = false
  }
}

async function onDelete(user) {
  const ok = window.confirm(`确定删除用户「${user.username}」吗？此操作不可恢复。`)
  if (!ok) return
  deletingId.value = user.id
  listError.value = ''
  try {
    await deleteUser(user.id)
    await loadUsers()
  } catch (e) {
    listError.value = e.message || '删除失败'
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="page users-page">
    <header class="topbar">
      <div>
        <h1>用户列表</h1>
        <p v-if="currentUser" class="muted">
          当前登录：{{ currentUser.username }}
        </p>
      </div>
      <button type="button" class="btn ghost" @click="logout">退出登录</button>
    </header>

    <section class="card section">
      <h2>新建用户</h2>
      <form class="form form-inline" @submit.prevent="onCreate">
        <label>
          <span>用户名</span>
          <input
            v-model="createUsername"
            type="text"
            :disabled="createLoading"
          />
        </label>
        <label>
          <span>密码</span>
          <input
            v-model="createPassword"
            type="password"
            :disabled="createLoading"
          />
        </label>
        <button type="submit" class="btn primary" :disabled="createLoading">
          {{ createLoading ? '创建中…' : '创建' }}
        </button>
      </form>
      <p v-if="createError" class="alert alert-error">{{ createError }}</p>
    </section>

    <section class="card section">
      <div class="section-head">
        <h2>全部用户</h2>
        <button
          type="button"
          class="btn ghost small"
          :disabled="listLoading"
          @click="loadUsers"
        >
          刷新
        </button>
      </div>

      <p v-if="listLoading" class="state">加载中…</p>
      <p v-else-if="listError" class="alert alert-error">{{ listError }}</p>
      <p v-else-if="users.length === 0" class="state muted">暂无用户</p>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td class="actions">
                <template v-if="editingId === user.id">
                  <input
                    v-model="editPassword"
                    type="password"
                    class="inline-input"
                    placeholder="新密码"
                    :disabled="editLoading"
                  />
                  <button
                    type="button"
                    class="btn primary small"
                    :disabled="editLoading"
                    @click="submitEdit(user)"
                  >
                    {{ editLoading ? '保存中…' : '保存' }}
                  </button>
                  <button
                    type="button"
                    class="btn ghost small"
                    :disabled="editLoading"
                    @click="cancelEdit"
                  >
                    取消
                  </button>
                  <span v-if="editError" class="inline-error">{{ editError }}</span>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="btn ghost small"
                    :disabled="deletingId === user.id"
                    @click="startEdit(user)"
                  >
                    修改密码
                  </button>
                  <button
                    type="button"
                    class="btn danger small"
                    :disabled="deletingId === user.id"
                    @click="onDelete(user)"
                  >
                    {{ deletingId === user.id ? '删除中…' : '删除' }}
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
