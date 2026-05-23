<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <div class="logo">📝</div>
        <h1>AI 刷题</h1>
        <p>智能解析 · 高效备考</p>
      </div>
      
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" :prefix-icon="UserFilled" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" class="login-btn" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <span>还没有账号？</span>
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserFilled, Lock } from '@element-plus/icons-vue'
import { userApi } from '../utils/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: '', password: '' })

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await userApi.login(form.username, form.password)
        localStorage.setItem('token', res.token)
        localStorage.setItem('userInfo', JSON.stringify({ userId: res.userId, username: res.username }))
        ElMessage.success('登录成功')
        router.push('/')
      } catch (error) {
        // error already handled by interceptor
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.login-box { width: 100%; max-width: 400px; background: rgba(255,255,255,0.95); border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.login-header { text-align: center; margin-bottom: 30px; }
.logo { font-size: 60px; margin-bottom: 10px; }
.login-header h1 { font-size: 28px; color: #333; margin-bottom: 8px; }
.login-header p { color: #666; font-size: 14px; }
.login-form { margin-top: 30px; }
.login-btn { width: 100%; height: 44px; font-size: 16px; border-radius: 8px; }
.login-footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
.login-footer a { color: #667eea; text-decoration: none; margin-left: 5px; }
.login-footer a:hover { text-decoration: underline; }
@media (max-width: 480px) { .login-box { padding: 30px 20px; } .logo { font-size: 50px; } .login-header h1 { font-size: 24px; } }
</style>
