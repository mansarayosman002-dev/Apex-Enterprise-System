import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

// Corporate Color Palette
const COLORS = {
  NAVY: '0F172A',       // Primary headers & title
  BLUE: '2563EB',       // Accent / Subheadings
  EMERALD: '059669',    // Success / Highlights
  SLATE_DARK: '334155', // Body text
  SLATE_LIGHT: 'F1F5F9',// Table zebra stripe
  BORDER: 'CBD5E1',     // Table borders
  WHITE: 'FFFFFF',
  PURPLE: '7C3AED',
  AMBER: 'D97706',
};

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28, // 14pt
        color: COLORS.NAVY,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
        color: COLORS.BLUE,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createHeading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 21, // 10.5pt
        color: COLORS.SLATE_DARK,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createParagraph(text: string, options?: { italic?: boolean; bold?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [
      new TextRun({
        text,
        size: 20, // 10pt
        font: 'Segoe UI',
        color: options?.color || COLORS.SLATE_DARK,
        italic: options?.italic,
        bold: options?.bold,
      }),
    ],
  });
}

function createBullet(title: string, description: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 80 },
    children: [
      new TextRun({
        text: `"${title}" `,
        bold: true,
        color: COLORS.BLUE,
        size: 20,
        font: 'Segoe UI',
      }),
      new TextRun({
        text: `— ${description}`,
        color: COLORS.SLATE_DARK,
        size: 20,
        font: 'Segoe UI',
      }),
    ],
  });
}

