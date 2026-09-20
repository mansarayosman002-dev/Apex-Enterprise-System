import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import { DarkModeToggle } from '../components/common/DarkModeToggle.tsx';
import { ApexLogo } from '../components/common/ApexLogo.tsx';
import { TechMotionBackground } from '../components/common/TechMotionBackground.tsx';
import loginHeroBrandImg from '../assets/login_hero_brand.jpg';
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Eye,
  EyeOff,
  Clock,
  Coins,
  ArrowRight,
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
    desc: 'System administration',
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
    desc: 'Staff & attendance',
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
    desc: 'Payroll & taxes',
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
    desc: 'Self-service',
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
        return 'e.g. admin';
      case 'hr.officer':
        return 'e.g. hr.officer';
      case 'payroll.officer':
        return 'e.g. payroll.officer';
      case 'aminata.turay':
        return 'e.g. EMP-1001';
      default:
        return 'Enter username or employee code';
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
    <div className="min-h-screen w-full bg-[#070b16] dark:bg-[#040711] text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans antialiased relative overflow-hidden selection:bg-blue-600 selection:text-white transition-colors duration-300">
      {/* Interactive Technology Motion Background */}
      <TechMotionBackground />

      {/* Floating dual-panel card container (Inspired by reference layout) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-[1140px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl sm:rounded-[36px] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.4),0_10px_30px_-5px_rgba(0,0,0,0.2)] dark:shadow-[0_25px_90px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(56,189,248,0.08)] border border-slate-200/80 dark:border-slate-800/90 p-2.5 sm:p-4 lg:p-4.5 flex flex-col lg:flex-row overflow-hidden transition-colors duration-300"
      >
        {/* =========================================================
            LEFT PANEL: Inset Visual Card with System Branding Image
        ========================================================= */}
        <div className="w-full lg:w-[48%] rounded-xl sm:rounded-[28px] bg-slate-950 text-white p-5 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl shrink-0 group/panel">
          {/* System Branding Background Image with Parallax Scale */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.img
              src={loginHeroBrandImg}
              alt="Apex Enterprise HRMS System Visual"
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
              className="w-full h-full object-cover object-center transform group-hover/panel:scale-105 transition-transform duration-1000 ease-out"
            />
            {/* Multilayered Vignette & Gradient Overlays for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-[#091122]/75 to-[#0b162e]/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/85 via-transparent to-[#060913]/90" />
            <div className="absolute inset-0 bg-blue-950/20 mix-blend-color" />
          </div>

          {/* Internal ambient light reflections */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow z-1" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/25 rounded-full blur-3xl pointer-events-none z-1" />

          {/* Top Brand Header with gentle hover animation */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex items-center justify-between"
          >
            <div className="px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-lg">
              <ApexLogo size="md" inverted={true} />
            </div>
          </motion.div>

          {/* Bottom Hero & 3 Stepper Feature Cards */}
          <div className="relative z-10 pt-6 sm:pt-20 lg:pt-32">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-semibold text-white mb-3 shadow-xs"
            >
              <span>Apex Enterprise</span>
              <span className="animate-spin-slow">⚡</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              Smart Attendance & <br className="hidden sm:inline" />
              Payroll System
            </h1>

            {/* Subtext */}
            <p className="mt-2 text-xs sm:text-sm text-blue-100/90 font-normal leading-relaxed max-w-sm drop-shadow-xs">
              Unified biometric QR scanning, automated shift calculations, and statutory payroll compliance.
            </p>

            {/* 3 Stepper / Feature Cards Side-by-Side (Visible on sm+) */}
            <div className="grid grid-cols-3 gap-2.5 mt-4 sm:mt-6 hidden sm:grid">
              {/* Card 1 (Active/Primary Card) */}
              <motion.div
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-white/95 backdrop-blur-md text-slate-900 p-3 sm:p-3.5 rounded-2xl shadow-xl border border-white flex flex-col justify-between cursor-default group"
              >
                <div>
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black mb-2 shadow-xs group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <h4 className="text-xs font-bold leading-tight text-slate-900 group-hover:text-blue-600 transition-colors">Terminal Check-In</h4>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  Biometric QR badges
                </p>
              </motion.div>

              {/* Card 2 (Glassmorphic Translucent Card) */}
              <motion.div
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-slate-900/70 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between hover:bg-slate-900/85 transition-all cursor-default group"
              >
                <div>
                  <div className="h-6 w-6 rounded-full bg-white/25 text-white flex items-center justify-center text-xs font-black mb-2 group-hover:bg-white/40 transition-colors">
                    2
                  </div>
                  <h4 className="text-xs font-bold leading-tight text-white">Shift Tracking</h4>
                </div>
                <p className="text-[10px] text-blue-100/80 mt-1 leading-snug line-clamp-2">
                  Grace period logic
                </p>
              </motion.div>

              {/* Card 3 (Glassmorphic Translucent Card) */}
              <motion.div
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-slate-900/70 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between hover:bg-slate-900/85 transition-all cursor-default group"
              >
                <div>
                  <div className="h-6 w-6 rounded-full bg-white/25 text-white flex items-center justify-center text-xs font-black mb-2 group-hover:bg-white/40 transition-colors">
                    3
                  </div>
                  <h4 className="text-xs font-bold leading-tight text-white">Payroll & Taxes</h4>
                </div>
                <p className="text-[10px] text-blue-100/80 mt-1 leading-snug line-clamp-2">
                  NASSIT & PAYE
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* =========================================================
            RIGHT PANEL: Clean & Spacious Sign-In Form
        ========================================================= */}
        <div className="w-full lg:w-[52%] p-4 sm:p-8 lg:p-12 flex flex-col justify-between bg-white dark:bg-slate-900 transition-colors">
          {/* Top Session Security Bar & Dark Mode Switch */}
          <div className="flex items-center justify-between pb-4 sm:pb-6">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-full shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span>Encrypted Session</span>
            </div>
            <DarkModeToggle />
          </div>

          {/* Form Content Area */}
          <div className="max-w-md w-full mx-auto my-auto py-2 sm:py-4">
            {/* Header */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Sign In
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Enter your credentials to continue.
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                {ROLE_TABS.map((role) => {
                  const isSelected = selectedRole === role.id;
                  const IconComponent = role.icon;
                  return (
                    <motion.button
                      key={role.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleTabSelect(role)}
                      className={`relative z-10 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center space-y-1 cursor-pointer select-none group ${isSelected
                        ? 'text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeRoleTab"
                          className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-500/25 border border-blue-400/30"
                          transition={{
                            type: 'spring',
                            stiffness: 480,
                            damping: 32,
                          }}
                        />
                      )}

                      <div className="relative z-10 flex items-center space-x-1.5">
                        <IconComponent className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-115 group-hover:rotate-6 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="text-[11px] font-semibold tracking-tight">{role.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Active Role Quick Banner */}
              <AnimatePresence mode="wait">
                {activeRoleItem && (
                  <motion.div
                    key={activeRoleItem.id}
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2.5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs shadow-2xs">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        <span className="font-bold text-blue-900 dark:text-blue-200 truncate">{activeRoleItem.roleTitle}:</span>
                        <span className="text-blue-700 dark:text-blue-300 truncate font-medium">{activeRoleItem.desc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="ml-2 text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 shrink-0 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error-banner"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 flex items-start space-x-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200"
                >
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                  <div className="flex-1 font-medium leading-relaxed">{error}</div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username / ID
                </label>
                <div className="relative rounded-xl shadow-2xs group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <User className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 group-focus-within:scale-115 transition-all duration-200" />
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
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition duration-200"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-2xs group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 group-focus-within:scale-115 transition-all duration-200" />
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
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition duration-200"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85, rotate: 180 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </motion.button>
                </div>
              </div>

              {/* Sign In Button (Matching vibrant blue continue button in inspiration) */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.985 }}
                className="w-full mt-2 py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2 group"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>
                )}
              </motion.button>
            </form>

            {/* Or Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">Or</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <motion.button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.985 }}
              className="w-full flex items-center justify-center space-x-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs hover:shadow-md cursor-pointer group"
            >
              <svg className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
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
              <span>Sign in with Google</span>
            </motion.button>
          </div>

          {/* Footer note */}
          <div className="pt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            <p>© {new Date().getFullYear()} Apex Enterprise Solutions (SL) Ltd. All rights reserved.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
