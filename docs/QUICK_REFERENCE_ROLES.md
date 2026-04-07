# 🎯 Role Enforcement - Quick Reference

## TL;DR

```
GROUP COMMANDS = ADMIN ONLY ⭐
└─ !add-group, !list-groups, !set-monitor-group, 
   !set-report-target, !remove-group, !report-config

DATA ENTRY = ALL USERS ✅
└─ !ticket, !remind, !addtask, !kb, !note, etc.
```

---

## 🔑 Key Points

| Aspect | Details |
|--------|---------|
| **Default Role** | `user` - Everyone is user by default |
| **Admin Promotion** | `!setrole <phone> admin` - Only admin can do this |
| **Permission Check** | Happens before command execution |
| **Enforcement** | Role hierarchy: user(1) < moderator(2) < admin(3) |

---

## 📊 Two-Minute Permission Chart

### ADMIN CAN
```
✅ !add-group                    Daftar grup baru
✅ !list-groups                  Lihat daftar grup
✅ !set-monitor-group            Aktif/nonaktif monitoring
✅ !set-report-target            Atur pengiriman laporan
✅ !remove-group                 Hapus grup
✅ !report-config                Lihat konfigurasi laporan
✅ !ticket                       Buat tiket
✅ !remind                       Buat reminder
✅ !addtask                      Buat task
✅ !setrole <phone> admin        Promosi user
```

### REGULAR USER CAN
```
✅ !ticket                       Buat tiket
✅ !remind                       Buat reminder
✅ !addtask                      Buat task
✅ !kb <search>                  Cari knowledge
✅ !note <content>               Buat note
❌ !add-group                    ← BLOCKED (admin only)
❌ !list-groups                  ← BLOCKED (admin only)
❌ !setrole <phone> admin        ← BLOCKED (admin only)
```

---

## 🔐 Role Promotion

### Make Someone Admin
```
!setrole 081234567890 admin

Response:
✅ Pengguna 081234567890 telah dipromosikan ke ADMIN
```

### Check Current Role
```
!setrole 081234567890

Response:
📋 Pengguna 081234567890: USER (atau ADMIN)
```

### Demote Admin to User
```
!setrole 081234567890 user

Response:
✅ Pengguna 081234567890 telah diturunkan ke USER
```

---

## ⚠️ Error Messages

**If regular user tries admin command:**
```
❌ UNAUTHORIZED
You need ADMIN role to use this command
```

**If user not found:**
```
❌ User not found: 081234567890
(User must send message to bot first)
```

---

## 🚀 Typical Workflow

### Step 1: Setup (Admin Only)
```
Admin executes once:
!add-group 120363ABC@g.us "Support Team"
!set-report-target daily 120363ABC@g.us true
```

### Step 2: Daily Use (Everyone)
```
Support agents execute anytime:
!ticket Customer down | Network error
!remind Follow up tomorrow | 09:00
!addtask Check cable in rack B3
```

### Step 3: Configuration (Admin Only)
```
If changing report settings:
!set-report-target weekly 120363ABC@g.us true
!remove-group 120363OLD@g.us
```

---

## 🆘 Troubleshooting

**Q: Why can't I use `!add-group`?**
- A: You need ADMIN role. Ask current admin to promote you: `!setrole <your_phone> admin`

**Q: How do I become admin?**
- A: Current admin must run: `!setrole <your_phone> admin`

**Q: Can regular users create tickets?**
- A: Yes! Use `!ticket <title> | <description>`

**Q: Can I revert admin promotion?**
- A: Yes! Admin runs: `!setrole <phone> user`

**Q: Does `!daily-report` require admin?**
- A: No, everyone can view reports. Only admin configures delivery.

---

## 💾 Database Reference

### User Roles Table
```
User
├── phone: string (WhatsApp/Telegram ID)
├── role: "user" | "admin" | "moderator"
└── createdAt: datetime

Example:
┌─────────────────┬────────┐
│ phone           │ role   │
├─────────────────┼────────┤
│ 081234567890    │ admin  │
│ 089876543210    │ user   │
│ 081111111111    │ admin  │
│ 081222222222    │ user   │
└─────────────────┴────────┘
```

---

## 🔄 Role Hierarchy

```
Level 1: user ✅ Can use data entry commands
         ├─ Create tickets
         ├─ Create reminders
         ├─ Create tasks
         └─ View reports

Level 2: moderator (Reserved for future features)
         └─ (Same as user, with expansion potential)

Level 3: admin ⭐ Can do everything above + manage system
         ├─ Group registration & config
         ├─ Report delivery setup
         ├─ User role management
         ├─ System monitoring
         └─ (Full control)
```

---

## 📱 Commands by Category

### 👤 User Management (Admin Only)
```
!setrole <phone> <user|admin|moderator>
```

### 👥 Group Management (Admin Only)
```
!add-group <jid> <name>
!list-groups
!set-monitor-group <jid> <true|false>
!set-report-target <daily|weekly|monthly> <jid> <true|false>
!remove-group <jid>
!report-config
```

### 🎫 Ticket Management (All Users)
```
!ticket <title> | <description>
!ticket-status <id>
!ticket-list
```

### ⏰ Reminder Management (All Users)
```
!remind <message> | <time>
!reminders
```

### ✅ Task Management (All Users)
```
!addtask <description>
!tasks
!done <task-id>
```

### 📚 Knowledge Management (All Users)
```
!kb <search-term>
!kbtopics
```

### 📊 Report Management
```
View (All Users):
!daily-report
!weekly-report
!monthly-report

Configure (Admin Only):
!report-config
!set-report-target <type> <jid> <true|false>
```

---

## ✅ Verification Checklist

- [ ] I understand: Group commands = admin only
- [ ] I understand: Data entry = all users
- [ ] I know how to check my role: `!setrole <phone>`
- [ ] I know how to promote users: `!setrole <phone> admin`
- [ ] I've tested that admin commands work with admin role
- [ ] I've tested that non-admin gets error message

---

## 🎓 Learning Path

1. **Understand roles:** Read `PERMISSION_MODEL.md`
2. **Implement changes:** See `ROLE_ENFORCEMENT_IMPLEMENTATION.md`
3. **Test thoroughly:** Follow `ROLE_ENFORCEMENT_TESTING.md`
4. **Deploy safely:** Use deployment checklist in implementation doc
5. **Train team:** Share this quick reference

---

## 📞 Quick Support

| Problem | Solution |
|---------|----------|
| "UNAUTHORIZED" error | Ask admin to promote you: `!setrole <phone> admin` |
| Can't create tickets | You're still user (correct). Try: `!ticket test \| test` |
| Forgot who is admin | Check database or ask in group |
| Role not updating | Have user send new message to bot after promotion |
| Port confusion | Different roles, not ports. See PERMISSION_MODEL.md |

---

## 🎯 One-Liner Summary

> **Admin setup once** (`!add-group`...`!set-report-target`...) 
> **Users work daily** (`!ticket`...`!remind`...`!addtask`...)
> **Never mix concerns.**

---

## 📌 Pin This

Keep this reference handy:
```
GROUP MGMT: admin: !add-group, !list-groups, 
            !set-monitor-group, !set-report-target,
            !remove-group, !report-config

TICKETS:    user: !ticket <title> | <desc>
REMINDERS:  user: !remind <msg> | <time>
TASKS:      user: !addtask <desc>
REPORTS:    user: !daily-report / !weekly-report

PROMOTE:    admin: !setrole <phone> admin
```

