import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessBannerProps {
  id?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessBanner: React.FC<SuccessBannerProps> = ({
  id,
  message,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`flex items-center justify-between rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-emerald-950/50 p-3.5 text-emerald-800 dark:text-emerald-200 shadow-2xs ${className}`}
    >
      <div className="flex items-center space-x-2.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">{message}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-800 dark:hover:text-emerald-200 transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
