import React, { useState } from 'react';
import { Maximize2, FileText, Download, Share2, Copy, Check } from 'lucide-react';
import { exportAiResponseToPdf, exportAiResponseToExcel, shareAiResponse } from '../../utils/aiExportUtils.ts';

interface AIMessageActionToolbarProps {
  content: string;
  title?: string;
  username?: string;
  onOpenFullView: () => void;
  compact?: boolean;
}

export const AIMessageActionToolbar: React.FC<AIMessageActionToolbarProps> = ({
  content,
  title = 'AI Analysis & Intelligence Report',
  username = 'Authorized User',
  onOpenFullView,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showStatus('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showStatus('Failed to copy');
    }
  };

  const handlePdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = exportAiResponseToPdf(title, content, username);
    if (ok) showStatus('Opening PDF preview...');
  };

  const handleExcel = (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = exportAiResponseToExcel(title, content);
    if (ok) showStatus('Downloaded Excel (.xls)');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await shareAiResponse(title, content);
    if (res === 'copied') showStatus('Link/Report copied');
    else if (res === 'shared') showStatus('Shared');
  };

  return (
    <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs">
      {/* 1. Full View Action */}
      <button
        type="button"
        onClick={onOpenFullView}
        className="inline-flex items-center space-x-1 rounded-md bg-purple-100/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 px-2.5 py-1 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 hover:text-purple-900 dark:hover:text-white transition active:scale-95"
        title="Open Full View Modal"
      >
        <Maximize2 className="h-3 w-3" />
        <span className={compact ? 'hidden sm:inline' : ''}>Full View</span>
      </button>

      {/* 2. Save as PDF Action */}
      <button
        type="button"
        onClick={handlePdf}
        className="inline-flex items-center space-x-1 rounded-md bg-indigo-100/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-2.5 py-1 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 hover:text-indigo-900 dark:hover:text-white transition active:scale-95"
        title="Save as PDF document"
      >
        <FileText className="h-3 w-3" />
        <span className={compact ? 'hidden sm:inline' : ''}>Save as PDF</span>
      </button>

      {/* 3. Save as Excel Action */}
      <button
        type="button"
        onClick={handleExcel}
        className="inline-flex items-center space-x-1 rounded-md bg-emerald-100/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 hover:text-emerald-900 dark:hover:text-white transition active:scale-95"
        title="Extract table & save as Excel"
      >
        <Download className="h-3 w-3" />
        <span className={compact ? 'hidden sm:inline' : ''}>Save as Excel</span>
      </button>

      {/* 4. Share Action */}
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center space-x-1 rounded-md bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition active:scale-95"
        title="Share report"
      >
        <Share2 className="h-3 w-3" />
        <span className={compact ? 'hidden sm:inline' : ''}>Share</span>
      </button>

      {/* 5. Copy Text Action */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center space-x-1 rounded-md bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition active:scale-95"
        title="Copy response text"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
        <span className={compact ? 'hidden sm:inline' : ''}>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {/* Temporary Toast Badge */}
      {statusMessage && (
        <span className="ml-auto inline-flex items-center rounded bg-purple-900/90 border border-purple-500/50 px-2 py-0.5 text-[11px] font-medium text-purple-200 animate-in fade-in">
          {statusMessage}
        </span>
      )}
    </div>
  );
};
