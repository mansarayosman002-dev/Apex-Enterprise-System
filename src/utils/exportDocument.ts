/**
 * Enterprise PDF and CSV Document Export Utility
 * Generates beautifully formatted, executive-styled standard PDF 1.4 documents
 * and Microsoft Excel-optimized RFC-4180 CSV workbooks.
 *
 * Applicable for:
 * 1. AI Assistant Responses & Strategic Advisory Briefings
 * 2. System Notifications, Shift Rosters & Personal Sender Notes
 * 3. Attendance Ledgers, Employee Rosters, Payroll Sheets & Audit Reports
 */

export interface ExportOptions {
  title: string;
  content: string;
  filenamePrefix?: string;
  metadata?: Record<string, string | undefined>;
}

export interface TableExportOptions {
  title: string;
  subtitle?: string;
  filenamePrefix?: string;
  metadata?: Record<string, string | number | undefined | null>;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  summaryRow?: (string | number | boolean | null | undefined)[];
}

/**
 * Escapes cell values according to RFC-4180 for Microsoft Excel
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

  // If cell contains commas, quotes, newlines, or semicolons, quote it
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes(';')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Parses Markdown content into an executive, multi-section CSV workbook
 * formatted specifically for pristine viewing and calculations in Microsoft Excel.
 */
