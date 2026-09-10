import React from 'react';
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Building2,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

interface NotificationMessageRendererProps {
  content: string;
  className?: string;
  isCompact?: boolean;
}

export const NotificationMessageRenderer: React.FC<NotificationMessageRendererProps> = ({
  content,
  className = '',
  isCompact = false,
}) => {
  if (!content) return null;

  const lines = content.split('\n');

  const renderCellWithStatusBadge = (cellText: string) => {
    const trimmed = cellText.trim();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith('late') || lower.includes('late (')) {
      return (
        <span className="inline-flex items-center rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
          {trimmed}
        </span>
      );
    }
    if (lower.includes('unreported') || lower.includes('absent')) {
      return (
        <span className="inline-flex items-center rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
          {trimmed}
        </span>
      );
    }
    if (lower.includes('on-time') || lower.includes('present') || lower.includes('approved')) {
      return (
        <span className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {trimmed}
        </span>
      );
    }
    return renderInlineFormatting(trimmed);
  };

  // Check if content has markdown tables
  const renderFormattedBlocks = () => {
    const blocks: React.ReactNode[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    let currentBlockKey = 0;

    const flushTable = () => {
      if (inTable && tableHeaders.length > 0) {
        blocks.push(
          <div key={`table-${currentBlockKey++}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold">
                <tr>
                  {tableHeaders.map((th, idx) => (
                    <th key={idx} className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-700">
                      {th.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                        {renderCellWithStatusBadge(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Markdown table row detection
      if (line.startsWith('|') && line.endsWith('|')) {
        const parts = line
          .slice(1, -1)
          .split('|')
          .map((p) => p.trim());

        // Check if it's separator line (e.g. |---|---|)
        if (parts.every((p) => /^[-:]+$/.test(p))) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = parts;
        } else {
          tableRows.push(parts);
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!line) {
        if (!isCompact) {
          blocks.push(<div key={`empty-${i}`} className="h-2.5" />);
        }
        continue;
      }

      // Headers (### or ## or #)
      if (line.startsWith('### ')) {
        blocks.push(
          <h4
            key={`h4-${i}`}
            className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider pt-2.5 pb-1.5 border-b border-slate-200/80 dark:border-slate-800"
          >
            {renderInlineFormatting(line.replace('### ', ''))}
          </h4>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <h3
            key={`h3-${i}`}
            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white pt-3 pb-1.5"
          >
            {renderInlineFormatting(line.replace('## ', ''))}
          </h3>
        );
        continue;
      }

      // Quote / Note Callout Block (> Note or **Sender Note**:)
      if (line.startsWith('> ') || line.startsWith('**Note from') || line.startsWith('**Sender Note**')) {
        const quoteText = line.startsWith('> ') ? line.slice(2) : line;
        blocks.push(
          <div
            key={`quote-${i}`}
            className="my-3 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-xs sm:text-[13px] text-indigo-950 dark:text-indigo-200 shadow-2xs"
          >
            <div className="flex items-center space-x-1.5 font-semibold text-indigo-700 dark:text-indigo-400 text-xs mb-1">
              <Info className="h-4 w-4" />
              <span>Personal Sender Note</span>
            </div>
            <div className="italic leading-relaxed">{renderInlineFormatting(quoteText)}</div>
          </div>
        );
        continue;
      }

      // Action Required / Warning Callout
      if (line.includes('[ACTION REQUIRED]') || line.includes('[URGENT]') || line.includes('[ALERT]')) {
        blocks.push(
          <div
            key={`action-${i}`}
            className="my-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 p-3.5 text-xs sm:text-[13px] text-rose-900 dark:text-rose-200 shadow-2xs"
          >
            <div className="flex items-center space-x-1.5 font-bold text-rose-700 dark:text-rose-400 text-xs mb-1">
              <AlertCircle className="h-4 w-4" />
              <span>Action Required</span>
            </div>
            <div className="leading-relaxed">{renderInlineFormatting(line.replace(/\[(ACTION REQUIRED|URGENT|ALERT)\]/g, '').trim())}</div>
          </div>
        );
        continue;
      }

      // Success / Completed Callout
      if (line.includes('[SUCCESS]') || line.includes('[COMPLETED]') || line.includes('[APPROVED]')) {
        blocks.push(
          <div
            key={`success-${i}`}
            className="my-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 text-xs sm:text-[13px] text-emerald-900 dark:text-emerald-200 shadow-2xs"
          >
            <div className="flex items-center space-x-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirmed Notification</span>
            </div>
            <div className="leading-relaxed">{renderInlineFormatting(line.replace(/\[(SUCCESS|COMPLETED|APPROVED)\]/g, '').trim())}</div>
          </div>
        );
        continue;
      }

      // Bullet items (- or • or *)
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        const bulletText = line.replace(/^[-*•]\s+/, '');
        blocks.push(
          <div key={`bullet-${i}`} className="flex items-start space-x-2.5 py-1 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderInlineFormatting(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Divider (---)
      if (line === '---' || line === '***') {
        blocks.push(
          <hr key={`hr-${i}`} className="my-3 border-slate-200 dark:border-slate-800" />
        );
        continue;
      }

      // Standard paragraph
      blocks.push(
        <p
          key={`p-${i}`}
          className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed py-0.5"
        >
          {renderInlineFormatting(line)}
        </p>
      );
    }

    if (inTable) {
      flushTable();
    }

    return blocks;
  };

  return (
    <div className={`notification-formatted-body ${className}`}>
      {renderFormattedBlocks()}
    </div>
  );
};

/**
 * Parses inline formatting like **bold**, `code`, and key-value highlights
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return text;

  // Split by bold (**text**) and code (`code`)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-white">
          {boldContent}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const codeContent = part.slice(1, -1);
      return (
        <code
          key={index}
          className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700"
        >
          {codeContent}
        </code>
      );
    }
    return part;
  });
}

/**
 * Extracts a clean plain-text snippet without markdown markup for compact dropdown previews
 */
export function extractCleanSnippet(markdown: string, maxLength = 120): string {
  if (!markdown) return '';

  const clean = markdown
    .replace(/^###?\s+/gm, '') // Remove headers
    .replace(/\|[^\n]+\|/g, ' ') // Strip tables
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Strip bold
    .replace(/`([^`]+)`/g, '$1') // Strip code
    .replace(/^[-*•]\s+/gm, '') // Strip bullets
    .replace(/\[(ACTION REQUIRED|URGENT|ALERT|SUCCESS|COMPLETED|APPROVED|INFO)\]/g, '')
    .replace(/\n+/g, ' ') // Collapse newlines
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength).trim() + '...';
}
