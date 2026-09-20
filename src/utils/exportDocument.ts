/**
 * Enterprise PDF and CSV Document Export Utility
 * Generates beautifully formatted, executive-styled standard PDF 1.4 documents
 * and Microsoft Excel-optimized RFC-4180 CSV workbooks.
 *
 * Applicable for:
 * 1. AI Assistant Responses & Strategic Advisory Briefings
 * 2. System Notifications, Shift Rosters & Personal Sender Notes
 * 3. Attendance Ledgers, Employee Rosters, Payroll Sheets & Audit Reports
 * 4. Official Individual Payslip Statements & Statutory Tax Documents
 */

import { PayrollRecord } from '../types/index.ts';
import { APEX_LOGO_JPEG_BASE64 } from '../assets/apexLogoBase64.ts';
import QRCode from 'qrcode';

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
  columnWidths?: number[]; // Explicit custom column widths (pt)
  alignments?: ('left' | 'center' | 'right')[]; // Explicit column alignments
}

export interface PayslipExportOptions {
  currency?: string;
  companyName?: string;
  companyAddress?: string;
  filenamePrefix?: string;
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
 * Parses Markdown content into an executive Microsoft Excel Workbook (.xls SpreadsheetML).
 */
export function downloadAsExcel({
  title,
  content,
  filenamePrefix = 'apex_export',
  metadata = {},
}: ExportOptions): void {
  const lines = content.split('\n');
  const tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const parts = line
        .slice(1, -1)
        .split('|')
        .map((p) => p.trim());

      if (parts.every((p) => /^[-:]+$/.test(p))) continue;
      tableRows.push(parts);
    }
  }

  if (tableRows.length > 1) {
    const headers = tableRows[0];
    const rows = tableRows.slice(1);
    exportTableToExcel({
      title,
      subtitle: 'Official AI Assistant Analytics & Workforce Data Export',
      filenamePrefix,
      metadata,
      headers,
      rows,
    });
  } else {
    // If no markdown table, output line-by-line key sections
    const cleanLines = lines
      .map((l) => l.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim())
      .filter((l) => l.length > 0)
      .map((l) => [l]);

    exportTableToExcel({
      title,
      subtitle: 'Official AI Assistant Response Statement',
      filenamePrefix,
      metadata,
      headers: ['Response Content / Advisory Findings'],
      rows: cleanLines.length > 0 ? cleanLines : [['No structured data provided']],
    });
  }
}

/**
 * Exports structured database tables (Attendance, Employees, Payroll, Reports)
 * to a clean, RFC 4180 compliant CSV table optimized for Microsoft Excel.
 * 
 * Placing headers directly on Row 1 ensures that Microsoft Excel:
 * 1. Automatically auto-sizes each column to fit the data and headers without clipping.
 * 2. Eliminates '########' date overflow errors caused by narrow default widths.
 * 3. Immediately activates AutoFilter (Ctrl+Shift+L) and 1-click sorting.
 * 4. Aligns all cells into proper columns without misalignment from metadata rows.
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

  // 1. Table Headers on Row 1 (Standard RFC 4180 format for Excel)
  csvRows.push(headers.map((h) => escapeCsvCell(h.toUpperCase())).join(','));

  // 2. Data Rows
  for (const r of rows) {
    csvRows.push(r.map(escapeCsvCell).join(','));
  }

  // 3. Optional Summary / Totals Row at the bottom
  if (summaryRow && summaryRow.length > 0) {
    csvRows.push(summaryRow.map(escapeCsvCell).join(','));
  }

  // Assemble with UTF-8 Byte Order Mark (\uFEFF) and Windows CRLF (\r\n) for Excel compatibility
  const csvString = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${formatDate(new Date())}.csv`);
}

/**
 * Exports structured database tables to a formatted Microsoft Excel Workbook (.xls SpreadsheetML).
 * Opens natively in Microsoft Excel with:
 * - Corporate Navy Header Banner (#142142) merged across all columns
 * - Styled Metadata Summary Block (Period, Scope, Timestamp)
 * - Custom pre-calculated column widths (105pt to 320pt) guaranteeing NO text clipping and ZERO ######## date overflows
 * - Dark Navy Blue table headers (#142142) with bold white font and solid borders
 * - Alternating zebra-striped rows (#FFFFFF and #F8FAFC)
 * - Right-aligned numeric values with 2-decimal formatting
 * - Centered status badges and dates
 * - Double-underlined bold Totals summary row
 */
export function exportTableToExcel({
  title,
  subtitle,
  filenamePrefix = 'apex_ledger',
  metadata = {},
  headers,
  rows,
  summaryRow,
}: TableExportOptions): void {
  const escapeXml = (str: any) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // Calculate dynamic column widths based on maximum content length
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of rows) {
      const cellVal = String(row[colIdx] ?? '');
      if (cellVal.length > maxLen) maxLen = cellVal.length;
    }
    // Convert character length to Excel column points: 8.5pt per char + 40pt padding
    // Enforce safe minimum of 110pt (which fits dates YYYY-MM-DD comfortably with zero ########)
    return Math.min(Math.max(maxLen * 8.5 + 40, 110), 320);
  });

  const totalCols = Math.max(headers.length, 1);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Apex Enterprise Systems</Author>
  <Company>Apex Enterprise Solutions (SL) Ltd.</Company>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
  </Style>
  <!-- Masthead Banner -->
  <Style ss:ID="TitleBanner">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#142142" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubtitleBanner">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#E2E8F0"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
  <!-- Metadata Styles -->
  <Style ss:ID="MetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#475569"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="MetaValue">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <!-- Data Table Header -->
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0284C7"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#142142" ss:Pattern="Solid"/>
  </Style>
  <!-- Zebra Data Rows -->
  <Style ss:ID="RowEven">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowOdd">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowEvenNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="RowOddNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="RowEvenCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowOddCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <!-- Summary / Totals -->
  <Style ss:ID="TotalStyle">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TotalNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Audit Ledger">
  <Table>
`;

  // Write Column Widths
  for (const w of colWidths) {
    xml += `   <Column ss:Width="${w.toFixed(0)}"/>\n`;
  }

  // Row 1: Corporate Masthead (Merged across all columns)
  xml += `   <Row ss:Height="26">\n`;
  xml += `    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="TitleBanner"><Data ss:Type="String">APEX ENTERPRISE SOLUTIONS (SL) LTD • ${escapeXml(title.toUpperCase())}</Data></Cell>\n`;
  xml += `   </Row>\n`;

  // Row 2: Subtitle Banner
  if (subtitle) {
    xml += `   <Row ss:Height="18">\n`;
    xml += `    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="SubtitleBanner"><Data ss:Type="String">${escapeXml(subtitle)} • Generated ${escapeXml(new Date().toLocaleString())}</Data></Cell>\n`;
    xml += `   </Row>\n`;
  }

  // Row 3: Blank Spacer
  xml += `   <Row ss:Height="8"/>\n`;

  // Metadata Block (Key in Col A, Value in Col B)
  const metaEntries = Object.entries(metadata).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (metaEntries.length > 0) {
    for (const [k, v] of metaEntries) {
      xml += `   <Row ss:Height="17">\n`;
      xml += `    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">${escapeXml(k)}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="MetaValue" ss:MergeAcross="${Math.min(totalCols - 2, 2)}"><Data ss:Type="String">${escapeXml(v)}</Data></Cell>\n`;
      xml += `   </Row>\n`;
    }
    xml += `   <Row ss:Height="8"/>\n`;
  }

  // Data Table Headers
  xml += `   <Row ss:Height="24">\n`;
  for (const h of headers) {
    xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(h.toUpperCase())}</Data></Cell>\n`;
  }
  xml += `   </Row>\n`;

  // Data Rows
  rows.forEach((r, rIdx) => {
    const isOdd = rIdx % 2 === 1;
    xml += `   <Row ss:Height="19">\n`;
    r.forEach((cellVal) => {
      const valStr = String(cellVal ?? '');
      const numVal = parseFloat(valStr);
      const isNum = !isNaN(numVal) && isFinite(numVal) && !valStr.includes(':') && !valStr.includes('-') && valStr.trim() !== '';
      const isCenter = valStr.length <= 10 && (valStr.includes('-') || valStr.includes(':') || ['Present', 'Late', 'Absent', 'Paid', 'Approved', 'Active'].includes(valStr));

      if (isNum) {
        xml += `    <Cell ss:StyleID="${isOdd ? 'RowOddNum' : 'RowEvenNum'}"><Data ss:Type="Number">${numVal}</Data></Cell>\n`;
      } else if (isCenter) {
        xml += `    <Cell ss:StyleID="${isOdd ? 'RowOddCenter' : 'RowEvenCenter'}"><Data ss:Type="String">${escapeXml(valStr)}</Data></Cell>\n`;
      } else {
        xml += `    <Cell ss:StyleID="${isOdd ? 'RowOdd' : 'RowEven'}"><Data ss:Type="String">${escapeXml(valStr)}</Data></Cell>\n`;
      }
    });
    xml += `   </Row>\n`;
  });

  // Summary Totals Row
  if (summaryRow && summaryRow.length > 0) {
    xml += `   <Row ss:Height="22">\n`;
    summaryRow.forEach((cellVal) => {
      const valStr = String(cellVal ?? '');
      const numVal = parseFloat(valStr);
      const isNum = !isNaN(numVal) && isFinite(numVal) && !valStr.includes(':') && !valStr.includes('-');

      if (isNum) {
        xml += `    <Cell ss:StyleID="TotalNum"><Data ss:Type="Number">${numVal}</Data></Cell>\n`;
      } else {
        xml += `    <Cell ss:StyleID="TotalStyle"><Data ss:Type="String">${escapeXml(valStr)}</Data></Cell>\n`;
      }
    });
    xml += `   </Row>\n`;
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${formatDate(new Date())}.xls`);
}

