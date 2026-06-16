// ============================================================
// Gemini.gs — AI summarization using Google Gemini (free)
// ============================================================

var GEMINI_MODEL = 'gemini-1.5-flash';
var GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                      GEMINI_MODEL + ':generateContent';

/**
 * Summarize a newsletter and return a priority score.
 * Accepts optional readingHistory string for preference learning.
 *
 * Returns:
 *   { summary: string, priority: number (1-5), whyItMatters: string }
 */
function summarizeNewsletter(senderName, subject, body, articleText, readingHistory) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { summary: 'API key not set.', priority: 1, whyItMatters: '' };

  var interestsStr = CONFIG.interests.join(', ');

  var contentSection = articleText
    ? 'Article content:\n' + articleText
    : 'Email body:\n' + body.substring(0, 2500);

  // Build reading history section — only included if we have data
  var historySection = readingHistory
    ? '\n\n' + readingHistory + '\n\nUse this history to adjust the priority score. ' +
      'Strong interest senders should score higher. Low interest senders should score lower. ' +
      'Do not override a genuinely strong article just because the sender has low history — ' +
      'use it as a tiebreaker and signal, not a hard rule.'
    : '';

  var prompt = [
    'Summarize this newsletter and score its priority for the user.',
    '',
    'Newsletter: ' + senderName,
    'Subject: ' + subject,
    '',
    contentSection,
    '',
    'User interests: ' + interestsStr,
    historySection,
    '',
    'Respond ONLY with a JSON object in this exact format (no markdown, no extra text):',
    '{',
    '  "summary": "2-3 sentence summary of the key points",',
    '  "priority": 4,',
    '  "why_it_matters": "One sentence explaining relevance to user interests and reading habits"',
    '}',
    '',
    'Priority scale: 5=must read, 4=high, 3=worth a look, 2=low, 1=skip'
  ].join('\n');

  try {
    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 }
    };
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(GEMINI_ENDPOINT + '?key=' + apiKey, options);
    var data = JSON.parse(response.getContentText());

    if (!data.candidates || !data.candidates[0]) {
      Logger.log('Gemini returned no candidates: ' + response.getContentText());
      return _fallback();
    }

    var text = data.candidates[0].content.parts[0].text.trim()
      .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    var parsed = JSON.parse(text);
    return {
      summary: parsed.summary || '',
      priority: Math.min(5, Math.max(1, parseInt(parsed.priority) || 3)),
      whyItMatters: parsed.why_it_matters || ''
    };

  } catch (e) {
    Logger.log('Gemini error for ' + senderName + ': ' + e.message);
    return _fallback();
  }
}

function _fallback() {
  return { summary: 'Could not summarize this newsletter.', priority: 2, whyItMatters: '' };
}
