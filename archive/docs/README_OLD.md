# ΠροΤερο — Football Prediction Platform

An advanced Nuxt 3 web application for football match predictions with **AI-powered Dixon-Coles modeling**, real-time odds comparison, and comprehensive match statistics tracking.

## 🎯 Features

- **🏆 League Dashboard**: Browse 6 major European leagues with live standings
- **📊 Advanced Predictions**: Dixon-Coles model enhanced with 30+ match statistics
- **🎲 Odds Comparison**: Real-time odds tracking with Kelly Criterion optimization
- **⚡ Admin Panel**: Comprehensive match editor with score and statistics management
- **🖼️ OCR Stats Extraction**: Upload screenshots to auto-extract match statistics
- **💾 Edge Database**: Turso SQLite with global edge replication
- **📈 Team Analytics**: Detailed metrics including xG, possession, form, and more

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Turso CLI (for database management)
- Python 3.8+ (for data tools)

### Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN

# Start dev server
npm run dev
```📁 Project Structure

```
protero/
├── pages/
│   ├── index.vue              # Main dashboard with leagues
│   ├── admin.vue              # Admin panel for match/stats editing
│   └── league/[slug].vue      # League detail with predictions
├── components/
│   ├── MatchPrediction.vue    # Prediction display component
│   ├── Sidebar.vue            # Navigation sidebar
│   ├── admin/                 # Admin components
│   │   ├── MatchStatsEditor.vue    # Full stats editor (30+ fields)
│   │   ├── MatchCard.vue           # Match score editor
│   │   └── ...
│   └── league/                # League-specific components
├── server/
│   ├── api/                   # API routes
│   │   ├── leagues/           # League data endpoints
│   │   ├── predictions/       # Prediction endpoints
│   │   └── admin/             # Admin endpoints
│   └── utils/
│       └── db.ts              # Turso database client
├── composables/
│   ├── useLeagueData.js       # League data management
│   ├── usePredictions.js      # Prediction calculations
│   └── useLeagueStats.js      # Statistics aggregation
├── tools/
│   ├── fetch_2025_season.py   # Update match data
│   ├── fetch_live_odds.py     # Fetch betting odds
│   ├── extract_match_stats_ocr.py  # OCR stats extraction
│   ├── advanced_prediction_model.py # Prediction model
│   └── README.md              # Tools documentation
└── public/data/
    └── leagues/               # League JSON data (fallback)yed by team_key)
│   ├── logo_map_edit.csv      # Curated logo map (exported for editing)
│   ├── [league].json          # Per-league standings and metrics
│   └── team_names.csv         # Teams in CSV format
├── tools/
│   ├── normalize_data.py      # Adds canonical team_key to JSON files
│   ├── generate_logo_map.py   # Generates logo_map.json via Wikidata/Wikimedia
│  🛠️ Data Management

### Update All Data (Recommended Weekly)

```bash
./tools/update_all.sh
```

This runs all data fetching and processing scripts in sequence.

### Individual Tools

#### Fetch Latest Match Results
```bash
python3 tools/fetch_2025_season.py
```
Fetches current season data from API-Football (standings, results, fixtures).

#### Update Betting Odds
```bash
python3 tools/fetch_live_odds.py
```
Fetches live odds for upcoming matches.

#### Extract Match Statistics (OCR)
```bash
python3 tools/extract_match_stats_ocr.py screenshots/match.png
```
Extract statistics from match screenshots using Tesseract OCR.

**Supported sources:** SofaScore, FlashScore, ESPN, TV broadcasts

See [OCR_STATS_GUIDE.md](OCR_STATS_GUIDE.md) for detailed instructions.

### Generate Predictions

```bash
python3 tools/advanced_prediction_model.py
```

Generates match predictions using the Dixon-Coles model with advanced features.

**For detailed tools documentation, see [tools/README.md](tools/README.md)**
### Manual Logo Curation

#### Export to CSV

```bash
python3 tools/import_logo_map.py export
```

Generates `public/data/logo_map_edit.csv` with columns:
- `team_key`: canonical team identifier
- `current_url`: current logo URL
- `new_url`: edit this to update
- `manual`: set to `true` if you manually edited the URL

#### Edit in Spreadsheet

