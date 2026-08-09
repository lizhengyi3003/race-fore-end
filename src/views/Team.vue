<!--
  团队介绍页：指导教师、团队成员与团队公约展示（静态数据）。
-->
<script setup lang="ts">
interface TeamMember {
  name: string
  role: string
  roleTag: string
  desc: string
}

/** 角色标签 → Element Plus tag 颜色映射（避免模板嵌套三元） */
const ROLE_TAG_TYPES: Record<string, 'danger' | 'primary' | 'success' | 'warning' | 'info'> = {
  负责人: 'danger',
  技术: 'primary',
  金融: 'success',
  数据: 'warning',
  农业: 'success',
  文稿: 'info',
  辅助: 'warning',
}

function roleTagType(roleTag: string) {
  return ROLE_TAG_TYPES[roleTag] || 'info'
}

const members: TeamMember[] = [
  {
    name: '廖子龙',
    role: '项目总负责人 / 数学组首席建模手',
    roleTag: '负责人',
    desc: '金融学202505班。项目发起创始人、首席建模负责人，统筹团队整体工作，搭建涉农信贷统计模型框架，对接指导教师，统筹商业计划书与答辩筹备全流程。',
  },
  {
    name: '李峥熠',
    role: '工具组核心成员',
    roleTag: '技术',
    desc: '计算机202506班。负责前端开发与全链路部署：搭建 Vue3 演示前端、封装评估 API，配置服务器与 Cloudflare 站点，完成前后端联调与项目上线。',
  },
  {
    name: '何依暘',
    role: '金融场景核心成员',
    roleTag: '金融',
    desc: '投资学202501班。负责金融业务逻辑、风控方案设计，开展行业调研分析，完成场景论证。',
  },
  {
    name: '樊子逸',
    role: '数学组数据助理',
    roleTag: '数据',
    desc: '信科202404班。承担调研数据清洗、数值运算工作，协助首席建模手开展指标检验、实证分析，支撑统计模型稳定运行。',
  },
  {
    name: '隆泓宇',
    role: '农业场景核心成员',
    roleTag: '农业',
    desc: '智慧农业202502班。聚焦东北涉农产业，开展实地产业调研；搭建农业产业场景素材库，挖掘涉农经营主体融资痛点。',
  },
  {
    name: '胡雯焘',
    role: '金融场景成员',
    roleTag: '金融',
    desc: '投资学202501班。协助金融研究、资料整理，配合完成场景论证。',
  },
  {
    name: '贺彦端',
    role: '工具组数据质检员',
    roleTag: '技术',
    desc: '大数据202406班。协助开展代码测试、异常数据处理、数据接口封装；整理技术素材，配合完成系统调试。',
  },
  {
    name: '李思琪',
    role: '金融组辅助成员',
    roleTag: '金融',
    desc: '金融学202505班。搜集金融行业资料、政策文献、市场案例；协助访谈调研，补充完善金融板块文字材料。',
  },
  {
    name: '梁琳',
    role: '农业组辅助成员',
    roleTag: '农业',
    desc: '智慧农业202502班。负责问卷发放、问卷信息汇总整理；收集涉农产业资料，协助农业场景核心成员开展调研。',
  },
  {
    name: '金杨羽立',
    role: '文稿政策分析师',
    roleTag: '文稿',
    desc: '工商管理202403班。统筹商业计划书撰写、全套竞赛 PPT 设计美化、申报材料整理；梳理东北振兴相关政策文献。',
  },
  {
    name: '肖裕玲',
    role: '全局辅助员',
    roleTag: '辅助',
    desc: '负责跨组协调与全局辅助工作，协助资料整理、会议记录与赛事材料汇总，为各小组提供支持。',
  },
]

const advisors = [
  {
    name: '谭晶桦',
    title: '指导教师',
    desc: '四川农业大学经济学院讲师，博士毕业于西南财经大学金融学专业，研究方向为金融智能与金融风险管理，参与多项国家级课题。',
  },
]

