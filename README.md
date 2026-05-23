# AI 刷题系统 - 独立 Web 版

原微信小程序已改造为独立的 Web 应用，支持账号登录系统。

---

## 项目结构

ai-quiz/
├── web/                    # Web 前端 (Vue 3 + Vite)
├── server/                 # 后端 API (Express + SQLite)
└── miniprogram/            # 原微信小程序（保留）

---

## 快速启动

### 1. 启动后端服务
`bash
cd server
npm install
npm start
`后端默认运行在 http://localhost:3000

### 2. 启动前端开发服务器
`bash
cd web
npm install
npm run dev
`前端默认运行在 http://localhost:5173

---

## 环境配置

### 后端环境变量 (server/.env)
`env
JWT_SECRET=your-secret-key-here
PORT=3000
DEEPSEEK_API_KEY=your-deepseek-api-key
``n
---

## 功能说明

### 账号系统
- 注册：用户名 3-20 字符，密码至少 6 位
- 登录：JWT Token 认证，localStorage 存储
- 数据隔离：每个用户只能看到自己的题库和答题记录

### 核心功能
1. 首页 - 查看题库列表、统计信息
2. 刷题 - 支持单选/多选/判断/填空题
3. 错题本 - 自动收录错题
4. 导入题库 - 上传 PDF/Word/HTML，AI 解析

---

## 生产部署

### 构建前端
`bash
cd web
npm run build
``n
### 部署方式
- 前后端分离部署，或
- 将 web/dist 合并到后端静态文件服务

---

## 技术栈

- 前端：Vue 3 + Vite + Element Plus + Vue Router + Axios
- 后端：Express + SQLite + JWT + bcryptjs
- AI 解析：DeepSeek API

