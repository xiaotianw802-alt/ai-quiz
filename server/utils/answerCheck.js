/**
 * 智能答案比对
 */

const JUDGE_MAP = {
  'A': ['对', '正确', 'true', '是', 'yes', 'right', 'correct', 'T'],
  'B': ['错', '错误', 'false', '否', 'no', 'wrong', 'incorrect', 'F'],
};

function normalizeAnswer(answer, questionType) {
  if (!answer) return '';
  const a = answer.trim();
  
  if (questionType === 'judge') {
    const upper = a.toUpperCase();
    if (upper === 'A' || upper === 'B') return upper;
    for (const [key, values] of Object.entries(JUDGE_MAP)) {
      if (Array.isArray(values) && values.some(v => v.toLowerCase() === a.toLowerCase())) {
        return key;
      }
    }
  }
  
  if (questionType === 'single') return a.toUpperCase();
  if (questionType === 'multi') return a.split('').map(c => c.toUpperCase()).sort().join('');
  return a;
}

function checkAnswer(userAnswer, correctAnswer, questionType) {
  if (!userAnswer || !correctAnswer) return false;
  const ua = normalizeAnswer(userAnswer, questionType);
  const ca = normalizeAnswer(correctAnswer, questionType);
  if (!ua || !ca) return false;
  if (questionType === 'fill' || questionType === 'essay') {
    return ua.toLowerCase() === ca.toLowerCase() || ca.toLowerCase().includes(ua.toLowerCase());
  }
  return ua === ca;
}

module.exports = { normalizeAnswer, checkAnswer };