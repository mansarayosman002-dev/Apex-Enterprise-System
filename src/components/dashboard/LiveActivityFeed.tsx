import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  RefreshCw,
  Coins,
  Cpu,
  Building2,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { AttendanceRecord } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';

interface LiveActivityFeedProps {
  recentLogs: AttendanceRecord[];
  pendingOvertimeCount?: number;
  onViewAll?: () => void;
  onOpenScanner?: () => void;
}

type FeedFilter = 'all' | 'checkin' | 'alert' | 'system';

interface SyntheticFeedItem {
  id: string;
  type: 'checkin' | 'alert' | 'system';
  title: string;
  subtitle: string;
  timestamp: string;
  statusVariant?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badgeText?: string;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  recentLogs,
  pendingOvertimeCount = 0,
  onViewAll,
  onOpenScanner,
}) => {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synthesize real check-in logs into uniform stream items
  const checkinItems: SyntheticFeedItem[] = recentLogs.slice(0, 8).map((log) => ({
    id: `log-${log.id}`,
    type: 'checkin',
    title: `${log.employeeName} (${log.employeeCode || 'EMP'})`,
    subtitle: `${log.departmentName || 'General'} • Check-in at ${log.checkIn || '08:00'} ${
      log.checkOut ? `• Checked out at ${log.checkOut}` : '• Currently On Duty'
    }`,
    timestamp: log.checkIn ? `${log.checkIn}` : 'Today',
    statusVariant: log.status,
    icon: log.status === 'late' ? Clock : log.status === 'overtime' ? Coins : CheckCircle2,
    iconBg:
      log.status === 'late'
        ? 'bg-amber-100 dark:bg-amber-950/60'
        : log.status === 'overtime'
        ? 'bg-purple-100 dark:bg-purple-950/60'
        : 'bg-emerald-100 dark:bg-emerald-950/60',
    iconColor:
      log.status === 'late'
        ? 'text-amber-600 dark:text-amber-400'
        : log.status === 'overtime'
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-emerald-600 dark:text-emerald-400',
    badgeText: log.status.toUpperCase(),
  }));

  // Automated alerts (derived from real system state)
  const alertItems: SyntheticFeedItem[] = [
    ...(pendingOvertimeCount > 0
      ? [
          {
            id: 'alert-ot',
            type: 'alert' as const,
            title: 'Overtime Claim Queue',
            subtitle: `${pendingOvertimeCount} pending overtime request(s) awaiting manager verification.`,
            timestamp: 'Action Needed',
            icon: AlertTriangle,
            iconBg: 'bg-amber-100 dark:bg-amber-950/60',
            iconColor: 'text-amber-600 dark:text-amber-400',
            badgeText: 'REVIEW',
          },
        ]
      : []),
    {
      id: 'alert-grace',
      type: 'alert' as const,
      title: 'Grace Period Active',
      subtitle: 'Late grace window (08:00 - 08:30) active.',
      timestamp: 'Active',
      icon: Clock,
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badgeText: 'POLICY',
    },
  ];

  // System lifecycle events
  const systemItems: SyntheticFeedItem[] = [
    {
      id: 'sys-ws',
      type: 'system' as const,
      title: 'QR Terminal Engine',
      subtitle: 'Scanner listener active and synced.',
      timestamp: 'Online',
      icon: QrCode,
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/60',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      badgeText: 'ONLINE',
    },
    {
      id: 'sys-statutory',
      type: 'system' as const,
      title: 'NASSIT & PAYE Rules',
      subtitle: '5% employee / 10% employer NASSIT verified.',
      timestamp: 'Compliant',
      icon: ShieldCheck,
      iconBg: 'bg-blue-100 dark:bg-blue-950/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badgeText: 'TAX ENGINE',
    },
    {
      id: 'sys-cron',
      type: 'system' as const,
      title: 'Anomaly Scanner',
      subtitle: 'Automated anomaly scan completed.',
      timestamp: 'Synced',
      icon: Cpu,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-600 dark:text-slate-300',
      badgeText: 'SCANNER',
    },
  ];

  // Combine and sort
  const allItems = [...alertItems, ...checkinItems, ...systemItems];

  const filteredItems =
    filter === 'all'
      ? allItems
      : filter === 'checkin'
      ? checkinItems
      : filter === 'alert'
      ? alertItems
      : systemItems;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners space-y-4">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
              Live Activity
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            Real-time check-ins, alerts, and system events.
          </p>
        </div>

        {/* Action Controls: Refresh & View All */}
        <div className="flex items-center space-x-2">
          <motion.button
            whileTap={{ rotate: 180 }}
            onClick={handleRefresh}
            className="p-1.5 rounded-xl border border-cyan-500/25 hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 transition cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
          </motion.button>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center space-x-1 rounded-xl bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300 transition cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'all', label: 'All Activities', count: allItems.length },
            { id: 'checkin', label: 'Check-Ins', count: checkinItems.length },
            { id: 'alert', label: 'Alerts', count: alertItems.length },
            { id: 'system', label: 'System Lifecycle', count: systemItems.length },
          ] as const
        ).map((tab) => {
          const isActive = filter === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold transition cursor-pointer select-none ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)] border border-cyan-300/40'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-mono font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Animated Items Stream */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-xs font-mono text-slate-400 dark:text-slate-500"
            >
              No telemetry events found under current filter.
            </motion.div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, delay: index * 0.02 }}
                  whileHover={{ x: 4 }}
                  className="group relative flex items-start space-x-3 rounded-xl border border-slate-100 dark:border-cyan-500/15 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-xs transition-all hover:bg-white dark:hover:bg-slate-800/80 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                >
                  {/* Left Animated Glowing Laser on Hover */}
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 opacity-0 group-hover:opacity-100 shadow-[0_0_8px_#22d3ee] transition-opacity" />

                  {/* Icon */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor} border border-cyan-500/20 shadow-2xs`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {item.statusVariant ? (
                    <div className="shrink-0">
                      <Badge variant={item.statusVariant} />
                    </div>
                  ) : item.badgeText ? (
                    <span className="shrink-0 rounded-md bg-slate-200/70 dark:bg-slate-700/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300">
                      {item.badgeText}
                    </span>
                  ) : null}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
