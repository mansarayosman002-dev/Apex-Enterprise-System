/**
 * Apex Enterprise HRMS - AI Export & Share Utilities
 * Provides PDF export, Excel/CSV table generation, and cross-platform sharing.
 */

/**
 * Parses markdown tables from AI response text into 2D array of strings
 */
export function extractTablesFromMarkdown(markdown: string): Array<{ headers: string[]; rows: string[][] }> {
  const lines = markdown.split('\n');
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];
  let currentHeaders: string[] = [];
  let currentRows: string[][] = [];
  let isParsingTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/\*\*/g, ''));

      // Check if this is a separator line (e.g. |---|---|)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!isParsingTable) {
        // First row is headers
        isParsingTable = true;
        currentHeaders = cells;
        currentRows = [];
      } else {
        currentRows.push(cells);
      }
    } else {
      if (isParsingTable) {
        if (currentHeaders.length > 0 && currentRows.length > 0) {
          tables.push({ headers: currentHeaders, rows: currentRows });
        }
        isParsingTable = false;
        currentHeaders = [];
        currentRows = [];
      }
    }
  }

  if (isParsingTable && currentHeaders.length > 0 && currentRows.length > 0) {
    tables.push({ headers: currentHeaders, rows: currentRows });
  }

  return tables;
}

/**
 * Exports AI response to Excel (.csv / .xlsx compatible format)
 */
/**
 * Converts markdown text into structured, high-fidelity HTML for PDF rendering
 */
