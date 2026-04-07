# 🔐 Permission Model - Groups & Data Entry

## Ringkas

| Feature | Role Required | Penjelasan |
|---------|---|-----------|
| **Setup Report Groups** | ⭐ ADMIN | Hanya admin yg bisa register/setup grup untuk report |
| **Monitor Groups** | ⭐ ADMIN | Hanya admin yg bisa enable/disable group monitoring |
| **Create Tickets** | USER | Semua user bisa buat ticket |
| **Create Reminders** | USER | Semua user bisa buat reminder |
| **Create Tasks** | USER | Semua user bisa buat task |
| **Knowledge Entry** | USER | Semua user bisa add knowledge items |
| **Create Notes** | USER | Semua user bisa buat notes |

---

## 📊 Visualization

```
┌─────────────────────────────────────┐
│         USER (Default Role)         │
├─────────────────────────────────────┤
│ ✅ Create tickets                   │
│ ✅ Create reminders                 │
│ ✅ Create tasks                     │
│ ✅ Add knowledge                    │
│ ✅ Use !daily-report command        │
│ ✅ View team reports                │
│ ❌ Setup report grupos              │
│ ❌ Manage group configuration       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      ADMIN (Full Control)           │
├─────────────────────────────────────┤
│ ✅ Create tickets                   │
│ ✅ Create reminders                 │
│ ✅ Create tasks                     │
│ ✅ Add knowledge                    │
│ ✅ Use !daily-report command        │
│ ✅ View team reports                │
│ ✅ Setup report groups              │ ← ONLY ADMIN
│ ✅ Manage group configuration       │ ← ONLY ADMIN
│ ✅ Promote/demote users             │
│ ✅ Manage alert rules               │
│ ✅ Configure escalations            │
└─────────────────────────────────────┘
```

---

## 🎯 Real-World Example

### Scenario: Tim Support dengan 1 Admin & 5 Agents

**Admin Setup (1 person):**
```
<!-- Admin does this ONCE -->
!add-group 120363ADMIN@g.us "Admin Reports"
!set-report-target daily 120363ADMIN@g.us true
!set-report-target weekly 120363ADMIN@g.us true
!set-report-target monthly 120363ADMIN@g.us true

!add-group 120363SUPPORT@g.us "Support Team"
!set-monitor-group 120363SUPPORT@g.us true
<!-- But report disabled - agents don't need reports -->

!setrole 081234567890 admin  <!-- promote someone to admin -->
```

**Support Agents (5 people) - Can do:**
```
✅ !ticket Link down | Internet error dari customer XYZ
✅ !remind Check modem status setiap jam 14:00
✅ !addtask Follow up dengan customer ABC
✅ !kb Bagaimana reset modem ASUS?
✅ !daily-report (baca report, tapi report tidak dikirim ke mereka)
```

**Support Agents - Cannot do:**
```
❌ !add-group (hanya admin)
❌ !set-report-target (hanya admin)
❌ !setrole (hanya admin)
```

---

## 🔑 How It Works

### Role Checking in Command Executor

```typescript
// Setiap command punya getRequiredRole()
command.getRequiredRole()  // Returns: "user" atau "admin"

// Bot check sebelum execute:
if (user.role !== command.requiredRole && command.requiredRole !== 'user') {
  return error("❌ You need ADMIN role to use this command");
}
```

### Group Management Commands

```typescript
export class AddGroupCommand extends BaseCommandHandler {
  // ...
  getCategory(): string {
    return 'admin';  // Clearly marked as admin command
  }
  
  getRequiredRole(): string {
    return 'admin';  // ⭐ REQUIRES ADMIN
  }
}
```

### Data Entry Commands

```typescript
export class TicketCreateCommand extends BaseCommandHandler {
  // ...
  getCategory(): string {
    return 'ticket';
  }
  
  getRequiredRole(): string {
    return 'user';  // ✅ Default, allow all users
  }
}
```

---

## 👤 User Roles Explained

### ROLE: `user` (Default)
- **Default for everyone** saat pertama kali chat dengan bot
- Bisa create tickets, reminders, tasks, notes, knowledge
- **Tidak bisa** manage sistem (groups, roles, escalations, alerts)

### ROLE: `moderator` (Optional)
- Lebih dari user, tapi belum full admin
- Reserved untuk future features (moderasi content, SLA management, dll)
- Sekarang: sama seperti user, bisa di-expand nanti

### ROLE: `admin` (Full Power)
- Bisa setup report groups
- Bisa manage group monitoring
- Bisa promote/demote users
- Bisa configure escalations, alerts, SLA rules
- **Usually: 1-3 people per tim**

---

## ⚙️ Commands by Role

### 🟢 USER LEVEL (Everyone)

```
🎫 Ticket Management
   !ticket <title> | <problem>        Create ticket
   !ticket-status <id>                View ticket status
   !ticket-list                       List open tickets

⏰ Reminders
   !remind <message> <when>           Create reminder
   !reminders                         List your reminders

✅ Tasks
   !addtask <description>             Add task
   !tasks                             List tasks
   !done <task-id>                    Complete task

📚 Knowledge Base
   !kb <search-term>                  Search knowledge
   !kbtopics                          List topics

📝 Notes
   !note <content>                    Add note

📊 Reports
   !daily-report                      View today's report
   !weekly-report                     View week's report
   !monthly-report                    View month's report
```

