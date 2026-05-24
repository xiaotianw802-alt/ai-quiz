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
      return res.status(403).json({ ok: false, error: '鏃犳潈璁块棶璇ラ鐩? });
    }
    const q = db.prepare('SELECT answer, analysis, type FROM questions WHERE id=?').get(question_id);
    if (!q) return res.status(404).json({ ok: false, error: '棰樼洰涓嶅瓨鍦? });
    const isCorrect = checkAnswer(user_answer, q.answer, q.type);
    saveRecord(req.userId, question_id, user_answer, isCorrect);
    res.json({ ok: true, data: { is_correct: isCorrect, answer: q.answer, analysis: q.analysis, has_answer: !!(q.answer && q.answer.trim()) } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 琛ュ厖/鏇存柊棰樼洰绛旀
router.post('/update-answer', (req, res) => {
  try {
    const { question_id, answer, analysis } = req.body;
    if (!question_id) return res.status(400).json({ ok: false, error: '缂哄皯棰樼洰ID' });
    
    const db = getDB();
    if (!isQuestionOwner(req.userId, question_id)) {
      return res.status(403).json({ ok: false, error: '鏃犳潈淇敼璇ラ鐩? });
    }
    
    const stmt = db.prepare('UPDATE questions SET answer = ?, analysis = ? WHERE id = ?');
    stmt.run(answer || '', analysis || '', question_id);
    
    res.json({ ok: true, data: { message: '绛旀宸叉洿鏂? } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 删除题库
router.delete('/bank/:id', (req, res) => {
  try {
    const { deleteBank } = require('../db');
    const bankId = req.params.id;
    deleteBank(req.userId, bankId);
    res.json({ ok: true, data: { message: '题库已删除' } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/stats', (req, res) => {
  try { res.json({ ok: true, data: getTotalStats(req.userId) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
