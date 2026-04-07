# 🧪 Testing Role Enforcement - Group Commands

## Overview

This guide explains how to test that **role-based permissions** are working correctly for group management commands.

---

## 📋 Test Matrix

| Command | Admin | Non-Admin | Expected |
|---------|-------|-----------|----------|
| `!add-group` | ✅ | ❌ | Only admin can execute |
| `!set-monitor-group` | ✅ | ❌ | Only admin can execute |
| `!set-report-target` | ✅ | ❌ | Only admin can execute |
| `!remove-group` | ✅ | ❌ | Only admin can execute |
| `!list-groups` | ✅ | ❌ | Only admin can execute |
| `!report-config` | ✅ | ❌ | Only admin can execute |
| `!ticket` | ✅ | ✅ | All users can execute |
| `!remind` | ✅ | ✅ | All users can execute |
| `!addtask` | ✅ | ✅ | All users can execute |

---

## 🔧 Test Setup

### Prerequisites
- Running bot with updated services/bots packages
- At least 2 phone numbers (one admin, one regular user)
- Access to WhatsApp/Telegram groups for testing

### Step 1: Identify Test Users

**Admin User:**
- Phone: `<YOUR_ADMIN_PHONE>` (e.g., 081234567890)
- Status: Already promoted to ADMIN via `!setrole` command

**Regular User:**
- Phone: `<YOUR_USER_PHONE>` (e.g., 089876543210)
- Status: Will have default 'user' role

---

## 🧪 Test Cases

### Test Case 1: Admin Can Execute Group Commands

**Step 1.1:** Admin sends message to bot
```
!add-group 120363TESTADMIN@g.us "Test Admin Group"
```

**Expected Result:**
```
✅ Grup ditambahkan: Test Admin Group
`120363TESTADMIN@g.us`

Konfigurasi monitoring dan report dengan:
!set-monitor-group <jid> true
!set-report-target <type> <jid> true
```

**Step 1.2:** Admin lists groups
```
!list-groups
```

**Expected Result:**
```
📊 Daftar Grup Teregistrasi
...mengubah grup dalam database...
✅ Test Admin Group (120363TESTADMIN@g.us)
   Monitoring: OFF
   Report: OFF
```

**Step 1.3:** Admin sets monitoring
```
!set-monitor-group 120363TESTADMIN@g.us true
```

**Expected Result:**
```
✅ DIAKTIFKAN

Grup Test Admin Group monitoring diaktifkan
```

**Step 1.4:** Admin sets report target
```
!set-report-target daily 120363TESTADMIN@g.us true
```

**Expected Result:**
```
✅ DIAKTIFKAN

Laporan DAILY untuk grup Test Admin Group diaktifkan
```

**Step 1.5:** Admin checks report config
```
!report-config
```

**Expected Result:**
```
📊 Konfigurasi Laporan Aktif

Test Admin Group
JID: `120363TESTADMIN@g.us`
  📅 Daily @ 7:00
```

---

### Test Case 2: Regular User CANNOT Execute Group Commands

**Step 2.1:** Regular user tries to add group
```
!add-group 120363TESTUSER@g.us "User Attempt"
```

**Expected Result:**
```
❌ UNAUTHORIZED

You need ADMIN role to use this command
[Or similar permission denied message]
```

**Step 2.2:** Regular user tries to list groups
```
!list-groups
```

**Expected Result:**
```
❌ UNAUTHORIZED

You need ADMIN role to use this command
```

**Step 2.3:** Regular user tries to remove group
```
!remove-group 120363TESTADMIN@g.us
```

**Expected Result:**
```
❌ UNAUTHORIZED

You need ADMIN role to use this command
```

---

### Test Case 3: All Users CAN Execute Data Entry Commands

**Step 3.1:** Regular user creates ticket
```
!ticket Internet down | Connection error since 14:00
```

**Expected Result:**
```
✅ Tiket berhasil dibuat
Tiket #1001: Internet down

Status: OPEN
...
```

**Step 3.2:** Regular user creates reminder
```
!remind Check server status | 15:30
```

**Expected Result:**
```
✅ Reminder dibuat berhasil
ID: rem_xxxxx
Message: Check server status
Time: 15:30
```

**Step 3.3:** Regular user adds task
```
!addtask Follow up with customer ABC regarding incident
```