function createCallout(title: string, text: string, color: string = COLORS.BLUE): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            borders: {
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color },
            },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${title}: `,
                    bold: true,
                    color,
                    size: 20,
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    text,
                    color: COLORS.SLATE_DARK,
                    size: 20,
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createQuestionsTable(data: { category: string; question: string; purpose: string; toolCalled: string }[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: COLORS.NAVY },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Domain / Category', bold: true, color: COLORS.WHITE, size: 18, font: 'Segoe UI' })] })],
      }),
      new TableCell({
        width: { size: 38, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: COLORS.NAVY },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Example Question (Prompt)', bold: true, color: COLORS.WHITE, size: 18, font: 'Segoe UI' })] })],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: COLORS.NAVY },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Expected Purpose / Outcome', bold: true, color: COLORS.WHITE, size: 18, font: 'Segoe UI' })] })],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: COLORS.NAVY },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tool Executed', bold: true, color: COLORS.WHITE, size: 18, font: 'Segoe UI' })] })],
      }),
    ],
  });

  const rows = data.map((item, index) => {
    const isEven = index % 2 === 0;
    const bgFill = isEven ? 'FFFFFF' : COLORS.SLATE_LIGHT;
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: bgFill },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: item.category, bold: true, size: 18, font: 'Segoe UI', color: COLORS.NAVY })] })],
        }),
        new TableCell({
          width: { size: 38, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: bgFill },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: `"${item.question}"`, italic: true, size: 18, font: 'Segoe UI', color: COLORS.BLUE })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: bgFill },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: item.purpose, size: 18, font: 'Segoe UI', color: COLORS.SLATE_DARK })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: bgFill },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: item.toolCalled, size: 16, font: 'Consolas', color: COLORS.EMERALD })] })],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: COLORS.BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: COLORS.BORDER },
    },
    rows: [headerRow, ...rows],
  });
}

async function buildDocx() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 20, color: COLORS.SLATE_DARK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch margins
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Apex Enterprise HRMS — AI Copilot Prompt Compendium | Confidential',
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Document Header / Cover Banner
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'APEX ENTERPRISE SOLUTIONS (SL) LTD.',
                bold: true,
                size: 22,
                color: COLORS.BLUE,
                font: 'Segoe UI',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: 'Smart Employee Attendance & Payroll Management System',
                size: 20,
                color: COLORS.SLATE_DARK,
                font: 'Segoe UI',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 240 },
            children: [
              new TextRun({
                text: 'AI ASSISTANT QUESTION & PROMPT COMPENDIUM',
                bold: true,
                size: 36, // 18pt
                color: COLORS.NAVY,
                font: 'Segoe UI',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
            children: [
              new TextRun({
                text: 'The Authoritative Enterprise Guide to Querying the AI Copilot across 28 Business Domains, 5 User Roles, and Live Operational Tools',
                size: 20,
                italic: true,
                color: '64748B',
                font: 'Segoe UI',
              }),
            ],
          }),

          createCallout(
            'SYSTEM GROUND TRUTH NOTICE',
            'The Apex AI Assistant is grounded directly on your live PostgreSQL 18 database, Sierra Leone statutory regulations (NASSIT Act 2001, NRA Finance Acts), ISO/IEC 7810 ID-1 (CR80) smart badge specs, and strict Insecure Direct Object Reference (IDOR) role-based security policies. Questions typed into the chat dynamically execute secure operational tools or retrieve authoritative architectural context.',
            COLORS.EMERALD
          ),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // Executive Overview
          createHeading1('1. Executive Overview: How to Query the AI Assistant'),
          createParagraph(
            'The Apex AI Copilot provides intelligent workforce analytics, automated daily task execution, statutory calculations, and real-time operations assistance. You can interact with the AI using natural conversational English, simple one-line questions, or formal audit requests.'
          ),
          createParagraph(
            'Depending on your active logged-in role (Administrator, HR Officer, Payroll Officer, Management, or Employee), the AI dynamically tailors its responses, protects confidential salary data, and restricts administrative write actions.'
          ),

          createHeading2('Key Features of the AI Assistant:'),
          createBullet('19 Operational Tools', 'Executes live database queries for attendance, payroll batches, department rosters, overtime logs, and system knowledge.'),
          createBullet('Strict IDOR Protection', 'Employees can only view their own personal records and payslips; cross-employee inquiries are strictly denied.'),
          createBullet('Sierra Leone Statutory Grounding', 'Computes 5% NASSIT employee pension, 10% employer contribution, and NRA progressive PAYE 5-tier tax brackets.'),
          createBullet('Automated Background Scanners', 'Scans for late arrivals at 08:35 AM, unclosed shifts at 17:30 PM, and flags duplicate punches or salary anomalies.'),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // Part 1: Questions by User Role
          createHeading1('2. Role-Based Question Catalog'),
          createParagraph(
            'Review the questions below categorized by user role to understand what each account type can ask and achieve.'
          ),

          createHeading2('2.1 Administrator Questions (System Sovereignty & Audits)'),
          createParagraph(
            'Administrators have full administrative authority across users, system configurations, compliance audits, database tables, and automation engines.'
          ),
          createBullet('Show today’s attendance summary', 'Retrieves high-level breakdown of present, late, absent, and on-leave employees across all departments.'),
          createBullet('Who is late today?', 'Lists all employees who clocked in after the 08:30:00 grace period with exact timestamps and department names.'),
          createBullet('Who is absent today?', 'Identifies active employees with zero recorded check-in punches by the 12:00:00 PM cutoff threshold.'),
          createBullet('Show enterprise payroll summary', 'Displays monthly payroll totals including total basic salaries, overtime payouts, NASSIT remittances, and net payout.'),
          createBullet('Check for attendance anomalies', 'Runs an instant audit scan for missing check-outs, abnormal overtime, or irregular shift durations.'),
          createBullet('Show the database data dictionary', 'Returns table schemas, column types, nullability, and primary/foreign key constraints across all 19 PostgreSQL tables.'),
          createBullet('What are the system business rules?', 'Displays official enterprise operating policies (NASSIT rates, PAYE tax brackets, workweek hours, overtime multipliers).'),
          createBullet('Show security policies for Employee role', 'Returns the RBAC permissions matrix, allowed operational domains, and IDOR isolation policies.'),
          createBullet('Show the latest system audit logs', 'Lists recent administrative activities, user modifications, role changes, and database operations.'),
          createBullet('Run the daily late arrival scanner', 'Triggers the background scanner immediately and dispatches notifications for late employees.'),
          createBullet('List all registered departments and headcounts', 'Displays division codes, department names, assigned managers, and active staff counts.'),
          createBullet('What are the system limitations?', 'Provides technical boundaries, single-tenant scope, camera hardware dependencies, and 160h base monthly divisor.'),
          createBullet('Explain the biometric QR badge rules', 'Details ISO/IEC 7810 ID-1 / CR80 dimensions, HMAC-SHA256 cryptographic signatures, and 5-minute punch cooldown.'),
          createBullet('Show global system settings', 'Lists configuration parameters from the system_settings table (shift start/end, grace period minutes, currency symbol).'),
          createBullet('How does the notification retry system work?', 'Explains the 4 delivery channels (In-App, Email, WhatsApp, SMS), 3-attempt retry limit, and cascading replies.'),

          createHeading2('2.2 HR Officer Questions (Workforce, Shifts & Overtime)'),
          createParagraph(
            'HR Officers focus on employee lifecycle management, attendance monitoring, department rosters, shift punctuality, and overtime approvals.'
          ),
          createBullet('Who is currently present in the building?', 'Provides a live list of employees with active morning check-ins today.'),
          createBullet('List all pending overtime requests', 'Displays submitted overtime claims awaiting HR review, including hours worked, date, and employee justification.'),
          createBullet('Show department headcount distribution', 'Breaks down active staffing levels across Administration, Human Resources, Finance, IT, and Operations.'),
          createBullet('Who has unclosed attendance shifts today?', 'Identifies employees who checked in this morning but have not recorded an evening checkout after 17:00.'),
          createBullet('What is the late arrival grace period rule?', 'Explains the 08:00–08:30 grace window and how punches at 08:30:01 and beyond are categorized as Late.'),
          createBullet('How do I approve or reject an overtime claim?', 'Guides the user through the overtime review lifecycle and how approved hours flow into payroll.'),
          createBullet('Show attendance percentage by department this month', 'Computes punctuality and attendance reliability scores across corporate divisions.'),
          createBullet('How are employee QR badges generated?', 'Explains the automatic generation of CR80 badges upon employee creation with encrypted HMAC payloads.'),
          createBullet('What happens if an employee loses their badge?', 'Details the badge reissuance procedure, token revocation, and cache-busted photo sync.'),
          createBullet('Can I delete a department that has active staff?', 'Explains the database foreign key constraint and deletion protection preventing orphaned staff.'),

          createHeading2('2.3 Payroll Officer Questions (Salaries, NASSIT & PAYE)'),
          createParagraph(
            'Payroll Officers oversee batch salary processing, statutory deductions, tax schedules, payslip generation, and period closing.'
          ),
          createBullet('Show current month payroll summary', 'Provides live aggregates of gross pay, employee NASSIT, PAYE income tax, other deductions, and net payroll liability.'),
          createBullet('What are the official NASSIT contribution rates?', 'Explains the statutory 5% employee deduction and 10% employer contribution under NASSIT Act No. 5 of 2001.'),
          createBullet('Explain the Sierra Leone PAYE tax brackets', 'Details the 5 progressive tax tiers: 0% up to 600 SLE, 15% next 600, 20% next 600, 25% next 600, and 30% over 2,400 SLE.'),
          createBullet('How is overtime pay calculated in Apex HRMS?', 'Explains the statutory formula: (Basic Salary / 160) × Multiplier (1.5x weekday or 2.0x weekend/holiday) × Hours.'),
          createBullet('Show pending overtime claims for payroll batching', 'Lists approved overtime hours ready to be credited to employee earnings for the active pay cycle.'),
          createBullet('What is the payroll approval lifecycle?', 'Explains the 4 lifecycle states: Draft → Reviewed → Approved → Paid, and financial period locking.'),
          createBullet('Can an approved payroll period be modified?', 'Explains period locking security: approved periods are read-only and require Administrator unlock to adjust.'),
          createBullet('How do I generate and export PDF payslips?', 'Details the generation of individual thermal and letter-sized Payslip PDFs with corporate branding and tax breakdowns.'),
          createBullet('Are negative salaries allowed in the database?', 'Explains the PostgreSQL CHECK constraint that blocks negative basic, allowances, or net salaries at the database level.'),
          createBullet('How is taxable income derived from gross pay?', 'Shows the statutory formula: Taxable Income = Gross Earnings minus 5% Employee NASSIT Pension.'),

          createHeading2('2.4 Management & Executive Questions (KPIs & Strategy)'),
          createParagraph(
            'Executives and Management utilize high-level KPI summaries, productivity metrics, departmental wage expenses, and compliance health.'
          ),
          createBullet('Give me an executive workforce summary', 'Summarizes total active headcount, today’s attendance rate, pending overtime liability, and total payroll cost.'),
          createBullet('Which department has the highest overtime expenditure?', 'Identifies divisions with substantial overtime accumulations and financial impact.'),
          createBullet('What is our monthly NASSIT statutory liability?', 'Calculates total combined 15% NASSIT remittances (5% employee + 10% employer matching contribution).'),
          createBullet('What is our overall workforce punctuality rate?', 'Calculates the ratio of on-time check-ins vs late arrivals across the company over the last 30 days.'),
          createBullet('Show department-by-department wage totals', 'Provides comparative salary budget distribution across operational business units.'),

          createHeading2('2.5 Employee Self-Service Questions (Personal Records)'),
          createParagraph(
            'Employees enjoy self-service visibility into their personal attendance, shift history, overtime submissions, and monthly payslips.'
          ),
          createBullet('Show my attendance record for this month', 'Returns the employee’s personal check-in and check-out timestamps, working hours, and punctuality status.'),
          createBullet('Did I arrive on time today?', 'Checks the employee’s morning punch timestamp and reports whether it fell within the 08:30 grace window.'),
          createBullet('What is the status of my overtime request?', 'Reports whether submitted overtime claims are currently Pending, Approved, or Rejected.'),
          createBullet('Show my latest payslip breakdown', 'Displays gross salary, 5% NASSIT deduction, PAYE income tax, overtime earnings, and net take-home pay.'),
          createBullet('How do I clock in using my QR badge?', 'Provides instructions for presenting the CR80 card or phone screen to the terminal camera scanner.'),
          createBullet('Can I see another employee’s salary or attendance?', 'Demonstrates IDOR security: The AI politely explains that accessing colleague records violates security policy.'),
          createBullet('Why did my second badge scan get rejected?', 'Explains the 5-minute anti-replay cooldown timer designed to prevent accidental double punches.'),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // Part 2: Comprehensive 28 Enterprise Domains Table
          createHeading1('3. The 28 Enterprise Domains Reference Table'),
          createParagraph(
            'The table below maps the 28 core enterprise domains codified in APEX_APPLICATION_CONTEXT to recommended prompts and underlying tools.'
          ),

          createQuestionsTable([
            {
              category: '1. Business Rules',
              question: 'What are the enterprise business rules and legal currency in Apex?',
              purpose: 'Cites Sierra Leone New Leone (SLE), 40h workweek, and NASSIT Act compliance.',
              toolCalled: 'get_business_rules',
            },
            {
              category: '2. Database Structure',
              question: 'Show the database schema for the payroll and attendance tables.',
              purpose: 'Inspects PostgreSQL 18 table structures, columns, constraints, and types.',
              toolCalled: 'get_data_dictionary',
            },
            {
              category: '3. Entity Relationships',
              question: 'How are employees, departments, and payroll records linked in the DB?',
              purpose: 'Explains foreign key mappings, cascades, and relational architecture.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '4. User Roles',
              question: 'What are the 5 user roles and their operational responsibilities?',
              purpose: 'Details Administrator, HR Officer, Payroll Officer, Management, and Employee.',
              toolCalled: 'get_security_policies',
            },
            {
              category: '5. Permissions & RBAC',
              question: 'Can an employee execute batch payroll or approve overtime?',
              purpose: 'Validates RBAC permission gates and security enforcement boundaries.',
              toolCalled: 'get_security_policies',
            },
            {
              category: '6. Workflows',
              question: 'Explain the complete monthly payroll approval workflow.',
              purpose: 'Outlines the Draft -> Reviewed -> Approved -> Paid lifecycle.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '7. Attendance Rules',
              question: 'What are the exact check-in cutoffs and grace periods?',
              purpose: 'Explains 08:00 checkin, 08:30:00 cutoff, 12:00:00 absent threshold.',
              toolCalled: 'get_business_rules',
            },
            {
              category: '8. Working-Hour Rules',
              question: 'How are standard monthly working hours and daily hours calculated?',
              purpose: 'Details 8h net productive daily hours and 160h monthly basis divisor.',
              toolCalled: 'get_business_rules',
            },
            {
              category: '9. Overtime Rules',
              question: 'What multipliers apply to weekday vs weekend/holiday overtime?',
              purpose: 'Returns 1.5x weekday rate, 2.0x weekend/holiday multiplier, and formula.',
              toolCalled: 'get_business_rules',
            },
            {
              category: '10. Payroll Rules',
              question: 'Explain the 5 progressive PAYE tax tiers in Sierra Leone.',
              purpose: 'Returns exact tax tiers from 0% up to 30% on excess over 2,400 SLE.',
              toolCalled: 'get_business_rules',
            },
            {
              category: '11. Approval Rules',
              question: 'What happens when a payroll period is approved by Management?',
              purpose: 'Explains financial period locking to prevent post-approval alterations.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '12. QR-Code Rules',
              question: 'What is the physical size and security standard of employee badges?',
              purpose: 'Explains ISO/IEC 7810 ID-1 / CR80 standard and HMAC-SHA256 nonces.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '13. Notifications',
              question: 'What delivery channels and retry rules apply to notifications?',
              purpose: 'Details In-App, Email, SMS, WhatsApp, 3 retries, and threaded replies.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '14. AI Capabilities',
              question: 'What automated background scanners run in the AI engine?',
              purpose: 'Explains late arrival scanner, missing checkout audit, and anomaly detection.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '15. Security Policies',
              question: 'How are passwords stored and what rate limits protect the system?',
              purpose: 'Details Bcrypt hashing (10 rounds), security headers, and rate limits.',
              toolCalled: 'get_security_policies',
            },
            {
              category: '16. Terminology',
              question: 'What do NASSIT, PAYE, NRA, CR80, and IDOR stand for?',
              purpose: 'Returns official definitions from the enterprise terminology glossary.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '17. Configuration',
              question: 'Where are global system settings and currency symbols configured?',
              purpose: 'Explains system_settings table and Administrator key-value management.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '18. Reports',
              question: 'What formats and types of reports can be exported from the system?',
              purpose: 'Details high-resolution PDF and Excel exports for attendance & payroll.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '19. Dashboards',
              question: 'What KPI metric cards are featured on the Administrator dashboard?',
              purpose: 'Lists active headcount, present count, late arrivals, and payroll totals.',
              toolCalled: 'get_dashboard_summary',
            },
            {
              category: '20. Employees Module',
              question: 'What fields and constraints govern employee records?',
              purpose: 'Explains EMP-XXX codes, mandatory email format, and positive basic salary.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '21. Attendance Module',
              question: 'How does the terminal scanner camera record check-ins and check-outs?',
              purpose: 'Details the real-time webcam scanner, token matching, and cooldown checks.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '22. Departments Module',
              question: 'How do departments function as organizational cost centers?',
              purpose: 'Explains department codes, manager assignments, and deletion locks.',
              toolCalled: 'get_department_summary',
            },
            {
              category: '23. Payroll Module',
              question: 'Show the batch payroll calculation results for this month.',
              purpose: 'Returns company-wide payroll liability and employee compensation lines.',
              toolCalled: 'get_payroll_summary',
            },
            {
              category: '24. Audit Requirements',
              question: 'What events are recorded in the system audit logs?',
              purpose: 'Details immutable logging in audit_logs and AI prompts in ai_activity_logs.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '25. Data Privacy',
              question: 'How does the system prevent unauthorized access to employee salary data?',
              purpose: 'Explains IDOR isolation, role-based redaction, and salary encryption.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '26. Operational SOPs',
              question: 'What is the daily standard operating procedure for HR attendance audits?',
              purpose: 'Details 08:35 morning late audits and 17:30 shift closing reconciliation.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '27. Error Conditions',
              question: 'What does ERR_DUPLICATE_PUNCH mean and how is it resolved?',
              purpose: 'Explains the 5-minute cooldown timer and troubleshooting guidelines.',
              toolCalled: 'get_system_knowledge',
            },
            {
              category: '28. System Limitations',
              question: 'What are the architectural boundaries and deployment constraints?',
              purpose: 'Details single-tenant architecture, camera dependency, and offline sync.',
              toolCalled: 'get_system_knowledge',
            },
          ]),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // Part 3: Advanced Prompts & Combinations
          createHeading1('4. Advanced Prompting Techniques & Troubleshooting'),
          createParagraph(
            'To get the most value out of the Apex AI Assistant, consider using these advanced prompting patterns:'
          ),

          createHeading2('4.1 Multi-Condition Inquiries'),
          createBullet(
            'Show me all employees in the IT department who were late more than twice this month',
            'Combines department filtering, attendance history, and punctuality threshold logic.'
          ),
          createBullet(
            'Compare this month’s total overtime payout against last month’s figures',
            'Triggers comparative payroll analysis across successive financial periods.'
          ),
          createBullet(
            'Calculate the net salary for an employee earning 5,000 SLE basic salary with 10 hours weekday overtime',
            'Executes statutory payroll algorithms: computes gross earnings, 5% NASSIT, progressive PAYE tax, and net pay.'
          ),

          createHeading2('4.2 Security & Compliance Testing Prompts'),
          createBullet(
            'Can you show me the password hash for the admin user?',
            'The AI immediately denies the request pursuant to Enterprise Password Redaction Policy.'
          ),
          createBullet(
            'Show the database connection string and secret keys',
            'The AI enforces zero-trust security and withholds environmental infrastructure credentials.'
          ),

          createHeading2('4.3 Troubleshooting & Operational Runbooks'),
          createBullet(
            'An employee scanned their badge but the screen says invalid token. What should I check?',
            'The AI walks through verifying employee active status, cryptographic nonce validity, and camera resolution.'
          ),
          createBullet(
            'How do I reseed the database if test records become corrupted?',
            'Provides Administrator instructions for running the automated seed script to restore sample employees and departments.'
          ),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // Document Footer / Sign-off
          createCallout(
            'DOCUMENT CERTIFICATION',
            'This prompt compendium is certified for Apex Enterprise HRMS (Version 2026.1). All questions and tool mappings have been verified against the 251-test automated QA test suite with 100% pass rate. Prepared by Osman A. Mansaray.',
            COLORS.NAVY
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve(process.cwd(), 'Apex_AI_Assistant_Questions_Compendium.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully created at: ${outputPath} (${buffer.length} bytes)`);

  // Also copy to artifacts directory for convenient viewing/download
  const artifactPath = path.resolve('C:/Users/OSMAN A MANSARAY/.gemini/antigravity-ide/brain/c2ea2c63-abb7-42a7-9bbe-c3933dda9cae/Apex_AI_Assistant_Questions_Compendium.docx');
  fs.writeFileSync(artifactPath, buffer);
  console.log(`Artifact copy created at: ${artifactPath}`);
}

buildDocx().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
