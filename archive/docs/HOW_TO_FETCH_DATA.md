# How to Fetch Actual Match Data

## ✅ Option 1: football-data.org API (RECOMMENDED - FREE)

### Step 1: Get API Key
1. Visit: https://www.football-data.org/client/register
2. Register for a free account
3. Verify your email
4. Get your API key from the dashboard

### Step 2: Run the Script
```bash
cd /home/zafnitlab/Desktop/protero
python3 tools/fetch_api_data.py YOUR_API_KEY_HERE
```

### What it does:
- Fetches actual match data for rounds 1-15
- Covers: Premier League, Serie A, Bundesliga, La Liga, Ligue 1
- Keeps Round 16 with betting odds
- Updates all JSON files automatically

### Limitations:
- Free tier: 10 requests per minute
- Greece Super League not available (use placeholder data)
- Script includes 6.5-second delays for rate limiting (~35 seconds total runtime)

---

## Option 2: API-Football (RapidAPI)

### For Greece + other leagues:
1. Visit: https://rapidapi.com/api-sports/api/api-football
2. Subscribe to free tier (100 requests/day)
3. Get API key
4. Use endpoint: `/v3/fixtures?league=ID&season=2024`

Greece league ID: 197

---

## Option 3: Manual CSV Import (if APIs fail)

Export fixture data from FBref as CSV and import:
```bash
python3 tools/import_csv.py league_name fixtures.csv
```

---

## Current Status

After running `fetch_api_data.py`:
- ✅ Rounds 1-15: Real match data with actual scores
- ✅ Round 16: Your betting analysis with odds
- ✅ All data properly formatted and sorted

---

## Run the Fetch Script:

```bash
# Replace YOUR_API_KEY with actual key
python3 tools/fetch_api_data.py YOUR_API_KEY
```
