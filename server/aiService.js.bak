const https = require('https');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'api.deepseek.com';

function askDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: false,
    });

    const req = https.request(
      {
        hostname: DEEPSEEK_BASE_URL,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 180000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.choices && result.choices[0]) {
              resolve(result.choices[0].message.content);
            } else {
              reject(new Error(result.error ? result.error.message : 'AI返回异常'));
            }
          } catch (e) {
            reject(new Error('AI响应解析失败: ' + data.slice(0, 200)));
          }
        });
      }
    );

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI请求超时'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * 文字版PDF：发送文本给DeepSeek识别题目
 */
async function parseQuestionsFromText(rawText) {
  const prompt = `你是一个专业的题库解析助手。请从以下文本中识别所有题目，并以严格的JSON数组返回。

每种题型格式如下：
- 单选题: {"type":"single","content":"题目内容","options":"A. 选项1\\nB. 选项2\\nC. 选项3\\nD. 选项4","answer":"A","analysis":"解析"}
- 多选题: {"type":"multi","content":"题目内容","options":"A. 选项1\\nB. 选项2\\nC. 选项3\\nD. 选项4","answer":"ABC","analysis":"解析"}
- 判断题: {"type":"judge","content":"题目内容","options":"对\\n错","answer":"对","analysis":"解析"}
- 填空题: {"type":"fill","content":"题目内容（用___表示空）","answer":"答案","analysis":"解析"}
- 简答题: {"type":"essay","content":"题目内容","answer":"参考答案","analysis":"解析"}

注意：
1. 如果原文本已有答案和解析，保留它们
2. 如果原文本缺少答案或解析，请根据题目内容补充
3. 只返回纯JSON数组，不要包含markdown代码块标记
4. 如果文本中没有题目，返回空数组 []

文本内容：
${rawText.slice(0, 15000)}`;

  const messages = [
    { role: 'system', content: '你是一个专业的题库解析助手，只返回严格的JSON格式。' },
    { role: 'user', content: prompt },
  ];

  const reply = await askDeepSeek(messages);
  return cleanJSON(reply);
}

/**
 * 扫描版PDF：发送图片给DeepSeek Vision识别题目
 */
async function parseQuestionsFromImages(images) {
  const prompt = `你是一个专业的题库解析助手。请从这些试卷图片中识别所有题目，并以严格的JSON数组返回。

每种题型格式如下：
- 单选题: {"type":"single","content":"题目内容","options":"A. 选项1\\nB. 选项2\\nC. 选项3\\nD. 选项4","answer":"A","analysis":"解析"}
- 多选题: {"type":"multi","content":"题目内容","options":"A. 选项1\\nB. 选项2\\nC. 选项3\\nD. 选项4","answer":"ABC","analysis":"解析"}
- 判断题: {"type":"judge","content":"题目内容","options":"对\\n错","answer":"对","analysis":"解析"}
- 填空题: {"type":"fill","content":"题目内容（用___表示空）","answer":"答案","analysis":"解析"}
- 简答题: {"type":"essay","content":"题目内容","answer":"参考答案","analysis":"解析"}

注意：
1. 请仔细识别图片中的每一道题
2. 如果图片中已有答案和解析，保留它们
3. 如果缺少答案或解析，请根据题目内容补充
4. 只返回纯JSON数组，不要包含markdown代码块标记
5. 如果图片中没有题目，返回空数组 []`;

  // 每批最多5张图片，避免token超限
  const BATCH_SIZE = 5;
  const allQuestions = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const content = [
      { type: 'text', text: prompt },
      ...batch.map(img => ({
        type: 'image_url',
        image_url: { url: img },
      })),
    ];

    const messages = [
      { role: 'system', content: '你是一个专业的题库解析助手，只返回严格的JSON格式。' },
      { role: 'user', content },
    ];

    console.log(`[AI] 处理第 ${i + 1}-${Math.min(i + BATCH_SIZE, images.length)} 页 (共${images.length}页)...`);
    const reply = await askDeepSeek(messages);
    const questions = cleanJSON(reply);
    allQuestions.push(...questions);
  }

  return allQuestions;
}

function cleanJSON(reply) {
  let cleaned = reply.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

module.exports = { askDeepSeek, parseQuestionsFromText, parseQuestionsFromImages };