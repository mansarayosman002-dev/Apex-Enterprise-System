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
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

async function generateDocument() {
  const doc = new Document({
    title: 'Apex AI HR & Payroll Assistant - Inquiries Guide',
    description: 'Comprehensive guide of natural language questions and capabilities for Apex AI HR & Payroll Assistant',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // Document Header / Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'SMART EMPLOYEE ATTENDANCE & PAYROLL MANAGEMENT SYSTEM',
                bold: true,
                size: 20,
                color: '1E3A8A', // Deep Blue
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'Apex AI HR & Payroll Assistant — Natural Language Questions & Capabilities Guide',
                bold: true,
                size: 28,
                color: '0F172A',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Document Version: 2026.1 | Sierra Leone (NLe) Enterprise Compliance | Strict Role-Based Access Control',
                italics: true,
                size: 18,
                color: '64748B',
                font: 'Arial',
              }),
            ],
          }),

          // Horizontal Divider Rule / Accent Line
          new Paragraph({
            spacing: { after: 300 },
            border: {
              bottom: {
                color: '3B82F6',
                size: 12,
                style: BorderStyle.SINGLE,
              },
            },
            children: [],
          }),

          // Section 1: System Overview & Security Principles
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: '1. Overview & Security Architecture',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'The Apex AI HR & Payroll Assistant operates as an intelligent orchestration layer on top of verified backend services (Attendance Engine, Payroll Engine, and PostgreSQL 18 Database). It strictly respects Role-Based Access Control (RBAC) and never executes arbitrary AI-generated SQL.',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Security Guardrails in Place:\n',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({
                text: '• Strict IDOR Protection: Employees can only view their own personal records and can never access other employees\' salaries or attendance.\n' +
                  '• Read vs. Write Action Separation: Safe analytics queries execute instantly. Sensitive mutations (e.g., employee deactivation, batch payroll processing) require explicit user confirmation.\n' +
                  '• Contextual Awareness: AI prompts and tool execution automatically inherit the verified authenticated identity of the logged-in user.\n' +
                  '• Dual Engine Reliability: Operates via Google Gemini (cloud) or local rule-based engine (100% offline air-gapped fallback).',
                size: 19,
                color: '334155',
                font: 'Arial',
              }),
            ],
          }),

          // Section 2: Administrator Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '2. Administrator Inquiries & Operational Commands',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Role Credentials: ',
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Username: admin | Password: password123 (Full Enterprise Permissions)',
                italics: true,
                size: 19,
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'A. Workforce Attendance Analytics:', bold: true, size: 20, font: 'Arial' }),
            ],
          }),
          createBulletPoint('"Show today\'s attendance summary." — Displays total workforce, present count, late arrivals, and absent employees.'),
          createBulletPoint('"Who is late today?" — Returns a detailed markdown table with employee ID, full name, department, scheduled time, and check-in time.'),
          createBulletPoint('"Show absent employees for today." — Lists all staff members with no check-in logged.'),
          createBulletPoint('"Which department has the highest attendance?" — Analyzes check-in rates grouped by department.'),
          createBulletPoint('"Check for attendance anomalies." — Scans PostgreSQL for unclosed shifts (> 14 hours), duplicate scans, or extreme overtime.'),

          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({ text: 'B. Enterprise Payroll & Compensation:', bold: true, size: 20, font: 'Arial' }),
            ],
          }),
          createBulletPoint('"Show current payroll summary." — Summarizes total workforce evaluated, draft/approved status, gross obligation, and net payouts in Sierra Leone Leones (SLE).'),
          createBulletPoint('"Summarize this month\'s gross payroll, net payouts, and statutory deductions."'),
          createBulletPoint('"Show overtime summary across all departments." — Summarizes approved overtime hours and accrued financial liability.'),
          createBulletPoint('"What are the Sierra Leone NASSIT contribution rules?" — Explains the 5% employee and 10% employer statutory pension rules.'),

          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({ text: 'C. Sensitive Operational Actions (Requires Confirmation):', bold: true, size: 20, font: 'Arial' }),
            ],
          }),
          createBulletPoint('"Deactivate employee #5." — Prompts the user with a confirmation card: "I am ready to deactivate Employee X. This will prevent attendance scanning. Do you want to proceed?"'),
          createBulletPoint('"Process batch payroll for 2026-09." — Generates preliminary calculations for all active staff and requests confirmation before committing to the database.'),
          createBulletPoint('"Send a reminder notification to employee #21." — Drafts and dispatches targeted multi-channel alerts.'),

          // Section 3: HR Officer Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '3. HR Officer Inquiries',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Role Credentials: ',
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Username: hr.officer | Password: password123',
                italics: true,
                size: 19,
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),
          createBulletPoint('"Who is late today and what time did they check in?"'),
          createBulletPoint('"List all absent employees today."'),
          createBulletPoint('"Show attendance overview for this week."'),
          createBulletPoint('"Show department attendance breakdown."'),
          createBulletPoint('"Are there any employees with missing check-outs?"'),
          createBulletPoint('"Draft an attendance reminder for employees who have not clocked in."'),
          createBulletPoint('"How many total active employees are registered in the system?"'),

          // Section 4: Payroll Officer Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '4. Payroll Officer Inquiries',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Role Credentials: ',
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Username: payroll.officer | Password: password123',
                italics: true,
                size: 19,
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),
          createBulletPoint('"Show current payroll summary."'),
          createBulletPoint('"How much overtime was recorded this period?"'),
          createBulletPoint('"Explain the payroll formula used for calculation." — Gross = Basic + Overtime + Allowances; Net = Gross - Deductions.'),
          createBulletPoint('"What is the total NASSIT deduction across all processed employees?"'),
          createBulletPoint('"List payroll records currently in Draft status."'),
          createBulletPoint('"Show all overtime hours approved for this pay period."'),

          // Section 5: Employee Self-Service Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '5. Employee Self-Service Inquiries (Strict Data Isolation)',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Role Credentials: ',
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Username: aminata.turay | Password: password123 (or Code: EMP-1004)',
                italics: true,
                size: 19,
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'Note: Employees can ONLY see their own records. Inquiries requesting other staff members\' data are immediately denied by security guardrails.',
                italics: true,
                size: 18,
                color: 'B45309', // Amber
                font: 'Arial',
              }),
            ],
          }),
          createBulletPoint('"Show my attendance history." — Displays individual check-in/out timestamps and status.'),
          createBulletPoint('"What time did I check in today?" — Returns exact punch time and tardiness evaluation.'),
          createBulletPoint('"Do I have any missing check-outs?" — Highlights open shifts requiring HR attention.'),
          createBulletPoint('"How many overtime hours did I work this month?" — Displays personal approved overtime tally.'),
          createBulletPoint('"Explain my payroll." — Provides full breakdown: Basic Salary, Overtime Payout, Allowances, Gross, Deductions, and Net Take-Home Pay.'),
          createBulletPoint('"What is my net salary for this month?"'),
          createBulletPoint('"Why was my salary calculated this way?" — Explains Sierra Leone statutory deductions (5% NASSIT and PAYE tax).'),

          // Section 6: Management & Executive Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '6. Management & Executive Inquiries',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Role Credentials: ',
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Username: management | Password: password123 (Read-Only Executive View)',
                italics: true,
                size: 19,
                color: '475569',
                font: 'Arial',
              }),
            ],
          }),
          createBulletPoint('"Summarize today\'s attendance." — Executive overview of enterprise punctuality and attendance rates.'),
          createBulletPoint('"Show workforce attendance rate across departments."'),
          createBulletPoint('"Summarize this month\'s total payroll obligation." — Overall financial commitment overview.'),
          createBulletPoint('"Show total overtime hours recorded across all departments." — Identifies potential operational bottlenecks.'),
          createBulletPoint('"Are there any critical operational anomalies?" — Displays severe attendance or payroll exceptions.'),

          // Section 7: Sierra Leone Statutory Rules & Labor Calculation Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '7. System & Sierra Leone Labor Law Educational Questions',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),
          createBulletPoint('"How does the system calculate overtime?" — Explains standard 8-hour shift thresholds and approved multiplier rules.'),
          createBulletPoint('"What is the grace period for late arrivals?" — Details the configurable arrival threshold before tardiness penalties apply.'),
          createBulletPoint('"How does NASSIT pension calculation work in Sierra Leone?" — Explains 5% employee deduction and 10% employer contribution.'),
          createBulletPoint('"What is the difference between Gross Salary and Net Take-Home Pay?" — Details statutory deduction arithmetic.'),

          // Section 8: Reference Table of Demo Accounts
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 160 },
            children: [
              new TextRun({
                text: '8. Demo Accounts Reference Table for Testing',
                bold: true,
                size: 24,
                color: '1E40AF',
                font: 'Arial',
              }),
            ],
          }),

          createDemoAccountsTable(),

          // Closing Note
          new Paragraph({
            spacing: { before: 300 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Generated by Smart Employee Attendance and Payroll Management System\nEmpowered by Apex Enterprise Architecture — 2026',
                italics: true,
                size: 18,
                color: '94A3B8',
                font: 'Arial',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(process.cwd(), 'Apex_AI_Assistant_Questions_Guide.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('Document successfully created at:', outputPath);
}

function createBulletPoint(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        size: 20,
        font: 'Arial',
      }),
    ],
  });
}

