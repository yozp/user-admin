<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isAuthenticated } from './lib/auth.js'

const route = useRoute()
const showShell = computed(() => route.meta.requiresAuth)
</script>

<template>
  <div id="app-root" :class="{ 'with-shell': showShell }">
    <RouterView />
  </div>
</template>

<style scoped>
#app-root {
  min-height: 100vh;
}
</style>