### 🔴 ADMIN LEVEL ONLY

```
👥 Group Management
   !add-group <jid> <name>            Register group
   !list-groups                       List all groups
   !set-monitor-group <jid> <t/f>     Enable/disable monitoring
   !set-report-target <type> <jid>    Enable/disable reports
   !remove-group <jid>                Delete group
   !report-config                     View report config

👤 User Management
   !setrole <phone> <role>            Promote/demote user

🚨 System Management
   !server <status|restart|logs>      DevOps commands
   !docker <status|restart>           Docker management
   !health                            Health check
   !config                            Manage escalations/alerts
```

---

## 🛡️ Security Model

### Why Separate Admin & User?

1. **Safety** - Regular users tidak bisa accidentally misconfigure sistem
2. **Auditability** - Admin actions can be logged & reviewed
3. **Accountability** - Clear who made what change
4. **Scalability** - Jika tim grow, lebih mudah manage permissions

### Example: Mencegah Data Entry User Spam Reports

```
ADMIN setup 1x:
!add-group 120363REPORTS@g.us "Monthly Reports"
!set-report-target monthly 120363REPORTS@g.us true
↓
Report hanya dikirim ke grup itu, di waktu yg tepat
User tidak bisa trigger/change delivery

vs

Without permission control:
Any user bisa !set-report-target capek-capek
→ Reports ke random groups, tim bingung
```

---

## 🔄 How to Promote User to Admin

### By Admin (via !setrole):

```
!setrole 081234567890 admin
```

Maka user with phone 081234567890 sekarang:
```
✅ Bisa !add-group
✅ Bisa !set-report-target
✅ Bisa !setrole (promote others)
```

### To Demote Back to User:

```
!setrole 081234567890 user
```

---

## 📋 Checklist: Setting Up Team Permissions

```
┌─ Initial Setup (Admin Only) ─┐
├─ [ ] Identify 1-3 admins
├─ [ ] Promote them: !setrole <phone> admin
└────────────────────────────┘
        ↓
┌─ Group Configuration (Admin Only) ─┐
├─ [ ] For each report group:
│   ├─ [ ] !add-group <jid> <name>
│   ├─ [ ] !set-report-target daily/weekly/monthly
│   └─ [ ] !report-config (verify)
└────────────────────────────┐
        ↓
┌─ User Onboarding (Everyone) ─┐
├─ [ ] Send quick guide: !ticket, !remind, !kb, !tasks
├─ [ ] Users create first ticket
├─ [ ] System auto-promotes first user to admin if none exist
└────────────────────────────┘
```

---

## 🎓 Training Guide for Your Team

### For Regular Users (Non-Admin):

> Bagikan ini ke semua staff:

```
Hai! Berikut perintah yang bisa kamu gunakan:

📝 Buat Tiket:
   !ticket Internet putus di cabang A | Tidak ada koneksi sejak 13:00

⏰ Set Reminder:
   !remind Follow-up customer XYZ | 15:00

✅ Add Task:
   !addtask Inspect server di data center

📊 Lihat Report:
   !daily-report
   !weekly-report

Kalau ada pertanyaan, hubungi admin tim!
```

### For Admins:

> Bagikan ini ke admin(s):

```
Kamu sekarang ADMIN! Tanggung jawab kamu:

👥 Setup Groups:
   !add-group <jid> <name>
   !set-report-target <type> <jid> true

📊 Verifikasi Config:
   !report-config
   !list-groups

👤 Manage Users:
   !setrole <phone> <admin|user>

⚠️ Jangan: Promote sembarangan atau disable monitoring tanpa alasan!
```

---

## 🔍 Troubleshooting

### Problem: "You need ADMIN role"
**Check:**
```
Apakah Anda sudah di-promote ke admin?
Tanya kepada current admin: !setrole <your_phone> admin
```

### Problem: "User not found" saat setrole
**Solutions:**
```
User harus chat dengan bot dulu
Bot auto-register saat first message
Kalau belum ada, tunggu mereka chat: "Halo bot"
Baru bisa: !setrole <phone> admin
```

### Problem: Admin promotion otomatis tidak terjadi
**Info:**
```
First user yg chat dengan bot auto-promoted ke admin
Kalau sudah ada admin, user baru = regular user
Existing admin bisa promote. Contoh:
!setrole 081234567890 admin
```

---

## ✅ Summary

**Report Groups = Admin Only**
- Setup, monitoring, delivery configuration
- Protects dari user misconfiguration
- Only 1-3 people di tim

**Data Entry = Everyone**
- Tickets, reminders, tasks, notes, knowledge
- Low-risk user actions
- Encourage team to use bot

**Roles:**
- `user` (default) → Can create data
- `admin` (promoted) → Can manage system

Semua secure, scalable, & clear!
