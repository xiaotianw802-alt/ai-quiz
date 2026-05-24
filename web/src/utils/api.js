import axios from 'axios'
import { ElMessage } from 'element-plus'

const baseURL = import.meta.env.PROD ? '' : '/'

const request = axios.create({ baseURL, timeout: 60000 })

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}, error => Promise.reject(error))

request.interceptors.response.use(response => {
  const data = response.data
  if (data.ok) return data
  else { ElMessage.error(data.error || '请求失败'); return Promise.reject(new Error(data.error)) }
}, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    window.location.hash = '#/login'
    ElMessage.error('登录已过期，请重新登录')
  } else {
    ElMessage.error(error.response?.data?.error || error.message || '网络错误')
  }
  return Promise.reject(error)
})

export const userApi = {
  login: (username, password) => request.post('/api/auth/login', { username, password }).then(r => r.data),
  register: (username, password) => request.post('/api/auth/register', { username, password }).then(r => r.data),
  logout: () => request.post('/api/auth/logout'),
  getMe: () => request.get('/api/auth/me').then(r => r.data)
}

export const questionApi = {
  getBanks: () => request.get('/api/questions/banks').then(r => r.data),
  getQuestions: (bankId, limit = 30) => request.get(`/api/questions/list?bank_id=${bankId || ''}&limit=${limit}`).then(r => r.data),
  getWrongQuestions: (bankId, limit = 30) => request.get(`/api/questions/wrong?bank_id=${bankId || ''}&limit=${limit}`).then(r => r.data),
  checkAnswer: (questionId, userAnswer) => request.post('/api/questions/check', { question_id: questionId, user_answer: userAnswer }).then(r => r.data),
  getStats: () => request.get('/api/questions/stats').then(r => r.data)
}

export const quizApi = {
  start: (bankId, count = 10) => request.get(`/api/quiz/start?bank_id=${bankId || ''}&count=${count}`).then(r => r.data),
  submit: (answers) => request.post('/api/quiz/submit', { answers }).then(r => r.data),
  explain: (questionId) => request.post('/api/quiz/explain', { question_id: questionId }).then(r => r.data),
  aiTutor: (question) => request.post('/api/quiz/ai-tutor', { question }).then(r => r.data)
}

export const uploadApi = {
  uploadFile: (file, type, bankName = '题库') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bank_name', bankName)
    const endpoint = type === 'pdf' ? '/api/upload/pdf' : type === 'html' ? '/api/upload/html' : '/api/upload/word'
    return request.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  }
}

export default request