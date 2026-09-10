import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  Maximize2,
  Edit3,
  Share2,
} from 'lucide-react';
import { downloadAsPdf, downloadAsCsv } from '../../utils/exportDocument.ts';

interface AIMessageActionsProps {
  content: string;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onFullView?: () => void;
  onShare?: () => void;
  onCopySuccess?: () => void;
}

export const AIMessageActions: React.FC<AIMessageActionsProps> = ({
  content,
  isEditing = false,
  onStartEdit,
  onFullView,
  onShare,
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);

  // 1. Response Copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (onCopySuccess) onCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // 2. Response Download as PDF
  const handleDownloadPdf = () => {
    downloadAsPdf({
      title: 'Apex AI Workforce Assistant Report',
      content,
      filenamePrefix: 'apex_ai_response',
      metadata: {
        Source: 'Apex AI Copilot',
      },
    });
  };

  // 3. Response Download as CSV
  const handleDownloadCsv = () => {
    downloadAsCsv({
      title: 'Apex AI Workforce Assistant Report',
      content,
      filenamePrefix: 'apex_ai_response',
      metadata: {
        Source: 'Apex AI Copilot',
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-400">
      {/* 1. Copy Action */}
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center space-x-1 rounded-md px-1.5 py-1 text-[10px] font-medium hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-700 dark:hover:text-slate-200 transition"
        title="Copy response text"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </>
        )}
      </button>

      {/* 2. PDF Download Action */}
      <button
        type="button"
        onClick={handleDownloadPdf}
        className="flex items-center space-x-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
        title="Download response as PDF document"
      >
        <FileText className="h-3 w-3" />
        <span>PDF</span>
      </button>

      {/* 3. CSV Download Action */}
      <button
        type="button"
        onClick={handleDownloadCsv}
        className="flex items-center space-x-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
        title="Download response table/data as CSV spreadsheet"
      >
        <FileSpreadsheet className="h-3 w-3" />
        <span>CSV</span>
      </button>

      {/* 4. Full View Action */}
      {onFullView && (
        <button
          type="button"
          onClick={onFullView}
          className="flex items-center space-x-1 rounded-md px-1.5 py-1 text-[10px] font-medium hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-700 dark:hover:text-slate-200 transition"
          title="Open in expanded full view"
        >
          <Maximize2 className="h-3 w-3" />
          <span>Full View</span>
        </button>
      )}

      {/* 5. Edit Action */}
      {onStartEdit && !isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className="flex items-center space-x-1 rounded-md px-1.5 py-1 text-[10px] font-medium hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-700 dark:hover:text-slate-200 transition"
          title="Edit response content"
        >
          <Edit3 className="h-3 w-3" />
          <span>Edit</span>
        </button>
      )}

      {/* 6. Share to Fellow Employee Action */}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="flex items-center space-x-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition"
          title="Share directly to fellow employee"
        >
          <Share2 className="h-3 w-3" />
          <span>Share</span>
        </button>
      )}
    </div>
  );
};
