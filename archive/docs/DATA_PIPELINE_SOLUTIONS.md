# 🔧 Data Pipeline Issues & Solutions

## 🚨 **Current Problems Identified**

### Issue Analysis (Dec 29, 2025):
```
League Status:
✅ Premier League: Round 17 (10 unplayed) - CORRECT
❌ La Liga: Round 16 (1 unplayed, but standings show GP 17) - MISMATCH  
❌ Bundesliga: Round 15 (9 unplayed, but standings show GP 14) - MISMATCH
❌ Serie A: Round 16 (10 unplayed, but standings show GP 15) - MISMATCH
❌ Ligue 1: Round 16 (9 unplayed, but standings show GP 15) - MISMATCH
```

### Root Causes:
1. **API Sync Issues**: Standings updated but fixture data outdated
2. **Rate Limits**: API-Football free tier (100/day) insufficient for real-time updates
3. **Manual Updates**: Python scripts require manual execution
4. **No Validation**: No checks for data consistency between standings/fixtures
5. **Odds Data**: Many games have placeholder odds (2.5/3.3/2.8)

---

## 🎯 **SOLUTION 1: Multi-Source Data Pipeline (Recommended)**

### Architecture: Hybrid scraping + API approach

```
┌─────────────────────────────────────────┐
│  PRIMARY: API-Football (RapidAPI)       │
│  • Standings (updates weekly)           │
│  • Historical matches with scores       │
│  Cost: FREE (100 req/day)               │
└──────────────┬──────────────────────────┘
               │
               ├──► Fallback #1: TheSportsDB API
               │    • Upcoming fixtures (FREE, unlimited)
               │    • Real-time scores
               │    • No odds data
               │
               ├──► Fallback #2: FBref Scraper
               │    • Match results (FREE)
               │    • Detailed stats
               │    • Requires parsing
               │
               └──► Odds: The Odds API / API-Football
                    • Live betting odds
                    • Multiple bookmakers
                    • FREE tier: 500 req/month
```

### Implementation Script:

```python
#!/usr/bin/env python3
"""
Enhanced Multi-Source Data Fetcher
Combines multiple free APIs for reliable data
"""

import requests
import json
from datetime import datetime
import time

class MultiSourceFetcher:
    def __init__(self):
        # API-Football (RapidAPI) - For standings & historical
        self.apifootball_key = "a2c93fa021mshda33fad170583f4p146558jsn8ae48020d8ea"
        self.apifootball_host = "api-football-v1.p.rapidapi.com"
        
        # TheSportsDB - For upcoming fixtures (FREE, unlimited)
        self.sportsdb_key = "3"  # Free tier key
        
        # The Odds API - For betting odds
        self.odds_api_key = "YOUR_KEY_HERE"  # Get free key: the-odds-api.com
        
        self.leagues = {
            'premier_league': {
                'api_football_id': 39,
                'sportsdb_id': 4328,
                'odds_api_key': 'soccer_epl'
            },
            'la_liga': {
                'api_football_id': 140,
                'sportsdb_id': 4335,
                'odds_api_key': 'soccer_spain_la_liga'
            },
            'bundesliga': {
                'api_football_id': 78,
                'sportsdb_id': 4331,
                'odds_api_key': 'soccer_germany_bundesliga'
            },
            'serie_a': {
                'api_football_id': 135,
                'sportsdb_id': 4332,
                'odds_api_key': 'soccer_italy_serie_a'
            },
            'ligue1': {
                'api_football_id': 61,
                'sportsdb_id': 4334,
                'odds_api_key': 'soccer_france_ligue_one'
            }
        }
    
    def fetch_standings_apifootball(self, league_id, season=2025):
        """Fetch standings from API-Football"""
        url = f"https://{self.apifootball_host}/v3/standings"
        headers = {
            'x-rapidapi-host': self.apifootball_host,
            'x-rapidapi-key': self.apifootball_key
        }
        params = {'league': league_id, 'season': season}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('response') and len(data['response']) > 0:
                return self.parse_standings(data['response'][0]['league']['standings'][0])
        except Exception as e:
            print(f"❌ API-Football error: {e}")
        
        return None
    
    def fetch_fixtures_sportsdb(self, league_id):
        """Fetch upcoming fixtures from TheSportsDB (FREE, no limits)"""
        url = f"https://www.thesportsdb.com/api/v1/json/{self.sportsdb_key}/eventsnextleague.php"
        params = {'id': league_id}
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('events'):
                return self.parse_sportsdb_fixtures(data['events'])
        except Exception as e:
            print(f"❌ TheSportsDB error: {e}")
        
        return []
    
    def fetch_odds_theoddsapi(self, sport_key):
        """Fetch live odds from The Odds API"""
        url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
        params = {
            'apiKey': self.odds_api_key,
            'regions': 'eu',
            'markets': 'h2h,totals',
            'oddsFormat': 'decimal'
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"⚠️  Odds API error: {e}")
        
        return []
    
    def parse_standings(self, standings_data):
        """Parse API-Football standings"""
        standings = []
        for team in standings_data:
            standings.append({
                'team': team['team']['name'],
                'team_key': team['team']['name'].lower().replace(' ', '_'),
                'gp': team['all']['played'],
                'w': team['all']['win'],
                'd': team['all']['draw'],
                'l': team['all']['lose'],
                'gf': team['all']['goals']['for'],
                'ga': team['all']['goals']['against'],
                'pts': team['points'],
                'last5_raw': team.get('form', '')
            })
        return standings
    
    def parse_sportsdb_fixtures(self, events):
        """Parse TheSportsDB fixtures"""
        fixtures = []
        for event in events:
            if event.get('strHomeTeam') and event.get('strAwayTeam'):
                fixtures.append({
                    'home': event['strHomeTeam'],
                    'away': event['strAwayTeam'],
                    'date': event.get('dateEvent', 'TBD'),
                    'time': event.get('strTime', 'TBD'),
                    'round': self.extract_round(event.get('intRound', 0))
                })
        return fixtures
    
    def extract_round(self, round_val):
        """Extract round number"""
        try:
            return int(round_val) if round_val else 0
        except:
            return 0
    
    def merge_data(self, league_key, standings, fixtures, odds_data):
        """Merge data from multiple sources"""
        print(f"\n✅ {league_key.upper()}")
        print(f"   Standings: {len(standings)} teams")
        print(f"   Fixtures: {len(fixtures)} upcoming")
        print(f"   Odds: {len(odds_data)} matches")
        
        # Create odds lookup
        odds_map = {}
        for match in odds_data:
            key = f"{match['home_team']}_{match['away_team']}".lower()
            odds_map[key] = self.extract_odds(match)
        
        # Merge fixtures with odds
        games = []
        for fixture in fixtures:
            key = f"{fixture['home']}_{fixture['away']}".lower()
            odds = odds_map.get(key, self.default_odds())
            
            games.append({
                'round': fixture['round'],
                'home': fixture['home'],
                'away': fixture['away'],
                'home_goals': None,
                'away_goals': None,
                'date': f"{fixture['date']} {fixture['time']}",
                'odds': odds,
                'status': 'scheduled'
            })
        
        return {
            'league': league_key,
            'season': '2025-2026',
            'standings': standings,
            'games': games,
            'last_updated': datetime.now().isoformat()
        }
    
    def extract_odds(self, match_data):
        """Extract odds from The Odds API format"""
        odds = self.default_odds()
        
        if 'bookmakers' in match_data and len(match_data['bookmakers']) > 0:
            bookmaker = match_data['bookmakers'][0]
            
            for market in bookmaker.get('markets', []):
                if market['key'] == 'h2h' and len(market['outcomes']) >= 3:
                    outcomes = market['outcomes']
                    odds['home'] = outcomes[0]['price']
                    odds['away'] = outcomes[1]['price']
                    odds['draw'] = outcomes[2]['price'] if len(outcomes) > 2 else 3.3
                
                elif market['key'] == 'totals' and len(market['outcomes']) >= 2:
                    odds['over'] = market['outcomes'][0]['price']
                    odds['under'] = market['outcomes'][1]['price']
        
        return odds
    
    def default_odds(self):
        """Return default odds when live data unavailable"""
        return {
            'home': 2.5,
            'draw': 3.3,
            'away': 2.8,
            'over': 1.9,
            'under': 1.9
        }
    
    def update_league(self, league_key, config):
        """Update single league using multi-source approach"""
        print(f"\n{'='*60}")
        print(f"📊 Updating {league_key.upper()}")
        print(f"{'='*60}")
        
        # Step 1: Get standings (API-Football - most reliable)
        standings = self.fetch_standings_apifootball(config['api_football_id'])
        if not standings:
            print(f"❌ Failed to fetch standings for {league_key}")
            return False
        
        # Step 2: Get upcoming fixtures (TheSportsDB - free & fast)
        fixtures = self.fetch_fixtures_sportsdb(config['sportsdb_id'])
        if not fixtures:
            print(f"⚠️  No upcoming fixtures found for {league_key}")
        
        # Step 3: Get odds (The Odds API - optional)
        odds_data = self.fetch_odds_theoddsapi(config['odds_api_key'])
        
        # Step 4: Merge and save
        merged_data = self.merge_data(league_key, standings, fixtures, odds_data)
        
        output_file = f"public/data/leagues/{league_key}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved to {output_file}")
        return True
    
    def update_all(self):
        """Update all leagues"""
        print("\n" + "="*60)
        print("🚀 MULTI-SOURCE DATA UPDATE")
        print("="*60)
        
        for league_key, config in self.leagues.items():
            self.update_league(league_key, config)
            time.sleep(2)  # Rate limiting
        
        print("\n✅ All leagues updated!")

if __name__ == '__main__':
    fetcher = MultiSourceFetcher()
    fetcher.update_all()
```

