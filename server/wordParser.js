const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mammoth = require('mammoth');

/**
 * 解析Word文档(.docx / .doc)，提取纯文本
 */
async function parseWord(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx') {
    // .docx 用 mammoth 提取
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  if (ext === '.doc') {
    // .doc 用 PowerShell COM 提取
    return parseDocViaPowerShell(filePath);
  }

  throw new Error('不支持的文件格式: ' + ext);
}

/**
 * 通过PowerShell COM自动化提取.doc文本（需安装Word）
 */
function parseDocViaPowerShell(filePath) {
  const absPath = path.resolve(filePath);
  const script = `
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open('${absPath.replace(/'/g, "''")}')
  $text = $doc.Content.Text
  $doc.Close()
  [Console]::OutputEncoding = [Text.Encoding]::UTF8
  Write-Output $text
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
`;
  try {
    const result = execSync(
      `powershell.exe -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { encoding: 'utf-8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 }
    );
    return (result || '').trim();
  } catch (e) {
    // COM 不可用时，尝试直接读原始文本
    console.log('[Word] COM失败，尝试原始读取:', e.message.slice(0, 80));
    return parseDocRaw(filePath);
  }
}

/**
 * 原始方式读.doc（兜底，可能含乱码但中文通常可读）
 */
function parseDocRaw(filePath) {
  const buf = fs.readFileSync(filePath);
  // .doc 文件中文字符通常以UTF-16LE存储
  // 简单过滤可读字符
  let text = '';
  for (let i = 0; i < buf.length - 1; i++) {
    const code = buf.readUInt16LE(i);
    // 中文字符范围 + 常见ASCII
    if ((code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3000 && code <= 0x303F) ||
        (code >= 0xFF00 && code <= 0xFFEF) ||
        (code >= 0x20 && code <= 0x7E) ||
        code === 0x0D || code === 0x0A) {
      text += String.fromCharCode(code);
    }
  }
  // 清理：连续非中文字符至少保留换行
  text = text.replace(/[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\x20-\x7e\r\n]+/g, ' ');
  return text.trim();
}

module.exports = { parseWord };