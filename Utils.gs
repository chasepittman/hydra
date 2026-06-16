// ============================================================
// Utils.gs — Shared helper functions + click tracking
// ============================================================

/**
 * Extract email address from a From header like "Name <email@example.com>"
 */
function extractEmail(fromHeader) {
  var match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  return fromHeader.toLowerCase().trim();
}

/**
 * Extract display name from a From header.
 * "Morning Brew <hello@morningbrew.com>" → "Morning Brew"
 */
function extractName(fromHeader) {
  var match = fromHeader.match(/^"?([^"<]+?)"?\s*</);
  if (match) return match[1].trim();
  var email = extractEmail(fromHeader);
  return email.split('@')[0];
}

/**
 * Extract the first meaningful article URL from an email's HTML body.
 * Skips tracking pixels, unsubscribe links, and very short URLs.
 */
function extractFirstLink(htmlBody) {
  if (!htmlBody) return null;
  var skipPattern = /unsubscribe|track|pixel|open\.php|click\.php|list-manage|mailto:|account|manage|preference|update.*profile/i;
  var linkPattern = /<a[^>]+href=["']?(https?:\/\/[^"'\s>]+)["']?/gi;
  var match;
  while ((match = linkPattern.exec(htmlBody)) !== null) {
    var url = match[1];
    if (url.length > 30 && !skipPattern.test(url)) return url;
  }
  return null;
}

/**
 * Extract the root domain from a full domain string.
 * "mail.morningbrew.com" → "morningbrew.com"
 */
function rootDomain(domain) {
  if (!domain) return '';
  var parts = domain.split('.');
  if (parts.length > 2) return parts.slice(-2).join('.');
  return domain;
}

/**
 * Extract domain from an email address.
 * "hello@mail.morningbrew.com" → "morningbrew.com"
 */
function domainFromEmail(email) {
  var parts = email.split('@');
  if (parts.length < 2) return '';
  return rootDomain(parts[1]);
}

/**
 * Format a Date object as "Monday, June 1, 2026"
 */
function formatDate(date) {
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' +
         date.getDate() + ', ' + date.getFullYear();
}

/**
 * Fetch article content from a URL.
 * Returns { text, html, failed }
 */
function fetchArticle(url) {
  try {
    var options = {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Hydra/1.0)' }
    };
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) return { text: null, html: null, failed: true };

    var rawHtml = response.getContentText();
    var cleaned = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

    var text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '\n\n').trim();

    var articleMatch =
      cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      cleaned.match(/<div[^>]*class="[^"]*(?:content|article|post|entry|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    var articleHtml = articleMatch ? articleMatch[1] : cleaned;
    return { text: text.substring(0, 5000), html: articleHtml.substring(0, 80000), failed: false };

  } catch (e) {
    Logger.log('fetchArticle error for ' + url + ': ' + e.message);
    return { text: null, html: null, failed: true };
  }
}

// ---------------------------------------------------------------
// Article cache helpers
// ---------------------------------------------------------------

function generateArticleId(senderEmail) {
  var date = new Date().toISOString().split('T')[0];
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, senderEmail + '|' + date);
  return bytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').substring(0, 12);
}

function cacheArticle(articleId, data) {
  var cache = CacheService.getScriptCache();
  var seconds = Math.min(CONFIG.articleCacheHours || 6, 6) * 3600;
  try {
    var payload = JSON.stringify(data);
    if (payload.length > 95000) {
      data.html = data.html ? data.html.substring(0, 60000) : null;
      data.truncated = true;
      payload = JSON.stringify(data);
    }
    cache.put('article_' + articleId, payload, seconds);
  } catch (e) {
    Logger.log('Cache write error: ' + e.message);
  }
}

function getCachedArticle(articleId) {
  try {
    var raw = CacheService.getScriptCache().get('article_' + articleId);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------
// Click tracking + preference learning
// ---------------------------------------------------------------

/**
 * Called from WebApp.gs when a reader page is opened.
 * Logs the open date for this sender.
 */
function logArticleOpen(senderEmail, senderName) {
  var key = _clickKey(senderEmail);
  var props = PropertiesService.getScriptProperties();
  var today = _today();

  var data = _getClickData(props, key, senderName);
  if (data.opens.indexOf(today) === -1) data.opens.push(today);
  data.opens = data.opens.filter(function(d) { return d >= _daysAgo(60); });

  props.setProperty(key, JSON.stringify(data));
}

/**
 * Called from Digest.gs when a newsletter appears in a digest.
 * Tracks how often each sender shows up so we can compute open rate.
 */
function logDigestAppearance(senderEmail, senderName) {
  var key = _clickKey(senderEmail);
  var props = PropertiesService.getScriptProperties();
  var today = _today();

  var data = _getClickData(props, key, senderName);
  if (data.appearances.indexOf(today) === -1) data.appearances.push(today);
  data.appearances = data.appearances.filter(function(d) { return d >= _daysAgo(60); });

  props.setProperty(key, JSON.stringify(data));
}

/**
 * Returns a formatted string summarising reading history across all senders
 * over the last 30 days, for passing to Gemini as context.
 *
 * Example output:
 *   Morning Brew: opened 8/12 times (67%) — strong interest
 *   TLDR: opened 1/14 times (7%) — low interest
 *   Lenny's Newsletter: opened 0/3 times (0%) — not yet engaged
 */
function getReadingHistoryContext() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var cutoff = _daysAgo(30);
  var lines = [];

  Object.keys(all).forEach(function(key) {
    if (key.indexOf('hydra_clicks_') !== 0) return;
    try {
      var data = JSON.parse(all[key]);
      var opens = data.opens.filter(function(d) { return d >= cutoff; }).length;
      var appearances = data.appearances.filter(function(d) { return d >= cutoff; }).length;
      if (appearances === 0) return;

      var rate = Math.round((opens / appearances) * 100);
      var signal = rate >= 60 ? 'strong interest' : rate >= 25 ? 'moderate interest' : 'low interest';
      lines.push(data.senderName + ': opened ' + opens + '/' + appearances + ' times (' + rate + '%) — ' + signal);
    } catch (e) {}
  });

  return lines.length > 0
    ? 'Reading history (last 30 days):\n' + lines.join('\n')
    : '';
}

// ---------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------

function _clickKey(senderEmail) {
  return 'hydra_clicks_' + senderEmail.replace(/[^a-z0-9]/gi, '_');
}

function _getClickData(props, key, senderName) {
  var raw = props.getProperty(key);
  return raw ? JSON.parse(raw) : { senderName: senderName, opens: [], appearances: [] };
}

function _today() {
  return new Date().toISOString().split('T')[0];
}

function _daysAgo(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