---

## 🎯 **SOLUTION 2: Real-Time Web Scraping (FREE, No Limits)**

### Target Sites:
1. **FBref.com** - Comprehensive stats, no rate limits
2. **FlashScore.com** - Real-time scores & fixtures
3. **Oddsportal.com** - Historical and live odds

### Advantages:
- ✅ 100% FREE, unlimited requests
- ✅ Always up-to-date
- ✅ Comprehensive data
- ❌ Requires maintenance (selectors change)
- ❌ Slower than APIs

```python
#!/usr/bin/env python3
"""
Web Scraping Alternative - FBref + FlashScore
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import requests
import time

class WebScraperPipeline:
    def __init__(self):
        self.leagues = {
            'premier_league': 'https://fbref.com/en/comps/9/Premier-League-Stats',
            'la_liga': 'https://fbref.com/en/comps/12/La-Liga-Stats',
            'bundesliga': 'https://fbref.com/en/comps/20/Bundesliga-Stats',
            'serie_a': 'https://fbref.com/en/comps/11/Serie-A-Stats',
            'ligue1': 'https://fbref.com/en/comps/13/Ligue-1-Stats'
        }
    
    def scrape_fbref_standings(self, url):
        """Scrape standings from FBref"""
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find standings table
        table = soup.find('table', {'id': 'results2024-202591_overall'})
        if not table:
            return []
        
        standings = []
        rows = table.find('tbody').find_all('tr')
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) > 10:
                team = cells[0].text.strip()
                gp = int(cells[3].text)
                w = int(cells[4].text)
                d = int(cells[5].text)
                l = int(cells[6].text)
                gf = int(cells[7].text)
                ga = int(cells[8].text)
                pts = int(cells[10].text)
                
                standings.append({
                    'team': team,
                    'gp': gp,
                    'w': w,
                    'd': d,
                    'l': l,
                    'gf': gf,
                    'ga': ga,
                    'pts': pts
                })
        
        return standings
    
    def scrape_flashscore_fixtures(self, league_id):
        """Scrape upcoming fixtures from FlashScore"""
        # Requires Selenium for dynamic content
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        driver = webdriver.Chrome(options=options)
        
        url = f"https://www.flashscore.com/football/{league_id}/fixtures/"
        driver.get(url)
        time.sleep(3)
        
        fixtures = []
        # Parse fixtures from page
        # ... implementation details
        
        driver.quit()
        return fixtures
```

