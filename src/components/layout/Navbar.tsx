import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DarkModeToggle } from '../common/DarkModeToggle.tsx';
import { ApexLogo } from '../common/ApexLogo.tsx';
import { NotificationBell } from '../notifications/NotificationBell.tsx';
import {
  ScanLine,
  User,
  LogOut,
  Clock,
  Building2,
  ChevronDown,
  Menu,
} from 'lucide-react';

import { PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail, withPhotoCacheBuster } from '../../utils/photoSync.ts';

interface NavbarProps {
  onOpenScanner: () => void;
  activePage: string;
  setActivePage: (page: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  activePage,
  setActivePage,
  onToggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userPhotoError, setUserPhotoError] = useState(false);
  const [navPhotoVersion, setNavPhotoVersion] = useState<number>(Date.now());

  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;
      if (
        user &&
        (user.employeeId === detail.employeeId ||
          user.employee?.id === detail.employeeId ||
          user.employee?.employeeCode === detail.employeeCode)
      ) {
        setNavPhotoVersion(Date.now());
        setUserPhotoError(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
      }
    };
  }, [user]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const rawUserPhoto =
    user?.photoUrl ||
    user?.employee?.photoUrl ||
    (user?.employee?.employeeCode ? `/uploads/employees/${user.employee.employeeCode}.jpg` : null) ||
    (user?.employeeId ? `/uploads/employees/EMP-${user.employeeId}.jpg` : null);

  const userPhoto = withPhotoCacheBuster(rawUserPhoto, navPhotoVersion);

  const userInitials = user?.employee
    ? `${user.employee.firstName.charAt(0)}${user.employee.lastName.charAt(0)}`.toUpperCase()
    : (user?.username?.substring(0, 2).toUpperCase() || 'U');

  const getRoleBadgeColor = (roleName?: string) => {
    switch (roleName) {
      case 'Administrator':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      case 'HR Officer':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
      case 'Payroll Officer':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'Employee':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'Management':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 backdrop-blur-md transition-colors duration-150">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center space-x-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5">
          <ApexLogo size="sm" showSubtitle={true} />
        </div>

        {/* Live Clock Widget */}
        <div className="hidden lg:flex items-center space-x-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span>{time}</span>
        </div>
      </div>

      {/* Center/Right Action Bar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Dark Mode Toggle Button */}
        <DarkModeToggle />

        {/* Notifications Center */}
        <NotificationBell onOpenCenter={() => setActivePage('notifications')} />

        {/* Quick QR Scanner Launch Button */}
        <button
          onClick={onOpenScanner}
          className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-3 py-2 sm:px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition hover:shadow-indigo-200"
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">QR Terminal Scanner</span>
        </button>

        {/* User Role Badge */}
        {user && (
          <div className="hidden md:flex items-center space-x-2">
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${getRoleBadgeColor(
                user.roleName
              )}`}
            >
              {user.roleName}
            </span>
          </div>
        )}

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 p-1.5 pr-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-indigo-100 dark:bg-indigo-950/80 font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-slate-200 dark:ring-slate-700">
              {userPhoto && !userPhotoError ? (
                <img
                  src={userPhoto}
                  alt={user?.username || 'User'}
                  className="h-full w-full object-cover object-top"
                  onError={() => setUserPhotoError(true)}
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200 max-w-[100px] sm:max-w-[120px] truncate hidden sm:inline-block">
              {user?.employee ? `${user.employee.firstName}` : user?.username}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95">
              <div className="border-b border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center space-x-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-indigo-100 dark:bg-indigo-950/80 font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/30 dark:ring-indigo-400/30 shadow-xs">
                  {userPhoto && !userPhotoError ? (
                    <img
                      src={userPhoto}
                      alt={user?.username || 'User'}
                      className="h-full w-full object-cover object-top"
                      onError={() => setUserPhotoError(true)}
                    />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.username}</p>
                  <span className="mt-0.5 inline-block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                    {user?.roleName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActivePage('profile');
                  setShowUserMenu(false);
                }}
                className="flex w-full items-center space-x-2.5 px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
              >
                <User className="h-4 w-4 text-slate-400" />
                <span>My Profile & QR Code</span>
              </button>

              <button
                onClick={() => {
                  setActivePage('dashboard');
                  logout();
                  setShowUserMenu(false);
                }}
                className="flex w-full items-center space-x-2.5 border-t border-slate-100 dark:border-slate-700 px-4 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
