import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import { DarkModeToggle } from '../components/common/DarkModeToggle.tsx';
import { ApexLogo } from '../components/common/ApexLogo.tsx';
import heroVisual from '../assets/login_hero_brand.jpg';
import {
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Eye,
  EyeOff,
  Building2,
  Clock,
  Coins,
  ArrowRight,
  Sparkles,
  Fingerprint,
  Cpu,
  BadgeCheck,
  UserCheck,
  X,
} from 'lucide-react';

interface RoleTabItem {
  id: string;
  label: string;
  name: string;
  roleTitle: string;
  desc: string;
  username: string;
  defaultPass: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const ROLE_TABS: RoleTabItem[] = [
  {
    id: 'admin',
    label: 'Admin',
    name: 'Osman A. Mansaray',
    roleTitle: 'Administrator',
    desc: 'Full System Administration & Governance',
    username: 'admin',
    defaultPass: 'password123',
    icon: ShieldCheck,
    accentColor: 'text-cyan-400',
  },
  {
    id: 'hr.officer',
    label: 'HR Officer',
    name: 'Fatmata Sesay',
    roleTitle: 'HR Officer',
    desc: 'Staff Records, Departments & Attendance',
    username: 'hr.officer',
    defaultPass: 'password123',
    icon: UserCheck,
    accentColor: 'text-teal-400',
  },
  {
    id: 'payroll.officer',
    label: 'Payroll',
    name: 'Mohamed S. Kamara',
    roleTitle: 'Payroll Officer',
    desc: 'NLe Payroll & NASSIT/PAYE Processing',
    username: 'payroll.officer',
    defaultPass: 'password123',
    icon: Coins,
    accentColor: 'text-indigo-400',
  },
  {
    id: 'aminata.turay',
    label: 'Employee',
    name: 'Aminata Turay',
    roleTitle: 'Employee',
    desc: 'Personal QR Attendance & Digital Payslips',
    username: 'aminata.turay',
    defaultPass: 'password123',
    icon: QrCode,
    accentColor: 'text-emerald-400',
  },
];

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeRoleItem = ROLE_TABS.find((r) => r.id === selectedRole);

  const handleTabSelect = (role: RoleTabItem) => {
    if (selectedRole === role.id) {
      setSelectedRole(null);
      setError(null);
      return;
    }
    // Set active role tab only - do NOT autofill credentials
    setSelectedRole(role.id);
    setError(null);
  };

  const handleClearSelection = () => {
    setSelectedRole(null);
    setError(null);
  };

