<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../api/auth.js'

const router = useRouter()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function onSubmit() {
  error.value = ''
  success.value = ''
  const name = username.value.trim()
  if (!name || !password.value) {
    error.value = '请填写用户名和密码'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await register(name, password.value)
    success.value = '注册成功，请登录'
    setTimeout(() => router.push('/login'), 800)
  } catch (e) {
    error.value = e.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page auth-page">
    <div class="card">
      <h1>注册</h1>
      <p class="muted">创建新账号</p>

      <form class="form" @submit.prevent="onSubmit">
        <label>
          <span>用户名</span>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            :disabled="loading"
          />
        </label>
        <label>
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            :disabled="loading"
          />
        </label>
        <label>
          <span>确认密码</span>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            :disabled="loading"
          />
        </label>

        <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
        <p v-if="success" class="alert alert-success" role="status">{{ success }}</p>

        <button type="submit" class="btn primary" :disabled="loading">
          {{ loading ? '提交中…' : '注册' }}
        </button>
      </form>

      <p class="footer-link">
        已有账号？
        <RouterLink to="/login">去登录</RouterLink>
      </p>
    </div>
  </div>
</template>