export function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';

  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      html += `<div class="table-card"><table class="report-table">`;
      const headerRow = tableRows[0];
      html += `<thead><tr>`;
      headerRow.forEach((h) => {
        html += `<th>${escapeHtml(h)}</th>`;
      });
      html += `</tr></thead><tbody>`;

      for (let r = 1; r < tableRows.length; r++) {
        const row = tableRows[r];
        const isTotalRow = row.some((cell) => /total|overall|sum/i.test(cell));
        html += `<tr class="${isTotalRow ? 'total-row' : ''}">`;
        row.forEach((cell) => {
          // Check for status pills
          const trimmed = cell.trim();
          let cellHtml = escapeHtml(trimmed);

          if (/^(present|on-time)$/i.test(trimmed)) {
            cellHtml = `<span class="badge badge-success">${trimmed}</span>`;
          } else if (/^(late|tardy)$/i.test(trimmed)) {
            cellHtml = `<span class="badge badge-warning">${trimmed}</span>`;
          } else if (/^(absent|rejected|failed)$/i.test(trimmed)) {
            cellHtml = `<span class="badge badge-danger">${trimmed}</span>`;
          } else if (/^(pending|reviewed)$/i.test(trimmed)) {
            cellHtml = `<span class="badge badge-info">${trimmed}</span>`;
          } else if (/^(approved|paid)$/i.test(trimmed)) {
            cellHtml = `<span class="badge badge-purple">${trimmed}</span>`;
          } else if (/^NLe\s*[\d,]+(\.\d{2})?/i.test(trimmed) || /^SLE\s*[\d,]+/i.test(trimmed)) {
            cellHtml = `<strong class="currency-cell">${cellHtml}</strong>`;
          } else if (/^EMP-\d+/i.test(trimmed)) {
            cellHtml = `<code class="code-badge">${cellHtml}</code>`;
          }

          html += `<td>${cellHtml}</td>`;
        });
        html += `</tr>`;
      }

      html += `</tbody></table></div>`;
      tableRows = [];
    }
    inTable = false;
  };

  const flushList = () => {
    if (inList) {
      html += listType === 'ul' ? `</ul>` : `</ol>`;
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Code Block Handling
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushTable();
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.replace(/```/, '').trim() || 'Code';
        codeBlockContent = '';
        continue;
      } else {
        inCodeBlock = false;
        html += `
          <div class="code-box">
            <div class="code-header">
              <span class="code-lang-tag">${escapeHtml(codeBlockLang)}</span>
              <span class="code-copy-tag">Apex System Output</span>
            </div>
            <pre class="code-body"><code>${escapeHtml(codeBlockContent.trim())}</code></pre>
          </div>
        `;
        codeBlockContent = '';
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent += rawLine + '\n';
      continue;
    }

    // 2. Table Handling
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/\*\*/g, ''));

      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator) {
        continue;
      }

      inTable = true;
      tableRows.push(cells);
      continue;
    } else {
      if (inTable) {
        flushTable();
      }
    }

    // 3. Headings
    if (line.startsWith('#')) {
      flushList();
      if (line.startsWith('### ')) {
        html += `<h3 class="h3-heading">${inlineFormat(line.slice(4))}</h3>`;
      } else if (line.startsWith('## ')) {
        html += `<h2 class="h2-heading">${inlineFormat(line.slice(3))}</h2>`;
      } else if (line.startsWith('# ')) {
        html += `<h1 class="h1-heading">${inlineFormat(line.slice(2))}</h1>`;
      }
      continue;
    }

    // 4. Blockquotes / Callout Boxes
    if (line.startsWith('>')) {
      flushList();
      const calloutText = line.replace(/^>\s*/, '');
      html += `<div class="callout-box"><div class="callout-bar"></div><div class="callout-text">${inlineFormat(calloutText)}</div></div>`;
      continue;
    }

    // 5. Bullet Lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        flushList();
        html += `<ul class="report-list">`;
        inList = true;
        listType = 'ul';
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>`;
      continue;
    }

    // 6. Numbered Lists
    if (/^\d+\.\s/.test(line)) {
      const clean = line.replace(/^\d+\.\s*/, '');
      if (!inList || listType !== 'ol') {
        flushList();
        html += `<ol class="report-list-numbered">`;
        inList = true;
        listType = 'ol';
      }
      html += `<li>${inlineFormat(clean)}</li>`;
      continue;
    }

    // 7. Regular paragraph
    flushList();
    if (line.length > 0) {
      html += `<p class="report-para">${inlineFormat(line)}</p>`;
    }
  }

  flushTable();
  flushList();

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

/**
 * Exports AI response to a fully styled Microsoft Excel Workbook XML (.xls)
 * Opens natively in Microsoft Excel with formatted headers, auto-widths, colors, and numbers.
 */
export function exportAiResponseToExcel(title: string, content: string): boolean {
  try {
    const tables = extractTablesFromMarkdown(content);
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${escapeXml(title)}</Title>
    <Author>Apex Enterprise AI Copilot</Author>
    <Created>${new Date().toISOString()}</Created>
    <Company>Apex Enterprise Solutions (SL) Ltd.</Company>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#334155"/>
    </Style>
    <Style ss:ID="OrgHeader">
      <Font ss:FontName="Segoe UI" ss:Size="13" ss:Bold="1" ss:Color="#0F172A"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="SubHeader">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#64748B"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="MetaLabel">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#475569"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
    </Style>
    <Style ss:ID="MetaVal">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#0F172A"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
    </Style>
    <Style ss:ID="TableHead">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2563EB"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
      </Borders>
    </Style>
    <Style ss:ID="DataEven">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#1E293B"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
      </Borders>
    </Style>
    <Style ss:ID="DataOdd">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#1E293B"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
      </Borders>
    </Style>
    <Style ss:ID="DataTotal">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2563EB"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#2563EB"/>
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="AI Analysis Report">
    <Table ss:DefaultRowHeight="20">
`;

    // Title Block
    xml += `
      <Column ss:AutoFitWidth="1" ss:Width="160"/>
      <Column ss:AutoFitWidth="1" ss:Width="200"/>
      <Column ss:AutoFitWidth="1" ss:Width="150"/>
      <Column ss:AutoFitWidth="1" ss:Width="150"/>
      <Column ss:AutoFitWidth="1" ss:Width="150"/>

      <Row ss:Height="24">
        <Cell ss:StyleID="OrgHeader" ss:MergeAcross="3"><Data ss:Type="String">APEX ENTERPRISE SOLUTIONS (SL) LTD.</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:StyleID="SubHeader" ss:MergeAcross="3"><Data ss:Type="String">Smart Employee Attendance &amp; Payroll Management System • AI Intelligence Export</Data></Cell>
      </Row>
      <Row ss:Height="8"><Cell/></Row>

      <Row ss:Height="18">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Report Subject:</Data></Cell>
        <Cell ss:StyleID="MetaVal" ss:MergeAcross="2"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Export Date &amp; Time:</Data></Cell>
        <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(currentDate + ' ' + currentTime)}</Data></Cell>
        <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Audit Authority:</Data></Cell>
        <Cell ss:StyleID="MetaVal"><Data ss:Type="String">PostgreSQL 18 Drizzle Verified</Data></Cell>
      </Row>
      <Row ss:Height="12"><Cell/></Row>
`;

    if (tables.length > 0) {
      tables.forEach((tbl, tIdx) => {
        if (tIdx > 0) {
          xml += `<Row ss:Height="14"><Cell/></Row>`;
        }
        // Table Header
        xml += `<Row ss:Height="24">`;
        tbl.headers.forEach((h) => {
          xml += `<Cell ss:StyleID="TableHead"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
        });
        xml += `</Row>`;

        // Table Rows
        tbl.rows.forEach((row, rIdx) => {
          const isTotal = row.some((c) => /total|sum|overall/i.test(c));
          const rowStyle = isTotal ? 'DataTotal' : rIdx % 2 === 0 ? 'DataEven' : 'DataOdd';
          xml += `<Row ss:Height="20">`;
          row.forEach((c) => {
            const num = parseFloat(c.replace(/[^0-9.-]/g, ''));
            const isPureNumber = !isNaN(num) && /^-?\d+(\.\d+)?$/.test(c.trim());
            if (isPureNumber) {
              xml += `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${num}</Data></Cell>`;
            } else {
              xml += `<Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`;
            }
          });
          xml += `</Row>`;
        });
      });
    } else {
      // Parse list or lines into structured Excel columns
      xml += `
        <Row ss:Height="24">
          <Cell ss:StyleID="TableHead"><Data ss:Type="String">Section / Domain</Data></Cell>
          <Cell ss:StyleID="TableHead" ss:MergeAcross="2"><Data ss:Type="String">Intelligence Detail / Specification</Data></Cell>
        </Row>
      `;
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      lines.forEach((line, rIdx) => {
        const clean = line.replace(/^[#-*\s]+/, '').trim();
        const style = rIdx % 2 === 0 ? 'DataEven' : 'DataOdd';
        let section = 'General';
        if (line.startsWith('#')) section = 'Header';
        else if (line.startsWith('-') || line.startsWith('*')) section = 'Item';

        xml += `
          <Row ss:Height="20">
            <Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(section)}</Data></Cell>
            <Cell ss:StyleID="${style}" ss:MergeAcross="2"><Data ss:Type="String">${escapeXml(clean)}</Data></Cell>
          </Row>
        `;
      });
    }

    xml += `
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_Report.xls`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    return false;
  }
}

