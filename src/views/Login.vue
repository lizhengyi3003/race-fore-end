<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Click, Slide, SlideRegion, Rotate } from 'go-captcha-vue'
import 'go-captcha-vue/dist/style.css'
import { useAuthStore } from '@/stores/auth'
import { getCaptcha, checkCaptcha, type CaptchaData, type CaptchaType } from '@/api/captcha'

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

// ---------- 行为验证码（go-captcha）：点击登录后弹出校验，四种模式随机 ----------
const captchaVisible = ref(false)
const captchaData = ref<CaptchaData | null>(null)
const captchaLoading = ref(false)
// 验证码加载失败标志：避免弹窗空白卡住，显示错误 + 重试
const captchaError = ref(false)
// 已通过验证的 captchaKey 与登录提交状态（防止重复触发登录 / @closed 清空竞态）
const pendingCaptchaKey = ref('')
const loginSubmitting = ref(false)

const TYPE_TIPS: Record<CaptchaType, string> = {
  click: '请依次点击下图中的字符',
  slide: '请拖动滑块完成拼图',
  drag: '请将拼图拖到正确位置',
  rotate: '请旋转图片对齐角度',
}

/** 加载/刷新验证码（弹窗打开或点击组件内置刷新按钮时调用） */
async function loadCaptcha() {
  if (loginSubmitting.value) return
  captchaLoading.value = true
  captchaError.value = false
  try {
    captchaData.value = await getCaptcha()
  } catch {
    // 验证码服务不可用/网络异常：显示错误与重试，避免弹窗空白卡校验
    captchaData.value = null
    captchaError.value = true
  } finally {
    captchaLoading.value = false
  }
}

/** 打开验证码弹窗并加载验证码 */
function openCaptcha() {
  if (loginSubmitting.value) return
  captchaVisible.value = true
  loadCaptcha()
}

/** 弹窗完全关闭后清理（不清理 pendingCaptchaKey，避免与进行中的登录竞态） */
function onCaptchaClosed() {
  captchaData.value = null
}

/** 统一校验：通过则关闭弹窗执行登录，失败则重置并换一张 */
function doCheck(value: string, reset: () => void) {
  if (loginSubmitting.value || !captchaData.value) return
  checkCaptcha(captchaData.value.captchaKey, captchaData.value.type, value)
    .then((res) => {
      if (res.passed) {
        // 先缓存已验证的 key（后续弹窗关闭 @closed 会清空 captchaData，避免竞态）
        pendingCaptchaKey.value = captchaData.value?.captchaKey || ''
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
      // 校验请求网络异常：重置并换一张，避免反复卡在同一张图
      ElMessage.error('验证服务异常，已为你换一张，请重试')
      reset()
      loadCaptcha()
    })
}

/** click：点选坐标 */
function onClickConfirm(dots: Array<{ key: number; index: number; x: number; y: number }>, reset: () => void) {
  doCheck(dots.map((d) => `${d.x},${d.y}`).join(','), reset)
}

/** slide / drag：滑块终点坐标 */
function onSlideConfirm(point: { x: number; y: number }, reset: () => void) {
  doCheck(`${point.x},${point.y}`, reset)
}

/** rotate：旋转角度 */
function onRotateConfirm(angle: number, reset: () => void) {
  doCheck(String(angle), reset)
}

/** 组件内置按钮事件：refresh 换一张；close 清除点选（组件内部已清） */
function captchaEvents() {
  return {
    refresh: loadCaptcha,
    close: () => {},
  }
}

/** 真实登录（验证码已通过后调用，防重进入） */
async function doLogin() {
  // 防重：登录请求进行中不再触发
  if (loginSubmitting.value) return
  const captchaKey = pendingCaptchaKey.value || captchaData.value?.captchaKey || ''
  if (!captchaKey) return
  loginSubmitting.value = true
  loading.value = true
  try {
    await authStore.login(form.username, form.password, captchaKey)
  } catch {
    // 仅登录失败才重新弹出验证码（换一张，防止同一验证码重复试探）
    pendingCaptchaKey.value = ''
    captchaVisible.value = true
    loadCaptcha()
    return
  } finally {
    loading.value = false
  }
  // 登录成功：提示并跳转；跳转失败不回滚登录状态、不重新弹窗
  ElMessage.success('登录成功')
  const redirect = (route.query.redirect as string) || '/home'
  await router.replace(redirect).catch(() => {})
  loginSubmitting.value = false
}

async function handleLogin() {
  if (loginSubmitting.value) return
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
      @closed="onCaptchaClosed"
    >
      <div v-loading="captchaLoading" class="captcha-box">
        <div v-if="captchaData" class="captcha-tip">{{ TYPE_TIPS[captchaData.type] }}</div>
        <!-- 验证码加载失败：显示错误 + 重试，避免弹窗空白卡校验 -->
        <div v-else-if="captchaError" class="captcha-error">
          <el-icon :size="28" color="#e6a23c"><WarningFilled /></el-icon>
          <p>验证码加载失败，请检查网络后重试</p>
          <el-button type="primary" size="small" @click="loadCaptcha">重新加载</el-button>
        </div>
        <!-- 四种交互模式随机：click 点选 / slide 滑块 / drag 拖拽 / rotate 旋转 -->
        <Click
          v-if="captchaData?.type === 'click'"
          :data="{ image: captchaData.image, thumb: captchaData.thumb }"
          :config="{
            width: captchaData.width,
            height: captchaData.height,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            title: '请依次点击',
            buttonText: '确 认',
          }"
          :events="{ ...captchaEvents(), confirm: onClickConfirm }"
        />
        <Slide
          v-else-if="captchaData?.type === 'slide'"
          :data="{
            thumbX: captchaData.displayX,
            thumbY: captchaData.displayY,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            image: captchaData.image,
            thumb: captchaData.thumb,
          }"
          :config="{
            width: captchaData.width,
            height: captchaData.height,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            title: '请拖动滑块',
          }"
          :events="{ ...captchaEvents(), confirm: onSlideConfirm }"
        />
        <SlideRegion
          v-else-if="captchaData?.type === 'drag'"
          :data="{
            thumbX: captchaData.displayX,
            thumbY: captchaData.displayY,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            image: captchaData.image,
            thumb: captchaData.thumb,
          }"
          :config="{
            width: captchaData.width,
            height: captchaData.height,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            title: '请拖到正确位置',
          }"
          :events="{ ...captchaEvents(), confirm: onSlideConfirm }"
        />
        <Rotate
          v-else-if="captchaData?.type === 'rotate'"
          :data="{
            image: captchaData.image,
            thumb: captchaData.thumb,
            thumbSize: captchaData.thumbSize,
          }"
          :config="{
            width: captchaData.width,
            height: captchaData.height,
            thumbWidth: captchaData.thumbWidth,
            thumbHeight: captchaData.thumbHeight,
            title: '请旋转对齐',
          }"
          :events="{ ...captchaEvents(), confirm: onRotateConfirm }"
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
  display: flex;
  flex-direction: column;
  align-items: center; // 验证码组件在弹窗中左右居中

  .captcha-tip {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    font-size: 13px;
    color: #606266;
  }

  .captcha-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 0;

    p {
      margin: 0;
      font-size: 13px;
      color: #909399;
    }
  }
}
</style>
