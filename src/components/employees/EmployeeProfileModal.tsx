import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord } from '../../types/index.ts';
import {
  X,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Briefcase,
  DollarSign,
  Calendar,
  CheckCircle2,
  Shield,
  User,
  Key,
  Clock,
  ExternalLink,
  Edit2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ApexLogo } from '../common/ApexLogo.tsx';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | null;
  onRegenerateQR?: () => void;
  onEdit?: (employee: Employee) => void;
  currency?: string;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onRegenerateQR,
  onEdit,
  currency = 'NLe ',
}) => {
  const [employee, setEmployee] = useState<any | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'badge' | 'details' | 'attendance'>('badge');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadDetails(employeeId);
    }
  }, [isOpen, employeeId]);

  const loadDetails = async (id: number) => {
    setLoading(true);
    setFeedback(null);
    try {
      const [empData, attData] = await Promise.all([
        api.getEmployeeById(id),
        api.getAttendance({ employeeId: id }),
      ]);
      setEmployee(empData);
      setRecentAttendance(attData.slice(0, 7));
    } catch (e) {
      console.error('Failed to load employee details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!employee) return;
    if (
      !confirm(
        'Are you sure you want to regenerate this QR code? The previous QR badge will be revoked and invalidated immediately.'
      )
    )
      return;

    setIsRegenerating(true);
    try {
      await api.regenerateQRCode(employee.id);
      await loadDetails(employee.id);
      setFeedback('New QR security token generated successfully.');
      if (onRegenerateQR) onRegenerateQR();
    } catch (e: any) {
      alert(e.message || 'Failed to regenerate QR code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadQR = () => {
    if (!employee?.qrCode?.dataUrl) return;
    const a = document.createElement('a');
    a.href = employee.qrCode.dataUrl;
    a.download = `QR_Badge_${employee.employeeCode}_${employee.firstName}_${employee.lastName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintBadge = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Profile & Digital Badge</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {employee?.employeeCode || 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {employee && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                className="flex items-center space-x-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 print:hidden">
          <button
            onClick={() => setActiveTab('badge')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'badge'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Digital QR Badge
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Employment & Contact Details
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Recent Attendance ({recentAttendance.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading || !employee ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading profile details...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedback && (
                <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 print:hidden">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* TAB 1: BADGE */}
              {activeTab === 'badge' && (
                <div className="space-y-4">
                  {/* Printable ID Card */}
                  <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                      {/* Left: Info */}
                      <div className="space-y-3 text-center sm:text-left flex-1">
                        <div className="flex items-center justify-center sm:justify-start">
                          <ApexLogo size="xs" inverted={true} showSubtitle={false} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-white">
                            {employee.firstName} {employee.lastName}
                          </h2>
                          <p className="text-xs font-medium text-indigo-300">{employee.position}</p>
                        </div>

                        <div className="space-y-1 text-xs text-slate-300">
                          <p className="flex items-center justify-center sm:justify-start space-x-1.5">
                            <Building className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{employee.departmentName || 'General'}</span>
                          </p>
                          <p className="flex items-center justify-center sm:justify-start space-x-1.5">
                            <Mail className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{employee.email}</span>
                          </p>
                          {employee.phone && (
                            <p className="flex items-center justify-center sm:justify-start space-x-1.5">
                              <Phone className="h-3.5 w-3.5 text-indigo-400" />
                              <span>{employee.phone}</span>
                            </p>
                          )}
                        </div>

                        <div className="pt-1 flex items-center justify-center sm:justify-start space-x-2.5">
                          <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-mono font-bold text-indigo-200 border border-indigo-500/30">
                            {employee.employeeCode}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              employee.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {employee.status === 'active' ? 'Active Staff' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {/* Right: QR Code */}
                      <div className="flex flex-col items-center rounded-2xl bg-white p-3.5 text-slate-900 shadow-md">
                        {employee.qrCode?.dataUrl ? (
                          <img
                            src={employee.qrCode.dataUrl}
                            alt="Employee QR Code"
                            className="h-36 w-36 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="flex h-36 w-36 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <QrCode className="h-12 w-12" />
                          </div>
                        )}
                        <span className="mt-1 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                          Attendance Token
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for QR */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadQR}
                        className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
                      >
                        <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Download QR PNG</span>
                      </button>
                      <button
                        onClick={handlePrintBadge}
                        className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
                      >
                        <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Print Badge</span>
                      </button>
                    </div>

                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="flex items-center space-x-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate Secure QR</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Employment Information</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Employee ID:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">#{employee.id}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Employee Code:</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{employee.employeeCode}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Department:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{employee.departmentName}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Position / Title:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{employee.position}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Basic Salary:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {currency}{parseFloat(employee.basicSalary.toString()).toFixed(2)} / mo
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Created At:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {new Date(employee.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Contact & System Login</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Email:</span>
                          <span className="font-medium text-slate-900 dark:text-white">{employee.email}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                          <span className="font-medium text-slate-900 dark:text-white">{employee.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Linked Login User:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {employee.userAccount ? employee.userAccount.username : 'None provisioned'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">System Account Status:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {employee.userAccount ? (
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  employee.userAccount.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {employee.userAccount.status}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">QR Token Status:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {employee.qrCode?.status ? (
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  employee.qrCode.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {employee.qrCode.status}
                              </span>
                            ) : (
                              'Unassigned'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div className="space-y-3">
                  {recentAttendance.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 py-10 text-center">
                      <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No attendance records logged yet</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Attendance will appear automatically once employee scans their QR badge.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">Date</th>
                            <th className="px-4 py-2.5 font-semibold">Check-In</th>
                            <th className="px-4 py-2.5 font-semibold">Check-Out</th>
                            <th className="px-4 py-2.5 font-semibold">Total Hours</th>
                            <th className="px-4 py-2.5 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {recentAttendance.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                {rec.attendanceDate}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{rec.checkIn}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{rec.checkOut || 'Active'}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{rec.workingHours} hrs</td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    rec.status === 'Present'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                      : rec.status === 'Late'
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                      : rec.status === 'Overtime'
                                      ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {rec.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
