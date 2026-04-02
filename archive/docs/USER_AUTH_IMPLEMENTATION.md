# 🔐 User Authentication Implementation

## Overview

Added comprehensive user authentication system to ΠροΤερο with email/password login, session management, and role-based access control.

## What Was Implemented

### 1. Database Schema ✅

**New Tables:**
- `users` - User accounts with email, password_hash, name, role
- `sessions` - Session management with expiry

**User Roles:**
- `user` - Regular user (default)
- `admin` - Administrator access

**Default Admin Account:**
- Email: `admin@protero.app`
- Password: `admin123` (⚠️ Change this!)

### 2. Authentication API ✅

**New API Endpoints:**
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - New user registration
- `GET /api/auth/me` - Get current user session
- `POST /api/auth/logout` - Logout and clear session

**Features:**
- Secure password hashing with bcrypt
- HTTP-only cookies for sessions
- 7-day session expiry
- Email validation
- Password strength requirements (min 6 chars)

### 3. Frontend Components ✅

**New Pages:**
- `/pages/login.vue` - Login/register page
- `/pages/leagues.vue` - Main dashboard (moved from index)
- `/pages/index.vue` - Redirect handler

**New Components:**
- `/components/LoginForm.vue` - Login/register form with toggle

**Composables:**
- `/composables/useAuth.ts` - Authentication state management

**Middleware:**
- `/middleware/auth.ts` - Route protection

### 4. Updated Admin Panel ✅

**Changes:**
- ❌ Removed password-only authentication
- ✅ Now requires user login with admin role
- ✅ Shows access denied for non-admin users
- ✅ Uses `useAuth()` composable for auth state

### 5. Security Features ✅

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ HTTP-only session cookies
- ✅ CSRF protection via sameSite cookies
- ✅ Session expiry (7 days)
- ✅ Secure cookies in production
- ✅ Email validation
- ✅ Password requirements

## Setup Instructions

### 1. Install Dependencies

```bash
npm install bcryptjs --save
```

### 2. Apply Database Schema

**Option A: Using the setup script (recommended)**
```bash
./tools/setup_auth.sh
```

**Option B: Manual setup**
```bash
# Login to Turso
turso auth login

# Apply schema
turso db shell protero-football < tools/setup_user_auth.sql
```

### 3. Start the Application

```bash
npm run dev
```

### 4. Test Login

1. Visit: http://localhost:3000
2. You'll be redirected to `/login`
3. Login with admin account:
   - Email: `admin@protero.app`
   - Password: `admin123`
4. You'll be redirected to `/leagues` (main dashboard)

### 5. Access Admin Panel

- Once logged in, visit: http://localhost:3000/admin
- Only users with `admin` role can access

## Application Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Application Flow                     │
└─────────────────────────────────────────────────────────┘

1. FIRST VISIT
   └─> Check authentication
       ├─ Not authenticated → /login
       └─ Authenticated → /leagues

2. LOGIN PAGE (/login)
   ├─ Enter email + password
   ├─ Or register new account
   └─ On success → /leagues

3. MAIN DASHBOARD (/leagues)
   ├─ Protected by auth middleware
   ├─ Shows all leagues and matches
   ├─ Click league → /league/[slug]
   └─ Sidebar navigation

4. ADMIN PANEL (/admin)
   ├─ Protected by auth middleware
   ├─ Requires admin role
   ├─ Non-admin → Access denied
   └─ Admin → Full access to match editor

5. LOGOUT
   └─ Clears session → /login
```

## File Structure

```
protero/
├── composables/
│   └── useAuth.ts                        # Auth state management
├── middleware/
│   └── auth.ts                          # Route protection
├── components/
│   └── LoginForm.vue                     # Login/register form
├── pages/
│   ├── index.vue                        # Redirect handler
│   ├── login.vue                        # Login page
│   ├── leagues.vue                      # Main dashboard (protected)
│   └── admin.vue                        # Admin panel (protected)
├── server/api/auth/
│   ├── login.post.ts                    # Login endpoint
│   ├── register.post.ts                 # Registration endpoint
│   ├── me.get.ts                        # Current user endpoint
│   └── logout.post.ts                   # Logout endpoint
└── tools/
    ├── setup_user_auth.sql              # Database schema
    └── setup_auth.sh                    # Setup script
