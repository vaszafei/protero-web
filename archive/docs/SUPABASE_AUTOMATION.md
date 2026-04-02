# 🤖 Supabase Automation Guide

**Date**: January 28, 2026  
**Status**: ✅ Ready to Deploy

---

## 🎯 What Gets Automated

### **1. Real-Time Triggers** (instant, automatic)
✅ Update game status when results added  
✅ Estimate xG when shots data added  
✅ Prevent duplicate games from being inserted  
✅ Auto-update `updated_at` timestamp  
✅ Log all important operations

### **2. Scheduled Jobs** (runs at specific times)
✅ **Daily 2 AM**: Update all game statuses  
✅ **Daily 3 AM**: Estimate missing xG  
✅ **Daily 5 AM**: Clean old logs (keep 30 days)  
✅ **Daily 9 AM**: Check data quality, send alerts  
✅ **Weekly Monday 4 AM**: Check for duplicates

---

## 🚀 Setup (One-Time)

### Step 1: Apply SQL File

```bash
# Copy the automation SQL file
cat database/migrations/supabase_automation.sql

# Go to Supabase Dashboard → SQL Editor
# Paste and run the entire file
```

### Step 2: Verify Cron Extension

```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not enabled, contact Supabase support or use their dashboard
-- (Some Supabase plans might need manual enablement)
```

### Step 3: Check Jobs Are Running

```sql
-- View all scheduled jobs
SELECT * FROM v_scheduled_jobs;

-- View recent automation runs
SELECT * FROM v_automation_stats;
```

---

## 📋 What Each Automation Does

### **Trigger 1: Auto-Update Game Status**

**When it runs:** Every time a game is inserted or updated

**What it does:**
```
IF game has results (home_goals & away_goals):
  → Set status = 'completed'

IF game date is 2+ days ago AND no results:
  → Set status = 'postponed'
```

**Example:**
```
You scrape Arsenal vs Liverpool, get result: 2-1
→ Automatically marked as 'completed' ✅

Chelsea game was Jan 20, today is Jan 28, no results
→ Automatically marked as 'postponed' ⚠️
```

**Benefit:** You never have to manually update status!

---

### **Trigger 2: Auto-Estimate xG**

**When it runs:** Every time a game is inserted or updated

**What it does:**
```
IF game missing xG BUT has shots_on_target:
  home_xG = (shots_on_target × 0.15) + (big_chances × 0.4)
  away_xG = (shots_on_target × 0.15) + (big_chances × 0.4)
  Set xg_estimated = TRUE
```

**Example:**
```
Scraper gets shots data but not xG from Flashscore
  Shots on target: 8
  Big chances: 2
→ Auto-calculates: xG = 1.2 + 0.8 = 2.0 ✅
```

**Benefit:** More games have xG for ML training!

---

### **Trigger 3: Prevent Duplicates**

**When it runs:** Before inserting/updating a game

**What it does:**
```
Check if game already exists:
  - Same home team
  - Same away team
  - Same date
  - Same league

IF duplicate found:
  → BLOCK the insert and show error
```

**Example:**
```
You try to insert Arsenal vs Liverpool on Jan 28
But it already exists in database
→ Error: "Duplicate game detected! Game already exists with ID: 1234" ❌
```

**Benefit:** Impossible to create duplicates via API fetch!

---

### **Trigger 4: Auto-Update Timestamps**

**When it runs:** Every time games, teams, or leagues are updated

**What it does:**
```
Sets updated_at = NOW()
```

**Benefit:** Always know when data was last modified

---

### **Trigger 5: Log Operations**

**When it runs:** When games are inserted or deleted

**What it does:**
```
Logs to operation_logs table:
  - What happened (INSERT/DELETE)
  - Which game (ID)
  - When it happened
  - Details (teams, league, etc)
```

**Example log:**
```sql
SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT 10;

operation_type | table_name | record_id | details
---------------|------------|-----------|------------------
INSERT         | games      | 2341      | {"league": "premier_league", ...}
DELETE         | games      | 2000      | {"reason": "duplicate cleanup"}
```

**Benefit:** Full audit trail of database changes!

---

### **Cron 1: Daily Update Game Status** (2 AM)

**What it does:**
Runs the `update_game_status()` function

