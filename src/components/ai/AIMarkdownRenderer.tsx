import React from 'react';
import { ShieldCheck, Table, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AIMarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export const AIMarkdownRenderer: React.FC<AIMarkdownRendererProps> = ({
  content,
  className = '',
  isUser = false,
}) => {
  if (isUser) {
    return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
  }

  // Parse markdown lines and structured blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableBuffer.length < 2) {
      tableBuffer = [];
      return;
    }

    const headerLine = tableBuffer[0];
    const headers = headerLine
      .split('|')
      .slice(1, -1)
      .map((h) => h.trim().replace(/\*\*/g, ''));

    const rows = tableBuffer.slice(2).map((r) =>
      r
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/\*\*/g, ''))
    );

    elements.push(
      <div
        key={`table-${key}`}
        className="my-3 overflow-x-auto rounded-xl border border-purple-200 dark:border-slate-700/70 bg-purple-50/50 dark:bg-slate-950/60 shadow-inner"
      >
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
          <thead className="bg-purple-100/70 dark:bg-slate-800/80 font-semibold text-purple-900 dark:text-slate-200">
            <tr>
              {headers.map((header, hIdx) => (
                <th key={hIdx} className="px-3.5 py-2.5 border-r border-slate-200 dark:border-slate-700/40 last:border-r-0 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={
                  rIdx % 2 === 0
                    ? 'bg-white/80 dark:bg-slate-900/30 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors'
                    : 'bg-slate-50 dark:bg-slate-900/70 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors'
                }
              >
                {row.map((cell, cIdx) => {
                  // Format cell content with badges if status
                  const lower = cell.toLowerCase();
                  let cellContent: React.ReactNode = cell;

                  if (lower === 'late') {
                    cellContent = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <Clock className="h-2.5 w-2.5" /> Late
                      </span>
                    );
                  } else if (lower === 'present' || lower === 'on-time') {
                    cellContent = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Present
                      </span>
                    );
                  } else if (lower === 'absent') {
                    cellContent = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                        <AlertCircle className="h-2.5 w-2.5" /> Absent
                      </span>
                    );
                  } else if (lower === 'approved' || lower === 'paid') {
                    cellContent = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {cell}
                      </span>
                    );
                  } else if (lower === 'pending') {
                    cellContent = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        Pending
                      </span>
                    );
                  } else if (
                    cell.startsWith('EMP-') ||
                    cell.startsWith('NLe') ||
                    cell.startsWith('SLE') ||
                    cell.includes(':') ||
                    /^\d+(\.\d+)?\s*(hrs|%)?$/.test(cell)
                  ) {
                    cellContent = <span className="font-mono text-slate-200 font-medium">{cell}</span>;
                  }

                  return (
                    <td
                      key={cIdx}
                      className="px-3.5 py-2 border-r border-slate-800/40 last:border-r-0 whitespace-nowrap"
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  // Helper to format inline bold, code, and links
  const formatInline = (text: string): React.ReactNode => {
    // Regex for bold **text** and code `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            className="rounded-md bg-purple-100 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/40 px-1.5 py-0.5 font-mono text-[11px] text-purple-800 dark:text-purple-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      continue;
    } else {
      if (inTable) {
        flushTable(idx);
        inTable = false;
      }
    }

    if (!trimmed) {
      continue;
    }

    // Statutory Authority Callout pill
    if (
      trimmed.startsWith('*Statutory Authority:') ||
      trimmed.startsWith('*Statutory Reference:') ||
      trimmed.startsWith('Statutory Authority:')
    ) {
      const authorityText = trimmed.replace(/\*/g, '').replace('Statutory Authority:', '').replace('Statutory Reference:', '').trim();
      elements.push(
        <div
          key={idx}
          className="my-2 flex items-center space-x-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-300"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold text-indigo-800 dark:text-indigo-200">Statutory Authority:</span>
          <span>{authorityText}</span>
        </div>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      const heading = trimmed.replace('#### ', '');
      elements.push(
        <h4
          key={idx}
          className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 mt-3 mb-1 flex items-center gap-1.5"
        >
          <span>{formatInline(heading)}</span>
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const heading = trimmed.replace('### ', '');
      elements.push(
        <h3
          key={idx}
          className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-purple-200 dark:border-purple-500/20"
        >
          {formatInline(heading)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const heading = trimmed.replace('## ', '');
      elements.push(
        <h2
          key={idx}
          className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 pb-1 border-b border-purple-200 dark:border-purple-500/30"
        >
          {formatInline(heading)}
        </h2>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <div key={idx} className="flex items-start space-x-2.5 my-1 ml-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0" />
          <div className="leading-relaxed">{formatInline(bulletText)}</div>
        </div>
      );
      continue;
    }

    // Regular paragraphs
    elements.push(
      <p key={idx} className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed my-1.5">
        {formatInline(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
