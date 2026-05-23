<template>
  <div class="review-page">
    <!-- 选择题库模式 -->
    <template v-if="mode === 'select'">
      <el-card class="header-card" :body-style="{ padding: '20px' }">
        <div class="header-content">
          <h2>📋 错题本</h2>
          <p class="subtitle">连续做对3次自动移出</p>
        </div>
      </el-card>
      
      <!-- 加载中 -->
      <div v-if="loading" class="loading-box">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      
      <!-- 无错题 -->
      <el-empty
        v-else-if="banks.length === 0"
        description="没有错题！"
        class="empty-box"
      >
        <template #image>
          <div class="empty-emoji">🎉</div>
        </template>
        <p class="empty-desc">去刷题吧~</p>
        <el-button type="primary" @click="goToQuiz">去刷题</el-button>
      </el-empty>
      
      <!-- 题库列表 -->
      <div v-else class="bank-list">
        <el-card
          v-for="bank in banks"
          :key="bank.id"
          class="bank-card"
          shadow="hover"
          @click="selectBank(bank.id)"
        >
          <div class="bank-content">
            <div class="bank-info">
              <div class="bank-name">{{ bank.name }}</div>
              <div class="bank-count wrong">{{ bank.wrong_count }} 道错题</div>
            </div>
            <el-icon class="bank-arrow"><ArrowRight /></el-icon>
          </div>
        </el-card>
      </div>
    </template>
    
    <!-- 浏览错题模式 -->
    <template v-else>
      <div class="review-header">
        <el-button 
          size="small" 
          @click="backToBanks"
          class="back-btn"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
      </div>
      
      <!-- 加载中 -->
      <div v-if="loading" class="loading-box">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      
      <!-- 无错题 -->
      <el-empty
        v-else-if="questions.length === 0"
        description="该题库没有错题"
        class="empty-box"
      >
        <template #image>
          <div class="empty-emoji">🎉</div>
        </template>
      </el-empty>
      
      <!-- 错题浏览 -->
      <template v-else>
        <!-- 进度条 -->
        <el-progress 
          :percentage="Math.round((currentIndex + 1) / questions.length * 100)" 
          :stroke-width="8"
          class="progress-bar"
        />
        
        <!-- 题目头部 -->
        <div class="q-header">
          <el-tag type="danger" effect="dark">错题</el-tag>
          <span class="q-number">{{ currentIndex + 1 }} / {{ questions.length }}</span>
        </div>
        
        <!-- 题目内容 -->
        <el-card class="q-card" v-if="currentQuestion">
          <div class="q-content">{{ currentQuestion.content }}</div>
        </el-card>
        
        <!-- 选项列表 -->
        <div v-if="currentOptions.length > 0" class="options-list">
          <div
            v-for="option in currentOptions"
            :key="option.text"
            class="option-item"
          >
            {{ option.text }}
          </div>
        </div>
        
        <!-- 查看答案按钮 -->
        <div class="show-answer-section">
          <el-button 
            type="primary" 
            plain
            @click="showAnswer = !showAnswer"
          >
            {{ showAnswer ? '隐藏答案' : '查看答案' }}
          </el-button>
        </div>
        
        <!-- 答案展示 -->
        <el-card v-if="showAnswer && currentQuestion" class="answer-box">
          <div class="answer-label">正确答案</div>
          <div class="answer-text">{{ currentQuestion.answer || '暂无' }}</div>
          <div v-if="currentQuestion.analysis" class="answer-analysis">
            📖 {{ currentQuestion.analysis }}
          </div>
        </el-card>
        
        <!-- 导航按钮 -->
        <div class="nav-buttons">
          <el-button 
            :disabled="currentIndex === 0"
            @click="prev"
          >
            上一题
          </el-button>
          <el-button 
            v-if="currentIndex === questions.length - 1"
            type="primary"
            @click="loadWrongQuestions"
          >
            刷新
          </el-button>
          <el-button 
            v-else
            type="primary"
            @click="next"
          >
            下一题
          </el-button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { questionApi } from '../utils/api'

const route = useRoute()
const router = useRouter()

const mode = ref('select') // select, review
const banks = ref([])
const bankId = ref('')
const questions = ref([])
const currentIndex = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const showAnswer = ref(false)
const loading = ref(true)

const loadBanks = async () => {
  loading.value = true
  try {
    const data = await questionApi.getBanks()
    // 只显示有错题的题库
    banks.value = (data || []).filter(b => b.wrong_count > 0)
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const selectBank = (id) => {
  bankId.value = id
  mode.value = 'review'
  loadWrongQuestions()
}

const loadWrongQuestions = async () => {
  loading.value = true
  try {
    const data = await questionApi.getWrongQuestions(bankId.value, 30)
    if (!data || data.length === 0) {
      mode.value = 'select'
      loadBanks()
      return
    }
    questions.value = data
    currentIndex.value = 0
    showAnswer.value = false
    updateCurrent()
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const backToBanks = () => {
  mode.value = 'select'
  loadBanks()
}

const updateCurrent = () => {
  const q = questions.value[currentIndex.value]
  if (!q) {
    currentQuestion.value = null
    currentOptions.value = []
    return
  }
  currentQuestion.value = q
  const options = q.options 
    ? q.options.split(/\r?\n/).filter(o => o.trim()).map(o => ({ text: o })) 
    : []
  currentOptions.value = options
}

const prev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    showAnswer.value = false
    updateCurrent()
  }
}

const next = () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    showAnswer.value = false
    updateCurrent()
  }
}

const goToQuiz = () => {
  router.push('/quiz')
}

onMounted(() => {
  // 如果有bank_id参数，直接进入错题浏览模式
  if (route.query.bank_id) {
    bankId.value = route.query.bank_id
    mode.value = 'review'
    loadWrongQuestions()
  } else {
    loadBanks()
  }
})
</script>

<style scoped>
.review-page {
  max-width: 800px;
  margin: 0 auto;
}

.header-card {
  background: linear-gradient(135deg, #c62828 0%, #e94560 100%);
  color: #fff;
  border: none;
  margin-bottom: 16px;
}

.header-content h2 {
  margin: 0 0 6px 0;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  opacity: 0.7;
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

.empty-box {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
}

.empty-emoji {
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
  cursor: pointer;
  border-radius: 12px;
}

.bank-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bank-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.bank-count {
  font-size: 13px;
}

.bank-count.wrong {
  color: #e94560;
}

.bank-arrow {
  font-size: 20px;
  color: #999;
}

.review-header {
  margin-bottom: 16px;
}

.back-btn {
  font-size: 13px;
}

.progress-bar {
  margin-bottom: 16px;
}

.q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.q-number {
  color: #666;
  font-size: 14px;
}

.q-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.q-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.option-item {
  padding: 16px;
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
}

.show-answer-section {
  text-align: right;
  margin-bottom: 16px;
}

.answer-box {
  border-radius: 12px;
  margin-bottom: 16px;
  background: #f5f5f5;
}

.answer-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.answer-text {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
}

.answer-analysis {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .option-item {
    padding: 14px;
    font-size: 14px;
  }
}
</style>