---

## 🎯 **SOLUTION 3: Automated Backend Service**

### Setup Scheduled Updates with GitHub Actions / Cron

```yaml
# .github/workflows/update-data.yml
name: Update League Data

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: pip install requests beautifulsoup4
      
      - name: Fetch latest data
        run: python3 tools/fetch_multi_source.py
        env:
          APIFOOTBALL_KEY: ${{ secrets.APIFOOTBALL_KEY }}
          ODDS_API_KEY: ${{ secrets.ODDS_API_KEY }}
      
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add public/data/leagues/*.json
          git commit -m "🤖 Auto-update league data" || echo "No changes"
          git push
```

---

## 🎯 **SOLUTION 4: Light Backend with Caching** (From previous recommendations)

See my previous response for **Turso/Supabase** setup.

---

## 📊 **Recommended Immediate Actions**

### 1. **Fix Current Data (Quick Fix)**
```bash
cd /home/zafnitlab/Desktop/protero

# Backup current data
cp -r public/data/leagues public/data/leagues_backup

# Run enhanced fetch script
python3 tools/fetch_multi_source.py

# Validate results
node tools/validate_leagues.js
```

### 2. **Implement Multi-Source Pipeline** (Best Long-term)
- Use Solution #1 script above
- Register for The Odds API (500 free requests/month)
- Set up GitHub Actions for auto-updates

### 3. **Add Data Validation**
```javascript
// tools/validate_leagues.js
const fs = require('fs');

const leagues = ['premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue1'];

leagues.forEach(league => {
  const data = JSON.parse(fs.readFileSync(`public/data/leagues/${league}.json`));
  
  const playedGames = data.games.filter(g => g.home_goals !== null).length;
  const avgGP = data.standings.reduce((sum, t) => sum + t.gp, 0) / data.standings.length;
  
  const expectedGames = avgGP * data.standings.length / 2;
  const difference = Math.abs(playedGames - expectedGames);
  
  if (difference > 10) {
    console.error(`❌ ${league}: Data mismatch! Played: ${playedGames}, Expected: ~${expectedGames}`);
  } else {
    console.log(`✅ ${league}: Data consistent`);
  }
});
```

---

## 🔗 **Alternative Free Data Sources**

1. **API-Sports** (api-football.com)
   - FREE: 100 requests/day
   - Comprehensive data
   - Current provider

2. **TheSportsDB** (thesportsdb.com)
   - FREE: Unlimited
   - Good for fixtures
   - No odds data

3. **Football-Data.org** (football-data.org)
   - FREE: 10 requests/min
   - European leagues
   - Good for fixtures

4. **The Odds API** (the-odds-api.com)
   - FREE: 500 requests/month
   - Live odds from multiple bookmakers
   - Best for betting data

5. **Web Scraping**
   - FBref.com (FREE, unlimited)
   - FlashScore.com (FREE, unlimited)
   - Requires maintenance

---

## 💰 **Cost Comparison**

| Solution | Setup Time | Monthly Cost | Reliability | Maintenance |
|----------|------------|--------------|-------------|-------------|
| Multi-Source API | 2-3 hours | $0 | ⭐⭐⭐⭐⭐ | Low |
| Web Scraping | 4-6 hours | $0 | ⭐⭐⭐ | Medium |
| Backend + DB | 4-8 hours | $0-10 | ⭐⭐⭐⭐⭐ | Low |
| Current Setup | 0 hours | $0 | ⭐⭐ | High |

---

## 🚀 **Next Steps**

1. **Immediate**: Run the multi-source fetch script
2. **Short-term**: Set up GitHub Actions for auto-updates
3. **Long-term**: Consider backend with Turso/Supabase if adding user features

Would you like me to implement any of these solutions?
