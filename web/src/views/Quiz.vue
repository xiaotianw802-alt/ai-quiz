<template>
  <div class="quiz-page">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-box">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载题目中...</span>
    </div>
    
    <!-- 答题结果 -->
    <div v-else-if="showResult" class="result-card">
      <div class="result-emoji">{{ quizResult.score >= 60 ? '🎉' : '💪' }}</div>
      <div class="result-score">{{ quizResult.correct }}/{{ quizResult.total }}</div>
      <div 
        class="result-text" 
        :style="{ color: quizResult.score >= 60 ? '#2e7d32' : '#e94560' }"
      >
        正确率 {{ quizResult.score }}%
      </div>
      <el-button type="primary" size="large" @click="retry">
        再来一轮
      </el-button>
    </div>
    
    <!-- 答题界面 -->
    <template v-else>
      <!-- 进度条和题数选择 -->
      <div class="progress-header">
        <el-progress 
          :percentage="Math.round((currentIndex + 1) / questions.length * 100)" 
          :stroke-width="8"
          class="progress-bar"
        />
        <el-dropdown @command="handleCountChange">
          <el-button size="small">
            {{ quizCountText }}<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="10">10 题</el-dropdown-item>
              <el-dropdown-item command="30">30 题</el-dropdown-item>
              <el-dropdown-item command="50">50 题</el-dropdown-item>
              <el-dropdown-item command="100">100 题</el-dropdown-item>
              <el-dropdown-item command="999">全部</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      
      <!-- 题目头部 -->
      <div class="q-header">
        <el-tag :type="getTypeTagType(currentQuestion?.type)" effect="dark">
          {{ typeTag }}
        </el-tag>
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
          :key="option.val"
          class="option-item"
          :class="{ 
            'option-selected': option.selected,
            'option-correct': questionState === 'confirmed' && feedback?.correctAnswer?.includes(option.val),
            'option-wrong': questionState === 'confirmed' && !feedback?.isCorrect && option.selected && !feedback?.correctAnswer?.includes(option.val)
          }"
          @click="selectAnswer(option.val)"
        >
          {{ option.text }}
        </div>
      </div>
      
      <!-- 填空/简答输入框 -->
      <div v-else class="fill-section">
        <el-input
          v-model="userAnswer"
          type="textarea"
          :rows="4"
          placeholder="请在此输入你的答案"
          maxlength="500"
          show-word-limit
          :disabled="questionState === 'confirmed'"
        />
      </div>
      
      <!-- 答题中操作按钮 -->
      <div v-if="questionState === 'answering'" class="action-buttons">
        <el-button 
          type="primary" 
          size="large" 
          class="submit-btn"
          @click="confirmAnswer"
        >
          确认答案
        </el-button>
        <el-button 
          v-if="currentIndex > 0" 
          size="large" 
          class="prev-btn"
          @click="goPrev"
        >
          上一题
        </el-button>
      </div>
      
      <!-- 答案反馈 -->
      <div v-if="questionState === 'confirmed' && feedback" class="feedback-box">
        <div 
          class="feedback-title"
          :class="feedback.isCorrect ? 'correct' : 'wrong'"
        >
          {{ feedback.isCorrect ? '✅ 回答正确！' : '❌ 回答错误' }}
        </div>
        <div v-if="!feedback.isCorrect" class="my-answer">
          你的答案：{{ feedback.myAnswer || '(未作答)' }}
        </div>
        <div class="correct-answer">
          正确答案：{{ feedback.correctAnswer }}
        </div>
        <div v-if="feedback.analysis" class="analysis">
          📖 {{ feedback.analysis }}
        </div>
        
        <el-button 
          type="primary" 
          size="large" 
          class="next-btn"
          @click="goNext"
        >
          {{ currentIndex >= questions.length - 1 ? '查看成绩' : '下一题' }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, ArrowDown } from '@element-plus/icons-vue'
import { quizApi, questionApi } from '../utils/api'

const route = useRoute()

const bankId = ref('')
const questions = ref([])
const currentIndex = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const userAnswer = ref('')
const questionState = ref('answering') // answering, confirmed
const feedback = ref(null)
const correctCount = ref(0)
const totalCount = ref(0)
const showResult = ref(false)
const quizResult = ref(null)
const loading = ref(true)
const typeTag = ref('')
const quizCount = ref(30)
const quizCountText = ref('30 题')

const typeNames = {
  single: '单选',
  multi: '多选',
  judge: '判断',
  fill: '填空',
  essay: '简答'
}

const getTypeTagType = (type) => {
  const types = {
    single: 'primary',
    multi: 'success',
    judge: 'warning',
    fill: 'info',
    essay: 'danger'
  }
  return types[type] || 'info'
}

