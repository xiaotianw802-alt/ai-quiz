<template>
  <div class="review-page">
    <template v-if="mode === 'select'">
      <el-card class="header-card" :body-style="{ padding: '20px' }">
        <div class="header-content">
          <h2>错题本</h2>
          <p class="subtitle">连续做对3次自动移出</p>
        </div>
      </el-card>
      <div v-if="loading" class="loading-box">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <el-empty v-else-if="banks.length === 0" description="没有错题！" class="empty-box">
        <template #image><div class="empty-emoji">🎉</div></template>
        <p class="empty-desc">去刷题吧~</p>
        <el-button type="primary" @click="goToQuiz">去刷题</el-button>
      </el-empty>
      <div v-else class="bank-list">
        <el-card v-for="bank in banks" :key="bank.id" class="bank-card" shadow="hover" @click="selectBank(bank.id)">
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
    <template v-else>
      <div class="review-header">
        <el-button size="small" @click="backToBanks" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
      </div>
      <div v-if="loading" class="loading-box">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <el-empty v-else-if="questions.length === 0" description="该题库没有错题" class="empty-box">
        <template #image><div class="empty-emoji">🎉</div></template>
      </el-empty>
      <template v-else>
        <el-progress :percentage="progressPercent" :stroke-width="8" class="progress-bar" />
        <div class="q-header">
          <el-tag type="danger" effect="dark">错题</el-tag>
          <span class="q-number">{{ currentIndex + 1 }} / {{ questions.length }}</span>
        </div>
        <el-card class="q-card" v-if="currentQuestion">
          <div class="q-content">{{ currentQuestion.content }}</div>
        </el-card>
        <div v-if="currentOptions.length > 0" class="options-list">
          <div v-for="option in currentOptions" :key="option.val" class="option-item" 
            :class="{ 'option-selected': option.selected, 'option-correct': showResult && isCorrectOption(option.val), 'option-wrong': showResult && !isCorrect && option.selected }"
            @click="selectAnswer(option.val)">{{ option.text }}</div>
        </div>
        <div v-else class="fill-section">
          <el-input v-model="userAnswer" type="textarea" :rows="4" placeholder="请输入答案" :disabled="showResult" />
        </div>
        <div v-if="!showResult" class="action-buttons">
          <el-button type="primary" size="large" class="submit-btn" @click="confirmAnswer">确认答案</el-button>
        </div>
        <div v-if="showResult" class="feedback-box">
          <div class="feedback-title" :class="isCorrect ? 'correct' : 'wrong'">{{ isCorrect ? '回答正确！' : '回答错误' }}</div>
          <div v-if="!isCorrect" class="my-answer">你的答案：{{ userAnswer }}</div>
          <div class="correct-answer">正确答案：{{ currentQuestion.answer || '暂无' }}</div>
          <div v-if="currentQuestion.analysis" class="analysis">{{ currentQuestion.analysis }}</div>
          <el-button type="primary" size="large" class="next-btn" @click="goNext">{{ currentIndex >= questions.length - 1 ? '完成' : '下一题' }}</el-button>
        </div>
      </template>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { questionApi } from '../utils/api'
