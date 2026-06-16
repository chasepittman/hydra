// ============================================================
// Email.gs — Hydra HTML email builders
// ============================================================

var PRIORITY_LABELS = {
  5: '🔴 Must Read',
  4: '🟠 High',
  3: '🟡 Worth a Look',
  2: '⚪ Low',
  1: '⚫ Skip'
};

var PRIORITY_COLORS = {
  5: '#c0392b',
  4: '#e67e22',
  3: '#f1c40f',
  2: '#95a5a6',
  1: '#7f8c8d'
};

// ---------------------------------------------------------------
// DIGEST EMAIL
// ---------------------------------------------------------------

function buildDigestEmail(items, recipient) {
  var date = formatDate(new Date());
  var count = items.length;
  var blocks = items.map(function(item) { return _newsletterBlock(item); }).join('\n');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f5f6fa;' +
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">' +
    '<div style="max-width:620px;margin:24px auto;padding:0 12px;">' +

    '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;' +
    'border-radius:12px;padding:24px;margin-bottom:16px;">' +
    '<h1 style="margin:0;font-size:22px;font-weight:700;">📬 Hydra</h1>' +
    '<p style="margin:6px 0 0;font-size:14px;opacity:.8;">' + date +
    ' &nbsp;·&nbsp; ' + count + ' newsletter' + (count !== 1 ? 's' : '') + '</p>' +
    '</div>' +

    '<div style="background:white;border-radius:8px;padding:10px 14px;' +
    'margin-bottom:16px;font-size:12px;color:#7f8c8d;border:1px solid #e0e0e0;">' +
    '🔴 Must Read &nbsp;·&nbsp; 🟠 High &nbsp;·&nbsp; 🟡 Worth a Look &nbsp;·&nbsp; ⚪ Low' +
    '</div>' +

    blocks +

    '<div style="text-align:center;padding:16px;font-size:12px;color:#bdc3c7;">' +
    'Sent to ' + recipient + ' · ' +
    '<a href="https://github.com/yourusername/hydra" style="color:#bdc3c7;">Hydra on GitHub</a>' +
    '</div>' +

    '</div></body></html>';
}

function _newsletterBlock(item) {
  var priority = item.priority || 3;
  var color = PRIORITY_COLORS[priority] || '#f1c40f';
  var label = PRIORITY_LABELS[priority] || '🟡 Worth a Look';

  var links = [];

  if (CONFIG.webAppUrl && item.articleId) {
    links.push(
      '<a href="' + CONFIG.webAppUrl + '?id=' + item.articleId + '" ' +
      'style="display:inline-block;background:#1a1a2e;color:white;' +
      'padding:6px 14px;border-radius:6px;font-size:13px;' +
      'font-weight:600;text-decoration:none;">📖 Read Full Article</a>'
    );
  }

  if (item.articleUrl) {
    if (item.fetchFailed) {
      links.push(
        '<a href="' + item.articleUrl + '" ' +
        'style="display:inline-block;color:#7f8c8d;font-size:13px;text-decoration:none;">' +
        '⚠️ Fetch failed — view original</a>'
      );
    } else {
      links.push(
        '<a href="' + item.articleUrl + '" ' +
        'style="display:inline-block;color:#95a5a6;font-size:13px;text-decoration:none;">' +
        '↗ View original</a>'
      );
    }
  }

  var linksHtml = links.length > 0
    ? '<div style="margin-top:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
      links.join('') + '</div>'
    : '';

  var whyHtml = item.whyItMatters
    ? '<p style="margin:8px 0 0;font-size:13px;color:#7f8c8d;font-style:italic;">💡 ' +
      item.whyItMatters + '</p>'
    : '';

  return '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;' +
    'margin-bottom:14px;background:#fff;">' +

    '<div style="display:flex;justify-content:space-between;align-items:center;' +
    'flex-wrap:wrap;gap:6px;margin-bottom:10px;">' +
    '<div>' +
    '<span style="font-weight:bold;font-size:15px;">' + _esc(item.senderName) + '</span>' +
    '<span style="color:#7f8c8d;font-size:13px;margin-left:8px;">' + _esc(item.subject) + '</span>' +
    '</div>' +
    '<span style="background:' + color + ';color:white;padding:2px 8px;' +
    'border-radius:10px;font-size:11px;font-weight:bold;white-space:nowrap;">' +
    label + '</span>' +
    '</div>' +

    '<p style="margin:0;font-size:14px;line-height:1.6;color:#2c3e50;">' + _esc(item.summary) + '</p>' +
    whyHtml +
    linksHtml +
    '</div>';
}

