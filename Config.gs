// ============================================================
// Config.gs — YOUR SETTINGS
// This is the only file you need to edit.
// ============================================================

var CONFIG = {

  // === YOUR INTERESTS ===
  // Hydra uses these to score each newsletter 1–5 for priority.
  // Edit these to match what you actually care about.
  interests: [
    "product management",
    "AI and technology",
    "startups",
    "design",
    "business strategy"
  ],

  // === DIGEST SETTINGS ===
  daysBack: 1,          // How many days of newsletters to include (1 = just today's)
  maxNewsletters: 15,   // Max newsletters per digest email

  // === RECIPIENT ===
  // Who receives the digest. Leave as "" to send it to yourself.
  digestRecipient: "",

  // === + ALIAS FILTERING ===
  // If you've resubscribed to newsletters using yourname+newsletters@gmail.com,
  // set this to "newsletters" so only those emails get processed.
  // Leave as "" to process all newsletters in your inbox.
  plusAlias: "",

  // === SENDERS TO SKIP ===
  // Paste email addresses here that you never want in the digest.
  excludeSenders: [
    // "promos@somestore.com",
    // "offers@anothersite.com"
  ],

  // === FULL ARTICLE READER ===
  // After deploying the web app (see README), paste your deployment URL here.
  // This enables the "Read Full Article" button in each digest email.
  // Leave as "" until you've deployed.
  webAppUrl: "",

  // How many hours to keep articles cached (max 6).
  // If you read your digest within this window, full articles will load instantly.
  articleCacheHours: 6

};
