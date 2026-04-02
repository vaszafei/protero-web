# 🌐 Supabase Edge Functions for Scraping

**Date**: January 28, 2026  
**Question**: Can we use Edge Functions to scrape Flashscore?

---

## ⚖️ **The Reality Check**

### **❌ What WON'T Work**

**Heavy Browser Scraping (Puppeteer)**
- Flashscore requires JavaScript rendering
- Puppeteer needs Chromium browser (~100MB+)
- Edge Functions have size limits (~50MB)
- Execution timeout (30-60 seconds)
- Memory limits (512MB-1GB)

**Your current Flashscore scraper:**
```javascript
// Uses puppeteer-extra with stealth plugin
// Loads full browser
// Takes 10-30 seconds per game
// 100+ games = 30+ minutes

→ TOO HEAVY for Edge Functions ❌
```

---

### **✅ What WILL Work**

**1. Simple HTTP/API Scraping**
- Fetch from APIs (API-Football)
- Parse simple HTML (no JavaScript needed)
- Quick data processing
- Database operations

**2. Orchestration & Triggers**
- Trigger scraping on your local machine
- Schedule scraping jobs
- Send webhooks to external scrapers
- Coordinate multiple scrapers

**3. Data Processing**
- Process scraped data
- Transform and validate
- Calculate features for ML
- Update database

---

## 🎯 **Practical Solutions**

### **Option 1: Hybrid Approach** (RECOMMENDED)

**Edge Functions:** Lightweight tasks  
**Local Machine:** Heavy scraping

```
┌─────────────────────────────────────┐
│   SUPABASE EDGE FUNCTIONS           │
│   - Fetch from API-Football         │
│   - Process scraped data            │
│   - Trigger scraper via webhook     │
│   - Update database                 │
└────────────────┬────────────────────┘
                 │
                 │ webhook/trigger
                 ▼
┌─────────────────────────────────────┐
│   YOUR LOCAL MACHINE                │
│   - Puppeteer scraping              │
│   - Flashscore scraping             │
│   - Upload to Supabase              │
└─────────────────────────────────────┘
```

---

### **Option 2: API-Football Only** (SIMPLEST)

Use Edge Functions to fetch from API-Football (no Flashscore).

**Pros:**
- ✅ API-Football provides most data
- ✅ Fast (API calls are quick)
- ✅ Reliable (no scraping detection)
- ✅ Fully automated

**Cons:**
- ❌ Less detailed than Flashscore
- ❌ Costs money (API subscription)
- ❌ No player stats
- ❌ Limited historical data

---

### **Option 3: Dedicated Scraping Server** (PROFESSIONAL)

Deploy scraper to always-on server.

**Options:**
- Railway.app ($5-10/month)
- Render.com ($7/month)
- Digital Ocean ($6/month)
- AWS Lambda (with layers)

**Pros:**
- ✅ Runs 24/7
- ✅ Can use Puppeteer
- ✅ Automated via cron
- ✅ No local machine needed

**Cons:**
- ❌ Costs money
- ❌ More complex setup

---

## 💻 **Implementation Examples**

### **Example 1: Edge Function to Fetch from API-Football**

Create: `supabase/functions/fetch-games/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get request parameters
    const { league, season } = await req.json()
    
    // Fetch from API-Football
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${league}&season=${season}`,
      {
        headers: {
          'X-RapidAPI-Key': Deno.env.get('API_FOOTBALL_KEY') ?? '',
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
      }
    )
    
    const data = await response.json()
    
    // Process and insert games
    const games = data.response.map((fixture: any) => ({
      home_team_id: fixture.teams.home.id,
      away_team_id: fixture.teams.away.id,
      date: fixture.fixture.date,
      league_key: league,
      season: season,
      home_goals: fixture.goals.home,
      away_goals: fixture.goals.away,
      status: fixture.fixture.status.short === 'FT' ? 'completed' : 'scheduled'
    }))
    
    // Insert to Supabase (duplicates will be blocked by trigger)
    const { data: inserted, error } = await supabase
      .from('games')
      .upsert(games, { onConflict: 'external_id' })
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: inserted?.length || 0 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    )
  }
})
```

**Deploy:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy fetch-games

# Test
supabase functions invoke fetch-games --data '{"league":"39","season":"2025"}'
```

**Schedule it:**
```sql
-- Run daily at 6 AM
SELECT cron.schedule(
  'daily-fetch-games',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/fetch-games',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"league":"premier_league","season":"2025-2026"}'::jsonb
    );
  $$
);
```

---

### **Example 2: Edge Function to Trigger Local Scraper**

Create: `supabase/functions/trigger-scraper/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // Find games that need scraping
  const { data: games } = await supabase
    .from('games')
    .select('id, flashscore_url')
    .eq('is_scraped', false)
    .not('flashscore_url', 'is', null)
    .limit(10)
  
  if (!games || games.length === 0) {
    return new Response(JSON.stringify({ message: 'No games to scrape' }))
  }
  
  // Send webhook to your local machine/server
  const webhookUrl = Deno.env.get('SCRAPER_WEBHOOK_URL')
  
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        games: games.map(g => ({
          id: g.id,
          url: g.flashscore_url
        }))
      })
    })
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      triggered: games.length 
    })
  )
})
```