**Expected Result:**
```
✅ Task berhasil ditambahkan
Task #1234: Follow up with customer ABC...
```

**Step 3.4:** Admin also can use data entry commands
```
(Admin sends same ticket/reminder/task commands)
```

**Expected Result:**
```
✅ (Same success responses as regular user)
```

---

### Test Case 4: Role Promotion Works

**Step 4.1:** Admin promotes regular user
```
!setrole 089876543210 admin
```

**Expected Result:**
```
✅ Pengguna 089876543210 telah dipromosikan ke ADMIN
```

**Step 4.2:** Previously regular user now executes group command
```
(Regular user now sends):
!list-groups
```

**Expected Result:**
```
✅ (Groups list displayed - now user is admin)
```

**Step 4.3:** Admin demotes user back
```
!setrole 089876543210 user
```

**Expected Result:**
```
✅ Pengguna 089876543210 telah diturunkan ke USER
```

**Step 4.4:** User no longer can execute group command
```
!list-groups
```

**Expected Result:**
```
❌ UNAUTHORIZED
```

---

## 🔍 Verification Checklist

After running all tests, check:

- [x] Admin can execute all 6 group commands
- [x] Regular user gets "UNAUTHORIZED" error for group commands
- [x] Regular user can execute ticket/task/reminder commands
- [x] Admin can also execute ticket/task/reminder commands
- [x] Role promotion (`!setrole`) works correctly
- [x] Role demotion restores permission restrictions
- [x] Role hierarchy: user(1) < moderator(2) < admin(3)

---

## 📊 Role Checking Mechanism

### Code Flow

```
User sends command
    ↓
CommandExecutor.execute()
    ↓
CommandExecutor.hasPermission()
    ↓
handler.getRequiredRole() → "admin"
vs
context.user.role → "user"
    ↓
roleHierarchy["user"] = 1
roleHierarchy["admin"] = 3
    ↓
1 >= 3? NO
    ↓
Throw UnauthorizedError
    ↓
Return: "You need ADMIN role to use this command"
```

### Group Commands Role Config

```typescript
// All 6 group commands have:
getCategory(): string {
  return 'admin';
}

getRequiredRole(): string {
  return 'admin';  // ← ENFORCES ADMIN ROLE
}
```

### Data Entry Commands Role Config

```typescript
// Ticket, Task, Reminder commands:
// (inherits BaseCommandHandler default)

getRequiredRole(): string {
  return 'user';  // ← ALLOWS ALL USERS
}
```

---

## 🐛 Troubleshooting

### Issue: User still can execute admin command

**Cause:** Role enforcement not recompiled
**Fix:** 
```bash
cd packages/services && pnpm build
cd packages/bots && pnpm build
# Restart bot
```

### Issue: Error message shows "UNAUTHORIZED" instead of specific text

**Cause:** Executor catches UnauthorizedError and returns generic message
**Fix:** Check logs for actual error:
```bash
tail -f logs/bot.log | grep -i "unauthorized\|permission"
```

### Issue: User still has old permissions after `!setrole`

**Cause:** User session cache not cleared
**Fix:** User sends new message to bot (triggers context refresh)

---

## 📝 Expected Log Output

When role enforcement works correctly, bot logs should show:

```
[INFO@CommandExecutor] Executing command: add-group
[INFO@CommandExecutor] User role check: required='admin' user='admin' PASS
[INFO@CommandExecutor] Command executed: add-group [duration: 123ms] [success: true]

[INFO@CommandExecutor] Executing command: list-groups
[INFO@CommandExecutor] User role check: required='admin' user='user' FAIL
[ERROR@CommandExecutor] UnauthorizedError: You need ADMIN role to execute command 'list-groups'
[INFO@CommandExecutor] Command execution error: UnauthorizedError
```

---

## ✅ Sign-Off

When all test cases pass:

```
✅ Role enforcement verified
✅ Group commands ADMIN-only confirmed
✅ Data entry commands USER-accessible confirmed
✅ Role promotion/demotion working
✅ Permission model stable

Status: READY FOR PRODUCTION
```

---

## 📞 Support

**Issue Encountered?**
1. Check logs: `tail -f logs/bot.log`
2. Verify role: `!setrole <phone>` (shows current role)
3. Check database: Query `User.role` in database
4. Restart bot and test again

