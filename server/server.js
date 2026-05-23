const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  lines.forEach(line => {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/upload', require('./routes/upload'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 托管前端静态文件（生产环境）
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback: 所有非API路由返回index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(webDist, 'index.html'));
    }
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, error: '接口不存在' });
});

// 全局错误
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ ok: false, error: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('AI刷题系统已启动: http://localhost:' + PORT);
  console.log('DeepSeek Key:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
  console.log('JWT Secret:', process.env.JWT_SECRET ? '已配置' : '使用默认密钥');
  console.log('数据目录:', process.env.DATA_DIR || path.join(__dirname));
});
