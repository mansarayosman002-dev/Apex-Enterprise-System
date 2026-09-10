import React from 'react';
import { AIMessageRenderer } from './AIMessageRenderer.tsx';
import {
  X,
  Maximize2,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  Share2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { downloadAsPdf, downloadAsCsv } from '../../utils/exportDocument.ts';

interface AIFullViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  isCopied?: boolean;
}

export const AIFullViewModal: React.FC<AIFullViewModalProps> = ({
  isOpen,
  onClose,
  content,
  title = 'Apex AI Assistant Report',
  onCopy,
  onShare,
  isCopied = false,
}) => {
  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    downloadAsPdf({
      title,
      content,
      filenamePrefix: 'apex_ai_report',
      metadata: {
        Source: 'Apex AI Copilot',
      },
    });
  };

  const handleDownloadCsv = () => {
    downloadAsCsv({
      title,
      content,
      filenamePrefix: 'apex_ai_report',
      metadata: {
        Source: 'Apex AI Copilot',
      },
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden border border-purple-400/40 shadow-xs">
              <img src="/apex-copilot-logo.png" alt="Apex AI Copilot" className="h-full w-full object-cover" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Full View
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Expanded document inspection and report export
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-1.5">
            {onCopy && (
              <button
                type="button"
                onClick={onCopy}
                className="flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                title="Copy to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-2xs"
              title="Download report as PDF document"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>

            {/* Download CSV */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-2xs"
              title="Download report as CSV spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>

            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                title="Share to fellow employee"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Print document"
            >
              <Printer className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close full view"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="max-w-3xl mx-auto rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs">
            <AIMessageRenderer content={content} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
          <span>Enterprise AI Workforce Intelligence • Apex Enterprise SL Ltd</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
