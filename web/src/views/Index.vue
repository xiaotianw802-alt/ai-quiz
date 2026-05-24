<template>
  <div class="index-page">
    <!-- 澶撮儴鍗＄墖 -->
    <div class="header-card">
      <div class="header-content" @click="showServerDialog = true">
        <h1>AI 鍒烽</h1>
        <p class="subtitle">鏅鸿兘瑙ｆ瀽 路 楂樻晥澶囪€?/p>
        <p class="server-hint">鐐瑰嚮鍒囨崲鏈嶅姟鍣?/p>
      </div>
      
      <!-- 缁熻淇℃伅 -->
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-num">{{ stats.total_q }}</div>
          <div class="stat-label">鎬婚閲?/div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-num">{{ stats.wrong_q }}</div>
          <div class="stat-label">閿欓鏁?/div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-num">{{ correctRate }}%</div>
          <div class="stat-label">姝ｇ‘鐜?/div>
        </div>
      </div>
    </div>
    
    <!-- 杩炴帴閿欒鎻愮ず -->
    <el-alert
      v-if="!connected && !loading"
      title="鍚庣鏈繛鎺?
      description="鐐瑰嚮涓婃柟鏍囬鍒囨崲鏈嶅姟鍣ㄥ湴鍧€"
      type="warning"
      show-icon
      :closable="false"
      class="warn-card"
    >
      <template #default>
        <el-button type="primary" size="small" @click="loadData">閲嶈瘯</el-button>
      </template>
    </el-alert>
    
    <!-- 鍔犺浇涓?-->
    <div v-if="loading" class="loading-box">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>鍔犺浇涓?..</span>
    </div>
    
    <!-- 棰樺簱鍒楄〃 -->
    <div v-else class="section">
      <div class="section-header">
        <h2 class="section-title">馃摎 鎴戠殑棰樺簱</h2>
        <el-button 
          v-if="banks.length === 0" 
          type="primary" 
          size="small" 
          @click="goToUpload"
        >
          + 瀵煎叆
        </el-button>
      </div>
      
      <!-- 绌虹姸鎬?-->
      <el-empty
        v-if="banks.length === 0 && connected"
        description="杩樻病鏈夐搴?
        class="empty-box"
      >
        <template #image>
          <div class="empty-icon">馃摥</div>
        </template>
        <p class="empty-desc">涓婁紶鏂囦欢锛孉I 鑷姩璇嗗埆棰樼洰</p>
        <el-button type="primary" @click="goToUpload">
          <el-icon><Document /></el-icon>
          瀵煎叆棰樺簱
        </el-button>
      </el-empty>
      
      <!-- 棰樺簱鍗＄墖鍒楄〃 -->
      <div class="bank-list">
        <el-card
          v-for="bank in banks"
          :key="bank.id"
          class="bank-card"
          shadow="hover"
        >
          <div class="bank-top">
            <div class="bank-avatar">{{ bank.name[0] }}</div>
            <div class="bank-info">
              <div class="bank-name">{{ bank.name }}</div>
              <div class="bank-meta">
                {{ bank.q_count }} 閬撻鐩?                <span v-if="bank.wrong_count > 0" class="wrong-count">
                  路 {{ bank.wrong_count }} 閬撻敊棰?                </span>
              </div>
            </div>
          </div>
          <div class="bank-actions">
            <el-button
              type="primary"
              class="bank-btn-start"
              @click="goQuiz(bank.id)"
            >
              <el-icon><VideoPlay /></el-icon>
              寮€濮嬪埛棰?            </el-button>
            <el-button
              class="bank-btn-wrong"
              @click="goWrong(bank.id)"
            >
              <el-icon><DocumentChecked /></el-icon>
              閿欓鏈瑊{ bank.wrong_count > 0 ? `(${bank.wrong_count})` : '' }}
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 鏈嶅姟鍣ㄨ缃璇濇 -->
    <el-dialog
      v-model="showServerDialog"
      title="鏈嶅姟鍣ㄨ缃?
      width="90%"
      :max-width="400"
    >
      <el-form>
        <el-form-item label="鏈嶅姟鍣ㄥ湴鍧€">
          <el-input
            v-model="serverUrl"
            placeholder="http://10.238.172.181:3000"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showServerDialog = false">鍙栨秷</el-button>
        <el-button type="primary" @click="setDefaultServer">鎭㈠榛樿</el-button>
        <el-button type="primary" @click="saveServer">纭畾</el-button>
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
    const [banksData, statsData] = await Promise.all([
      questionApi.getBanks(),
      questionApi.getStats()
    ])
    banks.value = banksData || []
    stats.value = statsData || { total_q: 0, wrong_q: 0 }
    connected.value = true
  } catch (e) {
    connected.value = false
    ElMessage.error('杩炴帴鏈嶅姟鍣ㄥけ璐?)
  } finally {
    loading.value = false
  }
}

const goQuiz = (bankId) => {
  localStorage.setItem('quizBankId', bankId)
  router.push('/quiz')
}

const goWrong = (bankId) => {
  router.push({ path: '/review', query: { bank_id: bankId } })
}

const deleteBank = async (bankId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个题库吗？', '提示', { type: 'warning' })
    await questionApi.deleteBank(bankId)
    ElMessage.success('题库已删除')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

const goToUpload = () => {
  router.push('/upload')
}

const saveServer = () => {
  localStorage.setItem('serverUrl', serverUrl.value)
  showServerDialog.value = false
  ElMessage.success('鏈嶅姟鍣ㄥ湴鍧€宸蹭繚瀛橈紝閲嶆柊鍔犺浇涓?..')
  setTimeout(() => {
    window.location.reload()
  }, 500)
}

const setDefaultServer = () => {
  serverUrl.value = 'http://10.238.172.181:3000'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.index-page {
  max-width: 800px;
  margin: 0 auto;
}

.header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  margin-bottom: 20px;
}

.header-content {
  text-align: center;
  margin-bottom: 20px;
  cursor: pointer;
}

.header-content h1 {
  font-size: 28px;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.8;
}

.server-hint {
  font-size: 12px;
  opacity: 0.5;
  margin-top: 4px;
}

.stats-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-num {
  font-size: 32px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.3);
}

.warn-card {
  margin-bottom: 20px;
}

.loading-box {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-icon {
  font-size: 40px;
  animation: rotating 2s linear infinite;
  margin-bottom: 10px;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.empty-box {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
}

.empty-desc {
  color: #999;
  margin-bottom: 20px;
}

.bank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bank-card {
  border-radius: 12px;
}

.bank-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.bank-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.bank-info {
  flex: 1;
}

.bank-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.bank-meta {
  font-size: 13px;
  color: #666;
}

.wrong-count {
  color: #e94560;
}

.bank-actions {
  display: flex;
  gap: 10px;
}

.bank-btn-start {
  flex: 1;
}

.bank-btn-wrong {
  flex: 1;
}

.bank-btn-delete {
  flex: 0 0 auto;
}

/* 绉诲姩绔€傞厤 */
@media (max-width: 768px) {
  .header-card {
    padding: 20px;
  }
  
  .header-content h1 {
    font-size: 24px;
  }
  
  .stat-num {
    font-size: 24px;
  }
  
  .bank-actions {
    flex-direction: column;
  }
}
</style>





