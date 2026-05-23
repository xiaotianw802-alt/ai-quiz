<template>
  <div class="upload-page">
    <!-- 头部卡片 -->
    <el-card class="header-card" :body-style="{ padding: '24px' }">
      <div class="header-content">
        <h1>📄 导入题库</h1>
        <p class="subtitle">支持 PDF · Word(.doc/.docx) · 超星HTML</p>
      </div>
    </el-card>
    
    <!-- 题库名称输入 -->
    <el-card class="input-card" shadow="hover">
      <el-form>
        <el-form-item label="题库名称（可选）">
          <el-input v-model="bankName" placeholder="如：计算机网络" size="large" />
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 上传按钮 -->
    <div class="upload-buttons">
      <el-upload class="upload-btn-wrapper" :auto-upload="false" :on-change="handlePDFChange" :show-file-list="false" accept=".pdf">
        <el-button type="primary" size="large" class="upload-btn pdf-btn" :loading="uploading && currentType === 'pdf'">
          <el-icon><Document /></el-icon> PDF
        </el-button>
      </el-upload>
      
      <el-upload class="upload-btn-wrapper" :auto-upload="false" :on-change="handleWordChange" :show-file-list="false" accept=".doc,.docx">
        <el-button type="info" size="large" class="upload-btn word-btn" :loading="uploading && currentType === 'word'">
          <el-icon><DocumentCopy /></el-icon> Word
        </el-button>
      </el-upload>
      
      <el-upload class="upload-btn-wrapper" :auto-upload="false" :on-change="handleHTMLChange" :show-file-list="false" accept=".html,.htm">
        <el-button type="warning" size="large" class="upload-btn html-btn" :loading="uploading && currentType === 'html'">
          <el-icon><ChromeFilled /></el-icon> HTML
        </el-button>
      </el-upload>
    </div>
    
    <p class="upload-hint">PDF: 试卷扫描 · Word: .doc/.docx · HTML: 超星作业</p>
    
    <!-- 上传中提示 -->
    <div v-if="uploading" class="uploading-box">
      <el-icon class="uploading-icon"><Loading /></el-icon>
      <span>正在解析...</span>
    </div>
    
    <!-- 上传成功 -->
    <el-card v-if="uploadResult" class="success-card">
      <div class="success-title"><el-icon><CircleCheck /></el-icon> 导入成功</div>
      <div class="success-info">
        <p>题库：{{ uploadResult.bank_name }}</p>
        <p>识别题目：{{ uploadResult.count }} 道</p>
      </div>
    </el-card>
    
    <!-- 上传失败 -->
    <el-alert v-if="uploadError" :title="uploadError" type="error" show-icon :closable="true" @close="uploadError = ''" class="error-alert" />
    
    <!-- 已有题库 -->
    <div class="section">
      <h3 class="section-title">📚 已有题库</h3>
      <el-empty v-if="banks.length === 0" description="还没有题库" class="empty-box">
        <template #image><div class="empty-icon">📭</div></template>
      </el-empty>
      <div v-else class="bank-list">
        <el-card v-for="bank in banks" :key="bank.id" class="bank-card" shadow="hover">
          <div class="bank-content">
            <div class="bank-info">
              <div class="bank-name">{{ bank.name }}</div>
              <div class="bank-count">{{ bank.q_count }} 道题目</div>
            </div>
            <el-button type="primary" link @click="goToQuiz(bank.id)">去刷题 →</el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, DocumentCopy, ChromeFilled, Loading, CircleCheck } from '@element-plus/icons-vue'
import { uploadApi, questionApi } from '../utils/api'

const router = useRouter()
const banks = ref([])
const bankName = ref('')
const uploading = ref(false)
const currentType = ref('')
const uploadResult = ref(null)
const uploadError = ref('')

const loadBanks = async () => {
  try {
    const data = await questionApi.getBanks()
    banks.value = data || []
  } catch (e) { console.error('加载题库失败', e) }
}

const handlePDFChange = (file) => { if (file.raw) doUpload(file.raw, 'pdf') }
const handleWordChange = (file) => { if (file.raw) doUpload(file.raw, 'word') }
const handleHTMLChange = (file) => { if (file.raw) doUpload(file.raw, 'html') }

const doUpload = async (file, type) => {
  uploading.value = true
  currentType.value = type
  uploadResult.value = null
  uploadError.value = ''
  const name = bankName.value.trim() || '题库'
  
  try {
    const result = await uploadApi.uploadFile(file, type, name)
    uploadResult.value = result
    bankName.value = ''
    loadBanks()
    ElMessage.success('导入成功')
  } catch (error) {
    uploadError.value = error.response?.data?.error || '上传失败'
    ElMessage.error(uploadError.value)
  } finally {
    uploading.value = false
    currentType.value = ''
  }
}

const goToQuiz = (bankId) => {
  localStorage.setItem('quizBankId', bankId)
  router.push('/quiz')
}

onMounted(() => { loadBanks() })
</script>

<style scoped>
.upload-page { max-width: 800px; margin: 0 auto; }
.header-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; margin-bottom: 16px; }
.header-content h1 { margin: 0 0 8px 0; font-size: 24px; }
.subtitle { margin: 0; font-size: 14px; opacity: 0.8; }
.input-card { margin-bottom: 16px; border-radius: 12px; }
.upload-buttons { display: flex; gap: 12px; margin-bottom: 12px; }
.upload-btn-wrapper { flex: 1; }
.upload-btn { width: 100%; height: 50px; font-size: 16px; }
.pdf-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; }
.word-btn { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); border: none; }
.html-btn { background: linear-gradient(135deg, #e65100 0%, #bf360c 100%); border: none; }
.upload-hint { text-align: center; color: #999; font-size: 13px; margin-bottom: 20px; }
.uploading-box { text-align: center; padding: 24px; color: #667eea; }
.uploading-icon { font-size: 24px; animation: rotating 2s linear infinite; margin-right: 8px; }
@keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.success-card { background: #e8f5e9; border-color: #4caf50; margin-bottom: 20px; border-radius: 12px; }
.success-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: bold; color: #2e7d32; margin-bottom: 12px; }
.success-info { color: #333; font-size: 14px; line-height: 1.8; }
.error-alert { margin-bottom: 20px; }
.section { margin-top: 20px; }
.section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 16px; }
.empty-box { background: #fff; border-radius: 12px; padding: 40px; }
.empty-icon { font-size: 60px; margin-bottom: 16px; }
.bank-list { display: flex; flex-direction: column; gap: 12px; }
.bank-card { border-radius: 12px; }
.bank-content { display: flex; justify-content: space-between; align-items: center; }
.bank-name { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 4px; }
.bank-count { font-size: 13px; color: #666; }
@media (max-width: 768px) { .upload-buttons { flex-direction: column; } .upload-btn { height: 44px; } }
</style>
