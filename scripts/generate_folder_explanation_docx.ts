import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  convertInchesToTwip,
} from 'docx';

async function generateFolderExplanationDocx() {
  console.log('Generating Apex HRMS Folder & System Architecture Word Document (.docx)...');

  // Professional color palette
  const PRIMARY_COLOR = '2563EB';   // Apex Blue
  const SECONDARY_COLOR = '0F172A'; // Slate 900
  const ACCENT_COLOR = '4F46E5';    // Indigo
  const SUCCESS_COLOR = '059669';   // Emerald
  const LIGHT_BG = 'F8FAFC';        // Slate 50
  const BORDER_COLOR = 'CBD5E1';    // Slate 300
  const MUTED_TEXT = '64748B';      // Slate 500

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: BORDER_COLOR,
  };

  const createCell = (text: string, isHeader = false, isLightBg = false, widthPercent?: number) => {
    return new TableCell({
      width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
      shading: {
        type: ShadingType.CLEAR,
        fill: isHeader ? SECONDARY_COLOR : isLightBg ? LIGHT_BG : 'FFFFFF',
      },
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      children: [
        new Paragraph({
          spacing: { line: 260, before: 60, after: 60 },
          children: [
            new TextRun({
              text,
              bold: isHeader,
              color: isHeader ? 'FFFFFF' : '1E293B',
              size: isHeader ? 20 : 19,
              font: 'Segoe UI',
            }),
          ],
        }),
      ],
    });
  };

  const doc = new Document({
    title: 'Apex HRMS Folder Structure & System Architecture Guide',
    description: 'Exhaustive architectural breakdown of the Smart Employee Attendance and Payroll Management System codebase.',
    creator: 'Osman A. Mansaray',
    styles: {
      default: {
        document: {
          run: {
            font: 'Segoe UI',
            size: 22, // 11pt
            color: '1E293B',
          },
          paragraph: {
            spacing: {
              line: 320,
              after: 140,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // ----------------------------------------------------
          // COVER / HEADER BLOCK
          // ----------------------------------------------------
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'FINAL YEAR DISSERTATION TECHNICAL SPECIFICATION',
                bold: true,
                size: 24,
                color: PRIMARY_COLOR,
                font: 'Segoe UI',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Smart Employee Attendance and Payroll Management System (Apex Enterprise)',
                italics: true,
                size: 20,
                color: MUTED_TEXT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'COMPLETE PROJECT FOLDER & CODEBASE ARCHITECTURE GUIDE',
                bold: true,
                size: 34,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Comprehensive Directory Analysis, File-by-File Breakdown & Module Mechanics',
                bold: true,
                size: 22,
                color: ACCENT_COLOR,
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Project / Dissertation Title: ', bold: true }),
                          new TextRun({ text: 'Smart Employee Attendance and Payroll Management System' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Principal Researcher / Developer: ', bold: true }),
                          new TextRun({ text: 'Osman A. Mansaray' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Root Workspace Directory: ', bold: true }),
                          new TextRun({ text: '.../smart-employee-attendance-&-payroll-system' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Core Technology Stack: ', bold: true }),
                          new TextRun({ text: 'React 19, TypeScript, Tailwind CSS v4, Node.js, Express, Drizzle ORM, SQLite' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Statutory Compliance Baseline: ', bold: true }),
                          new TextRun({ text: 'Sierra Leone Employment Act 2023, NASSIT Act No. 5 of 2001, Finance Act PAYE' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300 } }),

          // ----------------------------------------------------
          // SECTION 1: EXECUTIVE OVERVIEW
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: '1. Executive Architectural Overview', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The "smart-employee-attendance-&-payroll-system" codebase represents a production-ready, full-stack enterprise Human Resource Management System (HRMS). It is engineered to solve modern workforce management challenges by fusing real-time biometric QR terminal scanning, automated attendance shift calculations, statutory Sierra Leone payroll processing (NASSIT & PAYE), and domain-specific artificial intelligence into a cohesive, responsive web platform.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The architecture adopts a modular monolithic pattern where the frontend Single Page Application (SPA) and backend REST API server live inside a unified TypeScript monorepo. This eliminates synchronization drift between frontend client models and backend database schemas.',
              }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 2: HIGH-LEVEL DIRECTORY TREE MAP
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '2. High-Level Project Directory Map', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Below is the structural map of the root project directory and its principal sub-packages:',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Directory / File Path', true, false, 35),
                  createCell('Architectural Role & Description', true, false, 65),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/ (Root Directory)', false, true),
                  createCell('Core configuration files (package.json, tsconfig.json, vite.config.ts, server.ts, .env) and documentation.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src', false, false),
                  createCell('Primary application source code containing React components, views, database schema, server services, and utilities.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/pages', false, true),
                  createCell('13 core screen controllers (Dashboard, Attendance, Payroll, Employees, Departments, Reports, AI Assistant, etc.).'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/components', false, false),
                  createCell('Reusable UI component library divided into domain packages (ai, attendance, common, layout, payroll, etc.).'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/server', false, true),
                  createCell('Backend business logic: attendanceEngine.ts, payrollEngine.ts, REST routes.ts, dbServices.ts, and authMiddleware.ts.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/db', false, false),
                  createCell('Database layer: SQLite relational schema (schema.ts), Drizzle ORM client config, and table relationships.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/context', false, true),
                  createCell('Global React state providers: AuthContext.tsx (user session, RBAC) and ThemeContext.tsx (dark/light mode).'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/services', false, false),
                  createCell('Centralized HTTP client (api.ts) for communicating with backend REST endpoints with automatic authentication.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/utils', false, true),
                  createCell('Helper utilities: offlineStorage.ts (offline punch vault), exportDocument.ts (Excel/PDF generator), audio.ts, photoSync.ts.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/src/types', false, false),
                  createCell('Strict TypeScript type contracts, API request/response models, and statutory computation interfaces.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/scripts', false, true),
                  createCell('Administrative scripts: database constraint migration, test suites, automated document compilers, and demo seeders.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('/public', false, false),
                  createCell('Static assets served directly to the browser: company logos, placeholder employee photos, audio tone clips.'),
                ],
              }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 3: ROOT CONFIGURATION FILES
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '3. Root Configuration & Bootstrapping Files', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. server.ts: ', bold: true }),
              new TextRun({
                text: 'The master entry point for the backend runtime. It starts an Express HTTP server, binds across all network interfaces (\'0.0.0.0\' on port 3001) so local computers and mobile devices can connect over Wi-Fi, configures CORS and JSON body-parsers, and mounts the REST API router.\n',
              }),
              new TextRun({ text: '2. package.json: ', bold: true }),
              new TextRun({
                text: 'Defines all third-party dependencies and build scripts. Key packages include React 19, Motion (v12), Tailwind CSS v4, Drizzle ORM, bcryptjs, jsonwebtoken, html5-qrcode, canvas-confetti, and docx for Word report generation.\n',
              }),
              new TextRun({ text: '3. vite.config.ts: ', bold: true }),
              new TextRun({
                text: 'Vite bundler configuration with hot module replacement (HMR), React plugin integration, and proxy routing to the Express server.\n',
              }),
              new TextRun({ text: '4. tsconfig.json: ', bold: true }),
              new TextRun({
                text: 'TypeScript compiler configuration enforcing strict null checks, modern ES module resolution, and JSX transformation rules.\n',
              }),
              new TextRun({ text: '5. index.html: ', bold: true }),
              new TextRun({
                text: 'Single-page HTML shell with mobile viewport meta settings (viewport-fit=cover, maximum-scale=5.0) for native-feeling mobile app behavior.',
              }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 4: DATABASE LAYER (src/db)
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '4. Database Layer & Data Architecture (/src/db)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The system uses an embedded SQLite database (database.sqlite) governed by Drizzle ORM. This ensures zero external database configuration, instant portability across developer laptops, and ACID transaction safety.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Core Entities Defined in schema.ts:\n', bold: true }),
              new TextRun({ text: '• employees: ', bold: true }),
              new TextRun({ text: 'Stores employee code, first/last name, email, phone, job title, basic salary, department foreign key, photo URL, status (Active/Inactive), and encrypted QR hash.\n' }),
              new TextRun({ text: '• departments: ', bold: true }),
              new TextRun({ text: 'Organizational units with allocated budgets, manager assignments, and operational shift rules.\n' }),
              new TextRun({ text: '• attendanceLogs: ', bold: true }),
              new TextRun({ text: 'Stores check-in timestamps, check-out timestamps, shift dates, computed working hours, overtime hours, status (Present, Late, Half-Day, Absent), device terminal ID, and GPS coordinates if available.\n' }),
              new TextRun({ text: '• payrollLedger & payrollItems: ', bold: true }),
              new TextRun({ text: 'Stores statutory monthly salary runs: Gross Basic Salary, NASSIT 5% Employee Deduction, NASSIT 10% Employer Contribution, PAYE Graduated Tax, Overtime Earnings, Deductions, and Net Pay.\n' }),
              new TextRun({ text: '• aiConversations & aiMessages: ', bold: true }),
              new TextRun({ text: 'Stores AI Copilot conversation sessions, custom writing styles, and assistant prompt histories.\n' }),
              new TextRun({ text: '• anomalies: ', bold: true }),
              new TextRun({ text: 'Stores fraud detection records: buddy punching alerts, abnormal overtime spikes, and resolution audits.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 5: BACKEND BUSINESS ENGINES (src/server)
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '5. Backend Logic & Statutory Calculation Engines (/src/server)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'This folder contains the brain of the HRMS business operations. Every payroll coin and attendance minute is audited through specialized calculation modules:',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. payrollEngine.ts (Statutory Sierra Leone Calculations):\n', bold: true }),
              new TextRun({ text: '• NASSIT Pension Deduction: Automatically computes exact 5% employee deduction from basic salary and 10% employer contribution.\n' }),
              new TextRun({ text: '• Progressive PAYE Income Tax: Executes graduated Sierra Leone tax schedule with initial tax-exempt threshold, intermediate tax bands (15%, 20%), and top bracket (30%).\n' }),
              new TextRun({ text: '• Overtime Multipliers: Computes regular working day overtime at 1.5× hourly rate and weekend/public holiday overtime at 2.0× hourly rate.\n\n' }),
              new TextRun({ text: '2. attendanceEngine.ts (Biometric QR Punch Verification):\n', bold: true }),
              new TextRun({ text: '• Validates incoming QR badge tokens against active employee rosters.\n' }),
              new TextRun({ text: '• Applies 15-minute punctuality grace period after official shift opening (08:30).\n' }),
              new TextRun({ text: '• Prevents double-scanning through a 60-second cooldown lock and buddy punching detection heuristics.\n\n' }),
              new TextRun({ text: '3. routes.ts & dbServices.ts:\n', bold: true }),
              new TextRun({ text: '• Exposes over 40 REST endpoints covering authentication, employee CRUD, QR badge printing, attendance logs, payroll batches, audit logs, and AI Copilot inference.\n\n' }),
              new TextRun({ text: '4. authMiddleware.ts:\n', bold: true }),
              new TextRun({ text: '• Verifies JWT tokens and enforces Role-Based Access Control (RBAC) across Administrator, HR Officer, Payroll Officer, and Employee roles.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 6: FRONTEND PAGES (src/pages)
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '6. Frontend Views & Screen Controllers (/src/pages)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The /src/pages folder houses the 13 dedicated user interfaces that make up the Apex HRMS experience:',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Page Component', true, false, 25),
                  createCell('Route / Page ID', true, false, 20),
                  createCell('Functional Capabilities & User Workflows', true, false, 55),
                ],
              }),
              new TableRow({
                children: [
                  createCell('DashboardPage.tsx', false, true),
                  createCell('dashboard', false, true),
                  createCell('Live headcount KPI metrics, real-time check-in stream, department attendance charts, and quick terminal launch.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('AttendancePage.tsx', false, false),
                  createCell('attendance', false, false),
                  createCell('Daily attendance timesheets, date/department filters, overtime tracking, manual punch entry, and Excel/PDF export.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('EmployeesPage.tsx', false, true),
                  createCell('employees', false, true),
                  createCell('Employee directory with table & card grid views, photo uploads, biometric QR badge regeneration, and salary baselines.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('PayrollPage.tsx', false, false),
                  createCell('payroll', false, false),
                  createCell('Monthly payroll ledger, NASSIT 5%/10% breakdown, PAYE tax computation, individual printable payslips, and bank remittance exports.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('AIAssistantPage.tsx', false, true),
                  createCell('ai-assistant', false, true),
                  createCell('Full-screen AI copilot hub with 4 writing styles, automated audit routines, anomaly fraud detection, and regulatory rulebook.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('LoginPage.tsx', false, false),
                  createCell('login', false, false),
                  createCell('Secure sign-in with visual branding hero panel, role tabs (Admin, HR, Payroll, Employee), and encrypted session initiation.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('DepartmentsPage.tsx', false, true),
                  createCell('departments', false, true),
                  createCell('Departmental structures, budget tracking, employee assignments, and unit performance indicators.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('ReportsPage.tsx', false, false),
                  createCell('reports', false, false),
                  createCell('Statutory compliance reporting, PDF/Excel generators, tax audit trails, and executive attendance variance analyses.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('QRCodesPage.tsx', false, true),
                  createCell('qrcodes', false, true),
                  createCell('Bulk printable ID card badges with embedded high-contrast QR tokens and custom branding badges.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('ProfilePage.tsx', false, false),
                  createCell('profile', false, false),
                  createCell('Employee self-service portal: personal QR credentials badge, monthly payslip history, and contact update requests.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('NotificationCenterPage.tsx', false, true),
                  createCell('notifications', false, true),
                  createCell('Centralized alert feed: late arrival notifications, anomaly alerts, system broadcasts, and unread badges.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('SettingsPage.tsx', false, false),
                  createCell('settings', false, false),
                  createCell('System policies configuration: grace period minutes, overtime multipliers, company branding, and database backups.'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('UsersPage.tsx', false, true),
                  createCell('users', false, true),
                  createCell('User account administration, password resets, role assignment, and security audit logs.'),
                ],
              }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 7: UI COMPONENTS & COMMON MODULES
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '7. UI Components & Architectural Sub-Packages (/src/components)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The /src/components directory encapsulates modular, reusable visual building blocks:',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• /components/ai: ', bold: true }),
              new TextRun({ text: 'Contains AIFloatingWidget.tsx (the movable Amethyst orb copilot), AIAssistantLogo.tsx, AIMarkdownRenderer.tsx, and AIFullViewModal.tsx.\n' }),
              new TextRun({ text: '• /components/attendance: ', bold: true }),
              new TextRun({ text: 'Contains QRScannerModal.tsx, a full-featured camera scanner terminal supporting front/back camera flipping, audio chimes, manual punch entry, and offline vault caching.\n' }),
              new TextRun({ text: '• /components/layout: ', bold: true }),
              new TextRun({ text: 'Contains Navbar.tsx (global top header with search, clock, and notifications), Sidebar.tsx (collapsible desktop navigation & mobile slide-out drawer), and MobileBottomNav.tsx (touch-optimized mobile bottom bar).\n' }),
              new TextRun({ text: '• /components/common: ', bold: true }),
              new TextRun({ text: 'StatCard.tsx (interactive KPI cards), DarkModeToggle.tsx, AnimatedCounter.tsx, ApexLogo.tsx, and UserAvatar.tsx.\n' }),
              new TextRun({ text: '• /components/payroll: ', bold: true }),
              new TextRun({ text: 'Contains PayslipModal.tsx for viewing and printing official statutory payslips.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 8: UTILITIES & SERVICES
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '8. Utilities & Services Architecture (/src/services & /src/utils)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• api.ts (/src/services): ', bold: true }),
              new TextRun({ text: 'Provides typed async wrappers around all backend endpoints with automatic Bearer token injection and error handling.\n' }),
              new TextRun({ text: '• offlineStorage.ts (/src/utils): ', bold: true }),
              new TextRun({ text: 'Implements an encrypted client-side offline punch queue using browser storage. If network drops during terminal scanning, attendance punches are safely cached offline and automatically batch-synced upon reconnection.\n' }),
              new TextRun({ text: '• exportDocument.ts (/src/utils): ', bold: true }),
              new TextRun({ text: 'Client-side utility generating styled PDF ledgers and Microsoft Excel (.xls) spreadsheets directly in the browser.\n' }),
              new TextRun({ text: '• audio.ts (/src/utils): ', bold: true }),
              new TextRun({ text: 'Synthesizes clean browser audio chimes for successful check-ins, check-outs, and error alerts.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 9: SCRIPTS DIRECTORY
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '9. Database & Tooling Scripts (/scripts)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• setup_database.ts & apply_database_constraints.ts: ', bold: true }),
              new TextRun({ text: 'Initializes tables, creates indexes, and enforces foreign key integrity.\n' }),
              new TextRun({ text: '• export_employees_as_demo.ts: ', bold: true }),
              new TextRun({ text: 'Saves the current live workforce records into demo_employees.json so they persist across reseeds.\n' }),
              new TextRun({ text: '• test_rbac.ts & test-auto-upsert.ts: ', bold: true }),
              new TextRun({ text: 'Automated test scripts validating role security permissions and attendance upsert algorithms.\n' }),
              new TextRun({ text: '• Document Generators: ', bold: true }),
              new TextRun({ text: 'generate_ai_assistant_guide_docx.ts, generate_system_user_manual_docx.ts, and generate_folder_explanation_docx.ts compile formal dissertation Word manuals directly from codebase metadata.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 10: HOW TO RUN & DEPLOY
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '10. Execution Commands & Cross-Device Access', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Start the Development Server: ', bold: true }),
              new TextRun({ text: 'Run `npm run dev` from the project directory. The Express API and Vite frontend will launch concurrently on port 3001.\n' }),
              new TextRun({ text: '2. Access from Computer: ', bold: true }),
              new TextRun({ text: 'Open browser at http://localhost:3001.\n' }),
              new TextRun({ text: '3. Access from Mobile Devices: ', bold: true }),
              new TextRun({ text: 'Connect your phone to the same Wi-Fi network and browse to http://192.168.0.119:3001.' }),
            ],
          }),

          // ----------------------------------------------------
          // SIGN-OFF / FOOTER
          // ----------------------------------------------------
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: 'Prepared as part of the Final Year Dissertation for the Smart Employee Attendance and Statutory Payroll Management System.',
                italics: true,
                color: MUTED_TEXT,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Apex Enterprise HRMS • Architectural Documentation • Osman A. Mansaray',
                bold: true,
                size: 18,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Target paths to save the Word Document
  const targetPaths = [
    // 1. In project root
    path.resolve(process.cwd(), 'Apex_HRMS_Folder_Structure_and_System_Architecture_Guide.docx'),
    // 2. In parent dissertation folder
    path.resolve(process.cwd(), '..', 'Apex_HRMS_Folder_Structure_and_System_Architecture_Guide.docx'),
    // 3. Directly on User Desktop
    'C:\\Users\\OSMAN A MANSARAY\\Desktop\\Apex_HRMS_Folder_Structure_and_System_Architecture_Guide.docx',
  ];

  for (const targetPath of targetPaths) {
    try {
      fs.writeFileSync(targetPath, buffer);
      console.log(`[SUCCESS] Saved Word Document to: ${targetPath}`);
    } catch (err: any) {
      console.warn(`[NOTICE] Could not write to ${targetPath}: ${err.message}`);
    }
  }

  console.log('Folder explanation document generation complete!');
}

generateFolderExplanationDocx().catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
