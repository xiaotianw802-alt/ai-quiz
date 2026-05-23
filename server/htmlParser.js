const fs = require('fs');
const cheerio = require('cheerio');

function parseChaoxingHTML(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);
  const questions = [];

  $('.questionLi').each(function (i, el) {
    const $q = $(el);

    let type = 'single';
    if ($q.hasClass('multipleQuesId')) type = 'multi';
    else if ($q.hasClass('judgeQuesId')) type = 'judge';
    else if ($q.hasClass('fillQuesId')) type = 'fill';
    else if ($q.hasClass('essayQuesId')) type = 'essay';

    const content = $q.find('.qtContent').first().text().trim();
    if (!content) return;

    const optionEls = $q.find('ul.mark_letter li');
    let options = '';
    if (optionEls.length > 0) {
      const opts = [];
      optionEls.each(function (j, opt) {
        opts.push($(opt).text().trim());
      });
      options = opts.join('\n');
    }

    // 智能识别题型
    if (options) {
      // 判断题：只有"对/错"或"正确/错误"两个选项
      if (optionEls.length === 2) {
        const texts = optionEls.map(function(j, o) { return $(o).text().trim(); }).get();
        if ((texts[0] === '对' && texts[1] === '错') ||
            (texts[0] === '正确' && texts[1] === '错误') ||
            (texts[0] === '√' && texts[1] === '×') ||
            (texts[0] === 'A' && texts[1] === 'B' && content.includes('正确') && content.includes('错误'))) {
          type = 'judge';
          options = '对\n错';
        }
      }
    } else {
      // 没有选项 → 填空题或简答题
      if (content.includes('___') || content.includes('____') || content.includes('（  ）') || content.includes('()') || content.includes('( )')) {
        type = 'fill';
      } else {
        type = 'essay';
      }
    }

    const answer = $q.find('.rightAnswerContent').first().text().trim();
    const scoreText = $q.find('.totalScore').first().text().trim();
    const difficulty = scoreText ? Math.min(5, Math.ceil(parseFloat(scoreText) || 1)) : 1;

    questions.push({
      type: type,
      content: content,
      options: options || null,
      answer: answer || null,
      analysis: null,
      difficulty: difficulty,
    });
  });

  return questions;
}

module.exports = { parseChaoxingHTML };