**On your local machine:**
```javascript
// scraper-listener.js
import express from 'express';
import { runScraper } from './scraper.js';

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { games } = req.body;
  
  console.log(`Received ${games.length} games to scrape`);
  
  // Run scraper in background
  runScraper(games).catch(console.error);
  
  res.json({ status: 'started' });
});

app.listen(3000, () => {
  console.log('Scraper listener running on :3000');
});
```

---

### **Example 3: Edge Function for Data Processing**

Create: `supabase/functions/process-scraped-data/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { gameId, scrapedData } = await req.json()
  
  // Process and validate scraped data
  const processed = {
    home_xg: scrapedData.homeXG || null,
    away_xg: scrapedData.awayXG || null,
    home_shots: scrapedData.homeShots || null,
    away_shots: scrapedData.awayShots || null,
    home_possession: scrapedData.homePossession || null,
    away_possession: scrapedData.awayPossession || null,
    is_scraped: true,
    updated_at: new Date().toISOString()
  }
  
  // Calculate additional features
  if (processed.home_xg && processed.away_xg) {
    processed.total_xg = processed.home_xg + processed.away_xg
    processed.xg_difference = processed.home_xg - processed.away_xg
  }
  
  // Update game
  const { error } = await supabase
    .from('games')
    .update(processed)
    .eq('id', gameId)
  
  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    )
  }
  
  // Insert lineups if provided
  if (scrapedData.lineups) {
    await supabase
      .from('lineups')
      .insert(scrapedData.lineups.map(player => ({
        game_id: gameId,
        ...player
      })))
  }
  
  return new Response(
    JSON.stringify({ success: true, gameId }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## 🏗️ **Recommended Architecture**

### **Best Setup for Your Project:**

```
┌──────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ DATABASE (PostgreSQL)                      │        │
│  │ - Games, Teams, Lineups, Predictions       │        │
│  │ - Automated triggers & cron jobs           │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ EDGE FUNCTIONS                             │        │
│  │ - fetch-games (API-Football)               │        │
│  │ - process-data (data validation)           │        │
│  │ - trigger-scraper (webhook sender)         │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ CRON JOBS                                  │        │
│  │ - Daily 6 AM: Fetch new games              │        │
│  │ - Daily 7 AM: Trigger scraper              │        │
│  │ - Daily 2 AM: Maintenance                  │        │
│  └────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
                          │
                          │ webhooks/triggers
                          ▼
┌──────────────────────────────────────────────────────────┐
│              YOUR LOCAL MACHINE / VPS                    │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ FLASHSCORE SCRAPER (Puppeteer)             │        │
│  │ - Listens for webhook                      │        │
│  │ - Scrapes game details                     │        │
│  │ - Uploads to Supabase                      │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ ML TRAINING (Python)                       │        │
│  │ - Fetches data from Supabase               │        │
│  │ - Trains models                            │        │
│  │ - Uploads predictions                      │        │
│  └────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

---

## 💰 **Cost Comparison**

### **Option 1: Local Machine + Edge Functions** (FREE)
- Edge Functions: Free (1M requests/month)
- Database: Free (500MB)
- Scraping: Your computer (electricity ~$5/month)
- **Total: ~$5/month**

### **Option 2: All Cloud** ($20-30/month)
- Supabase Pro: $25/month
- Scraping server: $7/month (Render)
- API-Football: $10/month (if needed)
- **Total: $42/month**

### **Option 3: API-Football Only** ($10-35/month)
- Edge Functions: Free
- API-Football: $10-35/month (based on plan)
- No scraping needed
- **Total: $10-35/month**

---

## 🎯 **My Recommendation**

**Start with Option 1 (Hybrid):**

1. **Keep Flashscore scraping on your local machine**
   - Works perfectly now
   - No changes needed
   - Free

2. **Use Edge Functions for:**
   - Fetching from API-Football (scheduled)
   - Processing data after scraping
   - Triggering your local scraper (webhook)
   - Simple maintenance tasks

3. **Later, if needed:**
   - Move scraper to cheap VPS ($6/month)
   - Or switch to API-Football only
   - Or use serverless with custom setup

---

## 🚀 **Quick Start: Add Edge Functions to Your Project**

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Initialize functions
supabase init

# 3. Create your first function
supabase functions new fetch-games

# 4. Write function code (see examples above)

# 5. Deploy
supabase functions deploy fetch-games

# 6. Set secrets
supabase secrets set API_FOOTBALL_KEY=your-key

# 7. Schedule with cron (in Supabase SQL Editor)
# See examples above
```

---

## ❓ **FAQs**

**Q: Can I use Cheerio instead of Puppeteer in Edge Functions?**  
A: Yes! If Flashscore works without JavaScript, Cheerio is perfect. But Flashscore likely needs JS rendering.

**Q: What about AWS Lambda with Puppeteer?**  
A: Possible with Lambda Layers, but complex setup. Railway/Render is simpler.

**Q: Can I scrape just a few games with Edge Functions?**  
A: Yes! For 1-5 games, might work. For 100+ games, too slow.

**Q: Should I abandon local scraping?**  
A: No! Keep it. It works perfectly. Add Edge Functions for other tasks.

---

**Want me to create a specific Edge Function for your use case?** Let me know what you want to automate!