**Why this time:**
- 2 AM = middle of night
- No games happening
- No interference with your work

---

### **Cron 2: Daily Estimate xG** (3 AM)

**What it does:**
Runs the `estimate_missing_xg()` function

**Why after status update:**
Only estimates for completed games

---

### **Cron 3: Daily Cleanup Logs** (5 AM)

**What it does:**
```sql
DELETE FROM operation_logs 
WHERE created_at < NOW() - INTERVAL '30 days';
```

**Keeps:** Last 30 days of logs  
**Deletes:** Older logs to save space

---

### **Cron 4: Daily Quality Check** (9 AM)

**What it does:**
Checks each league's data quality and logs alerts

**Thresholds:**
- ⚠️ WARNING: <50% scraped, <40% xG, <60% URLs
- 🚨 CRITICAL: <30% scraped, <20% xG

**Where to see alerts:**
```sql
SELECT * FROM operation_logs 
WHERE operation_type = 'DATA_QUALITY_ALERT'
ORDER BY created_at DESC;
```

**Why 9 AM:**
You can check it when you start work

---

### **Cron 5: Weekly Duplicate Check** (Monday 4 AM)

**What it does:**
Checks for duplicates and logs results

**Why weekly:**
Duplicates are rare if triggers work
Weekly check is a safety net

**Where to see:**
```sql
SELECT * FROM operation_logs 
WHERE operation_type = 'DUPLICATE_CHECK'
ORDER BY created_at DESC;
```

---

## 📊 Monitoring Automations

### **View All Scheduled Jobs**
```sql
SELECT * FROM v_scheduled_jobs;
```

**Output:**
```
jobname                  | schedule    | active
------------------------|-------------|--------
daily-update-game-status | 0 2 * * *   | true
daily-estimate-xg        | 0 3 * * *   | true
daily-quality-check      | 0 9 * * *   | true
```

---

### **View Recent Operations**
```sql
SELECT * FROM v_recent_operations LIMIT 20;
```

**Output:**
```
operation_type      | table_name | time_ago
--------------------|------------|------------
DATA_QUALITY_ALERT  | games      | 2 hours ago
INSERT              | games      | 5 hours ago
DUPLICATE_CHECK     | games      | 1 day ago
```

---

### **View Automation Statistics**
```sql
SELECT * FROM v_automation_stats;
```

**Output:**
```
operation_type      | total_operations | last_run            | time_since_last
--------------------|------------------|---------------------|----------------
DATA_QUALITY_ALERT  | 28               | 2026-01-28 09:00:00 | 3 hours
DUPLICATE_CHECK     | 4                | 2026-01-27 04:00:00 | 1 day
```

---

## 🧪 Testing Automations

### **Test All at Once**
```sql
SELECT * FROM run_all_maintenance_now();
```

**Output:**
```
task                | status  | result
--------------------|---------|-------------------------
Update Game Status  | SUCCESS | 15 games updated
Estimate xG         | SUCCESS | 8 games updated
Check Duplicates    | SUCCESS | 0 duplicates found
```

---

### **Test Individual Triggers**

**Test duplicate prevention:**
```sql
-- Try to insert duplicate (should fail)
INSERT INTO games (home_team_id, away_team_id, date, league_key, season)
VALUES (1, 2, '2026-01-28', 'premier_league', '2025-2026');

-- If game exists, you'll get:
-- ERROR: Duplicate game detected! Game already exists with ID: 1234
```

**Test auto-status:**
```sql
-- Insert game with results
INSERT INTO games (home_team_id, away_team_id, home_goals, away_goals, ...)
VALUES (1, 2, 2, 1, ...);

-- Check status (should be 'completed')
SELECT id, status FROM games WHERE id = ... ;
```

---

## ⚙️ Managing Automations

### **Pause All Jobs** (during maintenance)
```sql
SELECT disable_all_cron_jobs();
-- Returns: "All cron jobs disabled"
```

### **Resume All Jobs**
```sql
SELECT enable_all_cron_jobs();
-- Returns: "All cron jobs enabled"
```

### **Pause One Job**
```sql
UPDATE cron.job 
SET active = FALSE 
WHERE jobname = 'daily-quality-check';
```