const handleCountChange = (command) => {
  const counts = { '10': 10, '30': 30, '50': 50, '100': 100, '999': 999 }
  const texts = { '10': '10 题', '30': '30 题', '50': '50 题', '100': '100 题', '999': '全部' }
  quizCount.value = counts[command]
  quizCountText.value = texts[command]
  loadQuestions()
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const data = await quizApi.startQuiz(bankId.value, quizCount.value)
    if (!data || data.length === 0) {
      ElMessage.warning('题库为空')
      loading.value = false
      return
    }
    questions.value = data
    currentIndex.value = 0
    questionState.value = 'answering'
    userAnswer.value = ''
    feedback.value = null
    correctCount.value = 0
    totalCount.value = 0
    showResult.value = false
    updateCurrent()
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const updateCurrent = () => {
  const q = questions.value[currentIndex.value]
  if (!q) {
    currentQuestion.value = null
    currentOptions.value = []
    return
  }
  currentQuestion.value = q
  
  // 解析选项
  const options = q.options 
    ? q.options.split(/\r?\n/).filter(o => o.trim()) 
    : []
  
  currentOptions.value = options.map(opt => {
    const val = opt.slice(0, 1)
    const selected = q.type === 'multi' 
      ? (userAnswer.value || '').includes(val) 
      : userAnswer.value === val
    return { text: opt, val, selected }
  })
  
  typeTag.value = typeNames[q.type] || q.type
}

const selectAnswer = (val) => {
  if (questionState.value !== 'answering') return
  
  const q = currentQuestion.value
  if (!q) return
  
  if (q.type === 'multi') {
    let cur = userAnswer.value || ''
    if (cur.includes(val)) {
      cur = cur.replace(val, '')
    } else {
      cur += val
    }
    userAnswer.value = cur.split('').sort().join('')
  } else {
    userAnswer.value = val
  }
  
  updateCurrent()
}

const confirmAnswer = async () => {
  const q = currentQuestion.value
  if (!q) return
  
  const ans = userAnswer.value
  if (!ans && currentOptions.value.length > 0) {
    ElMessage.warning('请先选择答案')
    return
  }
  
  try {
    const r = await questionApi.checkAnswer(q.id, ans || '')
    feedback.value = {
      isCorrect: r.is_correct,
      myAnswer: ans,
      correctAnswer: r.answer,
      analysis: r.analysis
    }
    questionState.value = 'confirmed'
    if (r.is_correct) correctCount.value++
    totalCount.value++
  } catch (e) {
    ElMessage.error('判断失败')
  }
}

const goPrev = () => {
  if (currentIndex.value <= 0) return
  currentIndex.value--
  questionState.value = 'answering'
  userAnswer.value = ''
  feedback.value = null
  updateCurrent()
}

const goNext = () => {
  if (currentIndex.value >= questions.value.length - 1) {
    quizResult.value = {
      correct: correctCount.value,
      total: totalCount.value,
      score: totalCount.value > 0 ? Math.round(correctCount.value / totalCount.value * 100) : 0
    }
    showResult.value = true
    return
  }
  currentIndex.value++
  questionState.value = 'answering'
  userAnswer.value = ''
  feedback.value = null
  updateCurrent()
}

const retry = () => {
  showResult.value = false
  loadQuestions()
}

onMounted(() => {
  // 从localStorage获取题库ID
  const savedBankId = localStorage.getItem('quizBankId') || ''
  bankId.value = savedBankId
  loadQuestions()
})
</script>

<style scoped>
.quiz-page {
  max-width: 800px;
  margin: 0 auto;
}

.loading-box {
  text-align: center;
  padding: 60px;
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

.result-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
}

.result-emoji {
  font-size: 60px;
  margin-bottom: 20px;
}

.result-score {
  font-size: 48px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.result-text {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 30px;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
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
  margin-bottom: 20px;
}

.option-item {
  padding: 16px;
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 15px;
}

.option-item:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.option-selected {
  border-color: #667eea;
  background: #f5f7ff;
}

.option-correct {
  border-color: #4caf50;
  background: #e8f5e9;
}

.option-wrong {
  border-color: #f44336;
  background: #ffebee;
}

.fill-section {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.submit-btn,
.prev-btn {
  width: 100%;
}

.feedback-box {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: #f5f5f5;
}

.feedback-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
}

.feedback-title.correct {
  color: #2e7d32;
}

.feedback-title.wrong {
  color: #c62828;
}

.my-answer {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.correct-answer {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

.analysis {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

.next-btn {
  width: 100%;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .result-card {
    padding: 30px 20px;
  }
  
  .result-score {
    font-size: 36px;
  }
  
  .option-item {
    padding: 14px;
    font-size: 14px;
  }
}
</style>