const route = useRoute()
const router = useRouter()
const mode = ref('select')
const banks = ref([])
const bankId = ref('')
const questions = ref([])
const currentIndex = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const userAnswer = ref('')
const showResult = ref(false)
const isCorrect = ref(false)
const loading = ref(true)
const progressPercent = computed(() => Math.round((currentIndex.value + 1) / questions.value.length * 100))
const loadBanks = async () => {
  loading.value = true
  try { banks.value = (await questionApi.getBanks() || []).filter(b => b.wrong_count > 0) }
  catch (e) { ElMessage.error('加载失败') }
  finally { loading.value = false }
}
const selectBank = (id) => { bankId.value = id; mode.value = 'review'; loadWrongQuestions() }
const loadWrongQuestions = async () => {
  loading.value = true
  try {
    const data = await questionApi.getWrongQuestions(bankId.value, 30)
    if (!data || data.length === 0) { mode.value = 'select'; loadBanks(); return }
    questions.value = data; currentIndex.value = 0; showResult.value = false; updateCurrent()
  } catch (e) { ElMessage.error('加载失败') }
  finally { loading.value = false }
}
const backToBanks = () => { mode.value = 'select'; loadBanks() }
const updateCurrent = () => {
  const q = questions.value[currentIndex.value]
  if (!q) { currentQuestion.value = null; currentOptions.value = []; return }
  currentQuestion.value = q; userAnswer.value = ''; showResult.value = false; isCorrect.value = false
  const opts = q.options ? q.options.split(/?
/).filter(o => o.trim()) : []
  currentOptions.value = opts.map(o => ({ text: o, val: o.slice(0, 1), selected: false }))
}
const selectAnswer = (val) => {
  if (showResult.value) return
  currentOptions.value.forEach(o => o.selected = o.val === val)
  userAnswer.value = val
}
const isCorrectOption = (val) => (currentQuestion.value.answer || '').includes(val)
const confirmAnswer = async () => {
  if (!userAnswer.value && currentOptions.value.length > 0) { ElMessage.warning('请先选择答案'); return }
  try {
    const r = await questionApi.checkAnswer(currentQuestion.value.id, userAnswer.value || '')
    isCorrect.value = r.is_correct; showResult.value = true
    currentQuestion.value.answer = r.answer
    if (r.is_correct) ElMessage.success('回答正确！')
  } catch (e) { ElMessage.error('判断失败') }
}
const goNext = () => {
  if (currentIndex.value >= questions.value.length - 1) { ElMessage.success('错题练习完成！'); mode.value = 'select'; loadBanks(); return }
  currentIndex.value++; updateCurrent()
}
const goToQuiz = () => { router.push('/quiz') }
onMounted(() => {
  if (route.query.bank_id) { bankId.value = route.query.bank_id; mode.value = 'review'; loadWrongQuestions() }
  else loadBanks()
})
</script>
<style scoped>
.review-page { max-width: 800px; margin: 0 auto; }
.header-card { background: linear-gradient(135deg, #c62828 0%, #e94560 100%); color: #fff; border: none; margin-bottom: 16px; }
.header-content h2 { margin: 0 0 6px 0; font-size: 20px; }
.subtitle { margin: 0; font-size: 13px; opacity: 0.7; }
.loading-box { text-align: center; padding: 40px; color: #666; }
.loading-icon { font-size: 40px; animation: rotating 2s linear infinite; margin-bottom: 10px; }
@keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.empty-box { background: #fff; border-radius: 12px; padding: 40px; }
.empty-emoji { font-size: 60px; margin-bottom: 16px; }
.empty-desc { color: #999; margin-bottom: 20px; }
.bank-list { display: flex; flex-direction: column; gap: 12px; }
.bank-card { cursor: pointer; border-radius: 12px; }
.bank-content { display: flex; justify-content: space-between; align-items: center; }
.bank-name { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 4px; }
.bank-count.wrong { color: #e94560; font-size: 13px; }
.bank-arrow { font-size: 20px; color: #999; }
.review-header { margin-bottom: 16px; }
.progress-bar { margin-bottom: 16px; }
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.q-number { color: #666; font-size: 14px; }
.q-card { border-radius: 12px; margin-bottom: 16px; }
.q-content { font-size: 16px; line-height: 1.8; color: #333; }
.options-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.option-item { padding: 16px; background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 15px; cursor: pointer; transition: all 0.3s; }
.option-item:hover { border-color: #c62828; background: #fff5f5; }
.option-selected { border-color: #c62828; background: #fff5f5; }
.option-correct { border-color: #4caf50; background: #e8f5e9; }
.option-wrong { border-color: #f44336; background: #ffebee; }
.fill-section { margin-bottom: 16px; }
.submit-btn { width: 100%; }
.feedback-box { padding: 20px; border-radius: 12px; background: #f5f5f5; }
.feedback-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; }
.feedback-title.correct { color: #2e7d32; }
.feedback-title.wrong { color: #c62828; }
.my-answer { color: #666; font-size: 14px; margin-bottom: 8px; }
.correct-answer { font-size: 16px; font-weight: 500; color: #333; margin-bottom: 12px; }
.analysis { color: #666; font-size: 14px; line-height: 1.6; padding: 12px; background: #fff; border-radius: 8px; margin-bottom: 16px; }
.next-btn { width: 100%; }
@media (max-width: 768px) { .option-item { padding: 14px; font-size: 14px; } }
</style>