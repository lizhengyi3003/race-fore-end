<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Click } from 'go-captcha-vue'
import 'go-captcha-vue/dist/style.css'
import { useAuthStore } from '@/stores/auth'
import { getCaptcha, checkCaptcha, type CaptchaData } from '@/api/captcha'

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

// ---------- 行为验证码（go-captcha）：点击登录后弹出校验 ----------
const captchaVisible = ref(false)
const captchaData = ref<CaptchaData | null>(null)
const captchaLoading = ref(false)

/** 加载/刷新验证码（弹窗打开时调用） */
async function loadCaptcha() {
  captchaLoading.value = true
  try {
    captchaData.value = await getCaptcha()
  } catch {
    captchaData.value = null
  } finally {
    captchaLoading.value = false
  }
}

/** 打开验证码弹窗并加载验证码 */
function openCaptcha() {
  captchaVisible.value = true
  loadCaptcha()
}

/** 点选确认回调：通过则关闭弹窗并执行登录，失败则重置并换一张 */
function onCaptchaConfirm(dots: Array<{ key: number; index: number; x: number; y: number }>, reset: () => void) {
  if (!captchaData.value) return
  const dotsArr: Array<[number, number]> = dots.map((d) => [d.x, d.y])
  checkCaptcha(captchaData.value.captchaKey, dotsArr)
    .then((res) => {
      if (res.passed) {
        ElMessage.success('验证成功')
        captchaVisible.value = false
        doLogin()
      } else {
        ElMessage.warning('验证失败，请重试')
        reset()
        loadCaptcha()
      }
    })
    .catch(() => {
      reset()
      loadCaptcha()
    })
}

/** 真实登录（验证码已通过后调用） */
async function doLogin() {
  if (!captchaData.value) return
  loading.value = true
  try {
    await authStore.login(form.username, form.password, captchaData.value.captchaKey)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } catch {
    // 登录失败：重新弹出验证码（换一张，防止同一验证码重复试探）
    captchaVisible.value = true
    loadCaptcha()
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  openCaptcha()
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

    <!-- 行为验证码弹窗：点击登录后弹出，校验通过才继续登录 -->
    <el-dialog
      v-model="captchaVisible"
      title="安全验证"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      align-center
      append-to-body
      @closed="captchaData = null"
    >
      <div v-loading="captchaLoading" class="captcha-box">
        <div class="captcha-tip">
          <span>请依次点击下图中的字符</span>
          <el-button link type="primary" size="small" @click="loadCaptcha">
            <el-icon><Refresh /></el-icon>&nbsp;换一张
          </el-button>
        </div>
        <Click
          v-if="captchaData"
          :data="{ image: captchaData.image, thumb: captchaData.thumb }"
          :config="{
            width: captchaData.width,
            height: captchaData.height,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            title: '请依次点击',
            buttonText: '确 认',
          }"
          :events="{ confirm: onCaptchaConfirm }"
        />
      </div>
    </el-dialog>
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

<!-- 验证码弹窗内容被 el-dialog teleport 到 body，需全局样式 -->
<style lang="scss">
.captcha-box {
  width: 100%;
  min-height: 60px;

  .captcha-tip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: #606266;
  }
}
</style>
