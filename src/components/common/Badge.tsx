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

  let styles = 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (norm.includes('present') || norm.includes('active') || norm.includes('approved') || norm.includes('paid')) {
    styles = 'bg-emerald-500/10 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
  } else if (norm.includes('late') || norm.includes('pending') || norm.includes('draft')) {
    styles = 'bg-amber-500/10 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
  } else if (norm.includes('absent') || norm.includes('inactive') || norm.includes('rejected')) {
    styles = 'bg-rose-500/10 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]';
  } else if (norm.includes('overtime') || norm.includes('processed')) {
    styles = 'bg-cyan-500/10 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]';
  } else if (norm.includes('admin') || norm.includes('manager')) {
    styles = 'bg-purple-500/10 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]';
  } else if (norm.includes('hr')) {
    styles = 'bg-blue-500/10 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[9.5px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold tracking-wider uppercase border ${sizeClasses} ${styles} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse shadow-[0_0_6px_currentColor]" />
      <span>{children || label || variant}</span>
    </span>
  );
};
