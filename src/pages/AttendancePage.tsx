import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { AttendanceRecord, Department, Employee } from '../types/index.ts';
import {
  CalendarCheck,
  ScanLine,
  Plus,
  Download,
  Filter,
  RefreshCw,
  Clock,
  User,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { ManualAttendanceModal } from '../components/attendance/ManualAttendanceModal.tsx';

interface AttendancePageProps {
  onOpenScanner: () => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ onOpenScanner }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterDate, filterDept, filterStatus]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attList, deptList, empList] = await Promise.all([
        api.getAttendance({
          date: filterDate || undefined,
          departmentId: filterDept ? Number(filterDept) : undefined,
          status: filterStatus || undefined,
        }),
        api.getDepartments(),
        api.getEmployees(),
      ]);
      setAttendance(attList);
      setDepartments(deptList);
      setEmployees(empList);
    } catch (e) {
      console.error('Failed to load attendance logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (attendance.length === 0) return;
    const headers = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 'Working Hours', 'Overtime Hours', 'Status', 'Notes'];
    const rows = attendance.map((a) => [
      a.employeeCode,
      a.employeeName,
      a.departmentName || '',
      a.attendanceDate,
      a.checkIn,
      a.checkOut || '',
      a.workingHours,
      a.overtimeHours,
      a.status,
      a.notes || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Attendance Tracking Ledger</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time automated check-in timestamps, working hours, and overtime computation
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={exportCSV}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
          >
            <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <ScanLine className="h-4 w-4" />
            <span>Open Terminal Scanner</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        {/* Date */}
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Filter by Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Department */}
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.departmentName}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Attendance Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Overtime">Overtime</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {(filterDate || filterDept || filterStatus) && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDate('');
                setFilterDept('');
                setFilterStatus('');
              }}
              className="w-full sm:w-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Attendance Content */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No attendance logs found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Scan a QR code or create a manual entry.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (displayed on phones < md) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {attendance.map((rec) => (
                <div key={rec.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{rec.employeeName}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{rec.employeeCode}</span>
                        <span>•</span>
                        <span>{rec.departmentName}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                        rec.status === 'Present'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : rec.status === 'Late'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          : rec.status === 'Overtime'
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
                          : rec.status === 'Absent'
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Check In</span>
                      <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">{rec.checkIn}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Check Out</span>
                      {rec.checkOut ? (
                        <span className="font-mono font-medium text-amber-700 dark:text-amber-400">{rec.checkOut}</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100/60 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                          On Shift
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">Hours</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {rec.workingHours}h {parseFloat(rec.overtimeHours?.toString() || '0') > 0 ? `(+${rec.overtimeHours}h)` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                    <span>Date: <strong className="text-slate-700 dark:text-slate-300">{rec.attendanceDate}</strong></span>
                    {rec.notes && <span className="truncate max-w-[160px] text-slate-500 dark:text-slate-400 italic">{rec.notes}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden on mobile, visible on md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Check-In</th>
                    <th className="px-4 py-3 font-semibold">Check-Out</th>
                    <th className="px-4 py-3 font-semibold">Hours (Reg/OT)</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</p>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{rec.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rec.departmentName}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{rec.attendanceDate}</td>
                      <td className="px-4 py-3 font-mono font-medium text-emerald-700 dark:text-emerald-400">{rec.checkIn}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        {rec.checkOut ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">{rec.checkOut}</span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            ● On Shift
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <span>{rec.workingHours}h</span>
                        {parseFloat(rec.overtimeHours?.toString() || '0') > 0 && (
                          <span className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                            (+{rec.overtimeHours}h OT)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            rec.status === 'Present'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : rec.status === 'Late'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                              : rec.status === 'Overtime'
                              ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
                              : rec.status === 'Absent'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                        {rec.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Manual Attendance Modal */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={loadData}
        employees={employees}
      />
    </div>
  );
};
