// ============================================================
// Audit.gs — Hydra inbox audit
//
// Run this once at the start. It will send you an email with:
//   - Every newsletter you're subscribed to
//   - Unsubscribe links
//   - Signup page URLs (for resubscribing with your + alias)
// ============================================================

var AUDIT_DAYS = 60;

function runAudit() {
  Logger.log('Hydra: starting inbox audit (last ' + AUDIT_DAYS + ' days)...');

  var newsletters = _detectNewsletters();

  if (newsletters.length === 0) {
    Logger.log('No newsletters found. Try searching Gmail manually: has:list-unsubscribe');
    return;
  }

  Logger.log('Found ' + newsletters.length + ' unique senders. Finding signup pages...');
  _enrichSignupUrls(newsletters);

  var recipient = CONFIG.digestRecipient || Session.getActiveUser().getEmail();
  var html = buildAuditEmail(newsletters, AUDIT_DAYS);

  GmailApp.sendEmail(
    recipient,
    '📋 Hydra Audit — ' + newsletters.length + ' newsletters found',
    'Your Hydra inbox audit (HTML email)',
    { htmlBody: html, name: 'Hydra' }
  );

  Logger.log('Audit email sent to ' + recipient + '. Done!');
}

// ---------------------------------------------------------------
// Detection
// ---------------------------------------------------------------

function _detectNewsletters() {
  var query = 'has:list-unsubscribe newer_than:' + AUDIT_DAYS + 'd';
  if (CONFIG.plusAlias) query += ' to:+' + CONFIG.plusAlias;

  Logger.log('Searching Gmail: ' + query);
  var threads = GmailApp.search(query, 0, 200);
  Logger.log('Threads found: ' + threads.length);

  var seen = {};

  for (var i = 0; i < threads.length; i++) {
    try {
      var message = threads[i].getMessages()[0];
      var from = message.getFrom();
      var senderEmail = extractEmail(from);

      if (CONFIG.excludeSenders.indexOf(senderEmail) !== -1) continue;

      var unsubHeader = message.getHeader('List-Unsubscribe') || '';

      if (!seen[senderEmail]) {
        seen[senderEmail] = {
          senderName: extractName(from),
          senderEmail: senderEmail,
          senderDomain: domainFromEmail(senderEmail),
          unsubscribeUrl: _parseUnsubscribeUrl(unsubHeader),
          signupUrl: null,
          sampleSubject: message.getSubject(),
          count: 0
        };
      }
      seen[senderEmail].count++;
    } catch (e) {
      Logger.log('Error on thread ' + i + ': ' + e.message);
    }
  }

  var results = Object.values(seen);
  results.sort(function(a, b) { return b.count - a.count; });
  return results;
}

function _parseUnsubscribeUrl(headerValue) {
  if (!headerValue) return null;
  var httpsMatch = headerValue.match(/<(https?:\/\/[^>]+)>/);
  if (httpsMatch) return httpsMatch[1];
  var urlMatch = headerValue.match(/https?:\/\/[^\s,<>]+/);
  return urlMatch ? urlMatch[0] : null;
}

// ---------------------------------------------------------------
// Signup URL enrichment
// ---------------------------------------------------------------

var PLATFORM_PATTERNS = [
  { suffix: 'substack.com',       template: 'https://%s/subscribe' },
  { suffix: 'beehiiv.com',        template: 'https://%s/subscribe' },
  { suffix: 'ghost.io',           template: 'https://%s/#/portal/signup' },
  { suffix: 'mailerlite.com',     template: null },
  { suffix: 'mailchimp.com',      template: null },
  { suffix: 'constantcontact.com',template: null },
];

function _enrichSignupUrls(newsletters) {
  var SLUGS = ['/subscribe', '/newsletter', '/signup', '/join'];

  for (var i = 0; i < newsletters.length; i++) {
    var nl = newsletters[i];
    var domain = nl.senderDomain;
    if (!domain) continue;

    var found = false;
    for (var j = 0; j < PLATFORM_PATTERNS.length; j++) {
      if (domain.endsWith(PLATFORM_PATTERNS[j].suffix) ||
          nl.senderEmail.includes(PLATFORM_PATTERNS[j].suffix)) {
        if (PLATFORM_PATTERNS[j].template) {
          nl.signupUrl = PLATFORM_PATTERNS[j].template.replace('%s', domain);
        }
        found = true;
        break;
      }
    }
    if (found) continue;

    for (var k = 0; k < SLUGS.length; k++) {
      if (_urlExists('https://' + domain + SLUGS[k])) {
        nl.signupUrl = 'https://' + domain + SLUGS[k];
        break;
      }
    }

    if (!nl.signupUrl) nl.signupUrl = _scrapeHomepageForSignup(domain);

    Utilities.sleep(300);
  }
}

function _urlExists(url) {
  try {
    var r = UrlFetchApp.fetch(url, { method: 'head', muteHttpExceptions: true, followRedirects: true });
    return r.getResponseCode() < 400;
  } catch (e) { return false; }
}

function _scrapeHomepageForSignup(domain) {
  try {
    var base = 'https://' + domain;
    var r = UrlFetchApp.fetch(base, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return null;
    var html = r.getContentText();
    var pattern = /href=["']([^"']+)["'][^>]*>[^<]*(subscribe|newsletter|sign.?up|join)[^<]*/gi;
    var match;
    while ((match = pattern.exec(html)) !== null) {
      var href = match[1];
      if (href.startsWith('http')) return href;
      if (href.startsWith('/')) return base + href;
    }
  } catch (e) {}
  return null;
}
