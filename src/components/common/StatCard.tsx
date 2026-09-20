import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedCounter } from './AnimatedCounter.tsx';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: {
    value: string;
    label: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
  className?: string;
  animateValue?: boolean;
  isLive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-indigo-50 dark:bg-indigo-950/50',
  iconTextColor = 'text-indigo-600 dark:text-indigo-400',
  trend,
  badge,
  badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  onClick,
  className = '',
  animateValue = true,
  isLive = false,
}) => {
  // Parse prefix or suffix if value is e.g. "95%" or "NLe 12,000"
  let parsedPrefix = '';
  let parsedSuffix = '';
  let cleanValue = value;

  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      parsedSuffix = '%';
      cleanValue = value.slice(0, -1).trim();
    } else if (value.startsWith('NLe ')) {
      parsedPrefix = 'NLe ';
      cleanValue = value.slice(4).trim();
    } else if (value.startsWith('$')) {
      parsedPrefix = '$';
      cleanValue = value.slice(1).trim();
    }
  }

  return (
    <motion.div
      id={id}
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -20px 0px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      className={`relative group overflow-hidden rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-3.5 sm:p-4.5 shadow-xs backdrop-blur-md transition-all duration-300 hover:shadow-[0_12px_35px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.2)] hover:border-cyan-400/60 dark:hover:border-cyan-400/80 cyber-corners ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Top Cyber Laser Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40 group-hover:opacity-100 group-hover:h-[2px] transition-all duration-500 pointer-events-none" />

      {/* Dynamic ambient hover spotlight blur */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="pointer-events-none absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-gradient-to-tr from-violet-500/15 to-transparent blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-500" />

      {/* Animated bottom gradient accent beam */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-transparent via-cyan-400 dark:via-cyan-300 to-transparent transition-all duration-500 ease-out pointer-events-none" />

      {/* Top Header Row: Title & Animated Icon */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center space-x-1.5 min-w-0 pr-2">
          {isLive && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 dark:text-cyan-400/80 uppercase truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
            {title}
          </span>
        </div>

        <motion.div
          whileHover={{ scale: 1.2, rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.3 }}
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBgColor} ${iconTextColor} shrink-0 border border-cyan-500/20 shadow-2xs group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:border-cyan-400/50 transition-all`}
        >
          <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        </motion.div>
      </div>

      {/* Value Row with AnimatedCounter */}
      <div className="mt-2.5 flex items-baseline justify-between gap-2 relative z-10">
        <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate drop-shadow-[0_0_8px_rgba(6,182,212,0.15)]">
          {animateValue ? (
            <AnimatedCounter
              value={cleanValue}
              prefix={parsedPrefix}
              suffix={parsedSuffix}
              className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono"
            />
          ) : (
            value
          )}
        </div>

        {badge && (
          <motion.span
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.08 }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 transition-transform ${badgeColor}`}
          >
            {badge}
          </motion.span>
        )}
      </div>

      {/* Bottom Subtitle / Trend Row */}
      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 relative z-10">
          {subtitle && <span className="truncate font-medium">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold shrink-0 flex items-center space-x-1 ${
                trend.isNeutral
                  ? 'text-slate-600 dark:text-slate-300'
                  : trend.isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span className="inline-block transition-transform group-hover:translate-x-0.5">{trend.value}</span>
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{trend.label}</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