```

## API Usage Examples

### Login
```javascript
const { login } = useAuth()
const result = await login('user@example.com', 'password')
if (result.success) {
  // Logged in!
}
```

### Register
```javascript
const { register } = useAuth()
const result = await register('user@example.com', 'password', 'John Doe')
if (result.success) {
  // Account created!
}
```

### Check Auth Status
```javascript
const { isAuthenticated, isAdmin, user } = useAuth()

if (isAuthenticated.value) {
  console.log('User:', user.value.name)
  console.log('Email:', user.value.email)
  console.log('Is Admin:', isAdmin.value)
}
```

### Logout
```javascript
const { logout } = useAuth()
await logout() // Clears session and redirects to /login
```

## Security Best Practices

### ✅ Implemented
- Password hashing with bcrypt
- HTTP-only cookies (not accessible via JavaScript)
- Secure cookies in production (HTTPS only)
- SameSite cookie protection
- Session expiry
- Email validation
- Password requirements

### 🔒 Recommended for Production
1. **Change default admin password** immediately
2. Use strong passwords (12+ characters, mixed case, numbers, symbols)
3. Enable HTTPS in production
4. Set secure environment variables
5. Consider adding:
   - Rate limiting on login attempts
   - Two-factor authentication (2FA)
   - Password reset functionality
   - Email verification
   - Account lockout after failed attempts

## Environment Variables

No changes needed to `.env` file. The old `ADMIN_PASSWORD` is no longer used.

```env
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token
# ADMIN_PASSWORD is no longer used
```

## Migration from Old System

**Before:** Simple password check in admin panel
```javascript
// Old: Single password for everyone
if (password === config.adminPassword) { ... }
```

**After:** Proper user authentication
```javascript
// New: User accounts with roles
const { isAuthenticated, isAdmin } = useAuth()
if (isAdmin.value) { ... }
```

**What Changed:**
- ❌ `ADMIN_PASSWORD` environment variable → No longer used
- ❌ `/api/admin/auth` endpoint → Removed
- ✅ `/api/auth/*` endpoints → New auth system
- ✅ User accounts with email/password
- ✅ Role-based access control
- ✅ Session management

## Troubleshooting

### "Not logged in to Turso"
```bash
turso auth login
```

### "Database error" when running setup
Make sure your database name is correct:
```bash
turso db list
```

### Can't login with admin credentials
Check if the schema was applied:
```bash
turso db shell protero-football "SELECT email FROM users WHERE role='admin';"
```

### Session expires too quickly
Edit session expiry in `/server/api/auth/login.post.ts`:
```typescript
expiresAt.setDate(expiresAt.getDate() + 30) // 30 days instead of 7
```

## Next Steps (Optional Enhancements)

1. **Password Reset**
   - Add "Forgot Password?" link
   - Email verification
   - Reset token generation

2. **Profile Management**
   - Update email/password
   - Profile picture
   - User preferences

3. **Enhanced Security**
   - Two-factor authentication (2FA)
   - Login history
   - Device management
   - Rate limiting

4. **Admin Features**
   - User management interface
   - Role assignment
   - Activity logs
   - Audit trail

## Testing Checklist

- [ ] Can register new account
- [ ] Can login with credentials
- [ ] Can access `/leagues` when logged in
- [ ] Cannot access `/leagues` when logged out
- [ ] Admin can access `/admin` panel
- [ ] Regular user cannot access `/admin` panel
- [ ] Can logout successfully
- [ ] Session persists after page refresh
- [ ] Session expires after 7 days

---

**Status:** ✅ Complete and ready to use
**Date:** January 7, 2026
**Database:** Turso SQLite (protero-football)
