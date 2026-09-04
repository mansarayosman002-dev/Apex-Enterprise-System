import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  id?: string;
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  id,
  title = 'Operation Error',
  message,
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`flex items-start justify-between rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/50 p-4 text-rose-800 dark:text-rose-200 shadow-2xs ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-rose-900 dark:text-rose-100">{title}</h4>
          <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2.5 flex items-center space-x-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-700 dark:hover:text-rose-200 transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
