<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// 平板/手机：技术路线步骤改为纵向排列
const isMobile = ref(window.innerWidth <= 992)
function updateIsMobile() {
  isMobile.value = window.innerWidth <= 992
}
onMounted(() => window.addEventListener('resize', updateIsMobile))
onBeforeUnmount(() => window.removeEventListener('resize', updateIsMobile))

// 行业痛点数据
const painPoints = [
  {
    title: '无标准财报，信用难识别',
    desc: '涉农主体普遍缺乏标准化财务报告，传统以财报为核心的风控手段难以覆盖，真实经营数据无法纳入信用评价。',
    icon: 'DocumentRemove',
    color: '#f56c6c',
  },
  {
    title: '缺抵押担保，融资难落地',
    desc: '多数涉农主体没有房产等“硬抵押”，土地经营权、农机具、生物资产等评估难、处置难，银行认可度低。',
    icon: 'Lock',
    color: '#e6a23c',
  },
  {
    title: '审批周期长，用款急难满足',
    desc: '涉农贷款审批仍以线下为主，与经营主体“短、频、急”的资金需求形成矛盾，优质商机常常错失。',
    icon: 'Timer',
    color: '#409eff',
  },
]

// 三大创新点数据
const advantages = [
  {
    number: '01',
    title: '模式创新',
    desc: '从“大而全的风控平台”转向“小而精的评估工具”，轻量化部署 + 极简交互，基层金融机构真正“用得起”。',
  },
  {
    number: '02',
    title: '模型创新',
    desc: '以 Logistic 回归评分卡为核心，结合 WOE 编码与业务阈值分级，信贷员“看得懂、讲得清”的可解释信用工具。',
  },
  {
    number: '03',
    title: '场景创新',
    desc: '专为东北涉农场景定制替代数据指标体系，将土地确权、农业补贴、农业保险等“沉睡数据”转化为信用资产。',
  },
]
</script>

<template>
  <div class="page-container">
    <!-- Hero 区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">涉农小微企业信贷风险智能评估系统</h1>
        <p class="hero-subtitle">用得起 · 看得懂 · 信得过 — 东北县域农商行的轻量化涉农信贷风控工具</p>
        <div class="hero-tags">
          <el-tag type="success" effect="dark" round>Logistic 评分卡</el-tag>
          <el-tag type="success" effect="dark" round>IV 特征筛选</el-tag>
          <el-tag type="success" effect="dark" round>WOE 编码</el-tag>
          <el-tag type="success" effect="dark" round>替代数据指标</el-tag>
        </div>
      </div>
    </section>

    <!-- 项目背景 -->
    <section class="section">
      <div class="section-header">
        <el-icon :size="24" color="#2c6e49"><WarningFilled /></el-icon>
        <h2>行业痛点</h2>
      </div>
      <el-row :gutter="20">
        <el-col v-for="pain in painPoints" :key="pain.title" :xs="24" :sm="12" :md="8">
          <div class="pain-card info-card">
            <el-icon :size="36" :color="pain.color" class="pain-icon">
              <component :is="pain.icon" />
            </el-icon>
            <h3>{{ pain.title }}</h3>
            <p>{{ pain.desc }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 解决方案 -->
    <section class="section">
      <div class="section-header">
        <el-icon :size="24" color="#2c6e49"><StarFilled /></el-icon>
        <h2>三大创新点</h2>
      </div>
      <el-row :gutter="20">
        <el-col v-for="adv in advantages" :key="adv.title" :xs="24" :sm="12" :md="8">
          <div class="advantage-card info-card">
            <div class="adv-number">{{ adv.number }}</div>
            <h3>{{ adv.title }}</h3>
            <p>{{ adv.desc }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 技术路线 -->
    <section class="section">
      <div class="section-header">
        <el-icon :size="24" color="#2c6e49"><Connection /></el-icon>
        <h2>技术路线（评分卡流程）</h2>
      </div>
      <div class="tech-flow info-card">
        <el-steps :active="5" :direction="isMobile ? 'vertical' : 'horizontal'" align-center>
          <el-step title="数据采集" description="四大维度15项替代数据指标" />
          <el-step title="特征筛选" description="IV值评估 / VIF共线性诊断" />
          <el-step title="WOE编码" description="连续变量分箱与证据权重转换" />
          <el-step title="Logistic建模" description="回归系数 → 0-1000分评分卡" />
          <el-step title="阈值分级" description="≥700低风险 / 500-700中 / <500高" />
          <el-step title="授信建议" description="额度匹配 / 扣分原因提示" />
        </el-steps>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HomeView',
}
</script>

<style scoped lang="scss">
.hero-section {
  background: linear-gradient(135deg, #1a1a2e 0%, #2c6e49 50%, #4c956c 100%);
  border-radius: 16px;
  padding: 60px 40px;
  text-align: center;
  margin-bottom: 32px;

  .hero-title {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
  }

  .hero-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 20px;
  }

  .hero-tags {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.section {
  margin-bottom: 36px;

  // 移动端卡片堆叠时保留纵向间距
  .el-row .el-col {
    margin-bottom: 16px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;

    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a2e;
    }
  }
}

.pain-card {
  text-align: center;
  padding: 32px 20px;
  height: 100%;

  .pain-icon {
    margin-bottom: 12px;
  }

  h3 {
    font-size: 16px;
    margin-bottom: 8px;
    color: #303133;
  }

  p {
    font-size: 13px;
    color: #909399;
    line-height: 1.7;
  }
}

.advantage-card {
  position: relative;
  padding: 32px 20px;
  height: 100%;

  .adv-number {
    position: absolute;
    top: 12px;
    right: 16px;
    font-size: 48px;
    font-weight: 800;
    color: rgba(44, 110, 73, 0.08);
  }

  h3 {
    font-size: 16px;
    margin-bottom: 8px;
    color: #303133;
  }

  p {
    font-size: 13px;
    color: #909399;
    line-height: 1.7;
  }
}

.tech-flow {
  padding: 40px 24px;

  @media (max-width: 768px) {
    padding: 20px 12px;
  }
}
</style>