// ---------------------------------------------------------------
// AUDIT EMAIL
// ---------------------------------------------------------------

function buildAuditEmail(newsletters, scannedDays) {
  var count = newsletters.length;
  var foundSignup = newsletters.filter(function(n) { return n.signupUrl; }).length;
  var date = formatDate(new Date());

  var rows = newsletters.map(function(nl, i) {
    var unsubCell = nl.unsubscribeUrl
      ? '<a href="' + nl.unsubscribeUrl + '" style="color:#e74c3c;">Unsubscribe</a>'
      : '<span style="color:#bdc3c7;">not found</span>';
    var signupCell = nl.signupUrl
      ? '<a href="' + nl.signupUrl + '" style="color:#27ae60;">Signup page</a>'
      : '<span style="color:#bdc3c7;">not found</span>';
    var rowBg = i % 2 === 0 ? '#fff' : '#f9f9f9';

    return '<tr style="background:' + rowBg + ';">' +
      '<td style="padding:10px 12px;font-weight:bold;">' + _esc(nl.senderName) + '</td>' +
      '<td style="padding:10px 12px;color:#7f8c8d;font-size:13px;">' + _esc(nl.senderEmail) + '</td>' +
      '<td style="padding:10px 12px;text-align:center;">' + (nl.count || '—') + '</td>' +
      '<td style="padding:10px 12px;text-align:center;">' + unsubCell + '</td>' +
      '<td style="padding:10px 12px;text-align:center;">' + signupCell + '</td>' +
      '</tr>';
  }).join('\n');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;background:#f5f6fa;' +
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">' +
    '<div style="max-width:800px;margin:24px auto;padding:0 12px;">' +

    '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;' +
    'border-radius:12px;padding:24px;margin-bottom:16px;">' +
    '<h1 style="margin:0;font-size:22px;font-weight:700;">📋 Hydra — Inbox Audit</h1>' +
    '<p style="margin:6px 0 0;font-size:14px;opacity:.8;">' + date +
    ' &nbsp;·&nbsp; Scanned last ' + scannedDays + ' days' +
    ' &nbsp;·&nbsp; ' + count + ' newsletters found</p>' +
    '</div>' +

    '<div style="background:white;border-radius:8px;padding:14px 16px;' +
    'margin-bottom:16px;border:1px solid #e0e0e0;font-size:14px;">' +
    '✅ <strong>' + foundSignup + '</strong> signup pages found &nbsp;·&nbsp; ' +
    '⚠️ <strong>' + (count - foundSignup) + '</strong> not found (search manually)' +
    '</div>' +

    '<div style="background:#eaf4fb;border-radius:8px;padding:14px 16px;' +
    'margin-bottom:16px;border:1px solid #aed6f1;font-size:14px;line-height:1.6;">' +
    '<strong>Next steps:</strong><br>' +
    '1. Click <strong>Signup page</strong> for each newsletter and resubscribe using ' +
    '<strong>yourname+newsletters@gmail.com</strong><br>' +
    '2. Click <strong>Unsubscribe</strong> to remove the original subscription<br>' +
    '3. Set <code>plusAlias: "newsletters"</code> in Config.gs to filter your digest' +
    '</div>' +

    '<div style="border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
    '<thead><tr style="background:#1a1a2e;color:white;">' +
    '<th style="padding:12px;text-align:left;">Newsletter</th>' +
    '<th style="padding:12px;text-align:left;">Sender</th>' +
    '<th style="padding:12px;text-align:center;">Emails</th>' +
    '<th style="padding:12px;text-align:center;">Unsubscribe</th>' +
    '<th style="padding:12px;text-align:center;">Resubscribe With + Alias</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table></div>' +

    '</div></body></html>';
}

// ---------------------------------------------------------------
// Shared
// ---------------------------------------------------------------

function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
