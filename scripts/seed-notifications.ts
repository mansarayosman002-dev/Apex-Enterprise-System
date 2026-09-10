import { db } from '../src/db/index.ts';
import { notifications } from '../src/db/schema.ts';

async function seedNotifications() {
  console.log('Seeding formatted enterprise notifications...');

  const sampleNotifications = [
    {
      title: 'Shift Arrival & Attendance Digest',
      category: 'Attendance',
      priority: 'high',
      channel: 'in_app',
      status: 'delivered',
      isRead: false,
      message: `### Shift Arrival Report (Morning Window)

Attendance statistics for **Apex Enterprise SL Ltd** morning shift (08:00 - 17:00).

- **Total Expected Staff**: 24
- **Checked In On-Time**: 21
- **Late Check-Ins**: 2
- **Absences / Unreported**: 1

| Employee ID | Name | Department | Check-In | Status |
|---|---|---|---|---|
| EMP-1005 | **Alie Koroma** | Operations & Logistics | 08:42:15 | Late (+42m) |
| EMP-1009 | **Sorie Sesay** | Finance & Accounts | 08:25:30 | Late (+25m) |
| EMP-1014 | **Aminata Turay** | Human Resources | --:--:-- | Unreported |

[ACTION REQUIRED] Please verify late arrival justifications or approve automated excuse requests via the HR Attendance Portal.`,
      createdAt: new Date(),
    },
    {
      title: 'Monthly Payroll Batch Pre-Processing Complete',
      category: 'Payroll',
      priority: 'urgent',
      channel: 'in_app',
      status: 'delivered',
      isRead: false,
      message: `### Payroll Batch: September 2026

The automated salary calculation engine has completed preliminary batch computation for all 24 active employees.

- **Gross Payroll Subtotal**: SLL 128,450,000
- **Total Statutory Deductions (NASSIT & PAYE)**: SLL 28,260,000
- **Total Net Payable**: SLL 100,190,000
- **Audit Flag**: 0 critical anomalies detected

> **Sender Note from Payroll Engine**:
> All biometric overtime hours and attendance adjustments have been matched with the approved roster schedule.

[SUCCESS] Batch has passed pre-flight validation and is ready for Financial Director sign-off.`,
      createdAt: new Date(Date.now() - 1000 * 60 * 35),
    },
    {
      title: 'Updated QR Code Security & Attendance Policy',
      category: 'HR',
      priority: 'medium',
      channel: 'in_app',
      status: 'delivered',
      isRead: false,
      message: `### Operational Notice: QR Punch Protocol

To ensure data integrity and prevent buddy punching across Apex Enterprise SL Ltd operational facilities:

- Dynamic QR Codes refresh every **30 seconds** on corporate kiosk displays.
- Employees must scan their unique digital ID badges during official shift windows.
- Any manual overrides require managerial two-factor approval.

Please contact HR or your Departmental Supervisor if you require badge re-issuance.`,
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
    },
    {
      title: 'AI Workforce Intelligence Anomaly Report',
      category: 'HR',
      priority: 'high',
      channel: 'in_app',
      status: 'delivered',
      isRead: true,
      message: `### Automated AI Workforce Anomaly Alert

The AI Copilot detected abnormal overtime accumulation in the **IT & Engineering** department over the past 14 days.

| Employee ID | Name | Role | Logged OT | Dept Average |
|---|---|---|---|---|
| EMP-1002 | **Osman Mansaray** | Lead Systems Architect | 34.5 hrs | 8.2 hrs |
| EMP-1004 | **Fatima Bangura** | Senior Full-Stack Eng | 28.0 hrs | 8.2 hrs |

> **Note from AI Analytics**:
> Increased overtime coincides with system deployment sprints. Roster re-balancing recommended to prevent burnout.`,
      createdAt: new Date(Date.now() - 1000 * 60 * 360),
    },
    {
      title: 'System Security & Automated Backup Completed',
      category: 'Alert',
      priority: 'low',
      channel: 'in_app',
      status: 'delivered',
      isRead: true,
      message: `### Enterprise Maintenance Log

Automated nightly database backup and security integrity check completed successfully.

- **Database**: PostgreSQL 18 Enterprise
- **Backup Archive**: \`apex_backup_2026_09_09_0300.sql.enc\`
- **SHA-256 Hash**: \`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\`
- **Encryption Status**: AES-256 GCM Verified

[COMPLETED] Zero security anomalies or unauthorized access attempts detected.`,
      createdAt: new Date(Date.now() - 1000 * 60 * 720),
    },
  ];

  for (const item of sampleNotifications) {
    await db.insert(notifications).values(item);
  }

  console.log(`Successfully seeded ${sampleNotifications.length} formatted notifications.`);
  process.exit(0);
}

seedNotifications().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
