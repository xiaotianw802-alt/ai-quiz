const { askDeepSeek } = require('./aiService');
const { getDB } = require('./db');

/**
 * 为无答案的题目自动生成答案
 */
async function fillMissingAnswers(questions) {
  const results = [];
  
  for (const q of questions) {
    // 如果已经有答案，跳过
    if (q.answer && q.answer.trim() !== '') {
      results.push(q);
      continue;
    }
    
    try {
      console.log(`[AutoFill] 正在为题目生成答案: ${q.content.slice(0, 50)}...`);
      
      const prompt = `请为以下题目生成正确答案和解析：

题目类型: ${q.type}
题目内容: ${q.content}
${q.options ? '选项:\n' + q.options : ''}

请严格按以下JSON格式返回（不要包含markdown代码块）：
{
  "answer": "正确答案",
  "analysis": "详细解析说明"
}

注意：
1. 判断题答案只能是"对"或"错"
2. 单选题答案只能是选项字母如"A"
3. 多选题答案是多个字母如"ABC"
4. 填空题答案是填空内容
5. 简答题给出简要答案`;

      const messages = [
        { role: 'system', content: '你是一个专业的题库老师，擅长生成准确的答案和解析。' },
        { role: 'user', content: prompt }
      ];
      
      const reply = await askDeepSeek(messages);
      const parsed = JSON.parse(reply.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim());
      
      q.answer = parsed.answer || '';
      q.analysis = parsed.analysis || '';
      
      console.log(`[AutoFill] 生成成功: 答案=${q.answer}`);
    } catch (e) {
      console.error(`[AutoFill] 生成失败:`, e.message);
      q.answer = q.answer || '';
      q.analysis = q.analysis || '';
    }
    
    results.push(q);
  }
  
  return results;
}

/**
 * 更新数据库中的题目答案
 */
function updateQuestionAnswers(bankId, questions) {
  const db = getDB();
  const stmt = db.prepare('UPDATE questions SET answer = ?, analysis = ? WHERE id = ?');
  
  let updated = 0;
  for (const q of questions) {
    if (q.id && (q.answer || q.analysis)) {
      stmt.run(q.answer || '', q.analysis || '', q.id);
      updated++;
    }
  }
  
  console.log(`[AutoFill] 已更新 ${updated} 道题目的答案`);
  return updated;
}

module.exports = { fillMissingAnswers, updateQuestionAnswers };