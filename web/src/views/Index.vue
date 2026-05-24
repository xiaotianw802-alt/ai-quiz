<template>
  <div class="index-page">
    <div class="header-card">
      <div class="header-content" @click="showServerDialog = true">
        <h1>AI 刷题</h1>
        <p class="subtitle">智能解析 · 高效备考</p>
        <p class="server-hint">点击切换服务器</p>
      </div>
      
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-num">{{ stats.total_q }}</div>
          <div class="stat-label">总题量</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-num">{{ stats.wrong_q }}</div>
          <div class="stat-label">错题数</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-num">{{ correctRate }}%</div>
          <div class="stat-label">正确率</div>
        </div>
      </div>
    </div>
    
    <el-alert
      v-if="!connected && !loading"
      title="后端未连接"
      description="点击上方标题切换服务器地址"
      type="warning"
      show-icon
      :closable="false"
      class="warn-card"
    >
      <template #default>
        <el-button type="primary" size="small" @click="loadData">重试</el-button>
      </template>
    </el-alert>
    
    <div v-if="loading" class="loading-box">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    
    <div v-else class="section">
      <div class="section-header">
        <h2 class="section-title">📚 我的题库</h2>
        <el-button v-if="banks.length === 0" type="primary" size="small" @click="goToUpload">+ 导入</el-button>
      </div>
      
      <el-empty v-if="banks.length === 0 && connected" description="还没有题库" class="empty-box">
        <template #image><div class="empty-icon">📄</div></template>
        <p class="empty-desc">上传文件，AI 自动识别题目</p>
        <el-button type="primary" @click="goToUpload"><el-icon><Document /></el-icon>导入题库</el-button>
      </el-empty>
      
      <div class="bank-list">
        <el-card v-for="bank in banks" :key="bank.id" class="bank-card" shadow="hover">
          <div class="bank-top">
            <div class="bank-avatar">{{ bank.name[0] }}</div>
            <div class="bank-info">
              <div class="bank-name">{{ bank.name }}</div>
              <div class="bank-meta">
                {{ bank.q_count }} 道题目
                <span v-if="bank.wrong_count > 0" class="wrong-count">· {{ bank.wrong_count }} 道错题</span>
              </div>
            </div>
          </div>
          <div class="bank-actions">
            <el-button type="primary" class="bank-btn-start" @click="goQuiz(bank.id)">
              <el-icon><VideoPlay /></el-icon>开始刷题
            </el-button>
            <el-button class="bank-btn-wrong" @click="goWrong(bank.id)">
              <el-icon><DocumentChecked /></el-icon>错题本{{ bank.wrong_count > 0 ? `(${bank.wrong_count})` : '' }}
            </el-button>
            <el-button type="danger" class="bank-btn-delete" @click="deleteBank(bank.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
    
    <el-dialog v-model="showServerDialog" title="服务器设置" width="90%" :style="{ maxWidth: '400px' }">
      <el-form>
        <el-form-item label="服务器地址">
          <el-input v-model="serverUrl" placeholder="http://10.238.172.181:3000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showServerDialog = false">取消</el-button>
        <el-button type="primary" @click="setDefaultServer">恢复默认</el-button>
        <el-button type="primary" @click="saveServer">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, VideoPlay, DocumentChecked, Document, Delete } from '@element-plus/icons-vue'
import { questionApi } from '../utils/api'

const router = useRouter()
const banks = ref([])
const stats = ref({ total_q: 0, wrong_q: 0 })
const loading = ref(true)
const connected = ref(true)
const showServerDialog = ref(false)
const serverUrl = ref(localStorage.getItem('serverUrl') || 'http://10.238.172.181:3000')

const correctRate = computed(() => {
  const total = stats.value.total_q || 0
  const wrong = stats.value.wrong_q || 0
  return total > 0 ? Math.round((total - wrong) / total * 100) : 0
})

const loadData = async () => {
  loading.value = true
  try {
    const [banksData, statsData] = await Promise.all([questionApi.getBanks(), questionApi.getStats()])
    banks.value = banksData || []
    stats.value = statsData || { total_q: 0, wrong_q: 0 }
    connected.value = true
  } catch (e) { connected.value = false; ElMessage.error('连接服务器失败') }
  finally { loading.value = false }
}

const goQuiz = (bankId) => { localStorage.setItem('quizBankId', bankId); router.push('/quiz') }
const goWrong = (bankId) => { router.push({ path: '/review', query: { bank_id: bankId } }) }

const deleteBank = async (bankId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个题库吗？', '提示', { type: 'warning' })
    await questionApi.deleteBank(bankId)
    ElMessage.success('题库已删除')
    loadData()
  } catch (e) { if (e !== 'cancel') ElMessage.error(e.message || '删除失败') }
}

const goToUpload = () => { router.push('/upload') }
const saveServer = () => {
  localStorage.setItem('serverUrl', serverUrl.value)
  showServerDialog.value = false
  ElMessage.success('服务器地址已保存，重新加载中...')
  setTimeout(() => { window.location.reload() }, 500)
}
const setDefaultServer = () => { serverUrl.value = 'http://10.238.172.181:3000' }
onMounted(() => { loadData() })
</script>

<style scoped>
.index-page { max-width: 800px; margin: 0 auto; }
.header-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 24px; color: #fff; margin-bottom: 20px; }
.header-content { text-align: center; margin-bottom: 20px; cursor: pointer; }
.header-content h1 { font-size: 28px; margin-bottom: 4px; }
.subtitle { font-size: 14px; opacity: 0.8; }
.server-hint { font-size: 12px; opacity: 0.5; margin-top: 4px; }
.stats-row { display: flex; justify-content: center; align-items: center; gap: 20px; }
.stat-item { text-align: center; }
.stat-num { font-size: 32px; font-weight: bold; }
.stat-label { font-size: 12px; opacity: 0.8; margin-top: 4px; }
.stat-divider { width: 1px; height: 40px; background: rgba(255, 255, 255, 0.3); }
.warn-card { margin-bottom: 20px; }
.loading-box { text-align: center; padding: 40px; color: #666; }
.loading-icon { font-size: 40px; animation: rotating 2s linear infinite; margin-bottom: 10px; }
@keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.section { margin-top: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 18px; font-weight: bold; color: #333; }
.empty-box { background: #fff; border-radius: 12px; padding: 40px; }
.empty-icon { font-size: 60px; margin-bottom: 16px; }
.empty-desc { color: #999; margin-bottom: 20px; }
.bank-list { display: flex; flex-direction: column; gap: 12px; }
.bank-card { border-radius: 12px; }
.bank-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.bank-avatar { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
.bank-info { flex: 1; }
.bank-name { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 4px; }
.bank-meta { font-size: 13px; color: #666; }
.wrong-count { color: #e94560; }
.bank-actions { display: flex; gap: 10px; }
.bank-btn-start { flex: 1; }
.bank-btn-wrong { flex: 1; }
.bank-btn-delete { flex: 0 0 auto; }
@media (max-width: 768px) {
  .header-card { padding: 20px; }
  .header-content h1 { font-size: 24px; }
  .stat-num { font-size: 24px; }
  .bank-actions { flex-wrap: wrap; }
  .bank-btn-start, .bank-btn-wrong { flex: 1 1 45%; }
  .bank-btn-delete { flex: 1 1 100%; }
}
</style>