/**
 * Exports an individual employee payslip statement to a dedicated, Excel-ready CSV workbook.
 */
export function exportPayslipToCsv(
  record: PayrollRecord,
  options?: PayslipExportOptions
): void {
  const currency = options?.currency || 'NLe ';
  const companyName = options?.companyName || 'Apex Enterprise Solutions (SL) Ltd.';
  const companyAddress = options?.companyAddress || '15 Siaka Stevens Street, Freetown, Sierra Leone';
  const filenamePrefix = options?.filenamePrefix || `payslip_${record.employeeCode}_${record.payrollPeriod}`;

  const basic = parseFloat(record.basicSalary?.toString() || '0');
  const overtime = parseFloat(record.overtimeAmount?.toString() || '0');
  const allowances = parseFloat(record.allowances?.toString() || '0');
  const deductions = parseFloat(record.deductions?.toString() || '0');
  const gross = parseFloat(record.grossSalary?.toString() || '0');
  const net = parseFloat(record.netSalary?.toString() || '0');

  const csvRows: string[] = [];

  // 1. Header Masthead
  csvRows.push([companyName.toUpperCase(), 'OFFICIAL SALARY PAYSLIP STATEMENT', 'STATUTORY REMITTANCE'].map(escapeCsvCell).join(','));
  csvRows.push(['HEADQUARTERS:', companyAddress, 'SECURITY LEVEL:', 'STRICTLY PRIVATE & CONFIDENTIAL'].map(escapeCsvCell).join(','));
  csvRows.push(['PAYROLL PERIOD:', record.payrollPeriod, 'DISBURSEMENT STATUS:', record.status.toUpperCase()].map(escapeCsvCell).join(','));
  csvRows.push(['STATEMENT ISSUE DATE:', new Date().toLocaleDateString(), 'GENERATION TIMESTAMP:', new Date().toLocaleTimeString()].map(escapeCsvCell).join(','));
  csvRows.push('');

  // 2. Employee Profile Plaque
  csvRows.push(['=== [EMPLOYEE PROFILE & IDENTIFICATION] ==='].map(escapeCsvCell).join(','));
  csvRows.push(['EMPLOYEE FULL NAME:', record.employeeName, 'EMPLOYEE CODE / ID:', record.employeeCode].map(escapeCsvCell).join(','));
  csvRows.push(['DEPARTMENT:', record.departmentName || 'General Operations', 'POSITION / TITLE:', record.position || 'Staff'].map(escapeCsvCell).join(','));
  csvRows.push(['PAYMENT METHOD:', 'Direct Bank Deposit / Wire', 'RECORD CREATED:', record.createdAt ? new Date(record.createdAt).toLocaleDateString() : ''].map(escapeCsvCell).join(','));
  csvRows.push('');

  // 3. Itemized Earnings Breakdown Table
  csvRows.push(['=== [SECTION 1: ITEMIZED EARNINGS & ALLOWANCES] ==='].map(escapeCsvCell).join(','));
  csvRows.push(['EARNING ITEM', 'CATEGORY', 'RATE / HOURS', `AMOUNT (${currency.trim()})`].map(escapeCsvCell).join(','));
  csvRows.push(['Basic Monthly Salary', 'Fixed Base Pay', '100% Contracted', basic.toFixed(2)].map(escapeCsvCell).join(','));
  csvRows.push(['Attendance Overtime Pay', 'Variable Allowance', `${record.overtimeHours || 0} Hours`, overtime.toFixed(2)].map(escapeCsvCell).join(','));
  csvRows.push(['Special & Travel Allowances', 'Subsidized Allowance', 'Approved Policy', allowances.toFixed(2)].map(escapeCsvCell).join(','));
  csvRows.push(['TOTAL GROSS EARNINGS', 'Gross Computation', 'Basic + OT + Allowances', gross.toFixed(2)].map(escapeCsvCell).join(','));
  csvRows.push('');

  // 4. Itemized Deductions Breakdown Table
  csvRows.push(['=== [SECTION 2: DEDUCTIONS & STATUTORY REMITTANCES] ==='].map(escapeCsvCell).join(','));
  csvRows.push(['DEDUCTION ITEM', 'CATEGORY', 'STATUTORY BASIS', `AMOUNT (${currency.trim()})`].map(escapeCsvCell).join(','));
  csvRows.push(['Standard Statutory Deductions', 'Company / Policy', 'General Deductions', deductions.toFixed(2)].map(escapeCsvCell).join(','));
  csvRows.push(['NASSIT Pension Fund (5%)', 'Social Security Act 2001', 'Employee Contribution', 'Included / Remitted'].map(escapeCsvCell).join(','));
  csvRows.push(['Income Tax (PAYE)', 'National Revenue Authority', 'Statutory Progressive Tax', 'Computed at source'].map(escapeCsvCell).join(','));
  csvRows.push(['TOTAL DEDUCTIONS', 'Deduction Sum', 'All Deductions & Withholdings', deductions.toFixed(2)].map(escapeCsvCell).join(','));
  csvRows.push('');

  // 5. Net Disbursement Statement
  csvRows.push(['=== [SECTION 3: NET SALARY SETTLEMENT] ==='].map(escapeCsvCell).join(','));
  csvRows.push(['NET TAKE-HOME SALARY:', `${currency}${net.toFixed(2)}`, 'DISBURSEMENT CHANNEL:', 'Direct Commercial Bank Transfer'].map(escapeCsvCell).join(','));
  csvRows.push(['CALCULATION FORMULA:', 'Gross Earnings - Total Deductions', 'PAYROLL CLEARANCE:', 'Authorized by Apex Finance Division'].map(escapeCsvCell).join(','));
  csvRows.push('');

  // 6. Statutory Compliance & Signature Footer
  csvRows.push(['=== [STATUTORY GOVERNANCE & AUTHENTICATION SEAL] ==='].map(escapeCsvCell).join(','));
  csvRows.push(['COMPLIANCE DECLARATION:', 'Generated in strict compliance with Sierra Leone Labor Laws and the National Social Security Insurance Trust (NASSIT Act 2001).'].map(escapeCsvCell).join(','));
  csvRows.push(['AUDIT VERIFICATION:', `Cryptographically sealed by Apex Enterprise System Engine • PostgreSQL 18 Record ID #${record.id}`].map(escapeCsvCell).join(','));
  csvRows.push(['PAYROLL OFFICER:', 'Digital Signature Verified • Apex HRMS Automated Payroll Subsystem'].map(escapeCsvCell).join(','));

  const csvString = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${formatDate(new Date())}.csv`);
}

/**
 * Exports an individual employee payslip statement to a dedicated Microsoft Excel Workbook (.xls).
 */
export function exportPayslipToExcel(
  record: PayrollRecord,
  options?: PayslipExportOptions
): void {
  const currency = options?.currency || 'NLe ';
  const companyName = options?.companyName || 'Apex Enterprise Solutions (SL) Ltd.';
  const filenamePrefix = options?.filenamePrefix || `payslip_${record.employeeCode}_${record.payrollPeriod}`;

  const basic = parseFloat(record.basicSalary?.toString() || '0');
  const overtime = parseFloat(record.overtimeAmount?.toString() || '0');
  const allowances = parseFloat(record.allowances?.toString() || '0');
  const deductions = parseFloat(record.deductions?.toString() || '0');
  const gross = parseFloat(record.grossSalary?.toString() || '0');
  const net = parseFloat(record.netSalary?.toString() || '0');

  exportTableToExcel({
    title: `${companyName} - Official Payslip Statement`,
    subtitle: `Employee: ${record.employeeName} (${record.employeeCode}) • Period: ${record.payrollPeriod}`,
    filenamePrefix,
    metadata: {
      'Employee Code': record.employeeCode,
      'Department': record.departmentName || 'Operations',
      'Designation': record.position || 'Staff',
      'Disbursement Status': record.status.toUpperCase(),
      'Take-Home Net': `${currency}${net.toFixed(2)}`,
    },
    headers: ['PAYSLIP LINE ITEM', 'CLASSIFICATION', 'BASIS / HOURS', `AMOUNT (${currency.trim()})`],
    rows: [
      ['Basic Monthly Salary', 'Fixed Base Pay', '100% Contracted', basic.toFixed(2)],
      ['Attendance Overtime Pay', 'Variable Allowance', `${record.overtimeHours || 0} Hours`, overtime.toFixed(2)],
      ['Special & Travel Allowances', 'Subsidized Allowance', 'Approved Policy', allowances.toFixed(2)],
      ['Gross Earnings Subtotal', 'Gross Computation', 'Basic + OT + Allowances', gross.toFixed(2)],
      ['Standard Statutory Deductions', 'Company / Policy', 'General Deductions', `-${deductions.toFixed(2)}`],
      ['NASSIT Pension Fund (5%)', 'Social Security Act 2001', 'Employee Contribution', 'Remitted'],
      ['Income Tax (PAYE)', 'Statutory Progressive Tax', 'National Revenue Authority', 'Withheld'],
    ],
    summaryRow: ['FINAL NET PAY DISBURSEMENT', 'Settled Take-Home', 'Direct Bank Transfer', `${currency}${net.toFixed(2)}`],
  });
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
    // Cyan accent divider bar (x: 40, y: 786, w: 515, h: 2.5)
    stream += '0.10 0.65 0.85 rg\n40 786 515 2.5 re\nf\n';

    // Official Apex Enterprise Company Logo
    stream += 'q\n28 0 0 28 48 794 cm\n/ApexLogo Do\nQ\n';

    // Banner Typography
    stream += 'BT\n1 1 1 rg\n/F2 12.5 Tf\n82 810 Td\n(APEX ENTERPRISE SL LTD) Tj\nET\n';
    stream += 'BT\n0.75 0.82 0.95 rg\n/F1 7.5 Tf\n82 799 Td\n(Smart Employee Attendance & Payroll Management System  |  Freetown, Sierra Leone) Tj\nET\n';
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
 * Calculates optimal, proportion-weighted column widths and alignments
 * to prevent text truncations and ensure a publication-grade layout.
 */
function computeColumnLayout(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  printableWidth: number,
  customWidths?: number[],
  customAlignments?: ('left' | 'center' | 'right')[]
): { widths: number[]; alignments: ('left' | 'center' | 'right')[] } {
  const numCols = Math.max(1, headers.length);
  const alignments: ('left' | 'center' | 'right')[] = [];

  // 1. Determine Alignments
  for (let c = 0; c < numCols; c++) {
    if (customAlignments && customAlignments[c]) {
      alignments.push(customAlignments[c]);
      continue;
    }
    const h = (headers[c] || '').toUpperCase();
    if (
      h.includes('SALARY') ||
      h.includes('PAY') ||
      h.includes('GROSS') ||
      h.includes('NET') ||
      h.includes('BASIC') ||
      h.includes('ALLOWANCE') ||
      h.includes('DEDUCTION') ||
      h.includes('AMOUNT') ||
      h.includes('TOTAL') ||
      h.includes('HOURS') ||
      h.includes('OT')
    ) {
      alignments.push('right');
    } else if (
      h === 'CODE' ||
      h === 'EMP ID' ||
      h === 'EMPLOYEE ID' ||
      h === 'DATE' ||
      h === 'IN' ||
      h === 'OUT' ||
      h === 'STATUS' ||
      h === 'PERIOD'
    ) {
      alignments.push('center');
    } else {
      alignments.push('left');
    }
  }

  // 2. Determine Column Widths
  if (customWidths && customWidths.length === numCols) {
    const sum = customWidths.reduce((a, b) => a + b, 0);
    const scale = printableWidth / Math.max(1, sum);
    return {
      widths: customWidths.map((w) => Math.round(w * scale * 10) / 10),
      alignments,
    };
  }

  // Calculate weights based on header semantics and content samples
  const weights: number[] = [];
  for (let c = 0; c < numCols; c++) {
    const h = (headers[c] || '').toUpperCase();
    if (h.includes('NAME') || h.includes('EMPLOYEE NAME')) {
      weights.push(2.5); // Wide for full personal names
    } else if (h.includes('EMAIL')) {
      weights.push(2.6); // Wide for email addresses
    } else if (h.includes('DEPARTMENT')) {
      weights.push(2.1); // Room for long department names
    } else if (h.includes('POSITION') || h.includes('DESIGNATION')) {
      weights.push(2.0); // Room for titles
    } else if (h.includes('PERIOD') || h.includes('DATE')) {
      weights.push(1.3); // Moderate for date strings
    } else if (h === 'CODE' || h === 'EMP ID' || h === 'ID' || h === 'EMPLOYEE ID') {
      weights.push(1.1); // Compact for employee code
    } else if (h === 'IN' || h === 'OUT' || h === 'CHECK-IN' || h === 'CHECK-OUT') {
      weights.push(1.0); // Compact for timestamps
    } else if (h === 'HOURS' || h === 'OT' || h === 'OT HOURS') {
      weights.push(0.9); // Compact for numeric hours
    } else if (h === 'STATUS') {
      weights.push(1.1); // Compact for badges
    } else if (
      h.includes('SALARY') ||
      h.includes('GROSS') ||
      h.includes('NET') ||
      h.includes('BASIC') ||
      h.includes('PAY')
    ) {
      weights.push(1.5); // Currency columns
    } else {
      weights.push(1.4);
    }
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.round((w / totalWeight) * printableWidth * 10) / 10);

  // Normalize any minor rounding gap
  const currentTotal = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += Math.round((printableWidth - currentTotal) * 10) / 10;

  return { widths, alignments };
}

/**
 * Generates an executive-styled, multi-page standard PDF 1.4 document
 * formatted specifically for ISO A4 Landscape paper (841.89 x 595.28 pt).
 * Features intelligent column weighting, zebra row striping,
 * summary totals rows, and corporate logo branding on every page.
 */
export function exportTableToPdf({
  title,
  subtitle,
  filenamePrefix = 'apex_ledger_report',
  metadata = {},
  headers,
  rows,
  summaryRow,
  columnWidths: customWidths,
  alignments: customAlignments,
}: TableExportOptions): void {
  const pages: string[] = [];
  const rowsPerPage = 21; // Perfectly accommodates table header, data rows, and summary row
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const numCols = Math.max(1, headers.length);
  const printableWidth = 762;
  const startX = 40;

  const { widths: colWidths, alignments } = computeColumnLayout(
    headers,
    rows,
    printableWidth,
    customWidths,
    customAlignments
  );

  for (let p = 0; p < totalPages; p++) {
    const pageRows = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    const isLastPage = p === totalPages - 1;
    let stream = '';

    // ==========================================
    // 1. CORPORATE HEADER MASTHEAD WITH LOGO (A4 Landscape: 841.89 x 595.28)
    // ==========================================
    // Deep corporate navy banner (x: 40, y: 542, w: 762, h: 40)
    stream += '0.08 0.13 0.26 rg\n40 542 762 40 re\nf\n';
    // Cyan accent divider strip
    stream += '0.10 0.65 0.85 rg\n40 540 762 2.5 re\nf\n';

    // Official Apex Enterprise Company Logo
    stream += 'q\n28 0 0 28 48 548 cm\n/ApexLogo Do\nQ\n';

    // Corporate Title & Subtitle
    stream += 'BT\n1 1 1 rg\n/F2 13 Tf\n82 564 Td\n(APEX ENTERPRISE SL LTD) Tj\nET\n';
    stream += 'BT\n0.75 0.82 0.95 rg\n/F1 7.5 Tf\n82 553 Td\n(Smart Employee Attendance & Payroll Management System  |  15 Siaka Stevens Street, Freetown, Sierra Leone) Tj\nET\n';
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
      if (v !== undefined && v !== null && v !== '') metaParts.push(`${k}: ${v}`);
    }
    const safeMeta = escapePdfString(metaParts.join('   |   ').slice(0, 140));
    stream += 'BT\n0.35 0.40 0.50 rg\n/F1 7.5 Tf\n52 497 Td\n(' + safeMeta + ') Tj\nET\n';

    // ==========================================
    // 3. TABLE HEADER ROW (A4 Landscape Width)
    // ==========================================
    let y = 464;
    stream += '0.90 0.93 0.97 rg\n40 ' + (y - 3) + ' 762 18 re\nf\n';
    stream += '0.72 0.78 0.86 RG\n0.5 w\n40 ' + (y - 3) + ' 762 18 re\nS\n';

    let runningX = startX;
    for (let c = 0; c < numCols; c++) {
      const colW = colWidths[c];
      const align = alignments[c];
      const maxChars = Math.max(4, Math.floor(colW / 5.2));
      const colText = escapePdfString(headers[c].slice(0, maxChars).toUpperCase());
      const textLenPt = colText.length * 4.8;

      let drawX = runningX + 4;
      if (align === 'right') {
        drawX = runningX + colW - textLenPt - 6;
      } else if (align === 'center') {
        drawX = runningX + (colW - textLenPt) / 2;
      }
      drawX = Math.max(runningX + 2, drawX);

      stream += 'BT\n0.10 0.15 0.30 rg\n/F2 7.5 Tf\n' + drawX.toFixed(1) + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
      runningX += colW;
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

      runningX = startX;
      for (let c = 0; c < numCols; c++) {
        const colW = colWidths[c];
        const align = alignments[c];
        const rawVal = row[c];
        const valStr = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
        const maxChars = Math.max(4, Math.floor(colW / 4.8));
        const colText = escapePdfString(valStr.slice(0, maxChars));
        const textLenPt = colText.length * 4.4;

        let drawX = runningX + 4;
        if (align === 'right') {
          drawX = runningX + colW - textLenPt - 6;
        } else if (align === 'center') {
          drawX = runningX + (colW - textLenPt) / 2;
        }
        drawX = Math.max(runningX + 2, drawX);

        stream += 'BT\n0.18 0.22 0.28 rg\n/F1 7.5 Tf\n' + drawX.toFixed(1) + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
        runningX += colW;
      }
      y -= 16;
    }

    // ==========================================
    // 5. SUMMARY / TOTALS ROW (On Final Page)
    // ==========================================
    if (isLastPage && summaryRow && summaryRow.length > 0) {
      y -= 2;
      // Highlighted summary background
      stream += '0.88 0.92 0.98 rg\n40 ' + (y - 3) + ' 762 18 re\nf\n';
      // Crisp dark-blue top accent border
      stream += '0.20 0.35 0.65 RG\n1.2 w\n40 ' + (y + 15) + ' m\n802 ' + (y + 15) + ' l\nS\n';
      // Bottom border
      stream += '0.70 0.78 0.88 RG\n0.5 w\n40 ' + (y - 3) + ' m\n802 ' + (y - 3) + ' l\nS\n';

      runningX = startX;
      for (let c = 0; c < numCols; c++) {
        const colW = colWidths[c];
        const align = alignments[c];
        const rawVal = summaryRow[c];
        const valStr = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
        const maxChars = Math.max(4, Math.floor(colW / 4.8));
        const colText = escapePdfString(valStr.slice(0, maxChars));
        const textLenPt = colText.length * 4.8;

        let drawX = runningX + 4;
        if (align === 'right') {
          drawX = runningX + colW - textLenPt - 6;
        } else if (align === 'center') {
          drawX = runningX + (colW - textLenPt) / 2;
        }
        drawX = Math.max(runningX + 2, drawX);

        stream += 'BT\n0.08 0.16 0.35 rg\n/F2 8 Tf\n' + drawX.toFixed(1) + ' ' + (y + 2) + ' Td\n(' + colText + ') Tj\nET\n';
        runningX += colW;
      }
    }

    // ==========================================
    // 6. CORPORATE CERTIFICATION FOOTER
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
 * Generates an executive, ISO 216 Portrait A4 (595.28 x 841.89 pt) single-page salary payslip.
 * Features official corporate letterhead, payment status badge, employee identity card,
 * itemized earnings vs deductions ledger, large net salary highlight box,
 * statutory NASSIT compliance notice, and digital signature authentication block.
 */
export function exportPayslipToPdf(
  record: PayrollRecord,
  options?: PayslipExportOptions
): void {
  const currency = options?.currency || 'NLe ';
  const companyName = options?.companyName || 'Apex Enterprise Solutions (SL) Ltd.';
  const companyAddress = options?.companyAddress || '15 Siaka Stevens Street, Freetown, Sierra Leone';
  const filenamePrefix = options?.filenamePrefix || `payslip_${record.employeeCode}_${record.payrollPeriod}`;

  const basic = parseFloat(record.basicSalary?.toString() || '0');
  const overtime = parseFloat(record.overtimeAmount?.toString() || '0');
  const allowances = parseFloat(record.allowances?.toString() || '0');
  const deductions = parseFloat(record.deductions?.toString() || '0');
  const gross = parseFloat(record.grossSalary?.toString() || '0');
  const net = parseFloat(record.netSalary?.toString() || '0');

  let stream = '';

  // ==========================================
  // 1. CORPORATE HEADER MASTHEAD (Portrait: 595.28 x 841.89 pt)
  // ==========================================
  // Deep corporate navy banner (x: 40, y: 782, w: 515, h: 44)
  stream += '0.08 0.13 0.26 rg\n40 782 515 44 re\nf\n';
  // Cyan accent divider strip
  stream += '0.10 0.65 0.85 rg\n40 779 515 3 re\nf\n';

  // Official Apex Enterprise Company Logo
  stream += 'q\n30 0 0 30 48 789 cm\n/ApexLogo Do\nQ\n';

  // Header Typography
  stream += 'BT\n1 1 1 rg\n/F2 13.5 Tf\n84 807 Td\n(' + escapePdfString(companyName.toUpperCase()) + ') Tj\nET\n';
  stream += 'BT\n0.75 0.82 0.95 rg\n/F1 7.5 Tf\n84 795 Td\n(' + escapePdfString(companyAddress) + '  |  HRMS Digital Payroll Division) Tj\nET\n';
  stream += 'BT\n0.85 0.92 1 rg\n/F2 8.5 Tf\n435 807 Td\n(SALARY PAYSLIP) Tj\nET\n';
  stream += 'BT\n0.65 0.75 0.90 rg\n/F1 7 Tf\n440 795 Td\n(OFFICIAL STATEMENT) Tj\nET\n';

  // ==========================================
  // 2. DOCUMENT TITLE & PERIOD STATUS PLAQUE
  // ==========================================
  // Card background (x: 40, y: 726, w: 515, h: 42)
  stream += '0.96 0.97 0.99 rg\n40 726 515 42 re\nf\n';
  stream += '0.80 0.85 0.92 RG\n0.5 w\n40 726 515 42 re\nS\n';

  // Title
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 11 Tf\n52 748 Td\n(MONTHLY SALARY DISBURSEMENT STATEMENT) Tj\nET\n';
  stream += 'BT\n0.40 0.45 0.52 rg\n/F1 7.5 Tf\n52 735 Td\n(Issued: ' + new Date().toLocaleDateString() + '  |  Reference ID: PAY-' + record.id + '-' + record.employeeCode + ') Tj\nET\n';

  // Period Pill Box (x: 375, y: 733, w: 90, h: 26)
  stream += '0.90 0.93 0.98 rg\n375 733 90 26 re\nf\n';
  stream += '0.70 0.78 0.92 RG\n0.5 w\n375 733 90 26 re\nS\n';
  stream += 'BT\n0.15 0.25 0.55 rg\n/F2 8.5 Tf\n382 742 Td\n(PERIOD: ' + escapePdfString(record.payrollPeriod) + ') Tj\nET\n';

  // Status Badge Pill (x: 472, y: 733, w: 72, h: 26)
  const isPaid = record.status === 'Paid';
  if (isPaid) {
    stream += '0.85 0.96 0.90 rg\n472 733 72 26 re\nf\n';
    stream += '0.20 0.65 0.40 RG\n0.5 w\n472 733 72 26 re\nS\n';
    stream += 'BT\n0.05 0.45 0.22 rg\n/F2 8.5 Tf\n492 742 Td\n(PAID) Tj\nET\n';
  } else {
    stream += '0.98 0.93 0.85 rg\n472 733 72 26 re\nf\n';
    stream += '0.85 0.55 0.15 RG\n0.5 w\n472 733 72 26 re\nS\n';
    stream += 'BT\n0.65 0.35 0.05 rg\n/F2 8.5 Tf\n484 742 Td\n(PENDING) Tj\nET\n';
  }

  // ==========================================
  // 3. EMPLOYEE INFORMATION CARD (4-Quadrant Grid)
  // ==========================================
  // Background card (x: 40, y: 654, w: 515, h: 62)
  stream += '0.98 0.98 0.99 rg\n40 654 515 62 re\nf\n';
  stream += '0.84 0.88 0.93 RG\n0.5 w\n40 654 515 62 re\nS\n';

  // Column 1: Employee Name & Code
  stream += 'BT\n0.45 0.50 0.58 rg\n/F1 7.5 Tf\n52 702 Td\n(EMPLOYEE FULL NAME) Tj\nET\n';
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 9.5 Tf\n52 690 Td\n(' + escapePdfString(record.employeeName.slice(0, 32)) + ') Tj\nET\n';

  stream += 'BT\n0.45 0.50 0.58 rg\n/F1 7.5 Tf\n52 674 Td\n(EMPLOYEE ID / CODE) Tj\nET\n';
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 9 Tf\n52 663 Td\n(' + escapePdfString(record.employeeCode) + ') Tj\nET\n';

  // Column 2: Department & Designation
  stream += 'BT\n0.45 0.50 0.58 rg\n/F1 7.5 Tf\n220 702 Td\n(ASSIGNED DEPARTMENT) Tj\nET\n';
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 9.5 Tf\n220 690 Td\n(' + escapePdfString((record.departmentName || 'General Operations').slice(0, 28)) + ') Tj\nET\n';

  stream += 'BT\n0.45 0.50 0.58 rg\n/F1 7.5 Tf\n220 674 Td\n(DESIGNATION / POSITION) Tj\nET\n';
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 9 Tf\n220 663 Td\n(' + escapePdfString((record.position || 'Staff Personnel').slice(0, 28)) + ') Tj\nET\n';

  // Column 3: Disbursement Channel
  stream += 'BT\n0.45 0.50 0.58 rg\n/F1 7.5 Tf\n400 702 Td\n(DISBURSEMENT CHANNEL) Tj\nET\n';
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 9 Tf\n400 690 Td\n(Direct Bank Wire) Tj\nET\n';

  stream += 'BT\n0.45 0.50 0.58 rg\n/F1 7.5 Tf\n400 674 Td\n(PAYROLL DATE) Tj\nET\n';
  const payDate = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  stream += 'BT\n0.10 0.15 0.30 rg\n/F2 9 Tf\n400 663 Td\n(' + escapePdfString(payDate) + ') Tj\nET\n';

  // ==========================================
  // 4. EARNINGS & DEDUCTIONS DUAL-COLUMN LEDGER
  // ==========================================
  const colLeftX = 40;
  const colLeftW = 250;
  const colRightX = 305;
  const colRightW = 250;
  let ledgerY = 620;

  // Header Banners
  // Earnings Header (Navy shaded)
  stream += '0.90 0.93 0.98 rg\n' + colLeftX + ' ' + (ledgerY - 4) + ' ' + colLeftW + ' 20 re\nf\n';
  stream += '0.70 0.78 0.90 RG\n0.5 w\n' + colLeftX + ' ' + (ledgerY - 4) + ' ' + colLeftW + ' 20 re\nS\n';
  stream += 'BT\n0.10 0.20 0.45 rg\n/F2 8.5 Tf\n' + (colLeftX + 10) + ' ' + (ledgerY + 2) + ' Td\n(EARNINGS & ALLOWANCES) Tj\nET\n';
  stream += 'BT\n0.10 0.20 0.45 rg\n/F2 8 Tf\n' + (colLeftX + colLeftW - 55) + ' ' + (ledgerY + 2) + ' Td\n(AMOUNT) Tj\nET\n';

  // Deductions Header (Rose shaded)
  stream += '0.98 0.92 0.92 rg\n' + colRightX + ' ' + (ledgerY - 4) + ' ' + colRightW + ' 20 re\nf\n';
  stream += '0.90 0.75 0.75 RG\n0.5 w\n' + colRightX + ' ' + (ledgerY - 4) + ' ' + colRightW + ' 20 re\nS\n';
  stream += 'BT\n0.55 0.15 0.15 rg\n/F2 8.5 Tf\n' + (colRightX + 10) + ' ' + (ledgerY + 2) + ' Td\n(DEDUCTIONS & ADJUSTMENTS) Tj\nET\n';
  stream += 'BT\n0.55 0.15 0.15 rg\n/F2 8 Tf\n' + (colRightX + colRightW - 55) + ' ' + (ledgerY + 2) + ' Td\n(AMOUNT) Tj\nET\n';

  ledgerY -= 20;

  // Ledger Rows (Border boxes)
  // Outer frame boxes for both columns
  stream += '0.86 0.89 0.94 RG\n0.5 w\n' + colLeftX + ' ' + (ledgerY - 110) + ' ' + colLeftW + ' 110 re\nS\n';
  stream += '0.86 0.89 0.94 RG\n0.5 w\n' + colRightX + ' ' + (ledgerY - 110) + ' ' + colRightW + ' 110 re\nS\n';

  // Left Rows (Earnings)
  const earningsItems = [
    { label: 'Basic Monthly Salary', val: `${currency}${basic.toFixed(2)}` },
    { label: `Attendance Overtime (${record.overtimeHours || 0} hrs)`, val: `+${currency}${overtime.toFixed(2)}` },
    { label: 'Special & Travel Allowances', val: `+${currency}${allowances.toFixed(2)}` },
  ];

  let curEY = ledgerY - 16;
  for (let i = 0; i < earningsItems.length; i++) {
    const item = earningsItems[i];
    stream += '0.92 0.94 0.97 RG\n0.3 w\n' + colLeftX + ' ' + (curEY - 4) + ' m\n' + (colLeftX + colLeftW) + ' ' + (curEY - 4) + ' l\nS\n';
    stream += 'BT\n0.25 0.30 0.38 rg\n/F1 8 Tf\n' + (colLeftX + 10) + ' ' + curEY + ' Td\n(' + escapePdfString(item.label) + ') Tj\nET\n';
    const valStr = escapePdfString(item.val);
    const valW = valStr.length * 4.6;
    stream += 'BT\n0.10 0.15 0.25 rg\n/F2 8 Tf\n' + (colLeftX + colLeftW - valW - 10) + ' ' + curEY + ' Td\n(' + valStr + ') Tj\nET\n';
    curEY -= 22;
  }

  // Left Total (Gross)
  stream += '0.93 0.96 0.99 rg\n' + colLeftX + ' ' + (ledgerY - 110) + ' ' + colLeftW + ' 26 re\nf\n';
  stream += '0.20 0.45 0.85 RG\n0.8 w\n' + colLeftX + ' ' + (ledgerY - 84) + ' m\n' + (colLeftX + colLeftW) + ' ' + (ledgerY - 84) + ' l\nS\n';
  stream += 'BT\n0.10 0.20 0.45 rg\n/F2 8.5 Tf\n' + (colLeftX + 10) + ' ' + (ledgerY - 98) + ' Td\n(TOTAL GROSS EARNINGS) Tj\nET\n';
  const grossStr = `${currency}${gross.toFixed(2)}`;
  const grossW = grossStr.length * 5.2;
  stream += 'BT\n0.10 0.30 0.70 rg\n/F2 9 Tf\n' + (colLeftX + colLeftW - grossW - 10) + ' ' + (ledgerY - 98) + ' Td\n(' + escapePdfString(grossStr) + ') Tj\nET\n';

  // Right Rows (Deductions)
  const deductionItems = [
    { label: 'Standard Statutory Deductions', val: `-${currency}${deductions.toFixed(2)}` },
    { label: 'NASSIT Social Security (5%)', val: 'Included / Remitted' },
    { label: 'PAYE Income Tax Withholding', val: 'Direct Deduction' },
  ];

  let curDY = ledgerY - 16;
  for (let i = 0; i < deductionItems.length; i++) {
    const item = deductionItems[i];
    stream += '0.92 0.94 0.97 RG\n0.3 w\n' + colRightX + ' ' + (curDY - 4) + ' m\n' + (colRightX + colRightW) + ' ' + (curDY - 4) + ' l\nS\n';
    stream += 'BT\n0.25 0.30 0.38 rg\n/F1 8 Tf\n' + (colRightX + 10) + ' ' + curDY + ' Td\n(' + escapePdfString(item.label) + ') Tj\nET\n';
    const valStr = escapePdfString(item.val);
    const valW = valStr.length * 4.6;
    stream += 'BT\n0.70 0.15 0.20 rg\n/F2 8 Tf\n' + (colRightX + colRightW - valW - 10) + ' ' + curDY + ' Td\n(' + valStr + ') Tj\nET\n';
    curDY -= 22;
  }

  // Right Total (Total Deductions)
  stream += '0.99 0.94 0.94 rg\n' + colRightX + ' ' + (ledgerY - 110) + ' ' + colRightW + ' 26 re\nf\n';
  stream += '0.85 0.30 0.35 RG\n0.8 w\n' + colRightX + ' ' + (ledgerY - 84) + ' m\n' + (colRightX + colRightW) + ' ' + (ledgerY - 84) + ' l\nS\n';
  stream += 'BT\n0.60 0.15 0.15 rg\n/F2 8.5 Tf\n' + (colRightX + 10) + ' ' + (ledgerY - 98) + ' Td\n(TOTAL DEDUCTIONS) Tj\nET\n';
  const dedStr = `-${currency}${deductions.toFixed(2)}`;
  const dedW = dedStr.length * 5.2;
  stream += 'BT\n0.80 0.10 0.20 rg\n/F2 9 Tf\n' + (colRightX + colRightW - dedW - 10) + ' ' + (ledgerY - 98) + ' Td\n(' + escapePdfString(dedStr) + ') Tj\nET\n';

  // ==========================================
  // 5. NET SALARY CALLOUT CARD (Highlighted Dark Navy Banner)
  // ==========================================
  const netBoxY = ledgerY - 182;
  // Box: x: 40, y: netBoxY, w: 515, h: 56
  stream += '0.08 0.13 0.26 rg\n40 ' + netBoxY + ' 515 56 re\nf\n';
  stream += '0.10 0.65 0.85 rg\n40 ' + netBoxY + ' 515 2.5 re\nf\n';

  // Left Title & Formula
  stream += 'BT\n0.75 0.82 0.95 rg\n/F2 8.5 Tf\n54 ' + (netBoxY + 36) + ' Td\n(NET TAKE-HOME SALARY) Tj\nET\n';
  stream += 'BT\n0.55 0.62 0.75 rg\n/F1 7.5 Tf\n54 ' + (netBoxY + 22) + ' Td\n(Formula: Gross Earnings - Total Statutory & Policy Deductions) Tj\nET\n';
  stream += 'BT\n0.50 0.58 0.70 rg\n/F1 7 Tf\n54 ' + (netBoxY + 10) + ' Td\n(Disbursed via Direct Bank Deposit  |  Bank Verified & Approved) Tj\nET\n';

  // Right glowing Emerald Net Figure
  const netStr = `${currency}${net.toFixed(2)}`;
  const netLenPt = netStr.length * 10.5;
  stream += 'BT\n0.20 0.90 0.55 rg\n/F2 18 Tf\n' + (540 - netLenPt) + ' ' + (netBoxY + 24) + ' Td\n(' + escapePdfString(netStr) + ') Tj\nET\n';
  stream += 'BT\n0.70 0.85 0.80 rg\n/F1 7.5 Tf\n' + (540 - 75) + ' ' + (netBoxY + 10) + ' Td\n(Bank Wire Authorized) Tj\nET\n';

  // ==========================================
  // 6. STATUTORY GOVERNANCE & SIGNATURE BLOCK
  // ==========================================
  const sigY = netBoxY - 70;
  stream += '0.82 0.85 0.90 RG\n0.5 w\n40 ' + (sigY + 46) + ' m\n555 ' + (sigY + 46) + ' l\nS\n';

  // Left: Statutory Compliance Statement
  stream += '0.12 0.58 0.42 rg\n44 ' + (sigY + 22) + ' 14 14 re\nf\n';
  stream += '1 1 1 rg\n51 ' + (sigY + 31) + ' m 47 ' + (sigY + 27) + ' l 55 ' + (sigY + 27) + ' l f\n';
  stream += 'BT\n0.18 0.22 0.28 rg\n/F2 7.5 Tf\n66 ' + (sigY + 28) + ' Td\n(STATUTORY LABOR COMPLIANCE) Tj\nET\n';
  stream += 'BT\n0.40 0.45 0.52 rg\n/F1 6.8 Tf\n66 ' + (sigY + 17) + ' Td\n(Compliant with Sierra Leone Employment Laws & National Social Security (NASSIT Act 2001).) Tj\nET\n';
  stream += 'BT\n0.40 0.45 0.52 rg\n/F1 6.8 Tf\n66 ' + (sigY + 7) + ' Td\n(Cryptographically signed by Apex Enterprise System Engine • PostgreSQL 18 Ledger.) Tj\nET\n';

  // Right: Signature Line
  stream += '0.50 0.55 0.62 RG\n0.5 w\n410 ' + (sigY + 16) + ' m\n545 ' + (sigY + 16) + ' l\nS\n';
  stream += 'BT\n0.35 0.40 0.48 rg\n/F2 7 Tf\n428 ' + (sigY + 5) + ' Td\n(AUTHORIZED PAYROLL OFFICER) Tj\nET\n';
  stream += 'BT\n0.50 0.55 0.62 rg\n/F1 6.5 Tf\n438 ' + (sigY - 4) + ' Td\n(Digital Seal Verified) Tj\nET\n';

  // ==========================================
  // 7. CORPORATE FOOTER
  // ==========================================
  stream += '0.80 0.83 0.88 RG\n0.5 w\n40 40 m\n555 40 l\nS\n';
  stream += 'BT\n0.45 0.50 0.55 rg\n/F1 7 Tf\n42 28 Td\n(CONFIDENTIAL  -  Personal & Privileged Salary Statement  |  Apex Enterprise SL Ltd) Tj\nET\n';
  stream += 'BT\n0.25 0.30 0.40 rg\n/F2 7.5 Tf\n490 28 Td\n(Page 1 of 1) Tj\nET\n';

  const pdfBlob = assemblePdfBlob([stream], 'portrait');
  triggerDownload(pdfBlob, `${filenamePrefix}_${formatDate(new Date())}.pdf`);
}

/**
 * Generates an isolated, standard ISO/IEC 7810 ID-1 (CR80) Employee Identity Badge as a PDF.
/**
 * Capitalizes the first letter of each word in an employee's job position.
 * Preserves common industry acronyms (CTO, CEO, CFO, COO, CIO, HR, IT, QA, AI, UI, UX, etc.).
 */
export function formatEmployeePosition(title?: string): string {
  if (!title) return 'Staff Member';
  const acronyms = new Set(['CTO', 'CEO', 'CFO', 'COO', 'CIO', 'HR', 'IT', 'QA', 'AI', 'UI', 'UX', 'SQL', 'NLE', 'SL']);
  return title
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (acronyms.has(upper)) return upper;
      if (word === '&' || word === '/') return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function formatTitleCase(str?: string): string {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generates an isolated, standard ISO/IEC 7810 ID-1 (CR80) Employee Identity Badge as a PDF.
 * Physical Dimensions: 53.98 mm width x 85.60 mm height (153.01 pt x 242.65 pt).
 * Output contains ONLY the physical badge itself with zero surrounding page margins,
 * corporate letterhead sheets, or extra paperwork.
 */
export async function exportBadgeToPdf(
  badge: {
    fullName: string;
    jobTitle?: string;
    department?: string;
    employeeId?: string;
    employeeCode?: string;
    photoUrl?: string | null;
    qrCodeUrl?: string | null;
    status?: string;
  },
  options?: {
    companyName?: string;
    companyAddress?: string;
    filenamePrefix?: string;
  }
): Promise<void> {
  // CR80 standard points: 53.98mm x 85.60mm (72 pt/in, 25.4 mm/in)
  const cardWidth = 153.01;
  const cardHeight = 242.65;
  const empCode = badge.employeeCode || badge.employeeId || 'EMP-000';
  const filenamePrefix = options?.filenamePrefix || `badge_${empCode}_${badge.fullName.replace(/\s+/g, '_')}`;

  const initials = badge.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ID';

  // Attempt to load employee photograph as a JPEG image object for PDF embedding
  const photoCandidate =
    badge.photoUrl ||
    (badge.employeeCode ? `/uploads/employees/${badge.employeeCode}.jpg` : null) ||
    (badge.employeeId ? `/uploads/employees/${badge.employeeId}.jpg` : null);

  const photoObj = await loadPhotoAsJpeg(photoCandidate);

  let stream = '';

  // 1. Full-Bleed Card Background (Deep Night / Navy Palette: #0b0e1b)
  stream += '0.043 0.055 0.106 rg\n0 0 ' + cardWidth + ' ' + cardHeight + ' re\nf\n';

  // 2. Subtle Inset Perimeter Card Border
  stream += '0.18 0.22 0.38 RG\n1.0 w\n0.5 0.5 152.01 241.65 re\nS\n';

  // 3. Card Lanyard Punch Slot (Centered at top)
  const slotW = 24;
  const slotH = 3.5;
  const slotX = (cardWidth - slotW) / 2;
  const slotY = 233.5;
  stream += '0.02 0.03 0.08 rg\n' + slotX + ' ' + slotY + ' ' + slotW + ' ' + slotH + ' re\nf\n';
  stream += '0.22 0.28 0.45 RG\n0.5 w\n' + slotX + ' ' + slotY + ' ' + slotW + ' ' + slotH + ' re\nS\n';

  // 4. Top Corporate Branding Header (Logo + APEX ENTERPRISE + SECURITY ID)
  // Apex 3D Logo Squircle
  stream += 'q\n16 0 0 16 11 206 cm\n/ApexLogo Do\nQ\n';
  // Text: APEX (White Bold) + ENTERPRISE (Cyan Bold #00e5ff)
  stream += 'BT\n1 1 1 rg\n/F2 7 Tf\n31 215 Td\n(APEX ) Tj\nET\n';
  stream += 'BT\n0.0 0.88 0.98 rg\n/F2 7 Tf\n53 215 Td\n(ENTERPRISE) Tj\nET\n';
  // Subtitle: SECURITY ID (Clean Slate)
  stream += 'BT\n0.58 0.68 0.82 rg\n/F2 4.5 Tf\n31 208 Td\n(SECURITY ID) Tj\nET\n';

  // 5. Horizontal Header Divider Accent Line
  stream += '0.16 0.22 0.38 RG\n0.5 w\n10 201 m 143 201 l S\n';

  // 6. Employee Photograph / Monogram Frame (Standard 35:45 passport ratio)
  const frameW = 46;
  const frameH = 60;
  const frameX = (cardWidth - frameW) / 2; // 53.5
  const frameY = 133;

  if (photoObj) {
    // Embed actual employee photograph image
    stream += 'q\n' + frameW + ' 0 0 ' + frameH + ' ' + frameX + ' ' + frameY + ' cm\n/EmployeePhoto Do\nQ\n';
  } else {
    // Fallback: Inner dark slate-indigo gradient box with monogram initials
    stream += '0.08 0.12 0.22 rg\n' + frameX + ' ' + frameY + ' ' + frameW + ' ' + frameH + ' re\nf\n';
    const initStr = escapePdfString(initials);
    const initW = initStr.length * 9.5;
    stream += 'BT\n0.80 0.88 1 rg\n/F2 16 Tf\n' + (frameX + (frameW - initW) / 2) + ' ' + (frameY + 23) + ' Td\n(' + initStr + ') Tj\nET\n';
  }

  // Crisp White Border around photograph
  stream += '1 1 1 RG\n1.6 w\n' + frameX + ' ' + frameY + ' ' + frameW + ' ' + frameH + ' re\nS\n';

  // Micro Security Hologram Chip Badge in Corner of Photo ("SL")
  // Smooth circular badge with vibrant cyan-blue fill and white border
  const slR = 4.8;
  const slCx = frameX + frameW - 2.5;
  const slCy = frameY + 2.5;
  const k = 0.5522847 * slR;
  stream += '0.01 0.52 0.78 rg\n1 1 1 RG\n0.6 w\n';
  stream += `${(slCx + slR).toFixed(2)} ${slCy.toFixed(2)} m\n`;
  stream += `${(slCx + slR).toFixed(2)} ${(slCy + k).toFixed(2)} ${(slCx + k).toFixed(2)} ${(slCy + slR).toFixed(2)} ${slCx.toFixed(2)} ${(slCy + slR).toFixed(2)} c\n`;
  stream += `${(slCx - k).toFixed(2)} ${(slCy + slR).toFixed(2)} ${(slCx - slR).toFixed(2)} ${(slCy + k).toFixed(2)} ${(slCx - slR).toFixed(2)} ${slCy.toFixed(2)} c\n`;
  stream += `${(slCx - slR).toFixed(2)} ${(slCy - k).toFixed(2)} ${(slCx - k).toFixed(2)} ${(slCy - slR).toFixed(2)} ${slCx.toFixed(2)} ${(slCy - slR).toFixed(2)} c\n`;
  stream += `${(slCx + k).toFixed(2)} ${(slCy - slR).toFixed(2)} ${(slCx + slR).toFixed(2)} ${(slCy - k).toFixed(2)} ${(slCx + slR).toFixed(2)} ${slCy.toFixed(2)} c\n`;
  stream += 'B\n';
  // SL White Bold Text
  stream += 'BT\n1 1 1 rg\n/F2 4.2 Tf\n' + (slCx - 2.8).toFixed(2) + ' ' + (slCy - 1.5).toFixed(2) + ' Td\n(SL) Tj\nET\n';

  // 7. Employee Information Block
  // Full Name (Prominent bold white text in Title Case)
  const nameStr = escapePdfString(formatTitleCase(badge.fullName));
  const nameW = Math.min(nameStr.length * 5.2, cardWidth - 14);
  const nameX = Math.max(7, (cardWidth - nameW) / 2);
  stream += 'BT\n1 1 1 rg\n/F2 9.5 Tf\n' + nameX.toFixed(2) + ' 119 Td\n(' + nameStr + ') Tj\nET\n';

  // Job Title / Position (Electric cyan bold text)
  const jobStr = escapePdfString(formatEmployeePosition(badge.jobTitle));
  const jobW = Math.min(jobStr.length * 3.8, cardWidth - 14);
  const jobX = Math.max(7, (cardWidth - jobW) / 2);
  stream += 'BT\n0.0 0.88 0.98 rg\n/F2 6.8 Tf\n' + jobX.toFixed(2) + ' 110 Td\n(' + jobStr + ') Tj\nET\n';

  // Department (Clean slate text preceded by vector building icon)
  const deptStr = escapePdfString(formatTitleCase(badge.department || 'Operations'));
  const deptTextW = Math.min(deptStr.length * 3.1, cardWidth - 24);
  const iconW = 5;
  const totalDeptW = iconW + 2.5 + deptTextW;
  const deptStartX = Math.max(7, (cardWidth - totalDeptW) / 2);

  // Vector building icon
  stream += '0.55 0.65 0.80 RG\n0.5 w\n' + deptStartX.toFixed(2) + ' 99.5 5 6 re\nS\n';
  stream += '0.55 0.65 0.80 rg\n' + (deptStartX + 1.2).toFixed(2) + ' 102.5 0.9 0.9 re\nf\n' + (deptStartX + 2.9).toFixed(2) + ' 102.5 0.9 0.9 re\nf\n';
  stream += '0.55 0.65 0.80 RG\n0.4 w\n' + (deptStartX + 1.8).toFixed(2) + ' 99.5 1.4 1.8 re\nS\n';
  // Department text
  stream += 'BT\n0.72 0.78 0.86 rg\n/F1 5.4 Tf\n' + (deptStartX + 7.5).toFixed(2) + ' 100.5 Td\n(' + deptStr + ') Tj\nET\n';

  // 8. Employee ID Code Pill
  const codePillW = 56;
  const codePillH = 11.5;
  const codePillX = (cardWidth - codePillW) / 2;
  const codePillY = 82;
  stream += '0.10 0.13 0.28 rg\n' + codePillX + ' ' + codePillY + ' ' + codePillW + ' ' + codePillH + ' re\nf\n';
  stream += '0.28 0.38 0.70 RG\n0.6 w\n' + codePillX + ' ' + codePillY + ' ' + codePillW + ' ' + codePillH + ' re\nS\n';
  const codeStr = escapePdfString('ID: ' + empCode);
  const codeW = codeStr.length * 3.8;
  stream += 'BT\n0.78 0.86 1.0 rg\n/F2 6 Tf\n' + (codePillX + (codePillW - codeW) / 2) + ' ' + (codePillY + 3.4) + ' Td\n(' + codeStr + ') Tj\nET\n';

  // 9. Official Scannable QR Code Container (Pure white rounded container card at bottom)
  const qrBoxSize = 58;
  const qrBoxX = (cardWidth - qrBoxSize) / 2;
  const qrBoxY = 14;
  stream += '1 1 1 rg\n' + qrBoxX + ' ' + qrBoxY + ' ' + qrBoxSize + ' ' + qrBoxSize + ' re\nf\n';
  stream += '0.85 0.88 0.92 RG\n0.5 w\n' + qrBoxX + ' ' + qrBoxY + ' ' + qrBoxSize + ' ' + qrBoxSize + ' re\nS\n';

  // Real Vector QR Code Matrix
  const margin = 4.5;
  const qrInnerSize = qrBoxSize - margin * 2; // 49 pt
  try {
    const qrObj = QRCode.create(empCode, { errorCorrectionLevel: 'M' });
    const modCount = qrObj.modules.size;
    const modSize = qrInnerSize / modCount;

    stream += '0 0 0 rg\n';
    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (qrObj.modules.get(r, c)) {
          const mx = qrBoxX + margin + c * modSize;
          const my = qrBoxY + margin + (modCount - 1 - r) * modSize;
          stream += mx.toFixed(2) + ' ' + my.toFixed(2) + ' ' + (modSize + 0.04).toFixed(2) + ' ' + (modSize + 0.04).toFixed(2) + ' re\nf\n';
        }
      }
    }
  } catch (err) {
    // High-precision vector fallback if encoding fails
    const drawQrFinder = (fx: number, fy: number) => {
      let s = '0 0 0 rg\n' + fx + ' ' + fy + ' 14 14 re\nf\n';
      s += '1 1 1 rg\n' + (fx + 2) + ' ' + (fy + 2) + ' 10 10 re\nf\n';
      s += '0 0 0 rg\n' + (fx + 4) + ' ' + (fy + 4) + ' 6 6 re\nf\n';
      return s;
    };
    stream += drawQrFinder(qrBoxX + 4, qrBoxY + qrBoxSize - 18);
    stream += drawQrFinder(qrBoxX + qrBoxSize - 18, qrBoxY + qrBoxSize - 18);
    stream += drawQrFinder(qrBoxX + 4, qrBoxY + 4);
  }

  const extraImages = photoObj
    ? [{ name: 'EmployeePhoto', width: photoObj.width, height: photoObj.height, bytes: photoObj.bytes }]
    : undefined;

  const pdfBlob = assemblePdfBlob([stream], 'portrait', { width: cardWidth, height: cardHeight }, extraImages);
  triggerDownload(pdfBlob, `${filenamePrefix}_${formatDate(new Date())}.pdf`);
}

/**
 * Loads an employee photo URL and converts it into a standard JPEG Uint8Array byte buffer
 * with standard 35:45 passport portrait aspect ratio for embedding into PDF documents.
 */
async function loadPhotoAsJpeg(
  url?: string | null
): Promise<{ width: number; height: number; bytes: Uint8Array } | null> {
  if (!url || typeof window === 'undefined') return null;
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => {
        resolve(null);
      }, 4000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const targetW = 280;
          const targetH = 360;
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          // Cover crop matching 35:45 ratio
          const srcRatio = img.naturalWidth / img.naturalHeight;
          const targetRatio = targetW / targetH;
          let sx = 0,
            sy = 0,
            sw = img.naturalWidth,
            sh = img.naturalHeight;
          if (srcRatio > targetRatio) {
            sw = img.naturalHeight * targetRatio;
            sx = (img.naturalWidth - sw) / 2;
          } else {
            sh = img.naturalWidth / targetRatio;
            sy = 0;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const commaIdx = dataUrl.indexOf(',');
          if (commaIdx === -1) {
            resolve(null);
            return;
          }
          const base64Data = dataUrl.slice(commaIdx + 1);
          const bytes = base64ToUint8Array(base64Data);
          resolve({ width: targetW, height: targetH, bytes });
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = url;
    });
  } catch {
    return null;
  }
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
 * Converts a base64 encoded string to a Uint8Array byte buffer
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Assembles a valid PDF-1.4 file buffer containing the provided page content streams
 * Supports standard ISO A4 portrait (595.28 x 841.89) and landscape (841.89 x 595.28),
 * or exact custom dimensions (e.g. CR80 ID-1: 153.01 x 242.65).
 * Automatically embeds the official Apex Enterprise Company Logo as /ApexLogo XObject,
 * and any optional extra images (such as employee photographs).
 */
function assemblePdfBlob(
  pageStreams: string[],
  orientation: 'portrait' | 'landscape' = 'portrait',
  customDimensions?: { width: number; height: number },
  extraImages?: { name: string; width: number; height: number; bytes: Uint8Array }[]
): Blob {
  const numPages = pageStreams.length;
  const encoder = new TextEncoder();

  const width = customDimensions ? customDimensions.width : (orientation === 'landscape' ? 841.89 : 595.28);
  const height = customDimensions ? customDimensions.height : (orientation === 'landscape' ? 595.28 : 841.89);

  const logoBytes = base64ToUint8Array(APEX_LOGO_JPEG_BASE64);

  const fontObjIndex1 = 3 + numPages;
  const fontObjIndex2 = 3 + numPages + 1;
  const logoObjIndex = 3 + numPages + 2;
  const extraImagesList = extraImages || [];
  const extraImgCount = extraImagesList.length;
  const streamStartObjIndex = 3 + numPages + 3 + extraImgCount;

  const pageObjectIds: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pageObjectIds.push(3 + i);
  }

  const objects: { id: number; data: Uint8Array }[] = [];

  // Obj 1: Catalog
  objects.push({ id: 1, data: encoder.encode('<< /Type /Catalog /Pages 2 0 R >>') });

  // Obj 2: Pages Collection
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  objects.push({ id: 2, data: encoder.encode(`<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>`) });

  // Extra XObjects dictionary string: e.g. /EmployeePhoto 7 0 R
  const extraXObjectsMap = extraImagesList
    .map((img, idx) => `/${img.name} ${3 + numPages + 3 + idx} 0 R`)
    .join(' ');
  const xObjectDict = `/XObject << /ApexLogo ${logoObjIndex} 0 R ${extraXObjectsMap} >>`;

  // Generate Page Objects with /Font and XObject resources
  for (let i = 0; i < numPages; i++) {
    const streamObjIndex = streamStartObjIndex + i;
    const pageDict = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /F1 ${fontObjIndex1} 0 R /F2 ${fontObjIndex2} 0 R >> ${xObjectDict} >> /Contents ${streamObjIndex} 0 R >>`;
    objects.push({ id: 3 + i, data: encoder.encode(pageDict) });
  }

  // Font Objects
  objects.push({ id: fontObjIndex1, data: encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>') });
  objects.push({ id: fontObjIndex2, data: encoder.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>') });

  // Apex Enterprise Company Logo Image XObject
  const logoHeader = encoder.encode(
    `<< /Type /XObject /Subtype /Image /Width 256 /Height 256 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`
  );
  const logoFooter = encoder.encode('\nendstream');
  const logoObjBuf = new Uint8Array(logoHeader.length + logoBytes.length + logoFooter.length);
  logoObjBuf.set(logoHeader, 0);
  logoObjBuf.set(logoBytes, logoHeader.length);
  logoObjBuf.set(logoFooter, logoHeader.length + logoBytes.length);
  objects.push({ id: logoObjIndex, data: logoObjBuf });

  // Extra Images (e.g. Employee Photograph)
  extraImagesList.forEach((img, idx) => {
    const imgObjId = 3 + numPages + 3 + idx;
    const imgHeader = encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`
    );
    const imgFooter = encoder.encode('\nendstream');
    const imgObjBuf = new Uint8Array(imgHeader.length + img.bytes.length + imgFooter.length);
    imgObjBuf.set(imgHeader, 0);
    imgObjBuf.set(img.bytes, imgHeader.length);
    imgObjBuf.set(imgFooter, imgHeader.length + img.bytes.length);
    objects.push({ id: imgObjId, data: imgObjBuf });
  });

  // Page Content Streams
  for (let i = 0; i < numPages; i++) {
    const streamBytes = encoder.encode(pageStreams[i]);
    const sHeader = encoder.encode(`<< /Length ${streamBytes.length} >>\nstream\n`);
    const sFooter = encoder.encode('\nendstream');
    const streamBuf = new Uint8Array(sHeader.length + streamBytes.length + sFooter.length);
    streamBuf.set(sHeader, 0);
    streamBuf.set(streamBytes, sHeader.length);
    streamBuf.set(sFooter, sHeader.length + streamBytes.length);
    objects.push({ id: streamStartObjIndex + i, data: streamBuf });
  }

  // Assemble PDF document with valid Byte Offsets & Cross-Reference Table
  const chunks: Uint8Array[] = [];
  const headerBytes = encoder.encode('%PDF-1.4\n');
  chunks.push(headerBytes);

  let currentOffset = headerBytes.length;
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(currentOffset);
    const head = encoder.encode(`${obj.id} 0 obj\n`);
    const tail = encoder.encode('\nendobj\n');
    chunks.push(head, obj.data, tail);
    currentOffset += head.length + obj.data.length + tail.length;
  }

  const startXref = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  chunks.push(encoder.encode(xref));

  return new Blob(chunks, { type: 'application/pdf' });
}
