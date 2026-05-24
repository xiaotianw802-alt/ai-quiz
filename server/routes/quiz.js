const express = require("express");
const router = express.Router();
const { getQuestions, saveRecord, isQuestionOwner } = require("../db");
const { askDeepSeek } = require("../aiService");
const { authMiddleware } = require('../middleware/auth');
const { checkAnswer } = require('../utils/answerCheck');

router.use(authMiddleware);

router.get("/start", (req, res) => {
  try {
    const { bank_id, count, type } = req.query;
    const questions = getQuestions(req.userId, bank_id || null, parseInt(count) || 10);
    const safe = questions.map(q => { const { answer, analysis, ...rest } = q; return rest; });
    res.json({ ok: true, data: safe });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post("/submit", (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ ok: false, error: "参数错误" });
    let correct = 0;
    const total = answers.length;
    const results = [];
    const db = require("../db").getDB();
    const stmt = db.prepare("SELECT answer, analysis, type FROM questions WHERE id=?");
    for (const a of answers) {
      if (!isQuestionOwner(req.userId, a.question_id)) {
        results.push({ question_id: a.question_id, is_correct: false, error: '无权访问该题目' });
        continue;
      }
      const q = stmt.get(a.question_id);
      if (!q) continue;
      const isCorrect = checkAnswer(a.user_answer, q.answer, q.type);
      saveRecord(req.userId, a.question_id, a.user_answer, isCorrect);
      if (isCorrect) correct++;
      results.push({ question_id: a.question_id, is_correct: isCorrect, answer: q.answer, analysis: q.analysis });
    }
    res.json({ ok: true, data: { correct, total, score: total > 0 ? Math.round((correct/total)*100) : 0, results } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post("/explain", async (req, res) => {
  try {
    const { question_id } = req.body;
    if (!isQuestionOwner(req.userId, question_id)) {
      return res.status(403).json({ ok: false, error: '无权访问该题目' });
    }
    const db = require("../db").getDB();
    const q = db.prepare("SELECT * FROM questions WHERE id=?").get(question_id);
    if (!q) return res.status(404).json({ ok: false, error: "题目不存在" });
    const messages = [
      { role: "system", content: "你是一个耐心的刷题辅导老师，请用通俗易懂的方式解释题目。" },
      { role: "user", content: `请详细解释这道题目：\n题目：${q.content}\n${q.options ? '选项：\n' + q.options : ''}\n正确答案：${q.answer || '无'}\n已有解析：${q.analysis || '无'}` },
    ];
    const explanation = await askDeepSeek(messages);
    res.json({ ok: true, data: { explanation } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;