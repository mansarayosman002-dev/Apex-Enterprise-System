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

async function generateManual() {
  console.log('Generating Apex AI Assistant Word Document Manual (.docx)...');

  // Professional color palette
  const PRIMARY_COLOR = '4F46E5'; // Indigo
  const SECONDARY_COLOR = '0F172A'; // Dark Slate
  const ACCENT_COLOR = '7C3AED'; // Purple
  const LIGHT_BG = 'F8FAFC'; // Slate 50
  const BORDER_COLOR = 'CBD5E1'; // Slate 300
  const MUTED_TEXT = '64748B'; // Slate 500

  // Standard border style
  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: BORDER_COLOR,
  };

  const doc = new Document({
    title: 'Apex HRMS AI Assistant Module User Manual',
    description: 'Step-by-step comprehensive guide on how to use the AI Assistant Module across desktop and mobile devices.',
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
          // COVER / TITLE BLOCK
          // ----------------------------------------------------
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'APEX ENTERPRISE HRMS',
                bold: true,
                size: 28,
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
                text: 'Smart Employee Attendance & Statutory Payroll Management System',
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
                text: 'AI ASSISTANT & COPILOT MODULE',
                bold: true,
                size: 38,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Comprehensive Step-by-Step Operations & User Guide',
                bold: true,
                size: 24,
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
                          new TextRun({ text: 'Author / Developer: ', bold: true }),
                          new TextRun({ text: 'Osman A. Mansaray' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Target Systems: ', bold: true }),
                          new TextRun({ text: 'Computer (PC/Mac) & Mobile Phones (iOS/Android)' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'System Release: ', bold: true }),
                          new TextRun({ text: 'Apex HRMS v2.4 (Statutory Sierra Leone Edition)' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Local Access URLs: ', bold: true }),
                          new TextRun({ text: 'Computer: http://localhost:3001 | Mobile: http://192.168.0.119:3001' }),
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
          // SECTION 1: INTRODUCTION & OVERVIEW
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: '1. Overview of the Apex AI Assistant Module', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Apex AI Assistant is an enterprise-grade, domain-specific artificial intelligence copilot designed specifically for human resource administrators, payroll accountants, operations supervisors, and employees. Unlike generic chatbots, the Apex AI Copilot is deeply integrated with the system’s SQLite database, real-time biometric QR scan records, and statutory Sierra Leone labor regulations.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The AI module is delivered through two coordinated interfaces:\n',
              }),
              new TextRun({ text: '• The Docked Floating Widget: ', bold: true }),
              new TextRun({ text: 'A movable, drag-and-drop assistant orb and popover available on every single page in the application.\n' }),
              new TextRun({ text: '• The Dedicated Full-Screen AI Hub: ', bold: true }),
              new TextRun({ text: 'A comprehensive control center featuring multi-turn conversation memory, 4 customizable writing styles, background workflow automation, anomaly fraud detection, and regulatory rule books.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 2: THE DOCKED FLOATING WIDGET
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '2. How to Use the Docked Floating AI Widget', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The floating widget gives you instant access to AI insights without ever leaving your current screen (such as Employee directory, Attendance ledger, or Payroll processing).',
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Step 2.1: Opening and Collapsing the Assistant', bold: true, color: SECONDARY_COLOR })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Locate the Amethyst AI Orb: ', bold: true }),
              new TextRun({ text: 'On desktop, it sits in the lower right corner (above system notifications). On mobile phones, it is automatically docked above the bottom navigation bar.\n' }),
              new TextRun({ text: '2. Click or Tap Once: ', bold: true }),
              new TextRun({ text: 'A single click smoothly opens the expanded chat popover.\n' }),
              new TextRun({ text: '3. Close or Minimize: ', bold: true }),
              new TextRun({ text: 'Click the "X" button on the header to close, or the minimize button (–) to shrink the card into a slim header pill while keeping your conversation active.' }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Step 2.2: Dragging and Moving the Widget Anywhere', bold: true, color: SECONDARY_COLOR })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Move the Collapsed Orb: ', bold: true }),
              new TextRun({ text: 'Click and hold (or touch and drag on a phone/tablet) the purple circular orb. Drag it anywhere across the screen. Notice the cursor changes to a gripping hand and the orb follows your pointer with physics damping.\n' }),
              new TextRun({ text: '• Move the Expanded Card: ', bold: true }),
              new TextRun({ text: 'Click and drag the top header bar (next to the grip icon). You can position the chat window anywhere on your screen so it never blocks important table data.\n' }),
              new TextRun({ text: '• Automatic Viewport Clamping: ', bold: true }),
              new TextRun({ text: 'The widget will never slide off-screen. It automatically detects screen edges and respects mobile bottom navigation bars.\n' }),
              new TextRun({ text: '• Position Memory & Reset: ', bold: true }),
              new TextRun({ text: 'Your custom position is saved automatically in browser memory. When moved, a Reset button (circular arrow icon) appears in the header. Clicking it instantly docks the widget back to its original corner.' }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Step 2.3: Using Quick Suggestions & Jump to Full Page', bold: true, color: SECONDARY_COLOR })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Quick Suggestion Chips: ', bold: true }),
              new TextRun({ text: 'When opening the widget, click any suggestion chip (e.g. "Explain NASSIT rules", "Who is late today?", "Attendance grace period") to trigger instant analysis.\n' }),
              new TextRun({ text: '• Jump to Full Page: ', bold: true }),
              new TextRun({ text: 'Click the External Link icon on the header bar to immediately transition your current context to the full-screen AI Assistant Page.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 3: THE DEDICATED FULL AI ASSISTANT PAGE
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '3. Step-by-Step Guide: The Dedicated AI Assistant Page', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The dedicated page (`/ai-assistant`) provides deep analytical workspaces for complex HR queries, compliance generation, and automation workflows.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'How to Navigate: ', bold: true }),
              new TextRun({ text: 'Click "AI Assistant" on the left sidebar navigation menu, or press Ctrl+K (Cmd+K on Mac) in the top search bar and select "AI Assistant".' }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Feature 3.1: Writing Style Personas', bold: true, color: SECONDARY_COLOR })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Before submitting a query, select your desired tone from the Writing Style dropdown:\n' }),
              new TextRun({ text: '1. Statutory (Default): ', bold: true }),
              new TextRun({ text: 'Outputs formal, legally grounded answers citing the Sierra Leone Employment Act 2023, NASSIT Act No. 5 of 2001, and Finance Act tax schedules.\n' }),
              new TextRun({ text: '2. Executive: ', bold: true }),
              new TextRun({ text: 'High-level summaries, bullet points, and strategic managerial takeaways for directors and executives.\n' }),
              new TextRun({ text: '3. Analytical: ', bold: true }),
              new TextRun({ text: 'Deep numerical breakdowns, formula steps, variance calculations, and auditing audits.\n' }),
              new TextRun({ text: '4. Concise: ', bold: true }),
              new TextRun({ text: 'Short, fast answers ideal for quick mobile lookups.' }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Feature 3.2: Message Action Toolbar & Document Export', bold: true, color: SECONDARY_COLOR })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Every response delivered by the AI features an action toolbar at the bottom of the message bubble:\n' }),
              new TextRun({ text: '• Copy to Clipboard: ', bold: true }),
              new TextRun({ text: 'Copies formatted markdown or plain text with one click.\n' }),
              new TextRun({ text: '• Full View Modal: ', bold: true }),
              new TextRun({ text: 'Opens an expansive reading view with clean typography, search, and presentation styling.\n' }),
              new TextRun({ text: '• Export to PDF & Word: ', bold: true }),
              new TextRun({ text: 'Instantly download the AI\'s generated report, policy clarification, or audit summary as an official document.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 4: AUTOMATIONS TAB
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '4. Using Automated Workflows (Automations Tab)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Automations tab allows administrators and payroll managers to trigger rule-based background processes with AI verification.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Available Automated Routines:\n' }),
              new TextRun({ text: '1. Daily Attendance Audit: ', bold: true }),
              new TextRun({ text: 'Scans all punches for the day, flags missing check-outs, identifies tardiness beyond the 15-minute grace window, and computes regular vs overtime hours.\n' }),
              new TextRun({ text: '2. Midnight Shift Roll-Forward: ', bold: true }),
              new TextRun({ text: 'Reconciles overnight shifts and pre-populates the next morning\'s active roster.\n' }),
              new TextRun({ text: '3. Pre-Flight Payroll Check: ', bold: true }),
              new TextRun({ text: 'Runs automated mathematical checks verifying NASSIT calculations (5% + 10%) and graduated PAYE tax tiers before salary disbursement.' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'How to Run: ', bold: true }),
              new TextRun({ text: 'Click the "Automations" tab at the top of the AI page. Click the "Run Now" button next to any scheduled routine. Review the status badge and execution timestamp in the real-time audit log.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 5: ANOMALY DETECTION & FRAUD PREVENTION
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '5. AI Anomaly Detection & Fraud Prevention (Anomalies Tab)', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Apex AI continuously runs heuristic inspection algorithms over attendance transactions to prevent buddy punching, time theft, and payroll inconsistencies.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'What the AI Monitors:\n' }),
              new TextRun({ text: '• Buddy Punching Signals: ', bold: true }),
              new TextRun({ text: 'Detects multiple employees scanned within unrealistic sub-second intervals from the same IP or terminal scanner.\n' }),
              new TextRun({ text: '• Overtime Spikes: ', bold: true }),
              new TextRun({ text: 'Identifies sudden, unapproved overtime jumps exceeding 3 standard deviations from an employee\'s departmental baseline.\n' }),
              new TextRun({ text: '• Ghost Clocking: ', bold: true }),
              new TextRun({ text: 'Flags records with check-ins but no check-outs or consecutive abnormal punch sequences.' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'How to Review: ', bold: true }),
              new TextRun({ text: 'Open the "Anomalies" tab. Click "Scan for Anomalies". Review the risk level badges (High, Medium, Low) and click "Resolve" or "Investigate" to take corrective measures.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 6: STATUTORY KNOWLEDGE BASE
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '6. Regulatory & Statutory Knowledge Repository', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The AI module contains an embedded, offline-capable statutory knowledge base. The AI references these exact rules for all payroll and attendance advice:',
              }),
            ],
          }),

          // Regulatory Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Regulatory Domain', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Statutory Formula / Apex Rule', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'NASSIT Pension (Employee)', bold: true })] })],
                  }),
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '5% mandatory statutory deduction from Gross Basic Salary' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'NASSIT Contribution (Employer)', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '10% employer statutory contribution (Total 15% remitted to NASSIT)' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'PAYE Income Tax', bold: true })] })],
                  }),
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Graduated progressive tax brackets (0% tax-free baseline up to 30% top bracket)' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Overtime Multiplier', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '1.5× hourly rate on regular working days; 2.0× on weekends and declared public holidays' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Attendance Grace Period', bold: true })] })],
                  }),
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '15-minute grace period past standard 08:30 shift start before status shifts to "Late"' })] })],
                  }),
                ],
              }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 7: MOBILE PHONE ACCESS & TOUCH OPERATIONS
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '7. Accessing and Using the AI Module on Mobile Phones', bold: true, color: PRIMARY_COLOR }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The entire system is 100% responsive and optimized for smartphones (iOS Safari, Android Chrome, and modern mobile browsers).',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Step 7.1: Connecting from Mobile\n', bold: true }),
              new TextRun({ text: '1. Ensure your smartphone is connected to the same Wi-Fi network as the host computer.\n' }),
              new TextRun({ text: '2. Open your mobile browser and navigate to: ' }),
              new TextRun({ text: 'http://192.168.0.119:3001\n', bold: true, color: PRIMARY_COLOR }),
              new TextRun({ text: '3. Log in with your credentials or tap any quick-select role.\n\n' }),
              new TextRun({ text: 'Step 7.2: Mobile AI Floating Experience\n', bold: true }),
              new TextRun({ text: '• The AI orb automatically docks above the mobile bottom navigation bar (at bottom-20 offset) so it never obstructs your navigation tabs.\n' }),
              new TextRun({ text: '• Dragging on touchscreens is smooth: touch and drag the orb to move it out of the way of any form inputs.\n' }),
              new TextRun({ text: '• The expanded chat popover adapts fluidly to your mobile screen width (`w-[calc(100vw-1rem)]`) with touch-friendly scrollbars.' }),
            ],
          }),

          // ----------------------------------------------------
          // SECTION 8: SAMPLE PROMPTS & BEST PRACTICES
          // ----------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '8. Practical Sample Prompts for Everyday Work', bold: true, color: PRIMARY_COLOR }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: SECONDARY_COLOR },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Department / Role', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: SECONDARY_COLOR },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Example AI Assistant Query', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'HR & Management', bold: true })] })],
                  }),
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '"Who arrived late today and what was the average tardiness in the Engineering department?"' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Payroll Accounting', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '"Explain how NASSIT 5% and graduated PAYE are calculated for a basic salary of NLe 15,000."' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Staff / Self-Service', bold: true })] })],
                  }),
                  new TableCell({
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '"How do I print or display my personal QR attendance badge for the kiosk scanner?"' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Compliance & Audit', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
                    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                    children: [new Paragraph({ children: [new TextRun({ text: '"Generate an executive payroll reconciliation summary for this month\'s audit report."' })] })],
                  }),
                ],
              }),
            ],
          }),

          // ----------------------------------------------------
          // SUMMARY / SIGN-OFF
          // ----------------------------------------------------
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: 'For technical assistance or system maintenance, refer to the dissertation documentation or contact the system administrator.',
                italics: true,
                color: MUTED_TEXT,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Apex Enterprise HRMS • Smart Employee Attendance and Statutory Payroll Management System',
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
    path.resolve(process.cwd(), 'Apex_AI_Assistant_User_Manual.docx'),
    // 2. In project's parent dissertation folder
    path.resolve(process.cwd(), '..', 'Apex_AI_Assistant_User_Manual.docx'),
    // 3. Directly on User Desktop
    'C:\\Users\\OSMAN A MANSARAY\\Desktop\\Apex_AI_Assistant_User_Manual.docx',
  ];

  for (const targetPath of targetPaths) {
    try {
      fs.writeFileSync(targetPath, buffer);
      console.log(`[SUCCESS] Saved Word Document to: ${targetPath}`);
    } catch (err: any) {
      console.warn(`[NOTICE] Could not write to ${targetPath}: ${err.message}`);
    }
  }

  console.log('All operations complete!');
}

generateManual().catch((err) => {
  console.error('Error generating manual:', err);
  process.exit(1);
});