### **Change Schedule**
```sql
-- Change quality check to 10 AM instead of 9 AM
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-quality-check'),
  schedule := '0 10 * * *'
);
```

---

## 🔔 Setting Up Alerts (Optional)

### **Option 1: Check Logs in Your App**

Add to your Nuxt dashboard:
```typescript
// Check for alerts
const { data: alerts } = await supabase
  .from('operation_logs')
  .select('*')
  .eq('operation_type', 'DATA_QUALITY_ALERT')
  .order('created_at', { ascending: false })
  .limit(1);

if (alerts && alerts.length > 0) {
  const alert = alerts[0].details;
  // Show notification in UI
  console.warn('Data quality issues:', alert);
}
```

### **Option 2: Email Notifications**

You can use Supabase Edge Functions to send emails:
```typescript
// supabase/functions/send-alerts/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const alerts = await supabase
    .from('operation_logs')
    .select('*')
    .eq('operation_type', 'DATA_QUALITY_ALERT')
    // ... get latest alerts
  
  if (alerts) {
    // Send email via SendGrid, Mailgun, etc.
    await sendEmail({
      to: 'you@example.com',
      subject: 'Protero: Data Quality Alert',
      body: `Found issues: ${JSON.stringify(alerts)}`
    });
  }
  
  return new Response('OK', { status: 200 })
})
```

Then call this function from cron:
```sql
SELECT cron.schedule(
  'send-daily-alerts',
  '0 10 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-alerts',
      headers := '{"Authorization": "Bearer YOUR_KEY"}'::jsonb
    );
  $$
);
```

---

## 📈 Performance Impact

### **Triggers** (Real-time)
- ⚡ **Fast**: < 1ms per operation
- 💾 **Memory**: Minimal
- 📊 **Impact**: None (runs on write anyway)

### **Cron Jobs** (Scheduled)
- ⏱️ **Duration**: 1-10 seconds each
- 🕐 **Runs**: Night time (no interference)
- 📊 **Impact**: None on your work

### **Logs Table**
- 💾 **Size**: ~1 KB per operation
- 🗑️ **Cleanup**: Auto-deletes after 30 days
- 📊 **Growth**: ~100 MB per year (with 1000 ops/day)

---

## ✅ Benefits Summary

### **Before Automation**
- ❌ Manual status updates
- ❌ Missing xG data
- ❌ Possible duplicates
- ❌ No audit trail
- ❌ Daily manual checks

### **After Automation**
- ✅ Auto status updates
- ✅ Auto xG estimation
- ✅ Duplicates blocked
- ✅ Full audit trail
- ✅ Automatic health checks
- ✅ Sleep well at night! 😴

---

## 🎯 Recommended Workflow

### **Morning (9:30 AM)**
```sql
-- Check if any alerts
SELECT * FROM operation_logs 
WHERE operation_type = 'DATA_QUALITY_ALERT'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Check automation stats
SELECT * FROM v_automation_stats;
```

### **After API Fetch**
Just fetch data - automation handles duplicates!

### **After Scraping**
Just scrape - automation handles xG, status!

### **Before ML Training**
```sql
-- Quick check: is data ready?
SELECT * FROM v_ml_ready_games;
```

---

## 🚨 Troubleshooting

### **Cron jobs not running?**

**Check if enabled:**
```sql
SELECT * FROM v_scheduled_jobs WHERE NOT active;
```

**Check pg_cron extension:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Check Supabase plan:**
Some plans might not support pg_cron. Contact support if needed.

---

### **Trigger not working?**

**Check if trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%auto%';
```

**Check function exists:**
```sql
SELECT * FROM pg_proc WHERE proname LIKE '%auto%';
```

**Test manually:**
```sql
-- Test auto-status
UPDATE games SET home_goals = 2, away_goals = 1 WHERE id = 1234;
SELECT status FROM games WHERE id = 1234;  -- Should be 'completed'
```

---

## 📝 Next Steps

1. **Apply automation SQL** (5 minutes)
2. **Test with sample data** (5 minutes)
3. **Monitor for 1 week** (passive)
4. **Adjust schedules** if needed (optional)
5. **Set up email alerts** (optional, 30 minutes)

---

**Questions?** Run `SELECT * FROM v_scheduled_jobs;` to see what's active!
