import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface AIMessageRendererProps {
  content: string;
  className?: string;
}

export const AIMessageRenderer: React.FC<AIMessageRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split content into blocks (paragraphs, tables, lists, headers)
  const blocks = parseContentBlocks(content);

  return (
    <div className={`space-y-3.5 text-xs leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'header':
            return <HeaderBlock key={idx} text={block.content} level={block.level} />;
          case 'table':
            return <TableBlock key={idx} tableData={block.tableData!} />;
          case 'metric_group':
            return <MetricGroupBlock key={idx} items={block.items!} />;
          case 'callout':
            return <CalloutBlock key={idx} text={block.content} variant={block.variant!} />;
          case 'list':
            return <ListBlock key={idx} items={block.items!} />;
          case 'paragraph':
          default:
            return <ParagraphBlock key={idx} text={block.content} />;
        }
      })}
    </div>
  );
};

// -------------------------------------------------------------
// Block Parsing Logic
// -------------------------------------------------------------
interface ContentBlock {
  type: 'header' | 'table' | 'metric_group' | 'callout' | 'list' | 'paragraph';
  content: string;
  level?: number;
  variant?: 'success' | 'warning' | 'error' | 'info';
  tableData?: { headers: string[]; rows: string[][] };
  items?: Array<{ label?: string; value?: string; text: string }>;
}

function parseContentBlocks(raw: string): ContentBlock[] {
  const lines = raw.split('\n');
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Check for Markdown Headers (###, ##, #)
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'header',
          level: match[1].length,
          content: match[2],
        });
        i++;
        continue;
      }
    }

    // 2. Check for Table Block (| ... |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headers = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        // Skip separator line (e.g. |---|---|)
        const contentRowLines = tableLines.slice(1).filter((l) => !l.replace(/[-|\s:]/g, '').length === false);

        const rows: string[][] = [];
        for (let r = 0; r < contentRowLines.length; r++) {
          const l = contentRowLines[r];
          if (/^\|[\s-:]+\|$/.test(l) || l.includes('---')) continue;
          const cells = l
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          if (cells.length > 0) {
            rows.push(cells);
          }
        }

        blocks.push({
          type: 'table',
          content: '',
          tableData: { headers, rows },
        });
        continue;
      }
    }

    // 3. Check for Metric / Stat Key-Value List (- **Key**: Value)
    if (line.startsWith('- **') || line.startsWith('* **')) {
      const metricItems: Array<{ label?: string; value?: string; text: string }> = [];
      while (i < lines.length && (lines[i].trim().startsWith('- **') || lines[i].trim().startsWith('* **'))) {
        const current = lines[i].trim();
        const kvMatch = current.match(/^[-*]\s+\*\*([^*]+)\*\*:\s*(.*)$/);
        if (kvMatch) {
          metricItems.push({
            label: kvMatch[1].trim(),
            value: kvMatch[2].trim(),
            text: current,
          });
        } else {
          metricItems.push({ text: current.replace(/^[-*]\s+/, '') });
        }
        i++;
      }

      // If at least 2 key-value metrics, group them into a rich metric card grid
      if (metricItems.filter((m) => m.label && m.value).length >= 2) {
        blocks.push({
          type: 'metric_group',
          content: '',
          items: metricItems,
        });
        continue;
      } else {
        blocks.push({
          type: 'list',
          content: '',
          items: metricItems,
        });
        continue;
      }
    }

    // 4. Check for Standard Bullet List (- Item or * Item)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: Array<{ text: string }> = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push({ text: lines[i].trim().substring(2).trim() });
        i++;
      }
      blocks.push({
        type: 'list',
        content: '',
        items: listItems,
      });
      continue;
    }

    // 5. Check for Callouts ([SUCCESS], [WARNING], [ERROR], [INFO], **Success**, **Warning**, **Error**, > [!NOTE])
    const calloutMatch = line.match(/^(?:\[(SUCCESS|WARNING|ERROR|INFO|NOTE)\]|\*\*(Success|Action Confirmed|Warning|Confirmation Required|Error|Action Failed|Execution Error|Session Expired|Notice|Permission Notice)\*\*[:]?|>)/i);
    if (calloutMatch) {
      let variant: 'success' | 'warning' | 'error' | 'info' = 'info';
      const indicator = (calloutMatch[1] || calloutMatch[2] || '').toLowerCase();
      if (indicator.includes('success') || indicator.includes('confirmed')) variant = 'success';
      else if (indicator.includes('warning') || indicator.includes('confirmation')) variant = 'warning';
      else if (indicator.includes('error') || indicator.includes('failed')) variant = 'error';
      else variant = 'info';

      const cleanText = line
        .replace(/^(?:\[(SUCCESS|WARNING|ERROR|INFO|NOTE)\])\s*/i, '')
        .replace(/^>\s*(\[!NOTE\])?\s*/i, '');

      blocks.push({
        type: 'callout',
        variant,
        content: cleanText,
      });
      i++;
      continue;
    }

    // 6. Regular Paragraph Block
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('* ') &&
      !lines[i].trim().match(/^(?:\[(SUCCESS|WARNING|ERROR|INFO|NOTE)\]|\*\*(Success|Action Confirmed|Warning|Confirmation Required|Error|Action Failed|Execution Error|Session Expired|Notice|Permission Notice)\*\*[:]?|>)/i)
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    blocks.push({
      type: 'paragraph',
      content: paraLines.join('\n'),
    });
  }

  return blocks;
}

// -------------------------------------------------------------
// Component Blocks
// -------------------------------------------------------------

const HeaderBlock: React.FC<{ text: string; level?: number }> = ({ text, level = 3 }) => {
  return (
    <div className="relative pt-1 pb-1 my-1">
      <div className="flex items-start space-x-2">
        <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 shrink-0 mt-1 animate-pulse" />
        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
          {renderInlineMarkdown(text)}
        </h3>
      </div>
      <div className="mt-1.5 h-0.5 w-full bg-gradient-to-r from-indigo-500/50 via-cyan-500/25 to-transparent rounded-full" />
    </div>
  );
};

const TableBlock: React.FC<{ tableData: { headers: string[]; rows: string[][] } }> = ({ tableData }) => {
  const { headers, rows } = tableData;
  if (!headers.length || !rows.length) return null;

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold tracking-wide">
              {headers.map((h, idx) => (
                <th key={idx} className="px-3 py-2.5 whitespace-nowrap first:pl-3.5 last:pr-3.5">
                  {renderInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 odd:bg-white dark:odd:bg-slate-900/40 even:bg-slate-50/30 dark:even:bg-slate-850/30"
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 whitespace-nowrap first:pl-3.5 last:pr-3.5">
                    {renderTableCell(cell, headers[cIdx])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function renderTableCell(cell: string, header = ''): React.ReactNode {
  const trimmed = cell.trim();
  const lowerH = header.toLowerCase();

  // Employee Code (EMP-1001)
  if (/^EMP-\d+$/i.test(trimmed)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
        {trimmed}
      </span>
    );
  }

  // Time (e.g. 08:30:00 or 15:24:06)
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return (
      <span className="inline-flex items-center space-x-1 font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
        <Clock className="h-3 w-3 text-slate-400" />
        <span>{trimmed}</span>
      </span>
    );
  }

  // Currency or Numbers (+150.00, SLE 5,800.00)
  if (lowerH.includes('amount') || lowerH.includes('salary') || lowerH.includes('pay') || trimmed.startsWith('SLE') || /^[+-]?\d+(\.\d{2})?$/.test(trimmed)) {
    const isNegative = trimmed.startsWith('-');
    const isPositive = trimmed.startsWith('+');
    return (
      <span
        className={`font-mono font-semibold ${
          isNegative
            ? 'text-rose-600 dark:text-rose-400'
            : isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-900 dark:text-slate-100 font-bold'
        }`}
      >
        {renderInlineMarkdown(trimmed)}
      </span>
    );
  }

  return renderInlineMarkdown(trimmed);
}

const MetricGroupBlock: React.FC<{ items: Array<{ label?: string; value?: string; text: string }> }> = ({ items }) => {
  return (
    <div className="my-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item, idx) => {
        const isMoney = item.value?.includes('SLE') || item.value?.includes('Le');
        const isStatus = item.label?.toLowerCase().includes('status');
        const isHighlight = item.label?.toLowerCase().includes('present') || item.label?.toLowerCase().includes('net');

        return (
          <div
            key={idx}
            className={`flex flex-col justify-between rounded-xl p-2.5 border transition-all ${
              isHighlight
                ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60'
                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`text-xs sm:text-sm font-bold tracking-tight ${
                  isMoney
                    ? 'text-emerald-600 dark:text-emerald-400 font-mono'
                    : isStatus
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {renderInlineMarkdown(item.value || '')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CalloutBlock: React.FC<{ text: string; variant: 'success' | 'warning' | 'error' | 'info' }> = ({
  text,
  variant,
}) => {
  const styles = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-300 dark:border-emerald-800/60',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-300 dark:border-amber-800/60',
      text: 'text-amber-900 dark:text-amber-200',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-300 dark:border-rose-800/60',
      text: 'text-rose-900 dark:text-rose-200',
      icon: <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    },
    info: {
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/40',
      border: 'border-indigo-200 dark:border-indigo-800/60',
      text: 'text-indigo-900 dark:text-indigo-200',
      icon: <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />,
    },
  }[variant];

  return (
    <div className={`my-2 flex items-start space-x-2.5 rounded-xl border ${styles.border} ${styles.bg} p-3 ${styles.text}`}>
      {styles.icon}
      <div className="flex-1 leading-relaxed text-xs">{renderInlineMarkdown(text)}</div>
    </div>
  );
};

const ListBlock: React.FC<{ items: Array<{ text: string }> }> = ({ items }) => {
  return (
    <ul className="my-1.5 space-y-1 pl-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(item.text)}</span>
        </li>
      ))}
    </ul>
  );
};

const ParagraphBlock: React.FC<{ text: string }> = ({ text }) => {
  return <div className="leading-relaxed text-slate-800 dark:text-slate-200">{renderInlineMarkdown(text)}</div>;
};

// -------------------------------------------------------------
// Inline Markdown Parser (**bold**, `code`, links)
// -------------------------------------------------------------
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Sanitize all unicode emojis
  const sanitized = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '');

  // Split by inline markdown tokens: `code`, **bold**, *italic*
  const tokens = sanitized.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (!token) return null;

        // Inline Code `token`
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
          const codeVal = token.slice(1, -1);
          const isStatus = ['active', 'draft', 'approved', 'processed', 'pending', 'inactive'].includes(codeVal.toLowerCase());

          if (isStatus) {
            const statusColor =
              codeVal.toLowerCase() === 'active' || codeVal.toLowerCase() === 'approved' || codeVal.toLowerCase() === 'processed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/60'
                : codeVal.toLowerCase() === 'draft' || codeVal.toLowerCase() === 'pending'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/60'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/60';

            return (
              <span
                key={i}
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${statusColor}`}
              >
                {codeVal}
              </span>
            );
          }

          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-300/60 dark:border-slate-700/60"
            >
              {codeVal}
            </code>
          );
        }

        // Bold **token**
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
          const boldVal = token.slice(2, -2);
          return (
            <strong key={i} className="font-bold text-slate-900 dark:text-white">
              {boldVal}
            </strong>
          );
        }

        // Italic *token*
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
          return (
            <em key={i} className="italic text-slate-600 dark:text-slate-400">
              {token.slice(1, -1)}
            </em>
          );
        }

        // Regular text
        return token;
      })}
    </>
  );
}