const conventions = [
  {
    title: '例会制度',
    desc: '每周召开项目例会，主动同步项目进度，按时保质完成分配任务。',
  },
  {
    title: '知识产权',
    desc: '项目全部知识产权、调研素材、方案成果归属团队共有，未经团队许可，不得私自对外传播。',
  },
  {
    title: '动态贡献评定',
    desc: '成员最终贡献排序不永久固定，将根据赛事全过程实际投入、任务完成质量、创新产出动态调整。',
  },
  {
    title: '争议解决',
    desc: '成员如对贡献认定存在异议，可向项目负责人提交材料申请贡献复议，最终由指导导师裁定。',
  },
]
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>数字涉农金融科创队 · 四川农业大学</h1>
      <p>跨学科融合团队，覆盖金融学、数理统计与计算机技术 · "挑战杯"创业计划竞赛（东北振兴产业升级专项赛）</p>
    </div>

    <!-- 团队宣言 -->
    <section class="team-motto info-card">
      <el-icon :size="28" color="#2c6e49"><Sunny /></el-icon>
      <h2>以数理之光，照亮乡村金融之路</h2>
      <p>
        我们是一支由金融学、统计学、计算机科学等多学科背景成员组成的复合型团队。
        致力于运用多元统计模型破解涉农小微企业信贷难题，让金融活水精准滴灌田间地头， 为东北乡村振兴贡献青春力量。
      </p>
    </section>

    <!-- 导师信息 -->
    <section class="section">
      <div class="section-header">
        <el-icon :size="22" color="#2c6e49"><Medal /></el-icon>
        <h2>指导教师</h2>
      </div>
      <el-row :gutter="20">
        <el-col v-for="advisor in advisors" :key="advisor.name" :xs="24" :sm="12" :md="8">
          <div class="advisor-card info-card">
            <el-avatar :size="72" icon="UserFilled" />
            <h3>{{ advisor.name }}</h3>
            <el-tag size="small" type="success">{{ advisor.title }}</el-tag>
            <p class="advisor-desc">{{ advisor.desc }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 团队成员 -->
    <section class="section">
      <div class="section-header">
        <el-icon :size="22" color="#2c6e49"><UserFilled /></el-icon>
        <h2>团队成员（共 {{ members.length }} 人）</h2>
      </div>
      <el-row :gutter="16">
        <el-col
          v-for="member in members"
          :key="member.name"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          style="margin-bottom: 16px"
        >
          <div class="member-card info-card">
            <el-avatar :size="56" icon="UserFilled" class="member-avatar" />
            <h3 class="member-name">{{ member.name }}</h3>
            <el-tag :type="roleTagType(member.roleTag)" size="small" effect="dark">
              {{ member.roleTag }}
            </el-tag>
            <p class="member-role">{{ member.role }}</p>
            <p class="member-desc">{{ member.desc }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- 团队公约 -->
    <section class="section">
      <div class="section-header">
        <el-icon :size="22" color="#2c6e49"><Document /></el-icon>
        <h2>团队公约</h2>
      </div>
      <div class="info-card convention-card">
        <el-timeline>
          <el-timeline-item
            v-for="(item, idx) in conventions"
            :key="idx"
            :timestamp="item.title"
            placement="top"
            :color="'#2c6e49'"
          >
            <p>{{ item.desc }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.team-motto {
  text-align: center;
  padding: 40px 24px;
  margin-bottom: 36px;

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #1a1a2e;
    margin: 16px 0 12px;
  }

  p {
    font-size: 14px;
    color: #606266;
    line-height: 1.8;
    max-width: 700px;
    margin: 0 auto;
  }
}

.section {
  margin-bottom: 36px;

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
    }
  }
}

.advisor-card {
  text-align: center;
  padding: 32px 20px;

  h3 {
    font-size: 15px;
    margin: 14px 0 8px;
    color: #303133;
  }

  .advisor-desc {
    font-size: 12px;
    color: #909399;
    line-height: 1.7;
    margin-top: 12px;
    text-align: left;
  }
}

.member-card {
  text-align: center;
  padding: 24px 16px;
  height: 100%;

  .member-avatar {
    margin-bottom: 12px;
  }

  .member-name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }

  .member-role {
    font-size: 12px;
    color: #909399;
    margin-top: 8px;
    margin-bottom: 6px;
  }

  .member-desc {
    font-size: 12px;
    color: #b0b3bb;
    line-height: 1.6;
  }
}

.convention-card {
  padding: 32px 40px;
}
</style>
