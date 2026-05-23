const express = require('express');
const router = express.Router();
const { getBanks, getQuestions, getWrongQuestions, getTotalStats, getWrongStatsByBank } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// 题库列表（含各题库错题数）
router.get('/banks', (req, res) => {
  try {
    const banks = getBanks(req.userId);
    const wrongStats = getWrongStatsByBank(req.userId);
    // 把错题数合并到每个题库
    const data = banks.map(b => {
      const ws = wrongStats.find(w => w.bank_id === b.id);
      return { ...b, wrong_count: ws ? ws.wrong_count : 0 };
    });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 随机题目
router.get('/list', (req, res) => {
  try {
    const { bank_id, limit } = req.query;
    const questions = getQuestions(req.userId, bank_id || null, parseInt(limit) || 30);
    const safe = questions.map(q => { const { answer, analysis, ...rest } = q; return rest; });
    res.json({ ok: true, data: safe, total: safe.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 错题（连续对3次才移除）
router.get('/wrong', (req, res) => {
  try {
    const { bank_id, limit } = req.query;
    const questions = getWrongQuestions(req.userId, bank_id || null, parseInt(limit) || 30);
    const safe = questions.map(q => { const { answer, analysis, ...rest } = q; return rest; });
    res.json({ ok: true, data: safe, total: safe.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 核对答案
router.post('/check', (req, res) => {
  try {
    const { question_id, user_answer } = req.body;
    const db = require('../db').getDB();
    
    // 检查题目是否属于当前用户
    const { isQuestionOwner } = require('../db');
    if (!isQuestionOwner(req.userId, question_id)) {
      return res.status(403).json({ ok: false, error: '无权访问该题目' });
    }
    
    const q = db.prepare('SELECT answer, analysis FROM questions WHERE id=?').get(question_id);
    if (!q) return res.status(404).json({ ok: false, error: '题目不存在' });

    const isCorrect = q.answer && user_answer.trim().toUpperCase() === q.answer.trim().toUpperCase();
    const { saveRecord } = require('../db');
    saveRecord(req.userId, question_id, user_answer, isCorrect);

    res.json({ ok: true, data: { is_correct: isCorrect, answer: q.answer, analysis: q.analysis } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 统计
router.get('/stats', (req, res) => {
  try {
    res.json({ ok: true, data: getTotalStats(req.userId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
