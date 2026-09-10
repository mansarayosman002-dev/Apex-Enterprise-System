import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { SystemSettings } from '../types/index.ts';
import { DarkModeToggle } from '../components/common/DarkModeToggle.tsx';
import { Settings, Save, RefreshCw, CheckCircle2, Building2, Clock, DollarSign, Database, Shield, Palette } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'Apex Enterprise Solutions',
    workStartTime: '08:00',
    workEndTime: '17:00',
    gracePeriodMinutes: 15,
    overtimeRateMultiplier: 1.5,
    currencySymbol: 'NLe',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestSuccess, setDbTestSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
    testDbConnection();
  }, []);

  const testDbConnection = async () => {
    setIsTestingDb(true);
    setDbTestSuccess(false);
    try {
      const status = await api.getDatabaseStatus();
      setDbStatus(status);
      setDbTestSuccess(true);
      setTimeout(() => setDbTestSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to query database status:', err);
    } finally {
      setIsTestingDb(false);
    }
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Configuration</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Global policies for attendance thresholds, overtime multiplier rates, and corporate branding
        </p>
      </div>

      {savedSuccess && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>System configuration updated successfully!</span>
        </div>
      )}

      {/* Appearance Theme Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
            <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2>Appearance & Theme Preference</h2>
          </div>
          <DarkModeToggle variant="segmented" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select between light theme, dark mode, or match your system operating system preference.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2>Organization & Letterhead Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Company / Organization Name</label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currencySymbol || ''}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                placeholder="$ or € or £"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* Working Hours & Grace Period */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2>Attendance & Shift Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Standard Work Start Time</label>
              <input
                type="time"
                value={settings.workStartTime || ''}
                onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Standard Work End Time</label>
              <input
                type="time"
                value={settings.workEndTime || ''}
                onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Late Arrival Grace Period (mins)</label>
              <input
                type="number"
                value={settings.gracePeriodMinutes ?? 0}
                onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Employees checking in after {settings.workStartTime} + {settings.gracePeriodMinutes} minutes will automatically be tagged as 'Late'.
          </p>
        </div>

        {/* Overtime Policy */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
            <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2>Overtime Computation Formula</h2>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Overtime Hourly Rate Multiplier (x)</label>
            <input
              type="number"
              step="0.1"
              value={settings.overtimeRateMultiplier ?? 1.5}
              onChange={(e) => setSettings({ ...settings, overtimeRateMultiplier: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hourly Wage = (Basic Salary / 160 hrs). Overtime Pay = Hourly Wage × {settings.overtimeRateMultiplier} × Overtime Hours.
          </p>
        </div>

        {/* PostgreSQL 18 Infrastructure Diagnostic Card */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    PostgreSQL 18 Database Engine
                  </h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {dbStatus ? dbStatus.status : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Database: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{dbStatus?.database || 'apex_hrms_db'}</span> • Port: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{dbStatus?.port || 5432}</span> • User: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{dbStatus?.user || 'postgres'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isTestingDb}
              onClick={testDbConnection}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition shadow-2xs shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
              <span>{isTestingDb ? 'Testing Latency...' : 'Test Connection'}</span>
            </button>
          </div>

          {dbTestSuccess && (
            <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>PostgreSQL 18 connection verified! Latency: <strong>{dbStatus?.latencyMs}ms</strong>. Auto-upsert synchronization active.</span>
            </div>
          )}

          {dbStatus && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Engine Build</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={dbStatus.version}>
                    {dbStatus.engine}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ping Latency</span>
                  <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {dbStatus.latencyMs} ms
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Registered Employees</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {dbStatus.tableCounts?.employees ?? 0} records
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Attendance Logs</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {dbStatus.tableCounts?.attendance ?? 0} records
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-indigo-900 dark:text-indigo-300">Automated Data Pipeline:</span> When employee rosters or attendance logs are uploaded via CSV or Excel, they are automatically inserted into the database. Existing records are updated in real-time without duplicate key conflicts.
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save System Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
};
