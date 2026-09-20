import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DarkModeToggle } from '../common/DarkModeToggle.tsx';
import { ApexLogo } from '../common/ApexLogo.tsx';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Settings,
  UserCheck,
  LogOut,
  Bell,
  X,
  RotateCcw,
  Bot,
  ScanLine,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AIAssistantLogo } from '../ai/AIAssistantLogo.tsx';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onRefreshData?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenScanner?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  onRefreshData,
  isMobileOpen = false,
  onCloseMobile,
  onOpenScanner,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, hasRole, logout } = useAuth();

  // Navigation items matching user specification:
  // Dashboard, Employees, Attendance, QR Scanner, Payroll, Departments, Reports, Notifications, AI Assistant, System Settings
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
      badge: null,
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      icon: Bot,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
      badge: 'Copilot',
      isAi: true,
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: Users,
      roles: ['Administrator', 'HR Officer', 'Management'],
      badge: null,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarCheck,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
      badge: 'Live',
    },
    {
      id: 'qrcodes',
      label: 'QR Scanner',
      icon: ScanLine,
      roles: ['Administrator', 'HR Officer'],
      badge: null,
    },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: DollarSign,
      roles: ['Administrator', 'Payroll Officer', 'Management', 'Employee'],
      badge: null,
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      roles: ['Administrator', 'HR Officer', 'Management'],
      badge: null,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
      badge: null,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
      badge: null,
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      roles: ['Administrator'],
      badge: null,
    },
    {
      id: 'users',
      label: 'Users',
      icon: ShieldCheck,
      roles: ['Administrator'],
      badge: null,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: UserCheck,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
      badge: null,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (!user) return false;
    if (user.roleName === 'Administrator') return true;
    return item.roles.includes(user.roleName);
  });

  const handleReseed = async () => {
    if (confirm('Reset database with complete sample records (departments, staff, logs, payroll)?')) {
      try {
        await api.reseedDatabase();
        alert('Database sample data refreshed successfully!');
        if (onRefreshData) onRefreshData();
      } catch (e) {
        alert('Failed to reset sample data');
      }
    }
  };

  const handleNavClick = (pageId: string) => {
    setActivePage(pageId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-2 left-2 z-50 flex flex-col rounded-3xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-in-out md:static md:translate-x-0 md:h-full md:rounded-3xl md:border md:border-cyan-500/20 md:dark:border-cyan-500/30 md:bg-white/90 md:dark:bg-slate-900/85 md:shadow-[0_10px_35px_rgba(0,0,0,0.3),0_0_20px_rgba(6,182,212,0.08)] md:backdrop-blur-2xl md:shrink-0 ${isMobileOpen ? 'translate-x-0 w-72 p-4' : '-translate-x-full md:translate-x-0'
          } ${isCollapsed ? 'md:w-20 md:p-3' : 'md:w-64 md:p-4'}`}
      >
        {/* Sidebar Bento Brand Header */}
        <div
          className={`flex items-center pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-2 shrink-0 transition-all ${isCollapsed ? 'justify-center flex-col gap-2.5 px-0' : 'justify-between px-1'
            }`}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <ApexLogo size="sm" variant="icon" />
              {onToggleCollapse && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={onToggleCollapse}
                  className="flex items-center justify-center h-7 w-7 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition cursor-pointer shadow-xs"
                  title="Expand Sidebar (Ctrl+B)"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          ) : (
            <>
              <ApexLogo size="xs" showSubtitle={true} />
              <div className="flex items-center space-x-1.5">
                {onToggleCollapse && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onToggleCollapse}
                    className="hidden md:flex items-center justify-center h-7 w-7 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition cursor-pointer shadow-xs"
                    title="Collapse Sidebar (Ctrl+B)"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onCloseMobile}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 md:hidden cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </>
          )}
        </div>

        {/* Navigation Links with Staggered Entrance & Sliding Spring Indicator */}
        <motion.nav
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.03,
              },
            },
          }}
          className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden pr-0.5"
        >
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[9.5px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-cyan-400/60 flex items-center justify-between">
              <span>OPERATIONAL SUITE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          )}

          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const isAi = item.isAi;

            return (
              <motion.button
                key={item.id}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  show: { opacity: 1, x: 0 },
                }}
                whileHover={{ scale: isCollapsed ? 1.08 : 1.015, x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavClick(item.id)}
                className={`relative group flex items-center rounded-xl select-none cursor-pointer transition-colors duration-200 ${isCollapsed ? 'justify-center h-10 w-full px-0' : 'w-full space-x-3 px-3.5 py-2.5 text-xs font-semibold'
                  } ${isActive
                    ? 'text-white'
                    : isAi
                      ? 'text-purple-600 dark:text-purple-300 hover:bg-purple-50/70 dark:hover:bg-purple-950/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {/* Active Sliding Spring Pill Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className={`absolute inset-0 rounded-xl ${isAi
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/40'
                      : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/40'
                      }`}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                {/* Left Active Glow Accent Line (only when expanded) */}
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeSidebarGlowLine"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}

                {/* Icon Container with Micro-rotation */}
                <div className="relative z-10 flex items-center justify-center shrink-0">
                  {isAi ? (
                    <div className="group-hover:rotate-12 transition-transform duration-300">
                      <AIAssistantLogo size="xs" withGlow={false} />
                    </div>
                  ) : (
                    <Icon
                      className={`h-4 w-4 transition-transform duration-300 group-hover:scale-115 group-hover:rotate-6 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                        }`}
                    />
                  )}

                  {/* Tiny glowing notification pip in collapsed mode */}
                  {isCollapsed && item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                    </span>
                  )}
                </div>

                {/* Label (Expanded mode) */}
                {!isCollapsed && <span className="relative z-10 truncate tracking-tight">{item.label}</span>}

                {/* Badges (Expanded mode) */}
                {!isCollapsed && item.badge && (
                  <span
                    className={`relative z-10 ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : isAi
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 animate-pulse'
                        : item.badge === 'Live'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Floating High-Tech Tooltip (Collapsed mode) */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3.5 hidden group-hover:flex items-center space-x-2 rounded-xl border border-cyan-500/40 bg-slate-900/95 px-3 py-1.5 text-xs font-mono text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] backdrop-blur-md z-50 pointer-events-none whitespace-nowrap">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.2 text-[9px] font-bold text-cyan-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}

          {/* Logout Button */}
          {isCollapsed ? (
            <div className="relative group w-full flex justify-center pt-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActivePage('dashboard');
                  logout();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="flex items-center justify-center h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-500/15 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] transition cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
              <div className="absolute left-full ml-3.5 hidden group-hover:flex items-center rounded-xl border border-rose-500/40 bg-slate-900/95 px-3 py-1.5 text-xs font-mono text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)] backdrop-blur-md z-50 pointer-events-none whitespace-nowrap">
                Logout
              </div>
            </div>
          ) : (
            <motion.button
              whileHover={{ x: 4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActivePage('dashboard');
                logout();
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition mt-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </motion.button>
          )}
        </motion.nav>

        {/* Action Panel in Sidebar */}
        <div
          className={`mt-auto pt-3 border-t border-slate-200/80 dark:border-slate-800 shrink-0 ${isCollapsed ? 'flex flex-col items-center space-y-2' : 'space-y-2.5'
            }`}
        >
          {isCollapsed ? (
            <>
              <div className="flex justify-center w-full">
                <DarkModeToggle variant="icon" />
              </div>
              {hasRole('Administrator') && (
                <div className="relative group flex justify-center w-full">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReseed}
                    className="flex items-center justify-center h-8 w-8 rounded-xl border border-cyan-500/20 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer shadow-xs"
                    title="Reset Demo Records"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </motion.button>
                  <div className="absolute left-full ml-3.5 hidden group-hover:flex items-center rounded-xl border border-cyan-500/40 bg-slate-900/95 px-3 py-1.5 text-xs font-mono text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] backdrop-blur-md z-50 pointer-events-none whitespace-nowrap">
                    Reset Records
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Theme</span>
                <DarkModeToggle variant="pill" />
              </div>

              {hasRole('Administrator') && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReseed}
                  className="flex w-full items-center justify-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                  <span>Reset Demo Records</span>
                </motion.button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