Open `logo_map_edit.csv` in your spreadsheet editor (Excel, Google Sheets, etc.) and:
1. Update `new_url` with corrected image URLs
2. Set `manual` to `true` for any edits
3. Save the file

#### Import Back to JSON

```bash
python3 tools/import_logo_map.py import
```

Updates `public/data/logo_map.json` with the edited URLs and manual flags.

#### Via Admin UI

Alternatively, use the admin panel in the app:

1. Visit http://localhost:3000/admin
2. Edit logo URLs inline in the table
3. Click **Apply Edits** to update locally
4. Click **Download logo_map.json** to save the updated map to your downloads
5. Replace `public/data/logo_map.json` with the downloaded file

## API & Data Format

### League JSON Structure

Each league file (`public/data/[league].json`) has:

```json
{
  "league": "bundesliga",
  "standings": [
    {
      "Team": "Bayern Munich",
      "team_key": "bayern_munich",
      "GP": "15",
      "W": "13",
      "D": "1",
      "L": "1",
      "GF": "45",
      "GA": "10",
      "GD": "35",
      "Pts": "40",
      "Form": "W W W D W"
    }
    // ...
  ],
  "metrics": {
    "bayern_munich": {
      "team": "Bayern Munich",
      "GP": "15",
      "W": "13",
      "D": "1",
      "L": "1",
      "GF": "45",
      "GA": "10",
      "last5_raw": "W W W D W",
      "last5_W": "4",
      "last5_D": "1",
      "last5_L": "0",
      "team_key": "bayern_munich"
    }
    // ...
  }
}
```

### Logo Map Structure

`public/data/logo_map.json`:

```json
{
  "bayern_munich": {
    "url": "https://commons.wikimedia.org/...",
    "manual": false
  },
  "aston_villa": {
    "url": null,
    "manual": false
  }
}
```

- `url`: Wikidata/Wikimedia Commons image URL or `null` if not found
- `manual`: `true` if URL was manually edited, `false` if auto-discovered

## Frontend Pages

### `/` — League Index

- Search across leagues and teams
- Click a league card to view standings and metrics
- Displays team count per league

### `/league/[slug]` — League Detail

- Standings table with team rank, record, goals, and points
- Metrics table with GP, W-D-L, GF-GA, and last-5 form
- Click any team row to open modal with logo and detailed metrics
- Back link to return to league index

### `/admin` — Logo Curation

- Table of all teams with current logo preview
- Edit logo URLs inline
- **Apply Edits** to update locally
- **Download logo_map.json** to export updated map
- **Export CSV** to download curated list
- **Import CSV** to bulk-update from a spreadsheet

## Configuration

### Tailwind & PostCSS

Tailwind CSS v4 is configured with the new `@tailwindcss/postcss` plugin:

- **nuxt.config.ts**: Defines PostCSS plugins and CSS imports
- **postcss.config.cjs**: Legacy postcss config (used as fallback)
- **tailwind.config.cjs**: Tailwind theme and content paths

The build uses:
- `@tailwindcss/postcss` (v4 plugin)
- `autoprefixer` (for vendor prefixes)
- Nuxt 3.17+ with SSR disabled

### Compatibility Date

Set to `2025-12-12` in both Nuxt and Nitro configs to avoid deprecation warnings.

## Troubleshooting

### Build Errors

If you see PostCSS warnings:

```bash
npm install --save-dev @tailwindcss/postcss
npm run build
```

### Logo Images Not Loading

1. Check that `public/data/logo_map.json` exists
2. Verify URLs in logo_map.json are valid (accessible via HTTPS)
3. Check browser console for CORS errors
4. Regenerate logo map: `python3 tools/generate_logo_map.py`

### Team Metrics Mismatch

If standings and metrics don't align:

1. Run normalization: `python3 tools/normalize_data.py`
2. Verify `team_key` fields match between standings and metrics in the JSON
3. Check that metrics object keys match `team_key` from standings

## Future Enhancements

- [ ] Validation badges for missing logos/metrics
- [ ] Last-5 form sparklines in standings table
- [ ] Home/away splits per team
- [ ] Head-to-head stats for upcoming matches
- [ ] Injury/lineup news integration
- [ ] Dark mode toggle

## License

MIT (or as per project requirements)
