<template>
  <div class="ai-tutor-page">
    <div class="header">
      <h1>🤖 AI 辅导老师</h1>
      <p>遇到不会的题？直接问 AI，它会一步步教你</p>
    </div>
    
    <!-- 题目输入区 -->
    <el-card class="input-card">
      <el-form>
        <el-form-item label="题目内容">
          <el-input
            v-model="questionContent"
            type="textarea"
            :rows="4"
            placeholder="粘贴题目内容，或手动输入..."
          />
        </el-form-item>
        
        <el-form-item label="选项（可选）">
          <el-input
            v-model="questionOptions"
            type="textarea"
            :rows="3"
            placeholder="A. 选项一&#10;B. 选项二&#10;C. 选项三"
          />
        </el-form-item>
        
        <el-form-item label="你的答案（可选）">
          <el-input v-model="userAnswer" placeholder="你选了什么？或有什么思路？" />
        </el-form-item>
        
        <el-button 
          type="primary" 
          size="large" 
          :loading="loading"
          @click="askAI"
        >
          💡 请教 AI
        </el-button>
      </el-form>
    </el-card>
    
    <!-- AI 回答区 -->
    <el-card v-if="aiResponse" class="response-card">
      <div class="response-header">
        <el-avatar :size="40" src="https://api.dicebear.com/7.x/bottts/svg?seed=AI" />
        <span class="ai-name">AI 辅导老师</span>
      </div>
      <div class="response-content" v-html="formattedResponse"></div>
      
      <div class="follow-up">
        <el-input
          v-model="followUpQuestion"
          placeholder="还有疑问？继续追问..."
          @keyup.enter="askFollowUp"
        >
          <template #append>
            <el-button @click="askFollowUp" :loading="loading">发送</el-button>
          </template>
        </el-input>
      </div>
    </el-card>
    
    <!-- 历史记录 -->
    <div v-if="chatHistory.length > 0" class="history-section">
      <h3>💬 对话历史</h3>
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in chatHistory"
          :key="index"
          :type="item.type === 'user' ? 'primary' : 'success'"
        >
          <el-card :class="item.type">
            <strong>{{ item.type === 'user' ? '你' : 'AI' }}：</strong>
            <div v-html="formatText(item.content)"></div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { quizApi } from '../utils/api'

const questionContent = ref('')
const questionOptions = ref('')
const userAnswer = ref('')
const aiResponse = ref('')
const followUpQuestion = ref('')
const loading = ref(false)
const chatHistory = ref([])

const formattedResponse = computed(() => {
  return formatText(aiResponse.value)
})

const formatText = (text) => {
  if (!text) return ''
  // 简单的 markdown 转换
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

const askAI = async () => {
  if (!questionContent.value.trim()) {
    ElMessage.warning('请输入题目内容')
    return
  }
  
  loading.value = true
  const fullQuestion = buildFullQuestion()
  
  // 添加到历史
  chatHistory.value.push({
    type: 'user',
    content: fullQuestion,
    time: new Date()
  })
  
  try {
    const res = await quizApi.aiTutor(fullQuestion)
    aiResponse.value = res.answer
    
    chatHistory.value.push({
      type: 'ai',
      content: res.answer,
      time: new Date()
    })
  } catch (e) {
    ElMessage.error('AI 服务繁忙，请稍后重试')
  } finally {
    loading.value = false
  }
}

const askFollowUp = async () => {
  if (!followUpQuestion.value.trim()) return
  
  questionContent.value = followUpQuestion.value
  await askAI()
  followUpQuestion.value = ''
}

const buildFullQuestion = () => {
  let text = questionContent.value
  if (questionOptions.value) {
    text += '\n\n选项：\n' + questionOptions.value
  }
  if (userAnswer.value) {
    text += '\n\n我的答案：' + userAnswer.value
  }
  return text
}
</script>

<style scoped>
.ai-tutor-page {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.header p {
  color: #666;
}

.input-card {
  margin-bottom: 20px;
}

.response-card {
  margin-bottom: 20px;
  background: #f8f9fa;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.ai-name {
  font-weight: bold;
  color: #667eea;
}

.response-content {
  line-height: 1.8;
  color: #333;
  margin-bottom: 20px;
}

.follow-up {
  margin-top: 16px;
}

.history-section {
  margin-top: 30px;
}

.history-section h3 {
  margin-bottom: 16px;
}

.user {
  background: #e3f2fd;
}

.ai {
  background: #f3e5f5;
}

:deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

:deep(strong) {
  color: #667eea;
}
</style>