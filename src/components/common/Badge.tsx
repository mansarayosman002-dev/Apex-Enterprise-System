import React from 'react';

export type BadgeVariant =
  | 'present'
  | 'absent'
  | 'late'
  | 'overtime'
  | 'early'
  | 'draft'
  | 'processed'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'admin'
  | 'hr'
  | 'payroll'
  | 'employee'
  | 'manager'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant | string;
  label?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  label,
  children,
  size = 'sm',
  className = '',
}) => {
  const norm = (variant || '').toString().toLowerCase();

  let styles = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (norm.includes('present') || norm.includes('active') || norm.includes('approved') || norm.includes('paid')) {
    styles = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60';
  } else if (norm.includes('late') || norm.includes('pending') || norm.includes('draft')) {
    styles = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60';
  } else if (norm.includes('absent') || norm.includes('inactive') || norm.includes('rejected')) {
    styles = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60';
  } else if (norm.includes('overtime') || norm.includes('processed')) {
    styles = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60';
  } else if (norm.includes('admin') || norm.includes('manager')) {
    styles = 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60';
  } else if (norm.includes('hr')) {
    styles = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${sizeClasses} ${styles} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      <span>{children || label || variant}</span>
    </span>
  );
};
