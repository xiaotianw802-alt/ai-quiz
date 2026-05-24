<template>
  <div class="quiz-page">
    <div v-if="loading" class="loading-box">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载题目中...</span>
    </div>
    
    <div v-else-if="showResult" class="result-card">
      <div class="result-emoji">{{ quizResult.score >= 60 ? '🎉' : '💭' }}</div>
      <div class="result-score">{{ quizResult.correct }}/{{ quizResult.total }}</div>
      <div class="result-text" :style="{ color: quizResult.score >= 60 ? '#2e7d32' : '#e94560' }">
        正确率 {{ quizResult.score }}%
      </div>
      <el-button type="primary" size="large" @click="retry">再来一轮</el-button>
      <el-button link @click="continueQuiz" v-if="hasUnfinished">继续上次进度</el-button>
    </div>
    
    <template v-else>
      <div class="progress-header">
        <el-progress :percentage="Math.round((currentIndex + 1) / questions.length * 100)" :stroke-width="8" class="progress-bar" />
        <el-dropdown @command="handleCountChange">
          <el-button size="small">{{ quizCountText }}<el-icon><ArrowDown /></el-icon></el-button>
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
      
      <div class="q-header">
        <el-tag :type="getTypeTagType(currentQuestion?.type)" effect="dark">{{ typeTag }}</el-tag>
        <span class="q-number">{{ currentIndex + 1 }} / {{ questions.length }}</span>
        <el-button v-if="questionState === 'answering'" link size="small" @click="saveAndExit">保存退出</el-button>
      </div>
      
      <el-card class="q-card" v-if="currentQuestion">
        <div class="q-content">{{ currentQuestion.content }}</div>
      </el-card>
      
      <div v-if="currentOptions.length > 0" class="options-list">
        <div v-for="option in currentOptions" :key="option.val" class="option-item"
          :class="{
            'option-selected': option.selected,
            'option-correct': questionState === 'confirmed' && feedback?.correctAnswer?.includes(option.val),
            'option-wrong': questionState === 'confirmed' && !feedback?.isCorrect && option.selected && !feedback?.correctAnswer?.includes(option.val)
          }"
          @click="selectAnswer(option.val)">
          {{ option.text }}
        </div>
      </div>
      
      <div v-else class="fill-section">
        <el-input v-model="userAnswer" type="textarea" :rows="4" placeholder="请在此输入你的答案" maxlength="500" show-word-limit :disabled="questionState === 'confirmed'" />
      </div>
      
      <div v-if="questionState === 'answering'" class="action-buttons">
        <el-button type="primary" size="large" class="submit-btn" @click="confirmAnswer">确认答案</el-button>
        <el-button v-if="currentIndex > 0" size="large" class="prev-btn" @click="goPrev">上一题</el-button>
      </div>
      
      <div v-if="questionState === 'confirmed' && feedback" class="feedback-box">
        <div class="feedback-title" :class="feedback.isCorrect === true ? 'correct' : feedback.isCorrect === false ? 'wrong' : 'unknown'">
          {{ feedback.isCorrect === true ? '✅ 回答正确！' : feedback.isCorrect === false ? '❌ 回答错误' : '答案待确认' }}
        </div>
        <div v-if="!feedback.isCorrect && feedback.isCorrect !== null" class="my-answer">你的答案：{{ feedback.myAnswer || '(未作答)' }}</div>
        
        <!-- 显示正确答案或补充答案按钮 -->
        <div v-if="feedback.hasAnswer" class="correct-answer">正确答案：{{ feedback.correctAnswer }}</div>
        <div v-else class="no-answer-box">
          <el-alert type="warning" :closable="false" show-icon>
            <template #title>本题暂无答案</template>
          </el-alert>
          <div class="add-answer-section">
            <el-input v-model="newAnswer" placeholder="请输入正确答案" size="small" style="margin-bottom: 8px;" />
            <el-input v-model="newAnalysis" type="textarea" :rows="2" placeholder="请输入解析（可选）" size="small" style="margin-bottom: 8px;" />
            <el-button type="primary" size="small" @click="submitNewAnswer">提交答案</el-button>
          </div>
        </div>
        
        <!-- 原有解析 -->
        <div v-if="feedback.analysis" class="analysis">
          <div class="analysis-title">📖 题目解析</div>
          {{ feedback.analysis }}
        </div>
        
        <!-- AI解析 -->
        <div v-if="aiExplanation" class="ai-explanation">
          <div class="ai-title">🤖 AI 智能解析</div>
          <div class="ai-content">{{ aiExplanation }}</div>
        </div>
        <div v-else-if="loadingAI" class="ai-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>AI 正在解析...</span>
        </div>
        <el-button v-else type="info" size="small" @click="getAIExplanation" class="ai-btn">
          <el-icon><MagicStick /></el-icon> 获取 AI 解析
        </el-button>
        
        <el-button type="primary" size="large" class="next-btn" @click="goNext">
          {{ currentIndex >= questions.length - 1 ? '查看成绩' : '下一题' }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, ArrowDown, MagicStick } from '@element-plus/icons-vue'