  const getUsernamePlaceholder = () => {
    switch (selectedRole) {
      case 'admin':
        return 'Enter admin username (e.g. admin)';
      case 'hr.officer':
        return 'Enter HR username (e.g. hr.officer)';
      case 'payroll.officer':
        return 'Enter payroll username (e.g. payroll.officer)';
      case 'aminata.turay':
        return 'Enter employee ID / code (e.g. EMP-1001)';
      default:
        return 'e.g. admin or EMP-1001';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('invalid username') ||
        msg.toLowerCase().includes('401') ||
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('credentials')
      ) {
        setError('Incorrect username or password. Please verify your credentials and try again.');
      } else {
        setError(msg || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased relative overflow-hidden">
      {/* Background Animated Ambient Lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

      {/* =========================================================
          LEFT HALF: Striking Brand Visual & Feature Showcase
      ========================================================= */}
      <div className="relative w-full lg:w-1/2 flex flex-col justify-between p-4 sm:p-8 lg:p-14 overflow-hidden bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800/80 shrink-0">
        {/* Background Visual Asset with Atmospheric Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroVisual}
            alt="Apex HRMS Visual"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.75] contrast-110"
          />
          {/* Multi-layer Dynamic Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent" />

          {/* Floating animated glowing orbs */}
          <motion.div
            animate={{
              x: [0, 20, 0, -20, 0],
              y: [0, -25, 0, 25, 0],
              scale: [1, 1.15, 1, 0.95, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/4 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
              x: [0, -25, 0, 25, 0],
              y: [0, 25, 0, -25, 0],
              scale: [1, 1.2, 1, 0.9, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-1/4 left-10 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"
          />
        </div>

        {/* Top Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10"
        >
          <div className="flex items-center justify-between">
            <ApexLogo size="md" inverted={true} />
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wide bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md shadow-lg shadow-cyan-950/50"
            >
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Sierra Leone Enterprise HRMS</span>
            </motion.span>
          </div>
        </motion.div>

        {/* Center Content Section */}
        <div className="relative z-10 my-auto py-3 sm:py-6 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 sm:py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] sm:text-xs font-semibold mb-2 sm:mb-3 backdrop-blur-xs">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 animate-pulse" />
              <span>Next-Gen Enterprise Platform</span>
            </div>

            <h1 className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Smart Attendance & <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                Automated Payroll
              </span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm lg:text-base text-slate-300 max-w-lg leading-relaxed font-normal hidden sm:block">
              Biometric identity verification, dynamic QR employee badges, 15-minute grace engine calculations, and statutory Sierra Leone (NLe) payroll compliance.
            </p>
          </motion.div>

          {/* =========================================================
              ANIMATED HOLOGRAPHIC SMART BADGE PREVIEW (Desktop & Tablet)
          ========================================================= */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-6 hidden md:block max-w-lg"
          >
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 overflow-hidden animate-float-slow group">
              {/* Animated Holographic Laser Scanline */}
              <div className="pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-scanline z-20" />

              {/* Subtle Shimmer Sweeper Overlay */}
              <div className="pointer-events-none absolute inset-0 animate-shimmer opacity-40 z-10" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
                    <div className="h-full w-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden">
                      <Fingerprint className="h-7 w-7 text-cyan-400 animate-pulse" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-xs font-bold text-white tracking-wide">Live Smart Badge Terminal</h3>
                      <BadgeCheck className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-cyan-300/80 font-mono tracking-wider">SECURE TOKEN: 256-BIT AES ACTIVE</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>SYNCHRONIZED</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Key Value Feature Badges - hidden on small phones to keep login form immediately accessible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg"
          >
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/50 transition cursor-default group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition">
                <QrCode className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">Smart QR Badges</h4>
                <p className="text-[11px] text-slate-400 truncate">Passport photo & camera scanning</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-950/50 transition cursor-default group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition">
                <Clock className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">15-Min Grace Engine</h4>
                <p className="text-[11px] text-slate-400 truncate">Automated on-time / late detection</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/50 transition cursor-default group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition">
                <Coins className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">NLe Payroll & PAYE</h4>
                <p className="text-[11px] text-slate-400 truncate">NASSIT & overtime computation</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-950/50 transition cursor-default group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">Role-Based Access</h4>
                <p className="text-[11px] text-slate-400 truncate">5-tier RBAC & immutable logs</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Trust Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 pt-4 sm:pt-6 border-t border-slate-800/60 hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] sm:text-xs text-slate-400 gap-2"
        >
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Apex Enterprise Solutions (SL) Ltd. • Freetown, Sierra Leone</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] font-mono">
            <Cpu className="h-3 w-3 text-cyan-500" />
            <span>v2.4 Core Engine</span>
          </div>
        </motion.div>
      </div>

      {/* =========================================================
          RIGHT HALF: Authentication Terminal
      ========================================================= */}
      <motion.div
        initial={{ opacity: 0, x: 25 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full lg:w-1/2 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/95 p-4 sm:p-10 lg:p-14 overflow-y-auto transition-colors duration-200 relative"
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between pb-4 sm:pb-6">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-full backdrop-blur-md shadow-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>TLS 1.3 / SSL Encrypted Session</span>
          </div>
          <div className="ml-auto flex items-center space-x-3">
            <DarkModeToggle />
          </div>
        </div>

        {/* Main Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-4 sm:py-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 text-center sm:text-left"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Workplace Login
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Select your role tab or enter credentials to access your dashboard terminal.
            </p>
          </motion.div>

          {/* Animated Role Selection Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Choose Role to Login
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Click tab to choose role
              </span>
            </div>

            {/* Segmented Tabs Control with LayoutId spring animation */}
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700/60 backdrop-blur-md shadow-xs">
              {ROLE_TABS.map((role) => {
                const isSelected = selectedRole === role.id;
                const IconComponent = role.icon;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleTabSelect(role)}
                    className={`relative z-10 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center space-y-1 cursor-pointer select-none ${isSelected
                      ? 'text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                      }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeRoleTab"
                        className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 rounded-xl shadow-lg shadow-cyan-600/30 border border-cyan-400/30"
                        transition={{
                          type: 'spring',
                          stiffness: 480,
                          damping: 32,
                        }}
                      />
                    )}

                    <div className="relative z-10 flex items-center space-x-1.5">
                      <motion.div
                        animate={isSelected ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] } : { scale: 1 }}
                        transition={{ duration: 0.35 }}
                      >
                        <IconComponent className={`h-4 w-4 ${isSelected ? 'text-white' : role.accentColor}`} />
                      </motion.div>
                      <span className="text-xs font-semibold tracking-tight">{role.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Animated Active Role Details Pill / Banner */}
            <AnimatePresence mode="wait">
              {activeRoleItem && (
                <motion.div
                  key={activeRoleItem.id}
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mt-2.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-950/40 dark:bg-cyan-950/60 border border-cyan-500/30 text-xs backdrop-blur-xs shadow-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      <span className="font-bold text-white truncate">{activeRoleItem.roleTitle} Portal:</span>
                      <span className="text-cyan-300 truncate font-medium">{activeRoleItem.desc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="ml-2 text-[11px] text-slate-400 hover:text-white flex items-center space-x-0.5 shrink-0 px-1.5 py-0.5 rounded hover:bg-white/10 transition cursor-pointer"
                      title="Deselect role tab"
                    >
                      <X className="h-3 w-3" />
                      <span>Deselect</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Error Banner with AnimatePresence */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="mb-5 flex items-start space-x-3 rounded-2xl bg-rose-50 dark:bg-rose-950/80 p-4 text-xs border-2 border-rose-400 dark:border-rose-600 shadow-lg shadow-rose-950/20 animate-shake backdrop-blur-md"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs mt-0.5">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-200">
                    Authentication Failed
                  </p>
                  <p className="mt-1 text-xs text-rose-800 dark:text-rose-100 font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-100 p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer shrink-0"
                  title="Dismiss error message"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">
            {/* Username / Employee Code Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username / Employee Code
              </label>
              <div className="relative rounded-xl shadow-2xs group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className={`h-4 w-4 transition-colors ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-cyan-500'}`} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={getUsernamePlaceholder()}
                  autoComplete="off"
                  data-lpignore="true"
                  className={`block w-full rounded-xl border bg-white dark:bg-slate-800/90 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition ${error
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                    }`}
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-2xs group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className={`h-4 w-4 transition-colors ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-cyan-500'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  data-lpignore="true"
                  className={`block w-full rounded-xl border bg-white dark:bg-slate-800/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition ${error
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className="relative w-full overflow-hidden flex items-center justify-center space-x-2 py-3 px-4 rounded-xl shadow-lg shadow-cyan-600/20 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 focus:outline-hidden transition-all disabled:opacity-50 cursor-pointer"
            >
              {/* Premium shimmer line sweep */}
              <div className="pointer-events-none absolute inset-0 animate-shimmer opacity-30" />

              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials & Session...</span>
                </div>
              ) : (
                <div className="relative z-10 flex items-center space-x-2">
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </motion.button>
          </form>

          {/* Google Sign-in Option */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800"
          >
            <motion.button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center space-x-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Authenticate with Google Account</span>
            </motion.button>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="pt-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Apex Enterprise Solutions (SL) Ltd. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
};

