<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } catch {
    // 错误提示由 http 拦截器统一处理
  } finally {
    loading.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="login-page" @keydown="handleKeydown">
    <div class="login-card">
      <div class="login-header">
        <el-icon :size="40" color="#2c6e49"><TrendCharts /></el-icon>
        <h1>涉农信贷风控系统</h1>
        <p>基于多元统计模型的涉农小微企业信贷风险智能评估</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="'User'" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="'Lock'"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin"> 登 录 </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>本系统为邀约制使用，账号由系统管理员统一开通，不支持自行注册</span>
      </div>
    </div>

    <div class="login-footer">© 2026 涉农信贷风控系统 · "挑战杯"创业计划竞赛 · 东北乡村振兴</div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #2c6e49 55%, #4c956c 100%);
  overflow: hidden;
}

.login-card {
  width: 400px;
  max-width: calc(100vw - 48px);
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px 28px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);

  .login-header {
    text-align: center;
    margin-bottom: 28px;

    h1 {
      font-size: 22px;
      color: #1a1a2e;
      margin: 12px 0 6px;
    }

    p {
      font-size: 13px;
      color: #909399;
    }
  }

  .login-btn {
    width: 100%;
    letter-spacing: 4px;
  }

  .login-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }
}

.login-footer {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}
</style>
