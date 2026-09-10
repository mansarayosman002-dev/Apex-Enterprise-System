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
} from 'lucide-react';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
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
    details?: Array<{ employeeCode: string; name: string; action: 'inserted' | 'updated' }>;
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
        setParseError('The uploaded data must contain at least a header row and one data row.');
        setParsedRows([]);
        return;
      }

      // Simple CSV header parser with quotes handling
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
        if (h.includes('code') || h === 'empid' || h === 'id') headerMap['code'] = idx.toString();
        else if (h.includes('first') || h === 'fname') headerMap['firstName'] = idx.toString();
        else if (h.includes('last') || h === 'lname' || h === 'surname') headerMap['lastName'] = idx.toString();
        else if (h.includes('email') || h === 'mail') headerMap['email'] = idx.toString();
        else if (h.includes('phone') || h.includes('tel') || h.includes('mobile')) headerMap['phone'] = idx.toString();
        else if (h.includes('dept') || h.includes('department')) headerMap['department'] = idx.toString();
        else if (h.includes('pos') || h.includes('role') || h.includes('title') || h.includes('job')) headerMap['position'] = idx.toString();
        else if (h.includes('sal') || h.includes('wage') || h.includes('pay')) headerMap['basicSalary'] = idx.toString();
        else if (h.includes('photo') || h.includes('avatar') || h.includes('image') || h.includes('picture')) headerMap['photoUrl'] = idx.toString();
        else if (h.includes('status') || h.includes('active')) headerMap['status'] = idx.toString();
      });

      if (!headerMap['firstName'] || !headerMap['lastName'] || !headerMap['email']) {
        setParseError('Header row must at minimum contain First Name, Last Name, and Email columns.');
        setParsedRows([]);
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = parseLine(lines[i]);
        if (parts.length < 2) continue;

        const rowObj = {
          employeeCode: headerMap['code'] !== undefined ? parts[Number(headerMap['code'])] || undefined : undefined,
          firstName: headerMap['firstName'] !== undefined ? parts[Number(headerMap['firstName'])] || '' : '',
          lastName: headerMap['lastName'] !== undefined ? parts[Number(headerMap['lastName'])] || '' : '',
          email: headerMap['email'] !== undefined ? parts[Number(headerMap['email'])] || '' : '',
          phone: headerMap['phone'] !== undefined ? parts[Number(headerMap['phone'])] || '' : '',
          department: headerMap['department'] !== undefined ? parts[Number(headerMap['department'])] || 'Engineering' : 'Engineering',
          position: headerMap['position'] !== undefined ? parts[Number(headerMap['position'])] || 'Staff Member' : 'Staff Member',
          basicSalary: headerMap['basicSalary'] !== undefined ? parts[Number(headerMap['basicSalary'])] || '5000' : '5000',
          photoUrl: headerMap['photoUrl'] !== undefined ? parts[Number(headerMap['photoUrl'])] || '' : '',
          status: (headerMap['status'] !== undefined ? parts[Number(headerMap['status'])] || 'active' : 'active').toLowerCase(),
        };

        if (rowObj.firstName && rowObj.lastName && rowObj.email) {
          rows.push(rowObj);
        }
      }

      setParsedRows(rows);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse CSV');
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
    const template = [
      'Employee Code,First Name,Last Name,Email,Phone,Department,Position,Basic Salary,Photo URL,Status',
      'EMP-1001,John,Doe,johndoe@apex.corp,+232 76 111 222,Engineering,Senior Software Engineer,8500,https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256,active',
      'EMP-1002,Jane,Smith,janesmith@apex.corp,+232 76 222 333,Human Resources,HR Business Partner,6200,https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256,active',
      'EMP-1003,Michael,Brown,michaelb@apex.corp,+232 76 333 444,Finance,Lead Financial Analyst,7100,,active',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + template.split('\n').join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'apex_employee_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    setImportResult(null);

    try {
      const res = await api.bulkImportEmployees(parsedRows);
      setImportResult(res);
      if (res.inserted > 0 || res.updated > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setParseError(err.message || 'Server error during bulk upload');
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Data Import & Upsert
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  PostgreSQL 18
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload CSV or Excel data. New records are automatically inserted; existing matching records are updated.
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
          {/* Rules & Actions Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-start space-x-2.5">
              <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold">Automatic Matching & Upsert Rule:</span> If an employee matches by <code>Employee Code</code> or <code>Email</code>, their PostgreSQL record is updated. If not found, a new profile and security QR badge are inserted.
              </div>
            </div>
            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 shrink-0 transition shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Import Method Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('file')}
              className={`pb-2 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'file'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
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
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
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
                className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/20 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition group"
              >
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition duration-200">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {fileName ? fileName : 'Choose a CSV file or drag and drop here'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Supported formats: Standard CSV with UTF-8 encoding
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition"
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
                Paste Raw CSV Content (Including Header Row):
              </label>
              <textarea
                value={csvText}
                onChange={handleTextChange}
                rows={6}
                placeholder="Employee Code,First Name,Last Name,Email,Phone,Department,Position,Basic Salary,Photo URL,Status&#10;EMP-1001,John,Doe,johndoe@apex.corp,+232 76 111 222,Engineering,Senior Software Engineer,8500,,active"
                className="w-full font-mono text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Error Banner */}
          {parseError && (
            <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Import Result Notification */}
          {importResult && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  PostgreSQL 18 Sync Execution Summary:
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
                    Total Processed
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

          {/* Parsed Data Preview Table */}
          {parsedRows.length > 0 && !importResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <Table className="h-4 w-4 text-indigo-500" />
                  <span>
                    Ready for Database Write ({parsedRows.length} {parsedRows.length === 1 ? 'Record' : 'Records'} Detected)
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Previewing first {Math.min(parsedRows.length, 5)} rows
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Full Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Position</th>
                        <th className="py-2 px-3">Basic Salary</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                            {row.employeeCode || <span className="text-slate-400 italic">Auto-generate</span>}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                            {row.firstName} {row.lastName}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {row.email}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {row.department}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {row.position}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-800 dark:text-slate-200">
                            {row.basicSalary}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.status === 'inactive'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {row.status}
                            </span>
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

        {/* Footer Controls */}
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
                Upload Another File
              </button>
            ) : (
              <button
                disabled={parsedRows.length === 0 || isSubmitting}
                onClick={handleSubmit}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Writing to PostgreSQL 18...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Sync {parsedRows.length} Records to Database</span>
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
