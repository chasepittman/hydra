// ============================================================
// WebApp.gs — Hydra full article reader page
//
// Setup: Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone with Google account
//        Copy the URL → paste into Config.gs webAppUrl
// ============================================================

function doGet(e) {
  var articleId = e && e.parameter && e.parameter.id;

  if (!articleId) return _renderError('No article ID provided.');

  var data = getCachedArticle(articleId);

  if (!data) return _renderExpired();

  // Log the open for preference learning
  if (data.senderEmail) {
    logArticleOpen(data.senderEmail, data.senderName);
  }

  return HtmlService
    .createHtmlOutput(_renderArticle(data))
    .setTitle(data.senderName + ' — ' + data.subject)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------

function _renderArticle(data) {
  var truncatedWarning = data.truncated
    ? '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;' +
      'padding:10px 14px;margin-bottom:20px;font-size:13px;color:#856404;">' +
      '⚠️ This article was very long — showing the first portion. ' +
      '<a href="' + data.articleUrl + '" style="color:#856404;">Read the full piece here.</a></div>'
    : '';

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + _esc(data.senderName) + ' — ' + _esc(data.subject) + '</title>' +
    '<style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { background: #f5f6fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #2c3e50; }' +
      '.topbar { background: linear-gradient(135deg,#1a1a2e,#16213e); color: white; padding: 16px 24px; position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }' +
      '.topbar-brand { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }' +
      '.topbar-meta { font-size: 13px; opacity: 0.7; }' +
      '.topbar a { color: #aed6f1; font-size: 13px; text-decoration: none; }' +
      '.topbar a:hover { color: white; }' +
      '.wrapper { max-width: 720px; margin: 32px auto; padding: 0 20px 60px; }' +
      '.article-header { background: white; border-radius: 12px; padding: 24px 28px; margin-bottom: 24px; border: 1px solid #e0e0e0; }' +
      '.sender-name { font-size: 13px; font-weight: 600; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }' +
      '.article-title { font-size: 22px; font-weight: 700; line-height: 1.35; color: #1a1a2e; margin-bottom: 12px; }' +
      '.article-meta { font-size: 13px; color: #95a5a6; display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }' +
      '.original-link { display: inline-block; background: #f5f6fa; border: 1px solid #e0e0e0; color: #2c3e50; padding: 6px 14px; border-radius: 6px; font-size: 13px; text-decoration: none; }' +
      '.original-link:hover { background: #e8eaf0; }' +
      '.article-body { background: white; border-radius: 12px; padding: 28px; border: 1px solid #e0e0e0; line-height: 1.75; font-size: 16px; color: #2c3e50; }' +
      '.article-body p { margin-bottom: 1.2em; }' +
      '.article-body h1, .article-body h2, .article-body h3 { font-weight: 700; margin: 1.5em 0 0.6em; line-height: 1.3; }' +
      '.article-body h1 { font-size: 1.4em; }' +
      '.article-body h2 { font-size: 1.2em; }' +
      '.article-body h3 { font-size: 1.05em; }' +
      '.article-body a { color: #2980b9; }' +
      '.article-body img { max-width: 100%; height: auto; border-radius: 6px; margin: 1em 0; }' +
      '.article-body ul, .article-body ol { padding-left: 1.5em; margin-bottom: 1.2em; }' +
      '.article-body li { margin-bottom: 0.4em; }' +
      '.article-body blockquote { border-left: 3px solid #e0e0e0; padding-left: 16px; color: #7f8c8d; font-style: italic; margin: 1.2em 0; }' +
      '.plain-text { white-space: pre-wrap; font-size: 15px; line-height: 1.7; }' +
    '</style></head><body>' +

    '<div class="topbar">' +
    '<span class="topbar-brand">📬 Hydra</span>' +
    '<span class="topbar-meta">' + _esc(data.date) + '</span>' +
    '<a href="' + (data.articleUrl || '#') + '" target="_blank">↗ Original article</a>' +
    '</div>' +

    '<div class="wrapper">' +

    '<div class="article-header">' +
    '<div class="sender-name">' + _esc(data.senderName) + '</div>' +
    '<div class="article-title">' + _esc(data.subject) + '</div>' +
    '<div class="article-meta">' +
    '<span>' + _esc(data.date) + '</span>' +
    (data.articleUrl
      ? '<a href="' + data.articleUrl + '" target="_blank" class="original-link">↗ View original source</a>'
      : '') +
    '</div></div>' +

    truncatedWarning +

    '<div class="article-body">' +
    (data.html ? _sanitizeHtml(data.html) : '<div class="plain-text">' + _esc(data.text || 'No content available.') + '</div>') +
    '</div></div></body></html>';
}

function _renderExpired() {
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Article Expired — Hydra</title>' +
    '<style>body{font-family:-apple-system,sans-serif;background:#f5f6fa;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}' +
    '.card{background:white;border-radius:12px;padding:40px;max-width:420px;' +
    'text-align:center;border:1px solid #e0e0e0;}' +
    'h2{color:#1a1a2e;margin-bottom:12px;}p{color:#7f8c8d;line-height:1.6;font-size:15px;}</style></head>' +
    '<body><div class="card">' +
    '<div style="font-size:40px;margin-bottom:16px;">⏱️</div>' +
    '<h2>Article Expired</h2>' +
    '<p>This link is valid for ' + (CONFIG.articleCacheHours || 6) + ' hours after the digest is sent.</p>' +
    '<p style="margin-top:12px;">Check your digest email for the original source link.</p>' +
    '</div></body></html>'
  ).setTitle('Article Expired — Hydra');
}

function _renderError(msg) {
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Error — Hydra</title>' +
    '<style>body{font-family:-apple-system,sans-serif;background:#f5f6fa;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}' +
    '.card{background:white;border-radius:12px;padding:40px;max-width:420px;' +
    'text-align:center;border:1px solid #e0e0e0;}' +
    'h2{color:#1a1a2e;}p{color:#7f8c8d;font-size:15px;}</style></head>' +
    '<body><div class="card">' +
    '<div style="font-size:40px;margin-bottom:16px;">❌</div>' +
    '<h2>Something went wrong</h2><p>' + _esc(msg) + '</p>' +
    '</div></body></html>'
  ).setTitle('Error — Hydra');
}

function _sanitizeHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '');
}

function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