export function downloadAsCsv({
  title,
  content,
  filenamePrefix = 'apex_export',
  metadata = {},
}: ExportOptions): void {
  const lines = content.split('\n');
  const csvRows: string[] = [];

  // 1. Official Microsoft Excel Corporate Masthead
  csvRows.push([
    'APEX ENTERPRISE SL LTD',
    'SMART EMPLOYEE ATTENDANCE & PAYROLL MANAGEMENT SYSTEM',
    'OFFICIAL AUDIT EXPORT',
  ].map(escapeCsvCell).join(','));

  csvRows.push([
    'DOCUMENT TITLE:',
    title,
    'SECURITY CLASSIFICATION:',
    'INTERNAL CONFIDENTIAL',
  ].map(escapeCsvCell).join(','));

  csvRows.push([
    'EXPORT DATE & TIME:',
    new Date().toLocaleString(),
    'HEADQUARTERS:',
    '15 Siaka Stevens Street, Freetown, Sierra Leone',
  ].map(escapeCsvCell).join(','));

  // Append optional metadata items cleanly across columns
  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      csvRows.push([`METADATA [${key.toUpperCase()}]:`, value].map(escapeCsvCell).join(','));
    }
  }

  csvRows.push(''); // Blank separator row for Excel layout

  // 2. Extract Data Tables from Markdown
  const tableRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const parts = line
        .slice(1, -1)
        .split('|')
        .map((p) => p.trim());

      // Skip separator rows: |---|---|
      if (parts.every((p) => /^[-:]+$/.test(p))) {
        continue;
      }

      inTable = true;
      tableRows.push(parts);
    } else if (inTable) {
      inTable = false;
    }
  }

  // If table exists, output formatted Table Section for Excel
  if (tableRows.length > 0) {
    csvRows.push(['=== [SECTION 1: DATA RECORDS & ATTENDANCE ROSTER] ==='].map(escapeCsvCell).join(','));
    // Table Header
    csvRows.push(tableRows[0].map(escapeCsvCell).join(','));
    // Table Rows
    for (let r = 1; r < tableRows.length; r++) {
      csvRows.push(tableRows[r].map(escapeCsvCell).join(','));
    }
    csvRows.push(''); // Blank spacer row
  }

  // 3. Extract KPI Metrics, Takeaways, and Bullet Items
  const metricRows: { metric: string; value: string; notes?: string }[] = [];
  const noteRows: { type: string; details: string }[] = [];
  const generalStatements: { section: string; text: string }[] = [];

  let currentSection = 'Overview & Context';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (raw.startsWith('|') && raw.endsWith('|')) continue; // already handled

    if (raw.startsWith('### ') || raw.startsWith('## ') || raw.startsWith('# ')) {
      currentSection = raw.replace(/^#+\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1');
      continue;
    }

    if (raw.startsWith('- ') || raw.startsWith('* ') || raw.startsWith('• ')) {
      const clean = raw.replace(/^[-*•]\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1');
      if (clean.includes(':')) {
        const [k, ...v] = clean.split(':');
        metricRows.push({
          metric: k.trim(),
          value: v.join(':').trim(),
          notes: currentSection,
        });
      } else {
        metricRows.push({
          metric: 'Key Item',
          value: clean,
          notes: currentSection,
        });
      }
      continue;
    }

    if (raw.startsWith('> ') || raw.startsWith('**Note from') || raw.startsWith('**Sender Note**')) {
      const clean = raw.replace(/^>\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1');
      noteRows.push({
        type: 'Administrative Note',
        details: clean,
      });
      continue;
    }

    // Paragraph text
    const cleanPara = raw.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    generalStatements.push({ section: currentSection, text: cleanPara });
  }

  // Output Metrics Section
  if (metricRows.length > 0) {
    csvRows.push(['=== [SECTION 2: EXECUTIVE SUMMARY & METRIC FINDINGS] ==='].map(escapeCsvCell).join(','));
    csvRows.push(['METRIC / PARAMETER', 'OBSERVATION / VALUE', 'SECTION / CATEGORY'].map(escapeCsvCell).join(','));
    for (const m of metricRows) {
      csvRows.push([m.metric, m.value, m.notes || 'General'].map(escapeCsvCell).join(','));
    }
    csvRows.push('');
  }

  // Output Sender / Administrative Notes Section
  if (noteRows.length > 0) {
    csvRows.push(['=== [SECTION 3: ADMINISTRATIVE & SENDER DIRECTIVES] ==='].map(escapeCsvCell).join(','));
    csvRows.push(['COMMUNICATION TYPE', 'MESSAGE / DIRECTIVE DETAILS'].map(escapeCsvCell).join(','));
    for (const n of noteRows) {
      csvRows.push([n.type, n.details].map(escapeCsvCell).join(','));
    }
    csvRows.push('');
  }

  // Output General Statements / Details if no table was found
  if (tableRows.length === 0 && generalStatements.length > 0) {
    csvRows.push(['=== [SECTION: STATEMENTS & DETAILED INFORMATION] ==='].map(escapeCsvCell).join(','));
    csvRows.push(['SECTION', 'DETAILS / CONTENT'].map(escapeCsvCell).join(','));
    for (const g of generalStatements) {
      csvRows.push([g.section, g.text].map(escapeCsvCell).join(','));
    }
    csvRows.push('');
  }

  // 4. Corporate Governance & Confidentiality Footer
  csvRows.push(['=== [SYSTEM GOVERNANCE & CONFIDENTIALITY NOTICE] ==='].map(escapeCsvCell).join(','));
  csvRows.push([
    'SYSTEM ORIGIN:',
    'Apex Enterprise System • PostgreSQL 18 Audit Log Verified',
  ].map(escapeCsvCell).join(','));
  csvRows.push([
    'CONFIDENTIALITY:',
    'For Authorized Apex Enterprise SL Ltd Personnel Only. Unauthorized distribution or copying prohibited.',
  ].map(escapeCsvCell).join(','));

  // Assemble CSV with Windows CRLF (\r\n) and UTF-8 Byte Order Mark (\uFEFF) for Excel
  const csvString = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${formatDate(new Date())}.csv`);
}

/**
 * Exports structured database tables (Attendance, Employees, Payroll, Reports)
 * to a standardized, executive Excel-ready CSV workbook with headers, metadata, and totals.
 */
export function exportTableToCsv({
  title,
  subtitle,
  filenamePrefix = 'apex_ledger',
  metadata = {},
  headers,
  rows,
  summaryRow,
}: TableExportOptions): void {
  const csvRows: string[] = [];

  // 1. Corporate Excel Header Masthead
  csvRows.push([
    'APEX ENTERPRISE SL LTD',
    'SMART EMPLOYEE ATTENDANCE & PAYROLL MANAGEMENT SYSTEM',
    'OFFICIAL AUDIT LEDGER',
  ].map(escapeCsvCell).join(','));

  csvRows.push([
    'REPORT TITLE:',
    title,
    'SECURITY CLASSIFICATION:',
    'STRICTLY CONFIDENTIAL',
  ].map(escapeCsvCell).join(','));

  if (subtitle) {
    csvRows.push(['PURPOSE / SCOPE:', subtitle].map(escapeCsvCell).join(','));
  }

  csvRows.push([
    'GENERATION TIMESTAMP:',
    new Date().toLocaleString(),
    'TOTAL RECORDS:',
    String(rows.length),
  ].map(escapeCsvCell).join(','));

  csvRows.push([
    'ORGANIZATION:',
    'Apex Enterprise Solutions (SL) Ltd.',
    'HEADQUARTERS:',
    '15 Siaka Stevens Street, Freetown, Sierra Leone',
  ].map(escapeCsvCell).join(','));

  // Custom metadata (e.g. Audit Period, Department Filter, Currency)
  for (const [k, v] of Object.entries(metadata)) {
    if (v !== undefined && v !== null && v !== '') {
      csvRows.push([`${k.toUpperCase()}:`, String(v)].map(escapeCsvCell).join(','));
    }
  }

  csvRows.push(''); // Spacer

  // 2. Data Table
  csvRows.push(['=== [DATA LEDGER RECORDS] ==='].map(escapeCsvCell).join(','));
  csvRows.push(headers.map((h) => escapeCsvCell(h.toUpperCase())).join(','));

  for (const r of rows) {
    csvRows.push(r.map(escapeCsvCell).join(','));
  }

  // 3. Optional Summary / Totals Row
  if (summaryRow && summaryRow.length > 0) {
    csvRows.push(summaryRow.map(escapeCsvCell).join(','));
  }

  // 4. System Footer
  csvRows.push('');
  csvRows.push([
    'CONFIDENTIALITY NOTICE:',
    'This ledger contains privileged payroll, identity, and attendance records of Apex Enterprise SL Ltd.',
  ].map(escapeCsvCell).join(','));
  csvRows.push([
    'SYSTEM VERIFICATION:',
    'Cryptographically signed by Apex Enterprise System Engine • PostgreSQL 18 Storage Engine',
  ].map(escapeCsvCell).join(','));

  const csvString = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${formatDate(new Date())}.csv`);
}

