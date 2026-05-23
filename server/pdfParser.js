const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * 解析PDF
 * 返回 { text: string } 或 { images: string[] }
 */
async function parsePDF(filePath, onProgress) {
  const dataBuffer = fs.readFileSync(filePath);

  // 先用 pdf-parse 尝试提取文字
  let text = '';
  try {
    const data = await pdfParse(dataBuffer);
    text = (data.text || '').trim();
  } catch (e) {
    text = '';
  }

  // 文字版PDF：直接返回文本
  if (text.length > 100) {
    if (onProgress) onProgress({ type: 'text' });
    return { text };
  }

  // 扫描版PDF：渲染每页为图片
  if (onProgress) onProgress({ type: 'scan_start', message: '检测到扫描版PDF，渲染图片中...' });
  return { images: await renderPagesToImages(filePath, onProgress) };
}

/**
 * 使用 mupdf 将PDF每页渲染为 base64 PNG
 */
async function renderPagesToImages(filePath, onProgress) {
  const mupdf = await import('mupdf');

  const doc = mupdf.default.Document.openDocument(filePath, 'application/pdf');
  const totalPages = doc.countPages();
  const images = [];

  for (let i = 0; i < totalPages; i++) {
    if (onProgress) onProgress({ type: 'render_progress', total: totalPages, current: i + 1 });

    try {
      const page = doc.loadPage(i);
      const pixmap = page.toPixmap(
        mupdf.default.Matrix.scale(1.5, 1.5),
        mupdf.default.ColorSpace.DeviceRGB
      );
      const pngBuffer = pixmap.asPNG();
      const base64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
      images.push(base64);
    } catch (e) {
      console.error(`第${i + 1}页渲染失败:`, e.message);
    }
  }

  return images;
}

module.exports = { parsePDF };