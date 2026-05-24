<template>
  <div class="quiz-page">
    <!-- 鍔犺浇涓?-->
    <div v-if="loading" class="loading-box">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>鍔犺浇棰樼洰涓?..</span>
    </div>
    
    <!-- 绛旈缁撴灉 -->
    <div v-else-if="showResult" class="result-card">
      <div class="result-emoji">{{ quizResult.score >= 60 ? '馃帀' : '馃挭' }}</div>
      <div class="result-score">{{ quizResult.correct }}/{{ quizResult.total }}</div>
      <div 
        class="result-text" 
        :style="{ color: quizResult.score >= 60 ? '#2e7d32' : '#e94560' }"
      >
        姝ｇ‘鐜?{{ quizResult.score }}%
      </div>
      <el-button type="primary" size="large" @click="retry">
        鍐嶆潵涓€杞?      </el-button>
    </div>
    
    <!-- 绛旈鐣岄潰 -->
    <template v-else>
      <!-- 杩涘害鏉″拰棰樻暟閫夋嫨 -->
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
              <el-dropdown-item command="10">10 棰?/el-dropdown-item>
              <el-dropdown-item command="30">30 棰?/el-dropdown-item>
              <el-dropdown-item command="50">50 棰?/el-dropdown-item>
              <el-dropdown-item command="100">100 棰?/el-dropdown-item>
              <el-dropdown-item command="999">鍏ㄩ儴</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      
      <!-- 棰樼洰澶撮儴 -->
      <div class="q-header">
        <el-tag :type="getTypeTagType(currentQuestion?.type)" effect="dark">
          {{ typeTag }}
        </el-tag>
        <span class="q-number">{{ currentIndex + 1 }} / {{ questions.length }}</span>
      </div>
      
      <!-- 棰樼洰鍐呭 -->
      <el-card class="q-card" v-if="currentQuestion">
        <div class="q-content">{{ currentQuestion.content }}</div>
      </el-card>
      
      <!-- 閫夐」鍒楄〃 -->
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
      
      <!-- 濉┖/绠€绛旇緭鍏ユ -->
      <div v-else class="fill-section">
        <el-input
          v-model="userAnswer"
          type="textarea"
          :rows="4"
          placeholder="璇峰湪姝よ緭鍏ヤ綘鐨勭瓟妗?
          maxlength="500"
          show-word-limit
          :disabled="questionState === 'confirmed'"
        />
      </div>
      
      <!-- 绛旈涓搷浣滄寜閽?-->
      <div v-if="questionState === 'answering'" class="action-buttons">
        <el-button 
          type="primary" 
          size="large" 
          class="submit-btn"
          @click="confirmAnswer"
        >
          纭绛旀
        </el-button>
        <el-button 
          v-if="currentIndex > 0" 
          size="large" 
          class="prev-btn"
          @click="goPrev"
        >
          涓婁竴棰?        </el-button>
      </div>
      
      <!-- 绛旀鍙嶉 -->
      <div v-if="questionState === 'confirmed' && feedback" class="feedback-box">
        <div 
          class="feedback-title"
          :class="feedback.isCorrect ? 'correct' : 'wrong'"
        >
          {{ feedback.isCorrect ? '鉁?鍥炵瓟姝ｇ‘锛? : '鉂?鍥炵瓟閿欒' }}
        </div>
        <div v-if="!feedback.isCorrect" class="my-answer">
          浣犵殑绛旀锛歿{ feedback.myAnswer || '(鏈綔绛?' }}
        </div>
        <div class="correct-answer">
          姝ｇ‘绛旀锛歿{ feedback.correctAnswer }}
        </div>
        <div v-if="feedback.analysis" class="analysis">
          馃摉 {{ feedback.analysis }}
        </div>
        
        <el-button 
          type="primary" 
          size="large" 
          class="next-btn"
          @click="goNext"
        >
          {{ currentIndex >= questions.length - 1 ? '鏌ョ湅鎴愮哗' : '涓嬩竴棰? }}
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
const quizCountText = ref('30 棰?)

const typeNames = {
  single: '鍗曢€?,
  multi: '澶氶€?,
  judge: '鍒ゆ柇',
  fill: '濉┖',
  essay: '绠€绛?
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
  const texts = { '10': '10 棰?, '30': '30 棰?, '50': '50 棰?, '100': '100 棰?, '999': '鍏ㄩ儴' }
  quizCount.value = counts[command]
  quizCountText.value = texts[command]
  loadQuestions()
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const data = await quizApi.start(bankId.value, quizCount.value)
    if (!data || data.length === 0) {
      ElMessage.warning('棰樺簱涓虹┖')
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
    ElMessage.error('鍔犺浇澶辫触')
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
  
  // 瑙ｆ瀽閫夐」
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
    ElMessage.warning('璇峰厛閫夋嫨绛旀')
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
    ElMessage.error('鍒ゆ柇澶辫触')
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
  // 浠巐ocalStorage鑾峰彇棰樺簱ID
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

/* 绉诲姩绔€傞厤 */
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
