# 🎯 League Preferences Feature

## Overview

Added user-specific league preferences allowing each user to select which leagues they want to follow. Admins see all leagues by default.

## What Was Added

### 1. New Database Table ✅

**`user_leagues` table:**
- Links users to their selected leagues
- Stores `user_id` and `league_key`
- Unique constraint on (user_id, league_key)

### 2. New Users ✅

**User "zaf" created:**
- Email: `zaf@protero.app`
- Password: `123456`
- Role: `user`

### 3. API Endpoints ✅

**`GET /api/user/leagues`** - Get user's league preferences
- Returns array of league keys
- Returns `isAdmin: true` for admin users

**`POST /api/user/leagues`** - Update league preferences
- Body: `{ leagues: ['premier_league', 'la_liga', ...] }`
- Updates user's selected leagues

### 4. New Pages & Components ✅

**`/pages/preferences.vue`** - Settings page
- Shows user info
- League preference selector
- Admin notice

**`/components/LeaguePreferences.vue`** - League selector
- Visual league cards with toggle switches
- Select all button
- Save preferences
- Shows warning if no leagues selected

### 5. Updated Dashboard ✅

**`/pages/leagues.vue`** - Filtered by preferences
- Shows only user's selected leagues
- Displays "No leagues selected" message
- "Preferences" button in header
- Admins see all leagues

**`/components/Sidebar.vue`** - Added preferences link
- New "Preferences" menu item
- Links to `/preferences`

## User Accounts

### Admin Account
```
Email: admin@protero.app
Password: admin123
Role: admin
Access: All leagues + admin panel
```

### User "zaf"
```
Email: zaf@protero.app
Password: 123456
Role: user
Access: Selected leagues only
```

## How It Works

### For Regular Users:
1. **First Login**: User sees "No leagues selected" message
2. **Click "Preferences"**: Goes to settings page
3. **Select Leagues**: Toggle leagues they want to follow
4. **Save**: Returns to dashboard showing only selected leagues
5. **Dashboard**: Shows stats and matches only for selected leagues

### For Admins:
1. **Login**: Sees all leagues automatically
2. **Preferences Page**: Can view but selections don't affect display
3. **Dashboard**: Always shows all leagues
4. **Admin Panel**: Full access as before

## Setup Instructions

### Apply Database Changes

```bash
# Run the setup script (includes new user and table)
./tools/setup_auth.sh

# Or manually:
turso db shell protero-football < tools/setup_user_auth.sql
```

### Test the Feature

1. **Login as zaf:**
   - Email: `zaf@protero.app`
   - Password: `123456`

2. **You'll see:** "No leagues selected" message

3. **Click "Preferences"** or "Select Leagues" button

4. **Toggle leagues** you want to follow

5. **Click "Save Preferences"**

6. **Dashboard updates** to show only selected leagues

## Features

### League Preferences Component
- ✅ Visual league cards with flags
- ✅ Toggle switches for each league
- ✅ "Select All" button
- ✅ Save button with loading state
- ✅ Warning if no leagues selected
- ✅ Toast notifications on save

### Smart Filtering
- ✅ Users see only selected leagues
- ✅ Stats update based on selection
- ✅ Only loads data for selected leagues (performance)
- ✅ Admins bypass filtering

### UI Updates
- ✅ "My Leagues" header on dashboard
- ✅ Preferences button in header
- ✅ Settings icon in sidebar
- ✅ User info card in preferences
- ✅ Admin badge and notice

## File Structure

```
protero/
├── server/api/user/
│   ├── leagues.get.ts           # Get user preferences
│   └── leagues.post.ts          # Update preferences
├── components/
│   ├── LeaguePreferences.vue    # League selector
│   └── Sidebar.vue              # Updated with preferences link
├── pages/
│   ├── preferences.vue          # Settings page
│   └── leagues.vue              # Updated with filtering
└── tools/
    └── setup_user_auth.sql      # Updated schema + new user
```

## API Examples

### Get User's Leagues
```javascript
const { data } = await $fetch('/api/user/leagues')
// Returns: { leagues: ['premier_league', 'bundesliga'], isAdmin: false }
```

### Save Preferences
```javascript
await $fetch('/api/user/leagues', {
  method: 'POST',
  body: { leagues: ['premier_league', 'la_liga', 'serie_a'] }
})
```

### Check in Component
```vue
<script setup>
const { isAdmin } = useAuth()

if (isAdmin.value) {
  // Show all leagues
} else {
  // Filter by preferences
}
</script>
```

## Database Schema

```sql
CREATE TABLE user_leagues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  league_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, league_key)
);
```

## Testing Checklist

- [ ] Can login as zaf (zaf@protero.app / 123456)
- [ ] See "No leagues selected" on first login
- [ ] Can navigate to preferences
- [ ] Can toggle league selections
- [ ] Can save preferences
- [ ] Dashboard updates to show selected leagues
- [ ] Stats reflect selected leagues only
- [ ] Admin sees all leagues regardless
- [ ] Preferences persist after logout/login

## Future Enhancements

- [ ] Set default leagues for new users
- [ ] League search in preferences
- [ ] Bulk operations (select by country)
- [ ] Favorite teams within leagues
- [ ] Custom ordering of leagues
- [ ] League notifications settings

---

**Status:** ✅ Complete and ready to test
**Date:** January 7, 2026
**New User:** zaf@protero.app (password: 123456)