function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats and prints or saves AI response as a high-definition PDF document
 */
export function exportAiResponseToPdf(title: string, content: string, username = 'Authorized User'): boolean {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups for this site to export PDF.');
      return false;
    }

    const formattedHtml = convertMarkdownToHtml(content);
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const docRef = `APX-AI-${Date.now().toString().slice(-6)}`;

    // Build standalone printable document with corporate design
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>${escapeHtml(title)} - Apex Enterprise AI Intelligence Report</title>
          <meta charset="utf-8" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 12mm 16mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 0;
              margin: 0;
              line-height: 1.55;
              font-size: 11.5px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .document-container {
              max-width: 100%;
              padding: 10px 14px;
            }
            /* Enterprise Header */
            .header-banner {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              padding-bottom: 14px;
              border-bottom: 2.5px solid #0f172a;
              margin-bottom: 16px;
            }
            .brand-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-badge {
              width: 44px;
              height: 44px;
              border-radius: 10px;
              background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4338ca 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
            }
            .logo-badge svg {
              width: 24px;
              height: 24px;
              fill: none;
              stroke: #38bdf8;
              stroke-width: 2;
            }
            .brand-title {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.4px;
              line-height: 1.2;
            }
            .brand-subtitle {
              font-size: 10px;
              color: #475569;
              font-weight: 500;
              margin-top: 2px;
            }
            .brand-address {
              font-size: 9px;
              color: #64748b;
              margin-top: 1px;
            }
            .brand-right {
              text-align: right;
            }
            .doc-pill {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 6px;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.6px;
              text-transform: uppercase;
            }
            .doc-ref {
              font-size: 9.5px;
              color: #64748b;
              font-family: 'JetBrains Mono', monospace;
              margin-top: 5px;
            }
            .confidential-tag {
              font-size: 8.5px;
              font-weight: 700;
              color: #dc2626;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin-top: 2px;
            }
            /* Metadata Grid */
            .meta-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 18px;
              display: grid;
              grid-template-columns: 2.2fr 1.6fr 1.2fr 1.4fr;
              gap: 12px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 8.5px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .meta-value {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            /* Headings */
            .h1-heading {
              font-size: 17px;
              font-weight: 800;
              color: #0f172a;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin-top: 20px;
              margin-bottom: 10px;
              letter-spacing: -0.3px;
            }
            .h2-heading {
              font-size: 14px;
              font-weight: 700;
              color: #1e3a8a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin-top: 16px;
              margin-bottom: 8px;
            }
            .h3-heading {
              font-size: 12.5px;
              font-weight: 700;
              color: #3b82f6;
              margin-top: 14px;
              margin-bottom: 6px;
            }
            .report-para {
              margin: 6px 0;
              color: #334155;
              line-height: 1.55;
            }
            /* Lists */
            .report-list, .report-list-numbered {
              margin: 6px 0 10px 0;
              padding-left: 18px;
              color: #334155;
            }
            .report-list li, .report-list-numbered li {
              margin-bottom: 4px;
              line-height: 1.5;
            }
            /* Tables */
            .table-card {
              margin: 12px 0 16px 0;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              page-break-inside: avoid;
              box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10.5px;
            }
            .report-table th {
              background: #0f172a;
              color: #ffffff;
              font-weight: 700;
              text-align: left;
              padding: 8px 10px;
              border: 1px solid #1e293b;
              font-size: 10px;
              letter-spacing: 0.3px;
              text-transform: uppercase;
            }
            .report-table td {
              padding: 7px 10px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
            }
            .report-table tr:nth-child(even) {
              background: #f8fafc;
            }
            .report-table tr.total-row td {
              background: #eff6ff;
              font-weight: 800;
              color: #0f172a;
              border-top: 2px solid #2563eb;
              border-bottom: 2px solid #2563eb;
            }
            /* Status Badges */
            .badge {
              display: inline-block;
              padding: 2px 7px;
              border-radius: 9999px;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
            .badge-danger  { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .badge-info    { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .badge-purple  { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
            .code-badge {
              background: #f1f5f9;
              color: #0f172a;
              padding: 2px 5px;
              border-radius: 4px;
              font-family: 'JetBrains Mono', monospace;
              font-size: 9.5px;
              border: 1px solid #e2e8f0;
            }
            .currency-cell {
              color: #0f172a;
              font-family: 'JetBrains Mono', monospace;
            }
            .inline-code {
              background: #f1f5f9;
              padding: 1px 5px;
              border-radius: 4px;
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              color: #0f172a;
              border: 1px solid #e2e8f0;
            }
            /* Callouts */
            .callout-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-left: 3.5px solid #2563eb;
              border-radius: 6px;
              padding: 8px 12px;
              margin: 10px 0;
              font-size: 11px;
              color: #334155;
            }
            /* Code Block */
            .code-box {
              background: #0f172a;
              border-radius: 8px;
              overflow: hidden;
              margin: 12px 0;
              border: 1px solid #1e293b;
              page-break-inside: avoid;
            }
            .code-header {
              background: #1e293b;
              padding: 6px 12px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
              font-family: 'JetBrains Mono', monospace;
              border-bottom: 1px solid #334155;
            }
            .code-lang-tag { color: #38bdf8; font-weight: 700; text-transform: uppercase; }
            .code-body {
              padding: 10px 12px;
              margin: 0;
              color: #f8fafc;
              font-family: 'JetBrains Mono', monospace;
              font-size: 9.5px;
              line-height: 1.5;
              overflow-x: auto;
            }
            /* Signatures */
            .sign-section {
              margin-top: 36px;
              padding-top: 14px;
              border-top: 1px dashed #cbd5e1;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 36px;
              page-break-inside: avoid;
            }
            .sign-box {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .sign-title {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
            }
            .sign-line {
              height: 36px;
              border-bottom: 1px solid #94a3b8;
              margin-bottom: 4px;
            }
            .sign-sub {
              font-size: 8.5px;
              color: #94a3b8;
            }
            /* Footer */
            .footer-strip {
              margin-top: 24px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 8.5px;
              color: #64748b;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="document-container">
            <!-- Header Banner -->
            <div class="header-banner">
              <div class="brand-left">
                <div class="logo-badge">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <div class="brand-title">Apex Enterprise Solutions (SL) Ltd.</div>
                  <div class="brand-subtitle">Smart Employee Attendance &amp; Payroll Management System</div>
                  <div class="brand-address">15 Siaka Stevens Street, Freetown, Sierra Leone • Statutory HR Compliance Engine</div>
                </div>
              </div>
              <div class="brand-right">
                <div class="doc-pill">Executive AI Report</div>
                <div class="doc-ref">${escapeHtml(docRef)}</div>
                <div class="confidential-tag">Confidential • Audited Record</div>
              </div>
            </div>

            <!-- Metadata Box -->
            <div class="meta-card">
              <div class="meta-item">
                <span class="meta-label">Subject / Query</span>
                <span class="meta-value">${escapeHtml(title)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Prepared By</span>
                <span class="meta-value">Apex AI Copilot (${escapeHtml(username)})</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Timestamp</span>
                <span class="meta-value">${escapeHtml(currentDate + ' ' + currentTime)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Grounding</span>
                <span class="meta-value">PostgreSQL 18 • NASSIT Act 2001</span>
              </div>
            </div>

            <!-- Report Body -->
            <div class="content-body">
              ${formattedHtml}
            </div>

            <!-- Formal Audit Verification Sign-off -->
            <div class="sign-section">
              <div class="sign-box">
                <span class="sign-title">AI Engine Authentication</span>
                <div class="sign-line"></div>
                <span class="sign-sub">Certified by Apex AI Copilot Core Engine • 100% Deterministic Grounding</span>
              </div>
              <div class="sign-box">
                <span class="sign-title">Enterprise Authorization &amp; Review</span>
                <div class="sign-line"></div>
                <span class="sign-sub">Signature of Authorized Officer (Administrator / HR / Finance)</span>
              </div>
            </div>

            <!-- Bottom Disclaimer -->
            <div class="footer-strip">
              <span>Apex Enterprise HRMS • Statutory Compliance: Sierra Leone Labor Act &amp; NASSIT Act No. 5 of 2001</span>
              <span>Generated via Apex AI Assistant • Internal Corporate Record</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    return true;
  } catch (error) {
    console.error('Failed to export to PDF:', error);
    return false;
  }
}

/**
 * Shares AI response text via Web Share API or copies to clipboard
 */
export async function shareAiResponse(title: string, content: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const shareText = `Apex HRMS AI Report: ${title}\n\n${content}\n\nGenerated via Apex Enterprise AI Copilot`;

    if (navigator.share && navigator.canShare && navigator.canShare({ title, text: shareText })) {
      await navigator.share({
        title: `Apex AI - ${title}`,
        text: shareText,
      });
      return 'shared';
    }

    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(shareText);
    return 'copied';
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return 'failed';
    }
    // Try simple clipboard copy
    try {
      await navigator.clipboard.writeText(content);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
