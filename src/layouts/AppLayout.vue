<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)

const activeMenu = computed(() => {
  return route.path
})

const userLabel = computed(() => authStore.displayName || authStore.user?.username || '')

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function navigateTo(path: string) {
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
</script>

<template>
  <el-container class="app-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="app-aside">
      <div class="aside-header">
        <el-icon :size="28" color="#fff" class="logo-icon">
          <TrendCharts />
        </el-icon>
        <span v-show="!isCollapsed" class="logo-text">涉农风控系统</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :router="false"
        background-color="#1a1a2e"
        text-color="#bfcbd9"
        active-text-color="#4c956c"
        class="aside-menu"
        @select="navigateTo"
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>项目介绍</span>
        </el-menu-item>
        <el-menu-item index="/input">
          <el-icon><Edit /></el-icon>
          <span>数据录入</span>
        </el-menu-item>
        <el-menu-item index="/result">
          <el-icon><DataAnalysis /></el-icon>
          <span>评估结果</span>
        </el-menu-item>
        <el-menu-item index="/dashboard">
          <el-icon><PieChart /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/team">
          <el-icon><UserFilled /></el-icon>
          <span>团队介绍</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主体区域 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="app-header">
        <div class="header-left">
          <el-icon class="collapse-btn" :size="22" @click="toggleCollapse">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <span class="header-title">基于多元统计模型的涉农小微企业信贷风险智能评估系统</span>
        </div>
        <div class="header-right">
          <el-tag type="success" effect="dark" round>Demo v1.0</el-tag>
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
        <span>© 2026 涉农信贷风控系统 · "挑战杯"创业计划竞赛 · 东北乡村振兴</span>
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
</style>
