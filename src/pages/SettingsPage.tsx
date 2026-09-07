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

  useEffect(() => {
    loadSettings();
  }, []);

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

        {/* Infrastructure Reference */}
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-5 text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-indigo-950 dark:text-indigo-300">
            <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3>Cloud SQL PostgreSQL Configuration</h3>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Instance: europe-west1 • Schema: Drizzle ORM • Dual Layer Security: Firebase ID Token & Cryptographic SHA256 QR tokens.
          </p>
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
