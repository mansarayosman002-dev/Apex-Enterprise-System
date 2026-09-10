import React, { useState, useRef } from 'react';
import { api } from '../../services/api.ts';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Table,
  HelpCircle,
  ArrowRight,
  Database,
  Calendar,
} from 'lucide-react';

interface AttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AttendanceImportModal: React.FC<AttendanceImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    total: number;
    inserted: number;
    updated: number;
    errors: Array<{ row: number; identifier: string; error: string }>;
    details?: Array<{ employeeCode: string; date: string; action: 'inserted' | 'updated'; status: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseCSVContent = (content: string) => {
    try {
      setParseError(null);
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setParseError('The uploaded data must contain a header row and at least one attendance record.');
        setParsedRows([]);
        return;
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const headerMap: Record<string, string> = {};

      headers.forEach((h, idx) => {
        if (h.includes('code') || h === 'empid' || h === 'id' || h.includes('employee')) headerMap['code'] = idx.toString();
        else if (h.includes('date') || h === 'day') headerMap['date'] = idx.toString();
        else if (h.includes('checkin') || h.includes('in') || h.includes('timein') || h.includes('start')) headerMap['checkIn'] = idx.toString();
        else if (h.includes('checkout') || h.includes('out') || h.includes('timeout') || h.includes('end')) headerMap['checkOut'] = idx.toString();
        else if (h.includes('status')) headerMap['status'] = idx.toString();
        else if (h.includes('work') || h.includes('hours')) headerMap['workingHours'] = idx.toString();
        else if (h.includes('overtime') || h.includes('ot')) headerMap['overtimeHours'] = idx.toString();
        else if (h.includes('note') || h.includes('remark')) headerMap['notes'] = idx.toString();
      });

      if (!headerMap['code'] || !headerMap['date']) {
        setParseError('Header row must at minimum contain Employee Code and Attendance Date columns.');
        setParsedRows([]);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = parseLine(lines[i]);
        if (parts.length < 2) continue;

        const rawCode = parts[Number(headerMap['code'])] || '';
        const rawDate = parts[Number(headerMap['date'])] || '';
        const rawCheckIn = headerMap['checkIn'] !== undefined ? parts[Number(headerMap['checkIn'])] || '' : '08:00:00';
        const rawCheckOut = headerMap['checkOut'] !== undefined ? parts[Number(headerMap['checkOut'])] || '' : '';
        const rawStatus = headerMap['status'] !== undefined ? parts[Number(headerMap['status'])] || '' : '';
        const rawWorkHours = headerMap['workingHours'] !== undefined ? parts[Number(headerMap['workingHours'])] || '' : '';
        const rawOtHours = headerMap['overtimeHours'] !== undefined ? parts[Number(headerMap['overtimeHours'])] || '' : '';
        const rawNotes = headerMap['notes'] !== undefined ? parts[Number(headerMap['notes'])] || '' : '';

        if (rawCode && rawDate) {
          rows.push({
            employeeCode: rawCode.toUpperCase().trim(),
            attendanceDate: rawDate.trim(),
            checkIn: rawCheckIn.trim() || undefined,
            checkOut: rawCheckOut.trim() || undefined,
            status: rawStatus.trim() || undefined,
            workingHours: rawWorkHours.trim() || undefined,
            overtimeHours: rawOtHours.trim() || undefined,
            notes: rawNotes.trim() || undefined,
          });
        }
      }

      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse attendance CSV');
      setParsedRows([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSVContent(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    setImportResult(null);
    if (text.trim()) {
      parseCSVContent(text);
    } else {
      setParsedRows([]);
      setParseError(null);
    }
  };

  const downloadSampleTemplate = () => {
    const today = new Date().toISOString().split('T')[0];
    const template = [
      'Employee Code,Attendance Date,Check In,Check Out,Status,Working Hours,Overtime Hours,Notes',
      `EMP-1001,${today},08:00:00,17:00:00,Present,8.0,0.0,Regular on-time shift`,
      `EMP-1002,${today},08:35:00,17:00:00,Late,7.5,0.0,Traffic delay`,
      `EMP-1003,${today},07:55:00,19:30:00,Overtime,10.5,2.5,Month-end financial audit`,
    ].join('\n');

    const blob = new Blob(['\uFEFF' + template.split('\n').join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'apex_attendance_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    setImportResult(null);

    try {
      const res = await api.bulkImportAttendance(parsedRows);
      setImportResult(res);
      if (res.inserted > 0 || res.updated > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setParseError(err.message || 'Server error during attendance bulk upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Attendance Import & Upsert
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  PostgreSQL 18
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload attendance punch logs. If an attendance log exists for the employee on that date, it is automatically updated.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Rules Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-start space-x-2.5">
              <HelpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-semibold">Automatic Matching & Upsert Rule:</span> If an attendance record exists for the given Employee Code and Date, it will be updated with the new punch times, status, and calculated hours. Otherwise, a new record is created.
              </div>
            </div>
            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 shrink-0 transition shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('file')}
              className={`pb-2 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'file'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Upload CSV File</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`pb-2 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'text'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Paste CSV Text</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'file' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/20 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition group"
              >
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition duration-200">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {fileName ? fileName : 'Choose an Attendance CSV file or drag and drop here'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Format: Employee Code, Attendance Date (YYYY-MM-DD), Check-In, Check-Out
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-emerald-600 group-hover:text-white transition"
                >
                  Browse Computer
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Textarea */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Paste Attendance CSV Text (Including Header Row):
              </label>
              <textarea
                value={csvText}
                onChange={handleTextChange}
                rows={6}
                placeholder="Employee Code,Attendance Date,Check In,Check Out,Status,Working Hours,Overtime Hours,Notes&#10;EMP-1001,2026-09-08,08:00:00,17:00:00,Present,8.0,0.0,Regular shift"
                className="w-full font-mono text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Result Banner */}
          {importResult && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  PostgreSQL 18 Attendance Sync Results:
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    importResult.errors.length === 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {importResult.errors.length === 0 ? 'Fully Synchronized' : 'Completed with Warnings'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Records
                  </span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {importResult.total}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Inserted New
                  </span>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    +{importResult.inserted}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-center">
                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    Updated Existing
                  </span>
                  <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                    ↻ {importResult.updated}
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Errors ({importResult.errors.length}):
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl">
                    {importResult.errors.map((e, idx) => (
                      <div key={idx}>
                        Row {e.row} ({e.identifier}): {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && !importResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <Table className="h-4 w-4 text-emerald-500" />
                  <span>
                    Ready to Write ({parsedRows.length} {parsedRows.length === 1 ? 'Record' : 'Records'} Detected)
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Previewing first {Math.min(parsedRows.length, 5)} records
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Employee Code</th>
                        <th className="py-2 px-3">Attendance Date</th>
                        <th className="py-2 px-3">Check-In</th>
                        <th className="py-2 px-3">Check-Out</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Working Hours</th>
                        <th className="py-2 px-3">Overtime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                            {row.employeeCode}
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {row.attendanceDate}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {row.checkIn || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {row.checkOut || '-'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {row.status || 'Auto'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {row.workingHours || 'Auto'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {row.overtimeHours || 'Auto'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {importResult ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center space-x-2">
            {importResult ? (
              <button
                onClick={() => {
                  setImportResult(null);
                  setParsedRows([]);
                  setCsvText('');
                  setFileName(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Upload More Records
              </button>
            ) : (
              <button
                disabled={parsedRows.length === 0 || isSubmitting}
                onClick={handleSubmit}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving to PostgreSQL 18...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Sync {parsedRows.length} Punch Logs to Database</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
