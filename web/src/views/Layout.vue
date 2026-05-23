<template>
  <div class="layout">
    <!-- PC端侧边栏 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-logo" v-if="!sidebarCollapsed">📝 AI刷题</span>
        <span class="sidebar-logo" v-else>📝</span>
      </div>
      <el-menu :default-active="activeMenu" router :collapse="sidebarCollapsed" background-color="#1a1a2e" text-color="#ccc" active-text-color="#e94560">
        <el-menu-item index="/index"><el-icon><Collection /></el-icon><span>题库</span></el-menu-item>
        <el-menu-item index="/quiz"><el-icon><EditPen /></el-icon><span>刷题</span></el-menu-item>
        <el-menu-item index="/review"><el-icon><Document /></el-icon><span>错题本</span></el-menu-item>
        <el-menu-item index="/upload"><el-icon><Upload /></el-icon><span>导入</span></el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <span class="user-info" v-if="!sidebarCollapsed">{{ username }}</span>
        <el-button link @click="handleLogout" style="color:#999"><el-icon><SwitchButton /></el-icon></el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 移动端顶部 -->
      <div class="mobile-header">
        <span class="mobile-title">📝 AI刷题</span>
        <span class="mobile-user">{{ username }}</span>
        <el-button link size="small" @click="handleLogout" style="color:#e94560">退出</el-button>
      </div>
      <div class="content-area">
        <router-view />
      </div>
    </div>

    <!-- 移动端底部导航 -->
    <div class="mobile-tabbar">
      <router-link to="/index" class="tab-item" :class="{ active: activeMenu === '/index' }">📚 题库</router-link>
      <router-link to="/quiz" class="tab-item" :class="{ active: activeMenu === '/quiz' }">✏️ 刷题</router-link>
      <router-link to="/review" class="tab-item" :class="{ active: activeMenu === '/review' }">📋 错题</router-link>
      <router-link to="/upload" class="tab-item" :class="{ active: activeMenu === '/upload' }">📄 导入</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)
const activeMenu = computed(() => '/' + (route.path.split('/')[1] || 'index'))
const username = computed(() => {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}').username || '用户' }
  catch { return '用户' }
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 220px; background: #1a1a2e; display: flex; flex-direction: column; transition: width 0.3s; flex-shrink: 0; }
.sidebar.collapsed { width: 64px; }
.sidebar-header { padding: 20px 16px; color: #fff; font-size: 20px; font-weight: bold; }
.sidebar-footer { padding: 12px 16px; border-top: 1px solid #333; display: flex; align-items: center; justify-content: space-between; }
.user-info { color: #ccc; font-size: 13px; }
.main-content { flex: 1; display: flex; flex-direction: column; background: #f5f5f5; overflow-y: auto; padding-bottom: 0; }
.mobile-header { display: none; background: #1a1a2e; color: #fff; padding: 12px 16px; align-items: center; justify-content: space-between; }
.mobile-title { font-size: 18px; font-weight: bold; }
.mobile-user { font-size: 13px; color: #ccc; }
.content-area { padding: 20px; max-width: 900px; margin: 0 auto; width: 100%; }
.mobile-tabbar { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #eee; padding: 6px 0; z-index: 100; }
.tab-item { flex: 1; text-align: center; color: #999; text-decoration: none; font-size: 12px; padding: 4px 0; }
.tab-item.active { color: #e94560; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-header { display: flex; }
  .mobile-tabbar { display: flex; }
  .content-area { padding: 16px; padding-bottom: 60px; max-width: 100%; }
}
</style>
