# 🚀 Edge Functions Summary

## ✅ What I Created For You

### **1. Documentation**
- `EDGE_FUNCTIONS_SCRAPING.md` - Full explanation of what's possible
- `supabase/SETUP.md` - Step-by-step setup guide

### **2. Edge Functions**
- `supabase/functions/fetch-games/` - Fetch from API-Football automatically
- `supabase/functions/trigger-scraper/` - Trigger your local scraper

### **3. Local Tools**
- `tools/scraper-webhook-listener.mjs` - Listen for scraping requests

---

## 🎯 The Answer: Can Supabase Scrape Flashscore?

### **Short Answer: No (for heavy scraping)**

Flashscore scraping with Puppeteer is TOO HEAVY for Edge Functions:
- ❌ Needs Chromium browser (~100MB)
- ❌ Takes 10-30 seconds per game
- ❌ Edge Functions time out after 60 seconds
- ❌ Memory intensive

### **But You CAN Use Edge Functions For:**

✅ **Fetching from API-Football** (I created this!)
✅ **Triggering your local scraper** (I created this!)
✅ **Processing scraped data**
✅ **Automating workflows**
✅ **Database operations**

---

## 🏗️ Recommended Architecture

```
┌─────────────────────────────────┐
│      SUPABASE CLOUD             │
│                                 │
│  📅 Cron: Daily 6 AM            │
│     → Run fetch-games           │
│     → Get new games from API    │
│                                 │
│  📅 Cron: Daily 7 AM            │
│     → Run trigger-scraper       │
│     → Send webhook to you       │
│                                 │
└────────────┬────────────────────┘
             │
             │ HTTP webhook
             │ (sends list of games)
             ▼
┌─────────────────────────────────┐
│    YOUR LOCAL MACHINE           │
│                                 │
│  🎧 Webhook Listener (port 3030)│
│     → Receives game list        │
│     → Runs Puppeteer scraper    │
│     → Uploads to Supabase       │
│                                 │
└─────────────────────────────────┘
```

**Benefits:**
- ✅ Fully automated
- ✅ Flashscore scraping works perfectly (local)
- ✅ API fetching automated (Edge Functions)
- ✅ No manual work needed
- ✅ Free (except API-Football $10-35/month)

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Login & Link Project
```bash
supabase login
cd /home/zafnitlab/Desktop/Projects/protero
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Set Secrets
```bash
# Set API-Football key
supabase secrets set API_FOOTBALL_KEY=your-key-here

# Set webhook URL (your local machine)
# If you have a static IP or use ngrok:
supabase secrets set SCRAPER_WEBHOOK_URL=http://your-ip:3030/scrape
```

### Step 4: Deploy Functions
```bash
supabase functions deploy fetch-games
supabase functions deploy trigger-scraper
```

### Step 5: Test
```bash
# Test fetch-games
supabase functions invoke fetch-games \
  --data '{"league":"premier_league","season":"2025"}'

# Test trigger-scraper
supabase functions invoke trigger-scraper \
  --data '{"league":"premier_league","limit":5}'
```

### Step 6: Start Webhook Listener (Local)
```bash
# Install dependencies if needed
npm install express

# Run listener
node tools/scraper-webhook-listener.mjs
```

### Step 7: Schedule with Cron
In Supabase SQL Editor:
```sql
-- Fetch games daily at 6 AM
SELECT cron.schedule(
  'daily-fetch-games',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/fetch-games',
      body := '{"league":"premier_league","season":"2025"}'::jsonb
    );
  $$
);

-- Trigger scraper daily at 7 AM
SELECT cron.schedule(
  'daily-trigger-scraper',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/trigger-scraper',
      body := '{"league":"premier_league","limit":20}'::jsonb
    );
  $$
);
```

---

## 💡 Usage Examples

### **Manual Trigger from Terminal**
```bash
# Fetch new games
curl -X POST https://your-project.supabase.co/functions/v1/fetch-games \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"league":"premier_league","season":"2025"}'

# Trigger scraper
curl -X POST https://your-project.supabase.co/functions/v1/trigger-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"league":"la_liga","limit":10"}'
```

### **Call from Nuxt Frontend**
```typescript
// Fetch games button
async function fetchGames() {
  const { data, error } = await supabase.functions.invoke('fetch-games', {
    body: { 
      league: 'premier_league', 
      season: '2025' 
    }
  })
  
  if (!error) {
    console.log(`Fetched ${data.inserted} new games!`)
  }
}

// Trigger scraper button
async function triggerScraper() {
  const { data } = await supabase.functions.invoke('trigger-scraper', {
    body: { 
      league: 'premier_league', 
      limit: 20 
    }
  })
  
  console.log(`Sent ${data.games_found} games to scraper`)
}
```

---

## 📊 What Gets Automated

### **Before (All Manual)**
```
7:00 AM - You wake up
7:30 AM - Open terminal
7:35 AM - Run API fetch script
7:45 AM - Check for new games
8:00 AM - Add Flashscore URLs manually
8:30 AM - Run scraper
9:00 AM - Check if scraping worked
9:15 AM - Start actual work
```

### **After (Automated)**
```
6:00 AM - 🤖 Supabase fetches games from API (automatic)
7:00 AM - 🤖 Supabase triggers scraper (automatic)
7:01 AM - 🤖 Your computer starts scraping (automatic)
8:00 AM - 🤖 Scraping completes (automatic)

9:00 AM - ☕ You wake up, coffee ready, data ready!
```

---

## 💰 Costs

**Supabase Edge Functions:**
- FREE tier: 1M requests/month
- Your usage: ~60 requests/month (2/day)
- Cost: **$0/month** ✅

**API-Football:**
- Basic plan: $10/month (100 requests/day)
- Pro plan: $35/month (unlimited)
- Your usage: ~14 requests/day (1 per league)
- Cost: **$10/month** 💰

**Webhook Listener:**
- Runs on your computer
- Electricity: ~$2/month
- Cost: **~$2/month** ✅

**Total: ~$12/month** (vs manual work: priceless!)

---

## 🎯 Next Steps

1. **Read**: `EDGE_FUNCTIONS_SCRAPING.md` (full explanation)
2. **Setup**: Follow `supabase/SETUP.md` (5 minutes)
3. **Deploy**: Deploy the 2 functions
4. **Test**: Run webhook listener + trigger function
5. **Schedule**: Set up cron jobs
6. **Relax**: Let it run automatically! ☕

---

## ❓ FAQ

**Q: Do I need to keep my computer on 24/7?**
A: For webhook listener, yes. Or use a $6/month VPS, or use ngrok for dynamic IP.

**Q: Can I skip API-Football and only use Flashscore?**
A: Yes! Just don't use fetch-games function. Keep manual workflow for now.

**Q: What if Edge Function fails?**
A: Check logs with `supabase functions logs fetch-games`

**Q: Can I trigger scraping from Nuxt dashboard?**
A: Yes! See "Call from Nuxt Frontend" examples above.

**Q: Is this worth it?**
A: If you run fetching/scraping 2+ times per week → YES! Saves hours.

---

**Ready to automate?** Start with `supabase/SETUP.md` 🚀
