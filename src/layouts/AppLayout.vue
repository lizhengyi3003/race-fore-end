<!--
  应用整体布局：桌面端可折叠侧边栏 + 移动端抽屉菜单 + 顶部用户栏 + 页脚。
  导航菜单来自 src/router 导出的 NAV_MENUS，应用名/版本/页脚文案来自 src/constants。
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { NAV_MENUS } from '@/router'
import { APP_NAME, APP_VERSION_BADGE, FOOTER_TEXT } from '@/constants'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)
// 平板/手机（< 992px）使用抽屉菜单，避免侧边栏挤压内容区
const isMobile = ref(window.innerWidth <= 992)
const mobileMenuOpen = ref(false)

function updateIsMobile() {
  isMobile.value = window.innerWidth <= 992
  if (!isMobile.value) {
    mobileMenuOpen.value = false
  }
}

const activeMenu = computed(() => route.path)

const userLabel = computed(() => authStore.displayName || authStore.user?.username || '')

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function navigateTo(path: string) {
  if (isMobile.value) {
    mobileMenuOpen.value = false
  }
  router.push(path)
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  authStore.logout()
  router.replace('/login')
}

onMounted(() => window.addEventListener('resize', updateIsMobile))
onBeforeUnmount(() => window.removeEventListener('resize', updateIsMobile))
</script>

<template>
  <el-container class="app-layout">
    <!-- 侧边栏（桌面端） -->
    <el-aside v-if="!isMobile" :width="isCollapsed ? '64px' : '220px'" class="app-aside">
      <div class="aside-header">
        <el-icon :size="28" color="#fff" class="logo-icon">
          <TrendCharts />
        </el-icon>
        <span v-show="!isCollapsed" class="logo-text">{{ APP_NAME }}</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        background-color="#1a1a2e"
        text-color="#bfcbd9"
        active-text-color="#4c956c"
        class="aside-menu"
        @select="navigateTo"
      >
        <el-menu-item v-for="m in NAV_MENUS" :key="m.index" :index="m.index">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="mobileMenuOpen"
      direction="ltr"
      size="220px"
      :with-header="false"
      modal-class="mobile-drawer-modal"
      class="mobile-drawer"
    >
      <div class="aside-header mobile-drawer-header">
        <el-icon :size="28" color="#fff" class="logo-icon">
          <TrendCharts />
        </el-icon>
        <span class="logo-text">{{ APP_NAME }}</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#1a1a2e"
        text-color="#bfcbd9"
        active-text-color="#4c956c"
        class="aside-menu"
        @select="navigateTo"
      >
        <el-menu-item v-for="m in NAV_MENUS" :key="m.index" :index="m.index">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <!-- 主体区域 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="app-header">
        <div class="header-left">
          <el-icon v-if="isMobile" class="collapse-btn" :size="22" @click="mobileMenuOpen = true">
            <Menu />
          </el-icon>
          <el-icon v-else class="collapse-btn" :size="22" @click="toggleCollapse">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <span class="header-title">{{
            isMobile ? APP_NAME : '基于多元统计模型的涉农小微企业信贷风险智能评估系统'
          }}</span>
        </div>
        <div class="header-right">
          <el-tag v-if="!isMobile" type="success" effect="dark" round>{{ APP_VERSION_BADGE }}</el-tag>
          <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'logout' && handleLogout()">
            <div class="user-info">
              <el-icon :size="18"><UserFilled /></el-icon>
              <span class="user-name">{{ userLabel }}</span>
              <el-icon :size="12"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ authStore.user?.role === 'admin' ? '管理员' : '分析师' }}
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="app-main">
        <router-view v-slot="{ Component, route: routePath }">
          <transition name="fade" appear>
            <component :is="Component" :key="routePath.path" />
          </transition>
        </router-view>
      </el-main>

      <!-- 底部 -->
      <el-footer class="app-footer">
        <span>{{ FOOTER_TEXT }}</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.app-layout {
  height: 100vh;
}

// 侧边栏
.app-aside {
  background: #1a1a2e;
  transition: width 0.3s;
  overflow: hidden;

  .aside-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    .logo-icon {
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }
  }

  .aside-menu {
    border-right: none;
    margin-top: 8px;
  }
}

// 顶部栏
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 20px;
  height: 56px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .collapse-btn {
      cursor: pointer;
      color: #606266;
      &:hover {
        color: #2c6e49;
      }
    }

    .header-title {
      font-size: 14px;
      font-weight: 500;
      color: #1a1a2e;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .user-info {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: #606266;
      font-size: 14px;
      padding: 6px 10px;
      border-radius: 6px;
      transition: background 0.2s;

      &:hover {
        background: #f0f2f5;
        color: #2c6e49;
      }

      .user-name {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

// 内容区
.app-main {
  background: #f5f7fa;
  min-height: calc(100vh - 56px - 40px);
  overflow-y: auto;
}

// 底部
.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #e8e8e8;
  background: #fff;
}

// 移动端抽屉样式见文件底部全局 <style>（el-drawer teleport 到 body，scoped 不生效）

// 移动端头部紧凑化
@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;

    .header-title {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 50vw;
    }

    .header-right {
      gap: 8px;

      .user-name {
        max-width: 72px;
      }
    }
  }

  .app-footer {
    font-size: 11px;
    padding: 0 12px;
  }
}
</style>

<!-- el-drawer 会 teleport 到 body，抽屉内部样式必须用全局（非 scoped）样式 -->
<style lang="scss">
.mobile-drawer .el-drawer__body {
  padding: 0;
  background: #1a1a2e;
}

.mobile-drawer .aside-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .logo-text {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }
}

.mobile-drawer .aside-menu {
  border-right: none;
}
</style>
