<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const routeLoading = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

// 路由切换：进入即显示顶部进度条，完成后延迟隐藏（避免闪烁）
router.beforeEach(() => {
  routeLoading.value = true
})
router.afterEach(() => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    routeLoading.value = false
  }, 180)
})

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<template>
  <!-- 路由切换顶部进度条 -->
  <div v-show="routeLoading" class="route-loading-bar" aria-label="页面加载中" />
  <router-view />
</template>

<style>
.route-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 4000;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, #4c956c, #2c6e49, #4c956c);
  background-size: 200% 100%;
  animation: route-loading-slide 1.1s ease-in-out infinite;
  pointer-events: none;
}

@keyframes route-loading-slide {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
