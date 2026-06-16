// ============================================================
// Setup.gs — Hydra first-run setup
//
// Step 1: Run setup()               → save your Gemini API key
// Step 2: Run runAudit()             → scan your inbox
// Step 3: Run runDigest(true)        → preview your first digest
// Step 4: Run createDailyTrigger()   → schedule daily emails
// ============================================================

function setup() {
  var key = '';

  try {
    var response = Browser.inputBox(
      'Hydra Setup',
      'Paste your free Gemini API key here.\n\nGet one at: aistudio.google.com/apikey',
      Browser.Buttons.OK_CANCEL
    );
    if (response === 'cancel' || !response) {
      Logger.log('Setup cancelled.');
      return;
    }
    key = response.trim();
  } catch (e) {
    Logger.log('=================================================');
    Logger.log('MANUAL SETUP:');
    Logger.log('1. Go to Project Settings → Script Properties');
    Logger.log('2. Add property: GEMINI_API_KEY = your_key_here');
    Logger.log('3. Get a free key at: aistudio.google.com/apikey');
    Logger.log('=================================================');
    return;
  }

  if (!key) { Logger.log('No key entered.'); return; }

  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);

  if (_testGeminiKey(key)) {
    Logger.log('✓ Hydra is ready. Gemini API key saved and verified.');
    Logger.log('');
    Logger.log('Next steps:');
    Logger.log('  1. Run runAudit()            → scan your inbox');
    Logger.log('  2. Run runDigest(true)        → preview your digest');
    Logger.log('  3. Run createDailyTrigger()   → schedule daily emails');
  } else {
    Logger.log('⚠ Key saved but test failed. Double-check at aistudio.google.com');
  }
}

function createDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runDigest') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('runDigest').timeBased().everyDays(1).atHour(7).create();
  Logger.log('✓ Daily trigger created — Hydra will run every day at ~7am.');
  Logger.log('  To change the time, edit atHour() above and re-run this function.');
}

function deleteDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runDigest') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  Logger.log(count > 0 ? '✓ Daily trigger removed.' : 'No trigger found.');
}

function _testGeminiKey(key) {
  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key;
    var payload = { contents: [{ parts: [{ text: 'Say "ok".' }] }], generationConfig: { maxOutputTokens: 5 } };
    var options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };
    var data = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
    return !!(data.candidates && data.candidates[0]);
  } catch (e) {
    return false;
  }
}
