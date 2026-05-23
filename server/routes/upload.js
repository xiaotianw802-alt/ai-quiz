const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const ALLOWED = ['.pdf', '.html', '.htm', '.docx', '.doc'];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.includes(ext)) cb(null, true);
    else cb(new Error('仅支持 PDF / Word / HTML 文件'));
  },
});

// PDF
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '请上传文件' });
    const { parsePDF } = require('../pdfParser');
    const { parseQuestionsFromText, parseQuestionsFromImages } = require('../aiService');
    const { createBank, addQuestions } = require('../db');
    const result = await parsePDF(req.file.path);
    let questions;
    if (result.text) questions = await parseQuestionsFromText(result.text);
    else if (result.images && result.images.length > 0) questions = await parseQuestionsFromImages(result.images);
    else return res.status(400).json({ ok: false, error: 'PDF无法识别' });
    if (!Array.isArray(questions) || questions.length === 0) return res.json({ ok: true, data: { count: 0, message: '未识别到题目' } });
    const bankName = req.body.bank_name || ('题库_' + new Date().toLocaleDateString('zh-CN'));
    const bank = createBank(req.userId, bankName);
    addQuestions(bank.lastInsertRowid, questions);
    res.json({ ok: true, data: { bank_id: bank.lastInsertRowid, bank_name: bankName, count: questions.length } });
  } catch (e) { console.error('[PDF]', e); res.status(500).json({ ok: false, error: e.message }); }
});

// HTML
router.post('/html', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '请上传文件' });
    const { parseChaoxingHTML } = require('../htmlParser');
    const { createBank, addQuestions } = require('../db');
    const questions = parseChaoxingHTML(req.file.path);
    if (!Array.isArray(questions) || questions.length === 0) return res.json({ ok: true, data: { count: 0 } });
    const bankName = req.body.bank_name || req.file.originalname.replace(/\.(html|htm)$/i, '');
    const bank = createBank(req.userId, bankName);
    addQuestions(bank.lastInsertRowid, questions);
    console.log(`[HTML] ${bankName}, ${questions.length}题`);
    res.json({ ok: true, data: { bank_id: bank.lastInsertRowid, bank_name: bankName, count: questions.length } });
  } catch (e) { console.error('[HTML]', e); res.status(500).json({ ok: false, error: e.message }); }
});

// Word (.docx + .doc)
router.post('/word', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '请上传文件' });
    const { parseWord } = require('../wordParser');
    const { parseQuestionsFromText } = require('../aiService');
    const { createBank, addQuestions } = require('../db');

    console.log('[Word] 提取文本:', req.file.originalname);
    const text = await parseWord(req.file.path);
    if (!text || text.length < 20) return res.status(400).json({ ok: false, error: 'Word文档无法提取文本，请确认内容' });

    console.log('[Word] AI识别题目中...');
    const questions = await parseQuestionsFromText(text);
    if (!Array.isArray(questions) || questions.length === 0) return res.json({ ok: true, data: { count: 0, message: '未识别到题目' } });

    const bankName = req.body.bank_name || req.file.originalname.replace(/\.(docx|doc)$/i, '');
    const bank = createBank(req.userId, bankName);
    addQuestions(bank.lastInsertRowid, questions);
    console.log(`[Word] ${bankName}, ${questions.length}题`);
    res.json({ ok: true, data: { bank_id: bank.lastInsertRowid, bank_name: bankName, count: questions.length } });
  } catch (e) { console.error('[Word]', e); res.status(500).json({ ok: false, error: e.message }); }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ ok: false, error: err.message });
  if (err) return res.status(400).json({ ok: false, error: err.message });
  next();
});

module.exports = router;