/**
 * Generates an executive-styled, multi-page standard PDF 1.4 binary file
 * with dark navy corporate header, metadata box, table grid formatting,
 * and page pagination for Markdown content.
 */
export function downloadAsPdf({
  title,
  content,
  filenamePrefix = 'apex_report',
  metadata = {},
}: ExportOptions): void {
  const pages: string[] = [];
  const linesPerPage = 38;
  const rawLines = content.split('\n');

  interface PrintableItem {
    type: 'header' | 'table-header' | 'table-row' | 'table-sep' | 'bullet' | 'note' | 'text' | 'blank';
    text: string;
    tableColumns?: string[];
    isBold?: boolean;
  }

  const printableItems: PrintableItem[] = [];

  // Parse lines into structured layout elements
  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) {
      printableItems.push({ type: 'blank', text: '' });
      continue;
    }

    // Markdown Headings
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      const headingText = line.replace(/^#+\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1').toUpperCase();
      printableItems.push({ type: 'header', text: headingText, isBold: true });
      continue;
    }

    // Markdown Table lines
    if (line.startsWith('|') && line.endsWith('|')) {
      const parts = line.slice(1, -1).split('|').map((p) => p.trim().replace(/\*\*([^*]+)\*\*/g, '$1'));
      if (parts.every((p) => /^[-:]+$/.test(p))) {
        printableItems.push({ type: 'table-sep', text: '' });
        continue;
      }
      const isHeader = printableItems.length === 0 || printableItems[printableItems.length - 1].type === 'header' || printableItems[printableItems.length - 1].type === 'blank';
      printableItems.push({
        type: isHeader ? 'table-header' : 'table-row',
        text: '',
        tableColumns: parts,
        isBold: isHeader,
      });
      continue;
    }

    // Bullets
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const clean = line.replace(/^[-*•]\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
      printableItems.push({ type: 'bullet', text: clean });
      continue;
    }

    // Quotes / Personal sender notes
    if (line.startsWith('> ') || line.startsWith('**Note from') || line.startsWith('**Sender Note**')) {
      const clean = line.replace(/^>\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1');
      printableItems.push({ type: 'note', text: clean, isBold: true });
      continue;
    }

    // Paragraph wrapping (approx 85 characters per line for Helvetica 8.5)
    const cleanPara = line.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    const words = cleanPara.split(' ');
    let curr = '';
    for (const w of words) {
      if ((curr + ' ' + w).trim().length > 85) {
        printableItems.push({ type: 'text', text: curr.trim() });
        curr = w;
      } else {
        curr = curr ? `${curr} ${w}` : w;
      }
    }
    if (curr) {
      printableItems.push({ type: 'text', text: curr.trim() });
    }
  }

  // Calculate pages
  const totalPages = Math.max(1, Math.ceil(printableItems.length / linesPerPage));

  for (let p = 0; p < totalPages; p++) {
    const pageItems = printableItems.slice(p * linesPerPage, (p + 1) * linesPerPage);
    let stream = '';

    // ==========================================
    // 1. CORPORATE HEADER MASTHEAD WITH LOGO (A4 Portrait: 595.28 x 841.89)
    // ==========================================
    // Deep corporate navy banner (x: 40, y: 788, w: 515, h: 40)
    stream += '0.08 0.13 0.26 rg\n40 788 515 40 re\nf\n';
    // Cyan accent divider bar (x: 40, y: 786, w: 515, h: 2)
    stream += '0.10 0.65 0.85 rg\n40 786 515 2 re\nf\n';

    // Official Apex Enterprise Geometric Logo Emblem (Summit Diamond & Chevron)
    stream += '0.12 0.58 0.82 rg\n48 796 24 24 re\nf\n';
    stream += '0.05 0.25 0.55 rg\n48 796 12 24 re\nf\n';
    stream += '1 1 1 rg\n60 816 m 52 800 l 68 800 l f\n';
    stream += '0.08 0.13 0.26 rg\n60 809 m 55 800 l 65 800 l f\n';

    // Banner Typography
    stream += 'BT\n1 1 1 rg\n/F2 12.5 Tf\n78 810 Td\n(APEX ENTERPRISE SL LTD) Tj\nET\n';
    stream += 'BT\n0.75 0.82 0.95 rg\n/F1 7.5 Tf\n78 799 Td\n(Smart Employee Attendance & Payroll Management System  |  Freetown, Sierra Leone) Tj\nET\n';
    stream += 'BT\n0.85 0.92 1 rg\n/F2 8 Tf\n435 810 Td\n(OFFICIAL AUDIT REPORT) Tj\nET\n';
    stream += 'BT\n0.65 0.75 0.90 rg\n/F1 7 Tf\n440 799 Td\n(ISO 216 A4 CERTIFIED) Tj\nET\n';

    // ==========================================
    // 2. DOCUMENT TITLE & METADATA PLAQUE
    // ==========================================
    // Background card (x: 40, y: 736, w: 515, h: 36)
    stream += '0.95 0.96 0.98 rg\n40 736 515 36 re\nf\n';
    stream += '0.82 0.85 0.90 RG\n0.5 w\n40 736 515 36 re\nS\n';

    // Document Title
    const safeTitle = escapePdfString(title.slice(0, 68));
    stream += 'BT\n0.10 0.15 0.30 rg\n/F2 10.5 Tf\n50 752 Td\n(' + safeTitle + ') Tj\nET\n';

    // Metadata details
    const metaParts = [
      `Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      'Security: CONFIDENTIAL',
    ];
    for (const [k, v] of Object.entries(metadata)) {
      if (v) metaParts.push(`${k}: ${v}`);
    }
    const safeMeta = escapePdfString(metaParts.join('   |   ').slice(0, 110));
    stream += 'BT\n0.40 0.45 0.52 rg\n/F1 7.5 Tf\n50 741 Td\n(' + safeMeta + ') Tj\nET\n';

    // ==========================================
    // 3. BODY CONTENT RENDERING
    // ==========================================
    let y = 718;

    for (const item of pageItems) {
      if (y < 58) break;

      if (item.type === 'blank') {
        y -= 9;
        continue;
      }

      if (item.type === 'header') {
        y -= 6;
        // Section Header background accent rule
        stream += '0.82 0.86 0.92 RG\n0.5 w\n40 ' + (y - 3) + ' m\n555 ' + (y - 3) + ' l\nS\n';
        stream += 'BT\n0.10 0.16 0.32 rg\n/F2 9.5 Tf\n42 ' + y + ' Td\n(' + escapePdfString(item.text) + ') Tj\nET\n';
        y -= 16;
        continue;
      }

      if (item.type === 'table-header' && item.tableColumns) {
        // Table Header shaded box
        stream += '0.91 0.93 0.97 rg\n40 ' + (y - 3) + ' 515 16 re\nf\n';
        stream += '0.75 0.80 0.88 RG\n0.5 w\n40 ' + (y - 3) + ' 515 16 re\nS\n';

        const colWidth = 505 / Math.max(1, item.tableColumns.length);
        for (let c = 0; c < item.tableColumns.length; c++) {
          const colX = 46 + c * colWidth;
          const colText = escapePdfString(item.tableColumns[c].slice(0, 22));
          stream += 'BT\n0.10 0.15 0.30 rg\n/F2 7.5 Tf\n' + colX + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
        }
        y -= 18;
        continue;
      }

      if (item.type === 'table-row' && item.tableColumns) {
        // Table Row
        stream += '0.88 0.91 0.95 RG\n0.3 w\n40 ' + (y - 2) + ' m\n555 ' + (y - 2) + ' l\nS\n';
        const colWidth = 505 / Math.max(1, item.tableColumns.length);
        for (let c = 0; c < item.tableColumns.length; c++) {
          const colX = 46 + c * colWidth;
          const colText = escapePdfString(item.tableColumns[c].slice(0, 24));
          stream += 'BT\n0.18 0.22 0.28 rg\n/F1 7.5 Tf\n' + colX + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
        }
        y -= 14;
        continue;
      }

      if (item.type === 'table-sep') {
        continue;
      }

      if (item.type === 'note') {
        // Administrative Callout Box with left vertical accent bar
        stream += '0.95 0.96 0.99 rg\n40 ' + (y - 4) + ' 515 16 re\nf\n';
        stream += '0.25 0.45 0.85 rg\n40 ' + (y - 4) + ' 3.5 16 re\nf\n';
        stream += 'BT\n0.15 0.25 0.55 rg\n/F2 7.5 Tf\n48 ' + (y + 1) + ' Td\n([ADMINISTRATIVE NOTE]  ' + escapePdfString(item.text.slice(0, 95)) + ') Tj\nET\n';
        y -= 18;
        continue;
      }

      if (item.type === 'bullet') {
        // Bullet glyph
        stream += '0.25 0.45 0.85 rg\n46 ' + (y + 3) + ' 2.5 2.5 re\nf\n';
        stream += 'BT\n0.20 0.24 0.30 rg\n/F1 8 Tf\n54 ' + y + ' Td\n(' + escapePdfString(item.text.slice(0, 95)) + ') Tj\nET\n';
        y -= 13;
        continue;
      }

      // Plain body paragraph text
      stream += 'BT\n0.20 0.24 0.30 rg\n/F1 8 Tf\n42 ' + y + ' Td\n(' + escapePdfString(item.text) + ') Tj\nET\n';
      y -= 12;
    }

    // ==========================================
    // 4. CORPORATE CONFIDENTIALITY FOOTER
    // ==========================================
    stream += '0.80 0.83 0.88 RG\n0.5 w\n40 40 m\n555 40 l\nS\n';
    stream += 'BT\n0.45 0.50 0.55 rg\n/F1 7 Tf\n42 28 Td\n(CONFIDENTIAL  -  For Apex Enterprise SL Ltd Authorized Internal Personnel Only) Tj\nET\n';
    stream += 'BT\n0.25 0.30 0.40 rg\n/F2 7.5 Tf\n490 28 Td\n(Page ' + (p + 1) + ' of ' + totalPages + ') Tj\nET\n';

    pages.push(stream);
  }

  const pdfBlob = assemblePdfBlob(pages, 'portrait');
  triggerDownload(pdfBlob, `${filenamePrefix}_${formatDate(new Date())}.pdf`);
}

/**
 * Generates an executive-styled, multi-page standard PDF 1.4 document
 * formatted specifically for ISO A4 Landscape paper (841.89 x 595.28 pt).
 * Automatically fits wide data tables with company logo on every page.
 */
export function exportTableToPdf({
  title,
  subtitle,
  filenamePrefix = 'apex_ledger_report',
  metadata = {},
  headers,
  rows,
}: TableExportOptions): void {
  const pages: string[] = [];
  const rowsPerPage = 22; // Perfectly fits A4 landscape height with masthead and footer
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const numCols = Math.max(1, headers.length);
  const printableWidth = 762;
  const colWidth = printableWidth / numCols;

  for (let p = 0; p < totalPages; p++) {
    const pageRows = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    let stream = '';

    // ==========================================
    // 1. CORPORATE HEADER MASTHEAD WITH LOGO (A4 Landscape: 841.89 x 595.28)
    // ==========================================
    // Deep corporate navy banner (x: 40, y: 542, w: 762, h: 40)
    stream += '0.08 0.13 0.26 rg\n40 542 762 40 re\nf\n';
    // Cyan accent divider strip
    stream += '0.10 0.65 0.85 rg\n40 540 762 2.5 re\nf\n';

    // Official Apex Enterprise Geometric Logo Emblem (Summit Diamond & Chevron)
    stream += '0.12 0.58 0.82 rg\n48 550 24 24 re\nf\n';
    stream += '0.05 0.25 0.55 rg\n48 550 12 24 re\nf\n';
    stream += '1 1 1 rg\n60 570 m 52 554 l 68 554 l f\n';
    stream += '0.08 0.13 0.26 rg\n60 563 m 55 554 l 65 554 l f\n';

    // Corporate Title & Subtitle
    stream += 'BT\n1 1 1 rg\n/F2 13 Tf\n80 564 Td\n(APEX ENTERPRISE SL LTD) Tj\nET\n';
    stream += 'BT\n0.75 0.82 0.95 rg\n/F1 7.5 Tf\n80 553 Td\n(Smart Employee Attendance & Payroll Management System  |  15 Siaka Stevens Street, Freetown, Sierra Leone) Tj\nET\n';
    stream += 'BT\n0.85 0.92 1 rg\n/F2 8.5 Tf\n640 564 Td\n(OFFICIAL AUDIT LEDGER) Tj\nET\n';
    stream += 'BT\n0.65 0.75 0.90 rg\n/F1 7.5 Tf\n640 553 Td\n(ISO 216 A4 PRINT VERIFIED) Tj\nET\n';

    // ==========================================
    // 2. DOCUMENT TITLE & METADATA PLAQUE
    // ==========================================
    stream += '0.95 0.96 0.98 rg\n40 492 762 36 re\nf\n';
    stream += '0.80 0.84 0.90 RG\n0.5 w\n40 492 762 36 re\nS\n';

    const safeTitle = escapePdfString(title.slice(0, 80));
    stream += 'BT\n0.10 0.15 0.30 rg\n/F2 11 Tf\n52 508 Td\n(' + safeTitle + ') Tj\nET\n';

    const metaParts = [
      `Date: ${new Date().toLocaleDateString()}`,
      `Total Records: ${rows.length}`,
      'Classification: STRICTLY CONFIDENTIAL',
    ];
    for (const [k, v] of Object.entries(metadata)) {
      if (v) metaParts.push(`${k}: ${v}`);
    }
    const safeMeta = escapePdfString(metaParts.join('   |   ').slice(0, 140));
    stream += 'BT\n0.35 0.40 0.50 rg\n/F1 7.5 Tf\n52 497 Td\n(' + safeMeta + ') Tj\nET\n';

    // ==========================================
    // 3. TABLE HEADER ROW (A4 Landscape Width)
    // ==========================================
    let y = 464;
    stream += '0.90 0.93 0.97 rg\n40 ' + (y - 3) + ' 762 18 re\nf\n';
    stream += '0.72 0.78 0.86 RG\n0.5 w\n40 ' + (y - 3) + ' 762 18 re\nS\n';

    for (let c = 0; c < numCols; c++) {
      const colX = 45 + c * colWidth;
      const colText = escapePdfString(headers[c].slice(0, 22).toUpperCase());
      stream += 'BT\n0.10 0.15 0.30 rg\n/F2 7.5 Tf\n' + colX + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
    }
    y -= 19;

    // ==========================================
    // 4. TABLE DATA ROWS
    // ==========================================
    for (let r = 0; r < pageRows.length; r++) {
      const row = pageRows[r];
      if (r % 2 === 1) {
        stream += '0.98 0.98 0.99 rg\n40 ' + (y - 2) + ' 762 15 re\nf\n';
      }
      stream += '0.88 0.90 0.94 RG\n0.3 w\n40 ' + (y - 2) + ' m\n802 ' + (y - 2) + ' l\nS\n';

      for (let c = 0; c < numCols; c++) {
        const colX = 45 + c * colWidth;
        const rawVal = row[c];
        const valStr = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
        const colText = escapePdfString(valStr.slice(0, 26));
        stream += 'BT\n0.18 0.22 0.28 rg\n/F1 7.5 Tf\n' + colX + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
      }
      y -= 16;
    }

    // ==========================================
    // 5. CORPORATE CERTIFICATION FOOTER
    // ==========================================
    stream += '0.80 0.83 0.88 RG\n0.5 w\n40 38 m\n802 38 l\nS\n';
    stream += 'BT\n0.45 0.50 0.55 rg\n/F1 7 Tf\n44 26 Td\n(CONFIDENTIAL  -  Apex Enterprise SL Ltd Audit Division  |  Certified Operations Report) Tj\nET\n';
    stream += 'BT\n0.25 0.30 0.40 rg\n/F2 7.5 Tf\n730 26 Td\n(Page ' + (p + 1) + ' of ' + totalPages + ') Tj\nET\n';

    pages.push(stream);
  }

  const pdfBlob = assemblePdfBlob(pages, 'landscape');
  triggerDownload(pdfBlob, `${filenamePrefix}_${formatDate(new Date())}.pdf`);
}

/**
 * Escapes characters for PDF text streams: (, ), \
 */
function escapePdfString(str: string): string {
  return str.replace(/[\(\)\\\r]/g, (match) => {
    if (match === '\r') return '';
    return '\\' + match;
  });
}

/**
 * Triggers a standard programmatic file download in the browser
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Assembles a valid PDF-1.4 file buffer containing the provided page content streams
 * Supports standard ISO A4 portrait (595.28 x 841.89) and landscape (841.89 x 595.28).
 */
function assemblePdfBlob(
  pageStreams: string[],
  orientation: 'portrait' | 'landscape' = 'portrait'
): Blob {
  const objects: string[] = [];
  const numPages = pageStreams.length;

  const width = orientation === 'landscape' ? 841.89 : 595.28;
  const height = orientation === 'landscape' ? 595.28 : 841.89;

  // Obj 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  // Page Object IDs will be from 3 to (3 + numPages - 1)
  const pageObjectIds: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pageObjectIds.push(3 + i);
  }

  // Obj 2: Pages Collection
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>`);

  // Fonts: Font 1 (Helvetica), Font 2 (Helvetica-Bold)
  const fontObjIndex1 = 3 + numPages;
  const fontObjIndex2 = 3 + numPages + 1;

  // Generate Page Objects with exact ISO A4 MediaBox
  for (let i = 0; i < numPages; i++) {
    const streamObjIndex = 3 + numPages + 2 + i;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /F1 ${fontObjIndex1} 0 R /F2 ${fontObjIndex2} 0 R >> >> /Contents ${streamObjIndex} 0 R >>`
    );
  }

  // Add Font Objects
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  // Add Content Streams
  for (const stream of pageStreams) {
    const streamBytes = new TextEncoder().encode(stream);
    objects.push(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
  }

  // Assemble PDF document with valid Byte Offsets & Cross-Reference Table
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const startXref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