import { quizApi, questionApi } from '../utils/api'

const route = useRoute()
const bankId = ref('')
const questions = ref([])
const currentIndex = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const userAnswer = ref('')
const questionState = ref('answering')
const feedback = ref(null)
const correctCount = ref(0)
const totalCount = ref(0)
const showResult = ref(false)
const quizResult = ref(null)
const loading = ref(true)
const typeTag = ref('')
const quizCount = ref(30)
const quizCountText = ref('30 题')
const hasUnfinished = ref(false)

// 新增：补充答案
const newAnswer = ref('')
const newAnalysis = ref('')

// 新增：AI解析
const aiExplanation = ref('')
const loadingAI = ref(false)

const typeNames = { single: '单选', multi: '多选', judge: '判断', fill: '填空', essay: '简答' }

const getTypeTagType = (type) => ({ single: 'primary', multi: 'success', judge: 'warning', fill: 'info', essay: 'danger' }[type] || 'info')

const handleCountChange = (command) => {
  const counts = { '10': 10, '30': 30, '50': 50, '100': 100, '999': 999 }
  const texts = { '10': '10 题', '30': '30 题', '50': '50 题', '100': '100 题', '999': '全部' }
  quizCount.value = counts[command]
  quizCountText.value = texts[command]
  loadQuestions()
}

const saveProgress = () => {
  const progress = {
    bankId: bankId.value,
    currentIndex: currentIndex.value,
    questions: questions.value,
    correctCount: correctCount.value,
    totalCount: totalCount.value,
    timestamp: Date.now()
  }
  localStorage.setItem('quizProgress', JSON.stringify(progress))
}

const loadProgress = () => {
  const saved = localStorage.getItem('quizProgress')
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch { return null }
}

