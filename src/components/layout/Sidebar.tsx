import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DarkModeToggle } from '../common/DarkModeToggle.tsx';
import { ApexLogo } from '../common/ApexLogo.tsx';
import {
  LayoutDashboard,
  Users,
  Building2,
  QrCode,
  CalendarCheck,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Settings,
  UserCheck,
  LogOut,
  Sparkles,
  Database,
  Bell,
  X,
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onRefreshData?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  onRefreshData,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, hasRole, logout } = useAuth();

  // All exact navigation items specified in specification
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: Users,
      roles: ['Administrator', 'HR Officer', 'Management'],
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      roles: ['Administrator', 'HR Officer', 'Management'],
    },
    {
      id: 'qrcodes',
      label: 'QR Codes',
      icon: QrCode,
      roles: ['Administrator', 'HR Officer'],
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarCheck,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: DollarSign,
      roles: ['Administrator', 'Payroll Officer', 'Management', 'Employee'],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    },
    {
      id: 'users',
      label: 'Users',
      icon: ShieldCheck,
      roles: ['Administrator'],
    },
    {
      id: 'ai-assistant',
      label: 'AI Copilot & Hub',
      icon: Sparkles,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['Administrator'],
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: UserCheck,
      roles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
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
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-transform duration-300 md:static md:translate-x-0 md:bg-slate-50/60 md:dark:bg-slate-900/60 md:min-h-[calc(100vh-4rem)] ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between pb-3 md:hidden border-b border-slate-100 dark:border-slate-800 mb-2">
          <ApexLogo size="xs" showSubtitle={false} />
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Enterprise Suite
          </div>
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.id === 'ai-assistant' ? (
                  <img
                    src="/apex-copilot-logo.png"
                    alt="AI Copilot"
                    className="h-4 w-4 rounded-full object-cover ring-1 ring-purple-400/50 shadow-xs"
                  />
                ) : (
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Logout Button in Persistent Sidebar */}
          <button
            onClick={() => {
              setActivePage('dashboard');
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition mt-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </nav>

        {/* Action Panel in Sidebar */}
        <div className="mt-auto space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Theme</span>
            <DarkModeToggle variant="pill" />
          </div>

          {hasRole('Administrator') && (
            <button
              onClick={handleReseed}
              className="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
              <span>Reset Demo Records</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
