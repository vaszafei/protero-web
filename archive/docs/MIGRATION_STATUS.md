# Supabase Migration Status

## ✅ Completed
- Schema deployed (9 tables, 4 views, triggers)
- 6,647 games migrated
- 302 teams migrated  
- Authentication endpoints (login, register)
- Game detail endpoints ([id].get.ts)
- Predictions endpoints ([gameId].get.ts)
- Python ML utilities
- TypeScript Supabase client

## ⚠️ Needs Migration (Still using Turso via db.execute())

### Critical (Causing 500 errors):
1. **server/api/leagues/[slug].get.ts** - Main league/standings/games endpoint
2. **server/api/leagues/index.get.ts** - List all leagues

### Other endpoints using old getDB():
- server/api/predictions/league/[key].get.ts
- server/api/admin/system-status.get.ts
- server/api/user/leagues.post.ts
- server/api/auth/me.get.ts
- server/api/seasons/[leagueKey].get.ts
- server/api/analytics/*.post.ts
- server/api/admin/fix-match-statuses.post.ts
- server/api/wallet/*.ts
- server/api/admin/bets.get.ts
- server/api/admin/recalculate-standings.post.ts
- And 10+ more...

## 🔧 Current Issue

**Error:** `GET /api/leagues/undefined?round=all&season=2025-2026 500`

**Cause:** The `db.execute()` compatibility wrapper in `server/utils/db.ts` only handles simple SELECT queries. Complex queries with JOINs, WHERE clauses, and parameters need full Supabase migration.

## 💡 Solutions

### Option 1: Quick Fix (Temporary)
Add leagues table to Supabase and create a simplified endpoint that returns basic data.

### Option 2: Full Migration (Recommended)
Rewrite all endpoints to use Supabase's query builder instead of raw SQL.

**Example transformation:**
```typescript
// OLD (Turso)
const result = await db.execute({
  sql: 'SELECT * FROM leagues WHERE key = ?',
  args: [slug]
})

// NEW (Supabase)
const { data, error } = await supabase
  .from('leagues')
  .select('*')
  .eq('key', slug)
  .single()
```

## 📊 Missing Tables in Supabase

Tables that exist in local DBs but not in Supabase schema:
- `leagues` table
- `standings` table  
- `referees` table (optional)

## 🚀 Next Steps

1. **Add missing tables to Supabase schema**
2. **Migrate leagues/standings data**
3. **Update API endpoints one by one**
4. **Test each endpoint after migration**

Would you like me to:
- A) Add the leagues/standings tables and migrate that data?
- B) Create a simplified version that works with existing data?
- C) Do a full systematic migration of all endpoints?