function createDemoAccountsTable(): Table {
  const headers = ['Role', 'Username / Identifier', 'Password', 'Permitted AI Capabilities'];
  const rowsData = [
    [
      'Administrator',
      'admin',
      'password123',
      'Universal access: Full attendance, payroll reports, audits, write actions (with confirmation)',
    ],
    [
      'HR Officer',
      'hr.officer',
      'password123',
      'Workforce attendance, late reports, absences, department breakdowns, reminders',
    ],
    [
      'Payroll Officer',
      'payroll.officer',
      'password123',
      'Payroll summaries, gross/net disbursements, statutory deductions, overtime liabilities',
    ],
    [
      'Employee (Self-Service)',
      'aminata.turay (EMP-1004)',
      'password123',
      'Strictly personal records: My attendance, my check-in time, my overtime, my payslip',
    ],
    [
      'Management',
      'management',
      'password123',
      'Read-only enterprise summaries: Company attendance, total payroll, overtime trends',
    ],
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (header) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: '1E3A8A' },
          width: { size: 2500, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  size: 18,
                  color: 'FFFFFF',
                  font: 'Arial',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const contentRows = rowsData.map(
    (row, idx) =>
      new TableRow({
        children: row.map(
          (cellText) =>
            new TableCell({
              shading: {
                type: ShadingType.CLEAR,
                fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
              },
              width: { size: 2500, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText,
                      size: 17,
                      color: '1E293B',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    rows: [headerRow, ...contentRows],
  });
}

generateDocument().catch(console.error);
