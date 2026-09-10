import { db } from '../src/db/index.ts';
import { systemSettings } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function seedCompanyKnowledge() {
  console.log('[KNOWLEDGE SEED] Starting Apex Enterprise SL Ltd Knowledge Base Upsert...');

  const knowledgeEntries = [
    {
      settingKey: 'company_name',
      settingValue: 'Apex Enterprise SL Ltd',
      description: 'Official corporate entity trading name',
    },
    {
      settingKey: 'company_legal_name',
      settingValue: 'Apex Enterprise Solutions (SL) Ltd.',
      description: 'Registered enterprise legal name in Sierra Leone',
    },
    {
      settingKey: 'company_tagline',
      settingValue: "Sierra Leone's Leading Enterprise Workforce Management & Automated Payroll Solutions Provider",
      description: 'Corporate motto and industry positioning',
    },
    {
      settingKey: 'company_headquarters',
      settingValue: '15 Siaka Stevens Street, Freetown, Western Area, Sierra Leone',
      description: 'Corporate physical headquarters address',
    },
    {
      settingKey: 'company_contact',
      settingValue: 'Email: info@apexenterprise.sl | Phone: +232 76 892 411 | Web: https://apexenterprise.sl',
      description: 'Corporate contact and communications channels',
    },
    {
      settingKey: 'company_overview',
      settingValue: `Apex Enterprise SL Ltd (Apex Enterprise Solutions (SL) Ltd.) is a premier Sierra Leonean technology enterprise and software engineering consultancy headquartered in Freetown. The company specializes in building robust, high-security digital infrastructure for public corporations, financial institutions, private sector enterprises, and non-governmental organizations across Sierra Leone and the wider West African region. Apex Enterprise is dedicated to eliminating manual payroll fraud, time theft, ghost workers, and regulatory non-compliance through modern cryptographic and automation technologies.`,
      description: 'Comprehensive corporate profile and mission statement',
    },
    {
      settingKey: 'company_services',
      settingValue: `Apex Enterprise SL Ltd delivers 5 flagship enterprise services:
1. Enterprise HRMS & Workforce Management: End-to-end employee lifecycle administration, digital onboarding, department hierarchies, role assignments, and leave tracking.
2. Smart QR Attendance & Terminal Infrastructure: Encrypted cryptographic badge generation, mobile camera and kiosk scanning, anti-buddy punching with live photo matching, and offline-sync terminals.
3. Automated Sierra Leone Statutory Payroll & Taxation: Full compliance calculation for NASSIT pension (5% employee / 10% employer), Sierra Leone NRA PAYE progressive income tax withholding, overtime computation, and banking direct deposit formats.
4. Custom Enterprise Software Engineering & Cloud Modernization: Scalable enterprise applications built with React, TypeScript, Node.js, and high-availability PostgreSQL database architectures.
5. AI-Powered Enterprise Copilot & Workforce Analytics: Intelligent conversational assistants, scheduled operational automations, automated compliance audits, and anomaly detection scanners.`,
      description: 'Complete breakdown of corporate products and services',
    },
    {
      settingKey: 'system_architecture_overview',
      settingValue: `The Smart Employee Attendance and Payroll Management System Using QR Code Technology is an enterprise application engineered with:
- Frontend: Modern React 18, Vite, TypeScript, and responsive TailwindCSS with dark/light themes.
- Backend: High-performance Node.js and Express.js REST API with modular routing.
- Database: Relational PostgreSQL 18 with Drizzle ORM, strict foreign keys, and indexed performance schemas.
- Security & RBAC: Multi-layered Role-Based Access Control (Administrator, HR Officer, Payroll Officer, Management, Employee) with JWT bearer token authentication, bcrypt password hashing, and IDOR isolation.
- AI Intelligence: Dual-engine architecture combining Google Gemini 2.5 Flash with a local deterministic intent parser, backed by 14 strict tools and confirmation gates for write actions.`,
      description: 'Technical architecture of the Smart HR & Payroll system',
    },
    {
      settingKey: 'system_attendance_workflow',
      settingValue: `How Attendance Tracking Operates:
1. QR Badge Issuance: Every employee is assigned a unique cryptographic QR badge embedding employee code and security hash.
2. Terminal Scanning: Employees scan badges at designated terminals (Kiosk or Mobile Camera Scanner).
3. Anti-Buddy Punching: The terminal instantly renders the employee's registered photo upon scanning for immediate visual verification by security or HR staff.
4. Debounce Protection: A 60-second cooldown prevents accidental duplicate punches.
5. Work Hours & Overtime Engine: Evaluates check-in time against standard shift (08:00:00) with a 15-minute grace threshold. Automatically deducts 1 hour of unpaid daily break. Hours worked after 17:00:00 are credited to overtime awaiting manager review.`,
      description: 'Operational lifecycle and anti-fraud mechanics of attendance',
    },
    {
      settingKey: 'system_payroll_workflow',
      settingValue: `How Payroll Processing Operates:
1. Earnings Formulation: Gross Salary = Basic Salary + Approved Overtime Payout (1.5x hourly rate) + Discretionary Allowances.
2. Sierra Leone NASSIT Compliance: Automatically deducts 5% from employee basic pay and calculates 10% employer contribution (15% total remitted to NASSIT within 15 days of month end).
3. NRA PAYE Tax Brackets: Applied progressively on taxable income (Gross Salary less allowable deductions): 0% (0 - 600,000 SLE), 15% (next 600,000 SLE), 20% (next 600,000 SLE), 30% (next 600,000 SLE), and 35% (above 2,400,000 SLE).
4. Net Take-Home Pay: Net Salary = Gross Salary - Total Deductions (NASSIT + PAYE).
5. Audit & Approval Cycle: Payroll transitions from Draft -> Preview -> Approved -> Paid, generating individual PDF/printed payslips and aggregate banking disbursement files.`,
      description: 'Statutory calculation logic and disbursement workflow of payroll',
    },
    {
      settingKey: 'system_ai_assistant',
      settingValue: `How the AI Assistant Layer Operates:
- Real-Time Database Grounding: Accesses live attendance records, department metrics, anomaly scans, and payroll records without executing raw SQL.
- Strict Permission Validator: Employees only receive personal self-service data; managerial and HR tools require elevated roles.
- Action Confirmation Safeguard: Destructive write operations (e.g., employee deactivation, batch payroll execution) require human confirmation before database mutation.
- Interactive Response Features: Every response provides 1-click Copy, Markdown Download, Expanded Full View inspection, Inline Editing, and Peer Sharing via in-app notifications.`,
      description: 'AI assistant governance, security isolation, and response features',
    },
  ];

  for (const entry of knowledgeEntries) {
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, entry.settingKey))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({
          settingValue: entry.settingValue,
          description: entry.description,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.settingKey, entry.settingKey));
      console.log(`[UPDATE] Updated setting: ${entry.settingKey}`);
    } else {
      await db.insert(systemSettings).values({
        settingKey: entry.settingKey,
        settingValue: entry.settingValue,
        description: entry.description,
      });
      console.log(`[INSERT] Created setting: ${entry.settingKey}`);
    }
  }

  console.log('[KNOWLEDGE SEED] Successfully seeded all Apex Enterprise knowledge records into PostgreSQL 18!');
}

// Self-run if called directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed-company-knowledge')) {
  seedCompanyKnowledge()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed Error:', err);
      process.exit(1);
    });
}
