const https = require('https');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'api.deepseek.com';

function askDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    if (!DEEPSEEK_API_KEY) {
      console.log('[AI] 未配置 DeepSeek API Key');
      return resolve('[]');
    }

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

async function parseQuestionsFromText(rawText) {
  if (!DEEPSEEK_API_KEY) {
    console.log('[AI] 未配置 API Key，使用规则提取');
    return extractQuestionsByRule(rawText);
  }

  const prompt = `请从以下文本中识别所有题目，并以JSON数组返回。
格式: {"type":"single","content":"题目","options":"A. x\nB. y","answer":"A","analysis":"解析"}
如果原文本有答案请保留，没有请补充。

文本：
${rawText.slice(0, 15000)}`;

  const messages = [
    { role: 'system', content: '只返回JSON数组' },
    { role: 'user', content: prompt },
  ];

  try {
    const reply = await askDeepSeek(messages);
    return cleanJSON(reply);
  } catch (e) {
    console.error('[AI] 失败，使用备用方案:', e.message);
    return extractQuestionsByRule(rawText);
  }
}

function extractQuestionsByRule(text) {
  const questions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  let currentQ = null;
  let options = [];
  
  for (const line of lines) {
    if (/^(\d+[\.．、]|\[\d+\])/.test(line) || /^(单选题|多选题|判断题)/.test(line)) {
      if (currentQ) {
        currentQ.options = options.join('\n');
        questions.push(currentQ);
      }
      currentQ = { type: 'single', content: line, options: '', answer: '', analysis: '' };
      options = [];
      if (line.includes('判断')) currentQ.type = 'judge';
      else if (line.includes('多选')) currentQ.type = 'multi';
    }
    else if (/^[A-D][\.．、]/.test(line) && currentQ) {
      options.push(line);
    }
    else if (line.includes('答案') && currentQ) {
      const match = line.match(/答案[：:]\s*([A-D对错]+)/);
      if (match) currentQ.answer = match[1];
    }
    else if (currentQ && options.length === 0) {
      currentQ.content += '\n' + line;
    }
  }
  
  if (currentQ) {
    currentQ.options = options.join('\n');
    questions.push(currentQ);
  }
  
  console.log(`[Rule] 提取到 ${questions.length} 题`);
  return questions;
}

async function parseQuestionsFromImages(images) {
  if (!DEEPSEEK_API_KEY) {
    console.log('[AI] 未配置 API Key');
    return [];
  }
  return [];
}

function cleanJSON(reply) {
  let cleaned = reply.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

module.exports = { askDeepSeek, parseQuestionsFromText, parseQuestionsFromImages };
