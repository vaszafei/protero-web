# Turso Setup Guide

This guide will help you complete the Turso implementation for the Protero football analytics project.

## Prerequisites

✅ Turso CLI installed (v1.0.15)
✅ @libsql/client npm package installed
✅ Database utility created
✅ Schema and migration scripts ready
✅ API routes created
✅ Admin panel created

## Step 1: Complete Turso Authentication

```bash
turso auth login
```

This will open your browser for GitHub authentication. Complete the login process.

## Step 2: Create Database

```bash
turso db create protero-football
```

This creates a new SQLite database named "protero-football" on Turso's edge network.

## Step 3: Get Database Credentials

```bash
# Get database URL
turso db show protero-football

# Create auth token
turso db tokens create protero-football
```

Copy the database URL (starts with `libsql://`) and the auth token.

## Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
TURSO_DATABASE_URL=libsql://protero-football-[your-org].turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
ADMIN_PASSWORD=your-secure-password
```

Replace the placeholders with your actual values.

## Step 5: Initialize Database Schema

```bash
node tools/setup_turso_schema.js
```

This creates all necessary tables:
- **leagues** - League metadata
- **teams** - Team information
- **standings** - Current standings
- **games** - Match fixtures and results
- **odds** - Betting odds
- **predictions** - AI predictions

## Step 6: Migrate Existing Data

```bash
node tools/migrate_to_turso.js
```

This will:
- Read all JSON files from `public/data/leagues/`
- Transform and insert data into Turso
- Create relationships between tables
- Display progress for each league

Expected output:
```
✓ Migrating Premier League... (20 teams, 120 games)
✓ Migrating La Liga... (20 teams, 120 games)
✓ Migrating Bundesliga... (18 teams, 108 games)
✓ Migrating Serie A... (20 teams, 120 games)
✓ Migrating Ligue 1... (18 teams, 108 games)

Migration complete! 96 teams, 576 games migrated.
```

## Step 7: Start Development Server

```bash
npm run dev
```

The app will now use Turso instead of JSON files.

## Step 8: Test Admin Panel

1. Navigate to `http://localhost:3000/admin`
2. Login with your admin password (from `.env`)
3. Select a league from the dropdown
4. Edit match scores
5. Click "Save" to update the database

### Admin Panel Features:

- **Authentication** - Password-protected access
- **League Selector** - Switch between different leagues
- **Match Editor** - Update scores and status
- **Auto-Save** - Each match saves independently
- **Automatic Standings** - Recalculated when games are marked finished

## Step 9: Verify Frontend Integration

Visit the main dashboard at `http://localhost:3000`:

- All league cards should load from Turso
- Standings should display correctly
- Match fixtures should show updated scores
- Predictions should work with new data

## Database Management

### View Database Contents

```bash
turso db shell protero-football
```

This opens an interactive SQLite shell. Try these queries:

```sql
-- List all leagues
SELECT * FROM leagues;

-- View standings for a league
SELECT * FROM standings WHERE league_key = 'premier-league' ORDER BY pts DESC;

-- Check recent games
SELECT * FROM games ORDER BY updated_at DESC LIMIT 10;

-- Count total records
SELECT 
  (SELECT COUNT(*) FROM teams) as teams,
  (SELECT COUNT(*) FROM games) as games,
  (SELECT COUNT(*) FROM standings) as standings;
```

### Backup Database

```bash
turso db shell protero-football ".backup backup.db"
```

### Update Schema (if needed)

Edit `/tools/setup_turso_schema.js` and run:

```bash
node tools/setup_turso_schema.js
```

## API Endpoints Created

### Public Endpoints (no auth required)

- **GET /api/leagues** - List all leagues with counts
- **GET /api/leagues/[slug]** - Get league data with standings and games
  - Query param: `?round=15` (optional, defaults to current round)

### Admin Endpoints (require authentication)

- **POST /api/admin/auth** - Admin login (sets HTTP-only cookie)
- **PATCH /api/admin/games/[id]** - Update game score and status

## File Structure

```
server/
├── utils/
│   └── db.ts                      # Turso client connection
└── api/
    ├── leagues/
    │   ├── index.get.ts           # List all leagues
    │   └── [slug].get.ts          # Get league details
    └── admin/
        ├── auth.post.ts           # Admin authentication
        └── games/
            └── [id].patch.ts      # Update game

tools/
├── setup_turso_schema.js          # Initialize database tables
└── migrate_to_turso.js            # Migrate JSON → Turso

pages/
└── admin.vue                      # Admin panel UI
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:** Verify your `.env` credentials:
```bash
turso db show protero-football
turso db tokens create protero-football
```

### Issue: "Table already exists"

**Solution:** Drop and recreate tables:
```bash
turso db shell protero-football

DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS odds;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS standings;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS leagues;
```

Then run `node tools/setup_turso_schema.js` again.

### Issue: "Migration script fails"

**Solution:** Check JSON file format:
```bash
# Validate JSON files
cat public/data/leagues/premier_league.json | jq .
```

### Issue: "Admin login not working"

**Solution:** Clear browser cookies and verify admin password in `.env`.

## Next Steps

After successful setup:

1. **Update Frontend Pages** - Modify `/pages/index.vue` to use API routes instead of static JSON
2. **Add More Admin Features** - Implement odds editing, prediction management
3. **Deploy to Production** - Use Vercel/Netlify with Turso edge replicas
4. **Set up Monitoring** - Track database queries and performance

## Production Deployment

When deploying to production:

1. Create production database:
   ```bash
   turso db create protero-football-prod
   ```

2. Add replicas for better performance:
   ```bash
   turso db replicas create protero-football-prod ams  # Amsterdam
   turso db replicas create protero-football-prod sin  # Singapore
   ```

3. Set environment variables in Vercel/Netlify:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PASSWORD`

4. Deploy:
   ```bash
   npm run build
   vercel --prod
   ```

## Performance Tips

- Turso automatically caches queries at the edge (<50ms globally)
- Use indexes (already created in schema) for fast queries
- Batch updates when possible
- Monitor with `turso db usage protero-football`

## Support

- Turso Docs: https://docs.turso.tech
- Turso Discord: https://discord.gg/turso
- Project Issues: Report in GitHub repo

---

**Ready to continue?** Run Step 1 above to complete authentication!
