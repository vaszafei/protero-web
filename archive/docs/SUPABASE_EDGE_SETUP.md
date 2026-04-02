# Supabase Edge Functions Setup

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
cd /home/zafnitlab/Desktop/Projects/protero
supabase link --project-ref your-project-ref
```

Get your project ref from: Supabase Dashboard → Settings → General → Reference ID

### 4. Set Secrets

```bash
# Set API-Football key
supabase secrets set API_FOOTBALL_KEY=your-api-football-key-here

# Verify secrets
supabase secrets list
```

### 5. Deploy Function

```bash
supabase functions deploy fetch-games
```

### 6. Test Function

```bash
# Test via CLI
supabase functions invoke fetch-games --data '{"league":"premier_league","season":"2025"}'

# Or via curl
curl -X POST https://your-project.supabase.co/functions/v1/fetch-games \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"league":"premier_league","season":"2025"}'
```

### 7. Schedule with Cron (Optional)

In Supabase SQL Editor:

```sql
-- Fetch Premier League daily at 6 AM
SELECT cron.schedule(
  'daily-fetch-premier-league',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/fetch-games',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"league":"premier_league","season":"2025"}'::jsonb
    );
  $$
);

-- Fetch all leagues weekly on Monday at 7 AM
SELECT cron.schedule(
  'weekly-fetch-all-leagues',
  '0 7 * * 1',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/fetch-games',
      body := jsonb_build_object('league', l.league_key, 'season', '2025')
    )
    FROM (VALUES 
      ('premier_league'),
      ('la_liga'),
      ('bundesliga'),
      ('serie_a'),
      ('ligue1')
    ) AS l(league_key);
  $$
);
```

## Available Leagues

```javascript
premier_league     → English Premier League
championship       → English Championship
la_liga           → Spanish La Liga
la_liga_2         → Spanish La Liga 2
bundesliga        → German Bundesliga
bundesliga_2      → German 2. Bundesliga
serie_a           → Italian Serie A
serie_b           → Italian Serie B
ligue1            → French Ligue 1
ligue_2           → French Ligue 2
liga_portugal     → Portuguese Liga
greek_super_league → Greek Super League
```

## Calling from Nuxt Frontend

```typescript
// In your Nuxt app
async function fetchGames(league: string, season: string) {
  const { data, error } = await supabase.functions.invoke('fetch-games', {
    body: { league, season }
  })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Fetched games:', data)
}

// Usage
await fetchGames('premier_league', '2025')
```

## Monitoring

View function logs:

```bash
supabase functions logs fetch-games
```

## Troubleshooting

**Error: "API_FOOTBALL_KEY not configured"**
```bash
supabase secrets set API_FOOTBALL_KEY=your-key
```

**Error: "Unknown league"**
Check the league key matches one from the list above.

**Error: "Duplicate game detected"**
This is expected - the trigger is working! The game already exists.

## Cost

- Edge Functions: **FREE** (1M requests/month)
- Database operations: **FREE** (500MB storage)
- API-Football: **$10-35/month** (depending on plan)

Total: ~$10-35/month
