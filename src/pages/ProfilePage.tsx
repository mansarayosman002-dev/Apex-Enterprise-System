import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Employee, AttendanceRecord, PayrollRecord } from '../types/index.ts';
import {
  User,
  QrCode,
  Download,
  Printer,
  Calendar,
  DollarSign,
  Building,
  Mail,
  Phone,
  Briefcase,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { PayslipModal } from '../components/attendance/PayslipModal.tsx';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [myPayroll, setMyPayroll] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    loadMyData();
  }, [user]);

  const loadMyData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (user.employeeId) {
        const [empData, attData, payData] = await Promise.all([
          api.getEmployeeById(user.employeeId),
          api.getAttendance({ employeeId: user.employeeId }),
          api.getPayroll({ employeeId: user.employeeId }),
        ]);
        setEmployee(empData);
        setMyAttendance(attData);
        setMyPayroll(payData);
      } else {
        // Administrator without linked employee - load all demo attendance for self
        const attData = await api.getAttendance();
        setMyAttendance(attData.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setIsChangingPass(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDownloadQR = () => {
    if (!employee?.qrCode?.dataUrl) return;
    const a = document.createElement('a');
    a.href = employee.qrCode.dataUrl;
    a.download = `QR_${employee.employeeCode}_${employee.firstName}.png`;
    a.click();
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Personal Profile & Access Badge</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your personal attendance QR token, assigned department, and historical statements
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: ID Badge & Details */}
          <div className="space-y-6">
            {/* Digital Badge Card */}
            <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl text-center">
              <div className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-indigo-200 uppercase tracking-wider backdrop-blur-xs">
                Apex Enterprise Solutions
              </div>

              {/* QR Image Box */}
              <div className="my-5 flex flex-col items-center">
                <div className="rounded-xl bg-white p-3 shadow-md">
                  {employee?.qrCode?.dataUrl ? (
                    <img
                      src={employee.qrCode.dataUrl}
                      alt="Personal QR"
                      className="h-36 w-36 object-contain"
                    />
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center bg-slate-100 text-slate-400">
                      <QrCode className="h-12 w-12 text-slate-700" />
                    </div>
                  )}
                </div>
                <span className="mt-2 font-mono text-xs font-bold text-indigo-200">
                  {employee?.employeeCode || user?.username}
                </span>
              </div>

              <h2 className="text-lg font-bold">
                {employee ? `${employee.firstName} ${employee.lastName}` : user?.username}
              </h2>
              <p className="text-xs text-indigo-300">{employee?.position || user?.roleName}</p>
              <p className="text-[11px] text-slate-400 mt-1">{employee?.departmentName || 'Apex Systems'}</p>

              {/* Print / Download buttons */}
              {employee?.qrCode?.dataUrl && (
                <div className="mt-5 flex justify-center gap-2 print:hidden">
                  <button
                    onClick={handleDownloadQR}
                    className="flex items-center space-x-1 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[11px] font-medium text-white transition"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handlePrintCard}
                    className="flex items-center space-x-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-[11px] font-medium text-white transition"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print Card</span>
                  </button>
                </div>
              )}
            </div>

            {/* Password Change Box */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-xs mb-3">
                <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3>Change Account Password</h3>
              </div>

              {passwordMsg && (
                <div
                  className={`mb-3 rounded-lg p-2 text-xs flex items-center space-x-1.5 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {isChangingPass ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

          {/* Right 2 Cols: My Attendance & My Payslips */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Attendance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3>My Attendance History</h3>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{myAttendance.length} records</span>
              </div>

              {myAttendance.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">No attendance records logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2 font-semibold">Date</th>
                        <th className="px-3.5 py-2 font-semibold">Check-In</th>
                        <th className="px-3.5 py-2 font-semibold">Check-Out</th>
                        <th className="px-3.5 py-2 font-semibold">Hours</th>
                        <th className="px-3.5 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {myAttendance.slice(0, 8).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">{rec.attendanceDate}</td>
                          <td className="px-3.5 py-2.5 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{rec.checkIn}</td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-300">{rec.checkOut || <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>}</td>
                          <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                            {rec.workingHours} hrs
                            {parseFloat(rec.overtimeHours?.toString() || '0') > 0 && (
                              <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                                (+{rec.overtimeHours}h OT)
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                rec.status === 'Present'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                  : rec.status === 'Late'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
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

            {/* My Payslips */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-sm">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3>My Issued Payslips</h3>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{myPayroll.length} statements</span>
              </div>

              {myPayroll.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">No payslip statements issued yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2 font-semibold">Period</th>
                        <th className="px-3.5 py-2 font-semibold">Gross</th>
                        <th className="px-3.5 py-2 font-semibold">Net Pay</th>
                        <th className="px-3.5 py-2 font-semibold">Status</th>
                        <th className="px-3.5 py-2 font-semibold text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {myPayroll.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">{rec.payrollPeriod}</td>
                          <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                            ${parseFloat(rec.grossSalary.toString()).toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-emerald-700 dark:text-emerald-300">
                            ${parseFloat(rec.netSalary.toString()).toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              onClick={() => setSelectedPayslip(rec)}
                              className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                            >
                              Open Statement
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        record={selectedPayslip}
      />
    </div>
  );
};
