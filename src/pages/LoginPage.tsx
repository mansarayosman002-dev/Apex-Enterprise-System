import React, { useState } from 'react';
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
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password credentials');
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased">
      {/* =========================================================
          LEFT HALF: Striking Brand Visual & Feature Showcase
      ========================================================= */}
      <div className="relative w-full lg:w-1/2 min-h-[220px] sm:min-h-[320px] lg:min-h-screen flex flex-col justify-between p-5 sm:p-10 lg:p-16 overflow-hidden bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Background Visual Asset with Atmospheric Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroVisual}
            alt="Apex HRMS Visual"
            className="w-full h-full object-cover object-center scale-105 filter brightness-90 contrast-110"
          />
          {/* Multi-layer Gradient Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Top Header Section */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <ApexLogo size="md" inverted={true} />
            <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Sierra Leone Enterprise HRMS</span>
            </span>
          </div>
        </div>

        {/* Center Content Section */}
        <div className="relative z-10 my-auto py-4 sm:py-8 lg:py-10">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Smart Attendance & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
              Automated Payroll
            </span>
          </h1>

          <p className="mt-2.5 sm:mt-4 text-xs sm:text-base text-slate-300 max-w-lg leading-relaxed font-normal">
            Enterprise-grade identity verification, dynamic QR biometric check-in, real-time grace calculations, and automated Sierra Leone (NLe) payroll compliance.
          </p>

          {/* Key Value Feature Badges - hidden on small phones to keep login form immediately accessible */}
          <div className="mt-6 hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/40 transition">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <QrCode className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">Smart QR Badges</h4>
                <p className="text-[11px] text-slate-400 truncate">Instant camera & scan validation</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/40 transition">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">15-Min Grace Engine</h4>
                <p className="text-[11px] text-slate-400 truncate">Automated on-time / late detection</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-emerald-500/40 transition">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Coins className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">NLe Payroll & PAYE</h4>
                <p className="text-[11px] text-slate-400 truncate">NASSIT & overtime computation</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-amber-500/40 transition">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white">Role-Based Security</h4>
                <p className="text-[11px] text-slate-400 truncate">5-tier RBAC & immutable audit logs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Footer */}
        <div className="relative z-10 pt-4 sm:pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] sm:text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Apex Enterprise Solutions (SL) Ltd. • Freetown, SL</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT HALF: Authentication Terminal
      ========================================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-slate-50 dark:bg-slate-900 p-5 sm:p-10 lg:p-14 overflow-y-auto transition-colors duration-150">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between pb-4 sm:pb-6">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Secure SSL Encrypted Session</span>
          </div>
          <div className="ml-auto flex items-center space-x-3">
            <DarkModeToggle />
          </div>
        </div>

        {/* Main Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-6">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Workplace Login
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Enter your system credentials or employee badge code to access your terminal.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3.5 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-xs animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Authentication Notice</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Username / Employee Code Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username / Employee Code
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or EMP-1001"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl shadow-md text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-[0.99] focus:outline-hidden transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-in Option */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
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
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Apex Enterprise Solutions (SL) Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
