# 📬 Hydra

An AI-powered tool that reads your Gmail newsletters, summarizes them with Google Gemini, and sends you one daily digest email sorted by priority. The more you use it, the smarter it gets — Hydra learns what you actually read and adjusts priorities over time.

**100% free. Runs entirely in your Google account. No downloads, no Python, no terminal.**

---

## What it does

- Scans your Gmail for newsletters automatically
- Reads linked articles in full (not just the email teaser)
- Summarizes each newsletter in 2–3 sentences using AI
- Scores each one 1–5 based on your interests
- Learns from which articles you open and adjusts future scoring
- Sends you one clean daily email, sorted highest priority first
- Each entry includes a **📖 Read Full Article** button (optional setup)

---

## Setup (10 minutes, browser only)

### Step 1 — Get a free Gemini API key

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy it — you'll paste it in Step 3

### Step 2 — Open Google Apps Script

1. Go to **[script.google.com](https://script.google.com)**
2. Click **New project** (top left)
3. Rename it "Hydra" (click the title at the top)

### Step 3 — Add the files

Add 8 files. For each one:
- Click the **+** next to "Files" → choose **Script**
- Name it exactly as shown
- Paste the code from the corresponding file in this repo

| File | What it does |
|------|-------------|
| `Config` | Your settings — edit this |
| `Utils` | Helpers + article cache + click tracking |
| `Gemini` | AI summarization |
| `Email` | Email builder |
| `Audit` | Newsletter scanner |
| `Digest` | Daily digest runner |
| `WebApp` | Full article reader page |
| `Setup` | First-run setup + trigger |

Delete the default `Code.gs` file — it's empty and not needed.

### Step 4 — Edit Config.gs

Update `interests` to match what you actually care about. Everything else can stay as-is.

### Step 5 — Run setup

Select `setup` from the function dropdown and click **Run ▶**. Google will ask you to authorize the script — click through. A dialog will ask for your Gemini API key — paste it in.

### Step 6 — Run the audit

Select `runAudit` and click **Run**. Check your email — you'll get a table of every newsletter you're subscribed to, with unsubscribe links and signup page URLs.

Use this to:
- Unsubscribe from each newsletter by clicking the links
- Resubscribe using `yourname+newsletters@gmail.com` (optional but recommended)

### Step 7 — Preview your first digest

Select `runDigest` and click **Run**. Check the Execution log — it shows a full preview without sending anything. To send a real digest, call it with no arguments.

### Step 8 — Schedule daily emails

Select `createDailyTrigger` and click **Run**. Done — Hydra sends you a digest every morning at ~7am.

---

## Setting Up the Full Article Reader (Optional)

Each newsletter in your digest can include a **📖 Read Full Article** button that opens a clean, styled reading page. Opening it also feeds into Hydra's preference learning.

**Step 1 — Deploy the web app**

1. Click **Deploy → New deployment**
2. Click the gear → **Web app**
3. Set: Execute as: **Me** / Who has access: **Anyone with Google account**
4. Click **Deploy** → copy the URL

**Step 2 — Paste the URL into Config.gs**

```javascript
webAppUrl: "https://script.google.com/macros/s/YOUR_ID/exec"
```

Links expire after 6 hours by default (configurable via `articleCacheHours`).

---

## How Preference Learning Works

Hydra tracks two things automatically:
- **Appearances** — how often each newsletter shows up in your digest
- **Opens** — how often you click 📖 Read Full Article

Over time it builds a picture like:
> Morning Brew: opened 8/12 times (67%) — strong interest
> TLDR: opened 1/14 times (7%) — low interest

This history gets passed to Gemini on every digest run and adjusts priority scores accordingly — newsletters you consistently open score higher, ones you ignore score lower. It uses this as a tiebreaker alongside your stated interests, not as a hard override.

---

## Using + Addressing (Recommended)

Gmail's `+` addressing lets you use `yourname+newsletters@gmail.com`. It lands in your regular inbox but Hydra can filter on it.

1. Run the audit to see your newsletters
2. Click **Unsubscribe** for each one
3. Resubscribe using `yourname+newsletters@gmail.com`
4. Set `plusAlias: "newsletters"` in Config.gs

---

## Cost

**Completely free.**

- Google Apps Script: free
- Gemini 1.5 Flash API: free tier (1,500 requests/day)
- Gmail: you already have it

---

## Sharing with others

Anyone can use Hydra by forking this repo and following the same setup steps with their own Google account and Gemini key. Each person runs it entirely within their own account — no shared servers, no shared data.

---

## Privacy

- Everything runs in your Google account
- Your emails never leave Google's infrastructure
- Newsletter content is sent to Google's Gemini API for summarization
- Click history is stored in your project's Script Properties — private to you

---

## Files

```
Config.gs   — Your settings (edit this)
Utils.gs    — Helpers + article cache + click tracking
Gemini.gs   — AI summarization via Gemini
Email.gs    — HTML email builders
Audit.gs    — Newsletter inbox scanner
Digest.gs   — Daily digest runner
WebApp.gs   — Full article reader page
Setup.gs    — First-run setup + daily trigger
```
