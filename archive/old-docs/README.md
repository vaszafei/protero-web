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

\`\`\`bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN

# Start dev server
npm run dev
\`\`\`

Open http://localhost:3000/ in your browser.

### Production Build

\`\`\`bash
npm run build
npm run start
\`\`\`

## 📁 Project Structure

\`\`\`
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
    └── leagues/               # League JSON data (fallback)
\`\`\`

## 🛠️ Data Management

### Update All Data (Recommended Weekly)

\`\`\`bash
./tools/update_all.sh
\`\`\`

This runs all data fetching and processing scripts in sequence.

### Individual Tools

#### Fetch Latest Match Results
\`\`\`bash
python3 tools/fetch_2025_season.py
\`\`\`
Fetches current season data from API-Football (standings, results, fixtures).

#### Update Betting Odds
\`\`\`bash
python3 tools/fetch_live_odds.py
\`\`\`
Fetches live odds for upcoming matches.

#### Extract Match Statistics (OCR)
\`\`\`bash
python3 tools/extract_match_stats_ocr.py screenshots/match.png
\`\`\`
Extract statistics from match screenshots using Tesseract OCR.

**Supported sources:** SofaScore, FlashScore, ESPN, TV broadcasts

See [OCR_STATS_GUIDE.md](OCR_STATS_GUIDE.md) for detailed instructions.

### Generate Predictions

\`\`\`bash
python3 tools/advanced_prediction_model.py
\`\`\`

Generates match predictions using the Dixon-Coles model with advanced features.

**For detailed tools documentation, see [tools/README.md](tools/README.md)**

## 🎓 Prediction Methodology

This project uses an **enhanced Dixon-Coles model** with advanced statistics for football match predictions.

### Core Features:
- **Dixon-Coles Base Model**: Poisson-based goal distribution
- **30+ Advanced Statistics**: xG, possession, shots, form, rest days
- **Home Advantage Modeling**: Venue-specific performance
- **Kelly Criterion Optimization**: Bankroll management and bet sizing
- **Odds Comparison**: Value bet identification

### Documentation:
- [PREDICTION_METHODOLOGY.md](PREDICTION_METHODOLOGY.md) - Model overview
- [ACADEMIC_MODEL_IMPLEMENTATION.md](ACADEMIC_MODEL_IMPLEMENTATION.md) - Implementation details
- [ACADEMIC_RESEARCH_IMPROVEMENTS.md](ACADEMIC_RESEARCH_IMPROVEMENTS.md) - Research & improvements
- [ADVANCED_STATS_RESEARCH.md](ADVANCED_STATS_RESEARCH.md) - Statistical analysis
- [KELLY_CRITERION_IMPLEMENTATION.md](KELLY_CRITERION_IMPLEMENTATION.md) - Betting strategy

## 📊 Database

**Technology:** [Turso](https://turso.tech/) - SQLite at the edge

**Schema:**
- \`leagues\` - League metadata
- \`teams\` - Team information  
- \`standings\` - Current standings
- \`games\` - Match results with 44 columns (30+ statistics)
- \`odds\` - Betting odds history
- \`predictions\` - Generated predictions

**Current Status:** ✅ Fully migrated to Turso (Dec 2025)

## 🎨 Tech Stack

- **Frontend:** Nuxt 3, Vue 3, Tailwind CSS, @nuxt/ui
- **Database:** Turso (libSQL), SQLite
- **Prediction:** Python, NumPy, SciPy
- **OCR:** Tesseract.js, Python PIL
- **APIs:** API-Football (RapidAPI), Odds API

## 📝 Documentation

### Essential Guides
- [README.md](README.md) - This file
- [tools/README.md](tools/README.md) - Tools documentation
- [OCR_STATS_GUIDE.md](OCR_STATS_GUIDE.md) - OCR workflow guide
- [STATS_SYSTEM_COMPLETE.md](STATS_SYSTEM_COMPLETE.md) - Stats system reference

### Research & Methodology
- [PREDICTION_METHODOLOGY.md](PREDICTION_METHODOLOGY.md)
- [ACADEMIC_MODEL_IMPLEMENTATION.md](ACADEMIC_MODEL_IMPLEMENTATION.md)
- [ACADEMIC_RESEARCH_IMPROVEMENTS.md](ACADEMIC_RESEARCH_IMPROVEMENTS.md)
- [ADVANCED_STATS_RESEARCH.md](ADVANCED_STATS_RESEARCH.md)
- [KELLY_CRITERION_IMPLEMENTATION.md](KELLY_CRITERION_IMPLEMENTATION.md)

### Current Analysis
- [TURSO_AI_PREDICTION_ANALYSIS.md](TURSO_AI_PREDICTION_ANALYSIS.md) - Latest prediction analysis
- [match_analysis.md](match_analysis.md) - Current match analysis

### Archive
Historical documentation and old scripts are preserved in \`/archive/\` - see [archive/README.md](archive/README.md)

## 🚀 Deployment

### Vercel (Recommended)

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
\`\`\`

Add environment variables in Vercel dashboard:
- \`TURSO_DATABASE_URL\`
- \`TURSO_AUTH_TOKEN\`
- \`ADMIN_PASSWORD\`

### Docker

\`\`\`bash
docker build -t protero .
docker run -p 3000:3000 --env-file .env protero
\`\`\`

## 🤝 Contributing

Contributions are welcome! This project focuses on:
- Prediction model improvements
- New statistical features
- UI/UX enhancements
- Data source integrations

## 📄 License

MIT License - see LICENSE file for details

---

**Made with ❤️ for football analytics enthusiasts**