const clearProgress = () => {
  localStorage.removeItem('quizProgress')
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const saved = loadProgress()
    if (saved && saved.bankId === bankId.value && saved.questions && saved.questions.length > 0) {
      questions.value = saved.questions
      currentIndex.value = saved.currentIndex
      correctCount.value = saved.correctCount
      totalCount.value = saved.totalCount
      hasUnfinished.value = true
      ElMessage.success('已恢复上次进度')
    } else {
      const data = await quizApi.start(bankId.value, quizCount.value)
      if (!data || data.length === 0) {
        ElMessage.warning('题库为空')
        loading.value = false
        return
      }
      questions.value = data
      currentIndex.value = 0
      correctCount.value = 0
      totalCount.value = 0
      hasUnfinished.value = false
      clearProgress()
    }
    
    questionState.value = 'answering'
    userAnswer.value = ''
    feedback.value = null
    newAnswer.value = ''
    newAnalysis.value = ''
    aiExplanation.value = ''
    loadingAI.value = false
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
  if (!q) { currentQuestion.value = null; currentOptions.value = []; return }
  currentQuestion.value = q
  const options = q.options ? q.options.split(/\r?\n/).filter(o => o.trim()) : []
  currentOptions.value = options.map(opt => {
    const val = opt.slice(0, 1)
    const selected = q.type === 'multi' ? (userAnswer.value || '').includes(val) : userAnswer.value === val
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
    cur = cur.includes(val) ? cur.replace(val, '') : cur + val
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
  if (!ans && currentOptions.value.length > 0) { ElMessage.warning('请先选择答案'); return }
  try {
    const r = await questionApi.checkAnswer(q.id, ans || '')
    feedback.value = { 
      isCorrect: r.is_correct, 
      myAnswer: ans, 
      correctAnswer: r.answer, 
      analysis: r.analysis,
      hasAnswer: r.has_answer
    }
    questionState.value = 'confirmed'
    if (r.is_correct === true) correctCount.value++
    totalCount.value++
    saveProgress()
    
    // 自动获取AI解析
    getAIExplanation()
  } catch (e) { ElMessage.error('判断失败') }
}

// 新增：获取AI解析
const getAIExplanation = async () => {
  if (aiExplanation.value) return
  loadingAI.value = true
  try {
    const q = currentQuestion.value
    const questionText = q.options 
      ? `${q.content}\n选项：\n${q.options}`
      : q.content
    const r = await quizApi.aiTutor(questionText)
    aiExplanation.value = r.answer || r
  } catch (e) {
    console.error('AI解析失败', e)
  } finally {
    loadingAI.value = false
  }
}

// 新增：提交新答案
const submitNewAnswer = async () => {
  if (!newAnswer.value.trim()) {
    ElMessage.warning('请输入答案')
    return
  }
  try {
    const q = currentQuestion.value
    await questionApi.updateAnswer(q.id, newAnswer.value, newAnalysis.value)
    
    // 更新本地反馈
    feedback.value.correctAnswer = newAnswer.value
    feedback.value.analysis = newAnalysis.value
    feedback.value.hasAnswer = true
    
    // 更新题目数据
    q.answer = newAnswer.value
    q.analysis = newAnalysis.value
    
    // 重新判断对错
    const { checkAnswer } = await import('../utils/answerCheck')
    feedback.value.isCorrect = checkAnswer(feedback.value.myAnswer, newAnswer.value, q.type)
    if (feedback.value.isCorrect) correctCount.value++
    
    ElMessage.success('答案已保存')
    newAnswer.value = ''
    newAnalysis.value = ''
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const saveAndExit = () => {
  saveProgress()
  ElMessage.success('进度已保存')
}

const continueQuiz = () => {
  hasUnfinished.value = false
  showResult.value = false
  updateCurrent()
}

const goPrev = () => { 
  if (currentIndex.value <= 0) return
  currentIndex.value--
  questionState.value = 'answering'
  userAnswer.value = ''
  feedback.value = null
  newAnswer.value = ''
  newAnalysis.value = ''
  aiExplanation.value = ''
  loadingAI.value = false
  updateCurrent()
  saveProgress()
}

const goNext = () => {
  if (currentIndex.value >= questions.value.length - 1) {
    quizResult.value = { correct: correctCount.value, total: totalCount.value, score: totalCount.value > 0 ? Math.round(correctCount.value / totalCount.value * 100) : 0 }
    showResult.value = true
    clearProgress()
    return
  }
  currentIndex.value++
  questionState.value = 'answering'
  userAnswer.value = ''
  feedback.value = null
  newAnswer.value = ''
  newAnalysis.value = ''
  aiExplanation.value = ''
  loadingAI.value = false
  updateCurrent()
  saveProgress()
}

const retry = () => {
  showResult.value = false
  clearProgress()
  loadQuestions()
}

onBeforeUnmount(() => {
  if (!showResult.value && questions.value.length > 0) {
    saveProgress()
  }
})

onMounted(() => { 
  bankId.value = localStorage.getItem('quizBankId') || ''
  loadQuestions() 
})
</script>

<style scoped>
.quiz-page { max-width: 800px; margin: 0 auto; }
.loading-box { text-align: center; padding: 60px; color: #666; }
.loading-icon { font-size: 40px; animation: rotating 2s linear infinite; margin-bottom: 10px; }
@keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.result-card { background: #fff; border-radius: 16px; padding: 40px; text-align: center; }
.result-emoji { font-size: 60px; margin-bottom: 20px; }
.result-score { font-size: 48px; font-weight: bold; color: #333; margin-bottom: 10px; }
.result-text { font-size: 20px; font-weight: 500; margin-bottom: 30px; }
.progress-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.progress-bar { flex: 1; }
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.q-number { color: #666; font-size: 14px; }
.q-card { border-radius: 12px; margin-bottom: 16px; }
.q-content { font-size: 16px; line-height: 1.8; color: #333; }
.options-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.option-item { padding: 16px; background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; cursor: pointer; transition: all 0.3s; font-size: 15px; }
.option-item:hover { border-color: #667eea; background: #f5f7ff; }
.option-selected { border-color: #667eea; background: #f5f7ff; }
.option-correct { border-color: #4caf50; background: #e8f5e9; }
.option-wrong { border-color: #f44336; background: #ffebee; }
.fill-section { margin-bottom: 20px; }
.action-buttons { display: flex; flex-direction: column; gap: 10px; }
.submit-btn, .prev-btn { width: 100%; }
.feedback-box { margin-top: 20px; padding: 20px; border-radius: 12px; background: #f5f5f5; }
.feedback-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; }
.feedback-title.correct { color: #2e7d32; }
.feedback-title.wrong { color: #c62828; }
.feedback-title.unknown { color: #f57c00; }
.my-answer { color: #666; font-size: 14px; margin-bottom: 8px; }
.correct-answer { font-size: 16px; font-weight: 500; color: #333; margin-bottom: 12px; }
.analysis { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 16px; padding: 12px; background: #fff; border-radius: 8px; }
.analysis-title { font-weight: bold; color: #333; margin-bottom: 8px; }
.next-btn { width: 100%; }

/* 新增：无答案区域样式 */
.no-answer-box { margin: 16px 0; }
.add-answer-section { margin-top: 12px; padding: 12px; background: #fff; border-radius: 8px; }

/* 新增：AI解析样式 */
.ai-explanation { margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: #fff; }
.ai-title { font-weight: bold; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.ai-content { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
.ai-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; color: #667eea; }
.ai-btn { margin: 12px 0; }

@media (max-width: 768px) {
  .result-card { padding: 30px 20px; }
  .result-score { font-size: 36px; }
  .option-item { padding: 14px; font-size: 14px; }
}
</style>
