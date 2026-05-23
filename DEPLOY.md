# AI刷题系统 - 部署指南

## 方案：Render免费托管（推荐）

### 1. 注册 Render 账号
- 访问 https://render.com
- 用 GitHub 账号登录（最简单）

### 2. 上传代码到 GitHub
```bash
# 在 ai-quiz 目录下初始化git
cd F:\ai-quiz
git init
git add .
git commit -m "Initial commit"

# 创建GitHub仓库并推送
# 去 https://github.com/new 创建新仓库（如 ai-quiz）
git remote add origin https://github.com/你的用户名/ai-quiz.git
git push -u origin main
```

### 3. 部署后端到 Render
1. 登录 Render Dashboard
2. 点击 "New +" → "Web Service"
3. 选择你的 GitHub 仓库
4. 配置：
   - Name: `ai-quiz-server`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`
5. 添加环境变量：
   - `JWT_SECRET`: 随机字符串（如 `your-secret-key-123`）
   - `DEEPSEEK_API_KEY`: 你的DeepSeek API密钥（可选）
6. 点击 "Create Web Service"

等待部署完成，会获得类似 `https://ai-quiz-server-xxx.onrender.com` 的地址。

### 4. 部署前端（可选）
Render也可以托管静态网站：
1. "New +" → "Static Site"
2. 选择同一仓库
3. 配置：
   - Name: `ai-quiz-web`
   - Build Command: `cd web && npm install && npm run build`
   - Publish Directory: `web/dist`
4. 添加环境变量：
   - `VITE_API_URL`: `https://ai-quiz-server-xxx.onrender.com`

或者直接用 GitHub Pages（免费）：
```bash
cd F:\ai-quiz\web
npm run build
# 将 dist 目录内容上传到 GitHub Pages
```

### 5. 手机使用
1. 用 Chrome 打开前端地址
2. 点击 "添加到主屏幕"
3. 像原生App一样使用！

---

## 方案B：Railway（备选）

Railway也提供免费额度，步骤类似：
1. https://railway.app 用GitHub登录
2. New Project → Deploy from GitHub repo
3. 选择仓库，自动检测Node.js
4. 添加环境变量，部署完成

---

## 注意事项

### 免费版限制
| 平台 | 休眠 | 限制 |
|------|------|------|
| Render | 15分钟无访问休眠 | 每月750小时 |
| Railway | 无休眠 | 每月5美元额度 |

**休眠问题**：Render免费版15分钟无访问会休眠，首次访问需等待10-30秒唤醒。

### 数据持久化
- Render的免费磁盘在重启后会清空
- 建议定期导出数据，或使用付费版
- 或者改用 PostgreSQL（Render提供免费PostgreSQL）

---

## 快速测试

部署完成后，测试API：
```bash
curl https://你的render地址/api/health
```

应该返回：`{"ok":true,"time":"..."}`
