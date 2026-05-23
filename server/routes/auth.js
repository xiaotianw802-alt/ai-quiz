const express = require('express');
const router = express.Router();
const { createUser, getUserByUsername, getUserById, verifyPassword } = require('../db');
const { authMiddleware, generateToken } = require('../middleware/auth');

// 用户注册
router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body;

    // 参数验证
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ ok: false, error: '用户名长度应为3-20个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: '密码长度至少为6个字符' });
    }

    // 检查用户名是否已存在
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ ok: false, error: '用户名已被注册' });
    }

    // 创建用户
    const result = createUser(username, password);
    const userId = result.lastInsertRowid;

    // 生成JWT Token
    const token = generateToken(userId, username);

    res.status(201).json({
      ok: true,
      data: {
        userId,
        username,
        token
      },
      message: '注册成功'
    });
  } catch (e) {
    console.error('[Register Error]', e);
    res.status(500).json({ ok: false, error: '注册失败：' + e.message });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // 参数验证
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ ok: false, error: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ ok: false, error: '用户名或密码错误' });
    }

    // 生成JWT Token
    const token = generateToken(user.id, user.username);

    res.json({
      ok: true,
      data: {
        userId: user.id,
        username: user.username,
        token
      },
      message: '登录成功'
    });
  } catch (e) {
    console.error('[Login Error]', e);
    res.status(500).json({ ok: false, error: '登录失败：' + e.message });
  }
});

// 退出登录（客户端只需删除token，服务端可以记录token黑名单）
router.post('/logout', authMiddleware, (req, res) => {
  // 在实际应用中，这里可以将token加入黑名单
  // 由于JWT是无状态的，真正的"退出"需要客户端删除token
  res.json({ ok: true, message: '退出登录成功' });
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: '用户不存在' });
    }

    res.json({
      ok: true,
      data: {
        userId: user.id,
        username: user.username,
        createdAt: user.created_at
      }
    });
  } catch (e) {
    console.error('[GetMe Error]', e);
    res.status(500).json({ ok: false, error: '获取用户信息失败：' + e.message });
  }
});

// 修改密码
router.post('/change-password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: '原密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: '新密码长度至少为6个字符' });
    }

    // 获取用户
    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: '用户不存在' });
    }

    // 这里需要重新查询获取password_hash
    const fullUser = getUserByUsername(user.username);
    
    // 验证原密码
    const isValid = verifyPassword(oldPassword, fullUser.password_hash);
    if (!isValid) {
      return res.status(401).json({ ok: false, error: '原密码错误' });
    }

    // 更新密码
    const bcrypt = require('bcryptjs');
    const newHash = bcrypt.hashSync(newPassword, 10);
    const { getDB } = require('../db');
    getDB().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);

    res.json({ ok: true, message: '密码修改成功' });
  } catch (e) {
    console.error('[ChangePassword Error]', e);
    res.status(500).json({ ok: false, error: '修改密码失败：' + e.message });
  }
});

module.exports = router;
