const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Railway持久化: 数据库存到 /data 目录（自动持久化）
// 本地开发: 存到项目目录
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'quiz.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('single','multi','judge','fill','essay')),
      content TEXT NOT NULL,
      options TEXT,
      answer TEXT,
      analysis TEXT,
      difficulty INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      user_answer TEXT,
      is_correct INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
  `);

  migrateOldData();
}

function migrateOldData() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(banks)").all();
    const hasUserId = tableInfo.some(col => col.name === 'user_id');
    if (!hasUserId) {
      db.exec(`ALTER TABLE banks ADD COLUMN user_id INTEGER DEFAULT 1;`);
      db.exec(`ALTER TABLE records ADD COLUMN user_id INTEGER DEFAULT 1;`);
      const defaultUser = db.prepare('SELECT id FROM users WHERE id = 1').get();
      if (!defaultUser) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO users (id, username, password_hash) VALUES (1, ?, ?)').run('admin', hash);
      }
    }
  } catch (e) {
    console.log('Migration check:', e.message);
  }
}

function createUser(username, password) {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = getDB().prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  return stmt.run(username, hash);
}

function getUserByUsername(username) {
  return getDB().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return getDB().prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function createBank(userId, name) {
  const stmt = getDB().prepare('INSERT INTO banks (user_id, name) VALUES (?, ?)');
  return stmt.run(userId, name);
}

function getBanks(userId) {
  return getDB().prepare(`
    SELECT b.*, (SELECT COUNT(*) FROM questions WHERE bank_id=b.id) AS q_count 
    FROM banks b WHERE b.user_id = ? ORDER BY b.id DESC
  `).all(userId);
}

function addQuestions(bankId, questions) {
  const insert = getDB().prepare('INSERT INTO questions (bank_id,type,content,options,answer,analysis,difficulty) VALUES (?,?,?,?,?,?,?)');
  const insertMany = getDB().transaction((items) => {
    for (const q of items) {
      insert.run(bankId, q.type, q.content, q.options || null, q.answer || null, q.analysis || null, q.difficulty || 1);
    }
  });
  insertMany(questions);
  return questions.length;
}

function getQuestions(userId, bankId, limit) {
  const sql = bankId
    ? `SELECT q.* FROM questions q INNER JOIN banks b ON q.bank_id = b.id WHERE b.user_id = ? AND q.bank_id = ? ORDER BY RANDOM() LIMIT ?`
    : `SELECT q.* FROM questions q INNER JOIN banks b ON q.bank_id = b.id WHERE b.user_id = ? ORDER BY RANDOM() LIMIT ?`;
  const params = bankId ? [userId, bankId, limit || 30] : [userId, limit || 30];
  return getDB().prepare(sql).all(...params);
}

function getWrongQuestions(userId, bankId, limit) {
  const db = getDB();
  const bankFilter = bankId ? 'AND q.bank_id = ?' : '';
  const sql = `
    WITH last_wrong AS (
      SELECT question_id, MAX(id) as wrong_id
      FROM records WHERE user_id = ? AND is_correct = 0 GROUP BY question_id
    ),
    correct_after AS (
      SELECT lw.question_id, COUNT(*) as cnt
      FROM last_wrong lw
      INNER JOIN records r ON r.question_id = lw.question_id AND r.user_id = ? AND r.id > lw.wrong_id AND r.is_correct = 1
      GROUP BY lw.question_id
    )
    SELECT DISTINCT q.* FROM questions q
    INNER JOIN banks b ON q.bank_id = b.id
    INNER JOIN last_wrong lw ON q.id = lw.question_id
    LEFT JOIN correct_after ca ON q.id = ca.question_id
    WHERE b.user_id = ? AND (ca.cnt IS NULL OR ca.cnt < 3) ${bankFilter}
    ORDER BY RANDOM() LIMIT ?
  `;
  const finalParams = bankId
    ? [userId, userId, userId, bankId, limit || 30]
    : [userId, userId, userId, limit || 30];
  return db.prepare(sql).all(...finalParams);
}

function saveRecord(userId, questionId, userAnswer, isCorrect) {
  getDB().prepare('INSERT INTO records (user_id, question_id, user_answer, is_correct) VALUES (?,?,?,?)')
    .run(userId, questionId, userAnswer, isCorrect ? 1 : 0);
}

function getWrongStatsByBank(userId) {
  const db = getDB();
  const sql = `
    WITH last_wrong AS (
      SELECT question_id, MAX(id) as wrong_id
      FROM records WHERE user_id = ? AND is_correct = 0 GROUP BY question_id
    ),
    correct_after AS (
      SELECT lw.question_id, COUNT(*) as cnt
      FROM last_wrong lw
      INNER JOIN records r ON r.question_id = lw.question_id AND r.user_id = ? AND r.id > lw.wrong_id AND r.is_correct = 1
      GROUP BY lw.question_id
    )
    SELECT q.bank_id, COUNT(DISTINCT q.id) as wrong_count
    FROM questions q
    INNER JOIN banks b ON q.bank_id = b.id
    INNER JOIN last_wrong lw ON q.id = lw.question_id
    LEFT JOIN correct_after ca ON q.id = ca.question_id
    WHERE b.user_id = ? AND (ca.cnt IS NULL OR ca.cnt < 3)
    GROUP BY q.bank_id
  `;
  return db.prepare(sql).all(userId, userId, userId);
}

function getTotalStats(userId) {
  const db = getDB();
  const total = db.prepare(`SELECT COUNT(*) as c FROM questions q INNER JOIN banks b ON q.bank_id = b.id WHERE b.user_id = ?`).get(userId);
  const wrongStats = getWrongStatsByBank(userId);
  const wrongQ = wrongStats.reduce((sum, s) => sum + s.wrong_count, 0);
  return { total_q: total.c, wrong_q: wrongQ };
}

function isQuestionOwner(userId, questionId) {
  const result = getDB().prepare(`
    SELECT 1 FROM questions q INNER JOIN banks b ON q.bank_id = b.id WHERE q.id = ? AND b.user_id = ?
  `).get(questionId, userId);
  return !!result;
}

module.exports = {
  getDB, createUser, getUserByUsername, getUserById, verifyPassword,
  createBank, getBanks, addQuestions, getQuestions,
  getWrongQuestions, saveRecord, getWrongStatsByBank, getTotalStats, isQuestionOwner
};
