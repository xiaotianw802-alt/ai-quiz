const express = require('express');
const router = express.Router();
const { getBanks, getQuestions, getWrongQuestions, getTotalStats, getWrongStatsByBank, isQuestionOwner, saveRecord, getDB } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { checkAnswer } = require('../utils/answerCheck');

router.use(authMiddleware);

router.get('/banks', (req, res) => {
  try {
    const banks = getBanks(req.userId);
    const wrongStats = getWrongStatsByBank(req.userId);
    const data = banks.map(b => {
      const ws = wrongStats.find(w => w.bank_id === b.id);
      return { ...b, wrong_count: ws ? ws.wrong_count : 0 };
    });
    res.json({ ok: true, data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/list', (req, res) => {
  try {
    const { bank_id, limit } = req.query;
    const questions = getQuestions(req.userId, bank_id || null, parseInt(limit) || 30);
    const safe = questions.map(q => { const { answer, analysis, ...rest } = q; return rest; });
    res.json({ ok: true, data: safe, total: safe.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/wrong', (req, res) => {
  try {
    const { bank_id, limit } = req.query;
    const questions = getWrongQuestions(req.userId, bank_id || null, parseInt(limit) || 30);
    const safe = questions.map(q => { const { answer, analysis, ...rest } = q; return rest; });
    res.json({ ok: true, data: safe, total: safe.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/check', (req, res) => {
  try {
    const { question_id, user_answer } = req.body;
    const db = getDB();
    if (!isQuestionOwner(req.userId, question_id)) {
      return res.status(403).json({ ok: false, error: '无权访问该题目' });
    }
    const q = db.prepare('SELECT answer, analysis, type FROM questions WHERE id=?').get(question_id);
    if (!q) return res.status(404).json({ ok: false, error: '题目不存在' });
    const isCorrect = checkAnswer(user_answer, q.answer, q.type);
    saveRecord(req.userId, question_id, user_answer, isCorrect);
    res.json({ ok: true, data: { is_correct: isCorrect, answer: q.answer, analysis: q.analysis, has_answer: !!(q.answer && q.answer.trim()) } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 补充/更新题目答案
router.post('/update-answer', (req, res) => {
  try {
    const { question_id, answer, analysis } = req.body;
    if (!question_id) return res.status(400).json({ ok: false, error: '缺少题目ID' });
    
    const db = getDB();
    if (!isQuestionOwner(req.userId, question_id)) {
      return res.status(403).json({ ok: false, error: '无权修改该题目' });
    }
    
    const stmt = db.prepare('UPDATE questions SET answer = ?, analysis = ? WHERE id = ?');
    stmt.run(answer || '', analysis || '', question_id);
    
    res.json({ ok: true, data: { message: '答案已更新' } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/stats', (req, res) => {
  try { res.json({ ok: true, data: getTotalStats(req.userId) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;