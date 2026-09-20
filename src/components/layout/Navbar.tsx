import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DarkModeToggle } from '../common/DarkModeToggle.tsx';
import { ApexLogo } from '../common/ApexLogo.tsx';
import { NotificationBell } from '../notifications/NotificationBell.tsx';
import {
  ScanLine,
  User,
  LogOut,
  Clock,
  ChevronDown,
  Menu,
  Search,
  Wifi,
  X,
  ArrowRight,
  ShieldCheck,
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
  const [dateStr, setDateStr] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userPhotoError, setUserPhotoError] = useState(false);
  const [navPhotoVersion, setNavPhotoVersion] = useState<number>(Date.now());

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Quick searchable navigation routes
  const searchableRoutes = [
    { title: 'Dashboard', page: 'dashboard', category: 'Overview', keywords: 'home stats metrics' },
    { title: 'AI Assistant', page: 'ai-assistant', category: 'Intelligence', keywords: 'copilot chat nassit questions' },
    { title: 'Employees', page: 'employees', category: 'Staff', keywords: 'staff roster directory personnel' },
    { title: 'Attendance', page: 'attendance', category: 'Tracking', keywords: 'checkin checkout timesheet shifts logs' },
    { title: 'QR Scanner', page: 'qrcodes', category: 'Terminal', keywords: 'badges kiosk camera credentials' },
    { title: 'Payroll Ledger', page: 'payroll', category: 'Finance', keywords: 'salaries payslip nassit paye allowances' },
    { title: 'Departments', page: 'departments', category: 'Organization', keywords: 'units teams divisions' },
    { title: 'Reports & Audits', page: 'reports', category: 'Analytics', keywords: 'export pdf excel stats statements' },
    { title: 'Notifications', page: 'notifications', category: 'Alerts', keywords: 'messages notices broadcasts' },
    { title: 'System Settings', page: 'settings', category: 'System', keywords: 'policies configuration branding rules' },
    { title: 'My Profile', page: 'profile', category: 'Account', keywords: 'badge credentials photo qr security' },
  ];

  const searchResults = searchQuery.trim()
    ? searchableRoutes.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.keywords.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  // Global keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Live Clock with seconds ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { month: 'short', day: 'numeric' }));
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

  const handleSelectSearchResult = (page: string) => {
    setActivePage(page);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  return (
    <header className="relative z-40 h-16 w-full rounded-2xl md:rounded-3xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 px-3.5 sm:px-5 md:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.3),0_0_20px_rgba(6,182,212,0.08)] backdrop-blur-2xl flex items-center justify-between shrink-0 transition-colors duration-150">
      {/* =========================================================
          LEFT: Mobile Menu, Breadcrumb Pill & Animated Live Clock
      ========================================================= */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onToggleMobileSidebar && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onToggleMobileSidebar}
            className="rounded-xl border border-cyan-500/30 p-2 text-slate-600 dark:text-cyan-300 hover:bg-cyan-500/10 md:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </motion.button>
        )}

        {/* Mobile Logo Only (Desktop logo sits inside the Sidebar Bento Box) */}
        <div className="flex md:hidden items-center space-x-2">
          <ApexLogo size="xs" showSubtitle={false} />
        </div>


        {/* Desktop Active View Breadcrumb Bento Pill */}
        <div className="hidden md:flex items-center space-x-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-cyan-500/20 px-3 py-1.5 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
          <span className="text-slate-400 dark:text-slate-500 font-normal">SYS</span>
          <span className="text-cyan-500">/</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
            {activePage === 'ai-assistant' ? 'AI COPILOT' : activePage.replace(/-/g, ' ')}
          </span>
        </div>

        {/* Live Real-Time Clock Indicator with Pulsing Emerald Ticker */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden xl:flex items-center space-x-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-cyan-500/20 font-mono shadow-2xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Clock className="h-3.5 w-3.5 text-cyan-500" />
          <span className="font-bold tracking-wider">{time}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans border-l border-slate-300 dark:border-slate-700 pl-1.5">
            {dateStr}
          </span>
        </motion.div>

        {/* Animated Network Status Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="hidden 2xl:flex items-center space-x-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-[10px] font-mono font-semibold text-cyan-700 dark:text-cyan-300"
          title="Network Connection: Quantum Encrypted Sync"
        >
          <Wifi className="h-3 w-3 text-cyan-400 animate-pulse" />
          <span>SYNC • 0.4ms</span>
        </motion.div>
      </div>

      {/* =========================================================
          CENTER: Global Search Input with Expand & Quick Jump
      ========================================================= */}
      <div className="relative flex-1 max-w-xs sm:max-w-sm lg:max-w-md mx-3 sm:mx-6">
        <motion.div
          animate={{
            boxShadow: isSearchFocused ? '0 0 18px rgba(6, 182, 212, 0.35)' : 'none',
          }}
          className={`relative flex items-center rounded-xl border bg-slate-50/80 dark:bg-slate-800/70 backdrop-blur-md transition-all duration-200 ${isSearchFocused
            ? 'border-cyan-500 dark:border-cyan-400 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-cyan-500/20'
            }`}
        >
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            <Search className={`h-4 w-4 transition-colors ${isSearchFocused ? 'text-cyan-500 dark:text-cyan-400' : ''}`} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search modules, staff, payroll..."
            className="w-full bg-transparent py-2 pl-9 pr-14 text-xs font-mono sm:text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400/80 focus:outline-hidden"
          />

          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchFocused(false);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="pointer-events-none absolute right-2.5 hidden sm:flex items-center space-x-1">
              <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          )}
        </motion.div>

        {/* Global Search Results Dropdown */}
        <AnimatePresence>
          {isSearchFocused && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden z-50 p-1.5 max-h-80 overflow-y-auto"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Jump
              </div>
              {searchResults.map((result) => (
                <motion.button
                  key={result.page}
                  whileHover={{ x: 3 }}
                  onClick={() => handleSelectSearchResult(result.page)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{result.title}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({result.category})</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================
          RIGHT: Scanner, Theme, Notification Bell, User Menu
      ========================================================= */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Dark/Light Mode Toggle with Micro-Interaction */}
        <DarkModeToggle />

        {/* Notification Bell with Unread Counter & Ring Shake */}
        <NotificationBell onOpenCenter={() => setActivePage('notifications')} />

        {/* Quick QR Terminal Scanner Launch Button with Hover Pulse */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenScanner}
          className="hidden sm:flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 sm:px-3.5 text-xs font-semibold text-white shadow-xs transition hover:shadow-md hover:shadow-indigo-500/25 cursor-pointer"
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden md:inline">Terminal Scanner</span>
        </motion.button>

        {/* User Profile Dropdown with Smooth Spring Animation */}
        <div className="relative z-50" ref={userMenuRef}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 p-1.5 pr-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer"
          >
            {/* User Avatar with Ring and Live Status Dot */}
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-indigo-100 dark:bg-indigo-950/80 font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/20 shadow-xs">
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
              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
            </div>

            <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] sm:max-w-[120px] truncate hidden sm:inline-block">
              {user?.employee ? user.employee.firstName : user?.username}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </motion.button>

          {/* Dropdown Popover */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 shadow-2xl z-50 backdrop-blur-md overflow-hidden ring-1 ring-slate-950/5 dark:ring-white/10"
              >
                {/* User Info Header */}
                <div className="border-b border-slate-100 dark:border-slate-700/80 px-4 py-3 flex items-center space-x-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-indigo-100 dark:bg-indigo-950/80 font-semibold text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-500/30 shadow-xs">
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
                    <span className="mt-0.5 inline-block text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {user?.roleName}
                    </span>
                  </div>
                </div>

                {/* Profile Link */}
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setActivePage('profile');
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center space-x-2.5 px-4 py-2.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>My Profile & QR Badge</span>
                </motion.button>

                {/* Sign Out Link */}
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setActivePage('dashboard');
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center space-x-2.5 border-t border-slate-100 dark:border-slate-700/80 px-4 py-2.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
