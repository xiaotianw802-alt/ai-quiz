const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 验证JWT Token的中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ ok: false, error: '未提供认证令牌' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ ok: false, error: '认证格式错误，请使用 Bearer Token' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: '令牌已过期，请重新登录' });
    }
    return res.status(401).json({ ok: false, error: '无效的认证令牌' });
  }
}

// 生成JWT Token
function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '7d' } // Token有效期7天
  );
}

// 可选的认证中间件（不强制要求登录，但会解析token如果有的话）
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.userId = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    req.userId = null;
    return next();
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
  } catch (err) {
    req.userId = null;
  }
  
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  generateToken,
  JWT_SECRET
};
