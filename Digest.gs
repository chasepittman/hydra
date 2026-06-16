// ============================================================
// Digest.gs — Hydra daily digest runner
//
// Run manually:   runDigest()
// Preview only:   runDigest(true)  ← logs to console, no email sent
// ============================================================

function runDigest(dryRun) {
  dryRun = dryRun || false;
  var startTime = new Date();
  Logger.log('Hydra: starting digest' + (dryRun ? ' (dry run)' : '') + '...');

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Logger.log('ERROR: Gemini API key not set. Run setup() first.');
    return;
  }

  // Build Gmail search query
  var query = 'has:list-unsubscribe newer_than:' + CONFIG.daysBack + 'd';
  if (CONFIG.plusAlias) query += ' to:+' + CONFIG.plusAlias;

  Logger.log('Searching: ' + query);
  var threads = GmailApp.search(query, 0, CONFIG.maxNewsletters * 3);
  Logger.log('Threads found: ' + threads.length);

  if (threads.length === 0) {
    Logger.log('No newsletters found for this period.');
    return;
  }

  // Deduplicate by sender
  var seenSenders = {};
  var toProcess = [];

  for (var i = 0; i < threads.length; i++) {
    try {
      var message = threads[i].getMessages()[0];
      var from = message.getFrom();
      var senderEmail = extractEmail(from);

      if (CONFIG.excludeSenders.indexOf(senderEmail) !== -1) continue;
      if (seenSenders[senderEmail]) continue;

      seenSenders[senderEmail] = true;
      toProcess.push({
        message: message,
        senderName: extractName(from),
        senderEmail: senderEmail
      });

      if (toProcess.length >= CONFIG.maxNewsletters) break;
    } catch (e) {
      Logger.log('Error reading thread ' + i + ': ' + e.message);
    }
  }

  Logger.log('Processing ' + toProcess.length + ' unique newsletters...');

  // Pull reading history once — passed to every Gemini call
  var readingHistory = getReadingHistoryContext();
  if (readingHistory) {
    Logger.log('Reading history loaded for ' + readingHistory.split('\n').length + ' senders.');
  }

  var items = [];

  for (var j = 0; j < toProcess.length; j++) {
    var entry = toProcess[j];
    Logger.log('[' + (j + 1) + '/' + toProcess.length + '] ' + entry.senderName);

    try {
      var subject = entry.message.getSubject();
      var body = entry.message.getPlainBody().substring(0, 2500);
      var articleUrl = extractFirstLink(entry.message.getBody());

      var articleText = null;
      var articleHtml = null;
      var fetchFailed = false;
      var articleId = null;

      if (articleUrl) {
        var fetched = fetchArticle(articleUrl);
        articleText = fetched.text;
        articleHtml = fetched.html;
        fetchFailed = fetched.failed;

        // Cache article for reader page
        if (!fetchFailed && CONFIG.webAppUrl) {
          articleId = generateArticleId(entry.senderEmail);
          cacheArticle(articleId, {
            senderName: entry.senderName,
            senderEmail: entry.senderEmail,
            subject: subject,
            articleUrl: articleUrl,
            html: articleHtml,
            date: formatDate(new Date())
          });
        }
      }

      // Log that this sender appeared in today's digest
      logDigestAppearance(entry.senderEmail, entry.senderName);

      // Summarize — pass reading history for preference learning
      var result = summarizeNewsletter(
        entry.senderName, subject, body, articleText, readingHistory
      );

      items.push({
        senderName: entry.senderName,
        senderEmail: entry.senderEmail,
        subject: subject,
        articleUrl: articleUrl,
        articleId: articleId,
        fetchFailed: fetchFailed,
        summary: result.summary,
        priority: result.priority,
        whyItMatters: result.whyItMatters
      });

    } catch (e) {
      Logger.log('Error processing ' + entry.senderName + ': ' + e.message);
    }

    Utilities.sleep(500);
  }

  if (items.length === 0) {
    Logger.log('Nothing to send.');
    return;
  }

  items.sort(function(a, b) { return b.priority - a.priority; });

  if (dryRun) {
    Logger.log('\n=== DRY RUN — would send this digest: ===\n');
    items.forEach(function(item) {
      Logger.log(item.senderName + ' | Priority: ' + item.priority + '/5');
      Logger.log('  Subject: ' + item.subject);
      Logger.log('  Summary: ' + item.summary);
      Logger.log('  Why: ' + item.whyItMatters);
      Logger.log('');
    });
  } else {
    var recipient = CONFIG.digestRecipient || Session.getActiveUser().getEmail();
    var html = buildDigestEmail(items, recipient);
    GmailApp.sendEmail(recipient, '📬 Hydra — ' + formatDate(new Date()), 'Your Hydra digest (HTML email)', {
      htmlBody: html,
      name: 'Hydra'
    });
    Logger.log('✓ Digest sent to ' + recipient + ' with ' + items.length + ' newsletters.');
  }

  Logger.log('Done in ' + ((new Date() - startTime) / 1000).toFixed(1) + 's');
}
