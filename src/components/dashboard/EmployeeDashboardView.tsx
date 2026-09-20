import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail, withPhotoCacheBuster } from '../../utils/photoSync.ts';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  UserCheck,
  QrCode,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  ScanLine,
  Download,
  Plus,
  FileText,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AttendanceRecord, PayrollRecord, Employee } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';
import { ScrollReveal, ScrollStagger, ScrollStaggerItem } from '../common/ScrollReveal.tsx';
import { OvertimeRequestModal } from '../attendance/OvertimeRequestModal.tsx';
import { PayslipModal } from '../attendance/PayslipModal.tsx';
import {
  EmployeeIDBadge,
  EmployeeBadgeData,
} from '../common/EmployeeIDBadge.tsx';

interface EmployeeDashboardViewProps {
  employee: Employee | null;
  attendanceLogs: AttendanceRecord[];
  payrollRecords: PayrollRecord[];
  overtimeClaims: any[];
  currency?: string;
  onOpenScanner: () => void;
  setActivePage: (page: string) => void;
  onRefreshData?: () => void;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({
  employee,
  attendanceLogs = [],
  payrollRecords = [],
  overtimeClaims = [],
  currency = 'NLe ',
  onOpenScanner,
  setActivePage,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [isOTModalOpen, setIsOTModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [photoError, setPhotoError] = useState<boolean>(false);
  const [photoVersion, setPhotoVersion] = useState<number>(Date.now());

  // Fallback to auth user's employee if employee prop not fully loaded yet
  const currentEmp = employee || user?.employee || null;

  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;
      if (
        currentEmp &&
        (currentEmp.id === detail.employeeId ||
          currentEmp.employeeCode === detail.employeeCode)
      ) {
        setPhotoVersion(Date.now());
        setPhotoError(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
      }
    };
  }, [currentEmp]);

  const rawPhoto =
    currentEmp?.photoUrl ||
    user?.photoUrl ||
    (currentEmp?.employeeCode ? `/uploads/employees/${currentEmp.employeeCode}.jpg` : null) ||
    (user?.employeeId ? `/uploads/employees/EMP-${user.employeeId}.jpg` : null);

  const resolvedPhoto = withPhotoCacheBuster(rawPhoto, photoVersion);

  const initials = currentEmp
    ? `${currentEmp.firstName.charAt(0)}${currentEmp.lastName.charAt(0)}`.toUpperCase()
    : (user?.username?.substring(0, 2).toUpperCase() || 'EM');

  // Today's log
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = attendanceLogs.find((a) => a.attendanceDate === todayStr);

  // Quick stats calculations
  const totalDaysPresent = attendanceLogs.filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;

  const totalWorkingHours = attendanceLogs.reduce(
    (acc, curr) => acc + (parseFloat(curr.totalHours?.toString() || '0') || 0),
    0
  );

  const totalOTHours = overtimeClaims
    .filter((o) => o.status === 'Approved')
    .reduce((acc, curr) => acc + (parseFloat(curr.hours?.toString() || '0') || 0), 0);

  const latestPayslip = payrollRecords[0] || null;

  const shiftTelemetryData = useMemo(() => {
    if (attendanceLogs && attendanceLogs.length > 0) {
      return [...attendanceLogs]
        .slice(0, 7)
        .reverse()
        .map((log) => {
          const hours = parseFloat(log.workingHours?.toString() || log.totalHours?.toString() || '0') || 0;
          return {
            date: log.attendanceDate ? log.attendanceDate.substring(5) : 'Day',
            HoursWorked: parseFloat(hours.toFixed(1)),
          };
        });
    }
    // Baseline sample if no logs exist yet
    return [
      { date: 'Mon', HoursWorked: 8.0 },
      { date: 'Tue', HoursWorked: 8.5 },
      { date: 'Wed', HoursWorked: 8.0 },
      { date: 'Thu', HoursWorked: 8.2 },
      { date: 'Fri', HoursWorked: 8.0 },
    ];
  }, [attendanceLogs]);

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Employee Profile Header */}
      <ScrollReveal direction="down" distance={20}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 p-6 text-white shadow-[0_0_25px_rgba(6,182,212,0.18)] border border-cyan-500/30 cyber-corners backdrop-blur-md gap-5">
          <div className="flex items-center space-x-4 sm:space-x-5">
            {/* Employee Passport Profile Picture */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden ring-2 ring-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-slate-800 flex items-center justify-center">
                {resolvedPhoto && !photoError ? (
                  <img
                    src={resolvedPhoto}
                    alt={`${currentEmp?.firstName || 'Employee'} Profile`}
                    className="h-full w-full object-cover object-top"
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-700 text-white font-mono font-bold text-xl sm:text-2xl">
                    {initials}
                  </div>
                )}
              </div>
              {/* Active Status Badge Indicator */}
              <span
                className="absolute -bottom-1 -right-1 flex h-4 w-4"
                title="Active Employee Status"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-slate-900 shadow-[0_0_6px_#10b981]"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                <UserCheck className="h-3.5 w-3.5" />
                <span>EMPLOYEE PORTAL</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                {currentEmp ? `${currentEmp.firstName} ${currentEmp.lastName}` : 'Employee Console'}
              </h1>
              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5 font-mono">
                <span className="text-cyan-400">{currentEmp?.position || 'Staff'}</span>
                <span>•</span>
                <span>{currentEmp?.departmentName || 'Apex Enterprise'}</span>
                {currentEmp?.employeeCode && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                      [{currentEmp.employeeCode}]
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-2 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setIsOTModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3.5 py-2 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-500/25 transition shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 text-cyan-300" />
              <span>CLAIM OVERTIME</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-300/40 hover:from-cyan-500 hover:to-blue-500 transition cursor-pointer"
            >
              <ScanLine className="h-4 w-4" />
              <span>TERMINAL SCAN</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Key Employee Status Cards */}
      <ScrollReveal direction="up" distance={20}>
        <ScrollStagger className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.06}>
          {/* Attendance Status */}
          <ScrollStaggerItem>
            <StatCard
              title="Today's Status"
              value={todayLog ? todayLog.status : 'Not Checked In'}
              subtitle={todayLog ? `${todayLog.checkIn} - ${todayLog.checkOut || 'Active'}` : 'No punch today'}
              icon={Clock}
              iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
              iconTextColor="text-indigo-600 dark:text-indigo-400"
              badge={todayLog?.status || 'Pending'}
              badgeColor={todayLog?.status === 'Present' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}
            />
          </ScrollStaggerItem>

          {/* Working Hours */}
          <ScrollStaggerItem>
            <StatCard
              title="Hours Worked"
              value={`${totalWorkingHours.toFixed(1)} hrs`}
              subtitle={`${totalDaysPresent} days present`}
              icon={CheckCircle2}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              trend={{ value: `${totalDaysPresent} Days`, label: 'Present', isPositive: true }}
            />
          </ScrollStaggerItem>

          {/* Overtime Accumulated */}
          <ScrollStaggerItem>
            <StatCard
              title="Overtime"
              value={`${totalOTHours.toFixed(1)} hrs`}
              subtitle="1.5x multiplier"
              icon={TrendingUp}
              iconBgColor="bg-amber-50 dark:bg-amber-950/60"
              iconTextColor="text-amber-600 dark:text-amber-400"
              badge="1.5x Multiplier"
              badgeColor="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
            />
          </ScrollStaggerItem>

          {/* Permitted Payroll Information */}
          <ScrollStaggerItem>
            <StatCard
              title="Net Pay"
              value={`${currency}${parseFloat(latestPayslip?.netSalary?.toString() || employee?.basicSalary?.toString() || '0').toFixed(2)}`}
              subtitle={latestPayslip ? (latestPayslip.payrollPeriod || latestPayslip.period) : 'Base salary'}
              icon={DollarSign}
              iconBgColor="bg-blue-50 dark:bg-blue-950/60"
              iconTextColor="text-blue-600 dark:text-blue-400"
              badge={latestPayslip?.status || 'Base'}
              badgeColor="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300"
              onClick={() => latestPayslip && setSelectedPayslip(latestPayslip)}
            />
          </ScrollStaggerItem>
        </ScrollStagger>
      </ScrollReveal>

      {/* 3. Digital QR ID Badge & Detailed History Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Digital Staff QR Code Badge */}
        <ScrollReveal className="h-full" delay={0} direction="up" distance={24}>
          <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col items-center text-center space-y-4">
            <div className="w-full text-left">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Official Staff QR Badge</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan at any terminal to verify check-in & check-out</p>
            </div>

            {/* Official Portrait ID Badge with Passport Photo, Logo & QR Code */}
            <div className="w-full flex justify-center py-1">
              <EmployeeIDBadge
                badge={{
                  fullName: currentEmp ? `${currentEmp.firstName} ${currentEmp.lastName}` : (user?.username || 'Staff Member'),
                  jobTitle: currentEmp?.position || user?.roleName || 'Employee',
                  department: currentEmp?.departmentName || 'Apex Enterprise',
                  employeeId: currentEmp?.employeeCode || (user?.employeeId ? `EMP-${user.employeeId}` : 'EMP'),
                  rawEmployeeId: currentEmp?.id || user?.employeeId,
                  employeeCode: currentEmp?.employeeCode,
                  photoUrl: currentEmp?.photoUrl || user?.photoUrl,
                  qrCodeUrl: employee?.qrCode?.dataUrl,
                  status: currentEmp?.status || 'Active',
                }}
                variant="compact"
              />
            </div>

            <div className="w-full">
              <button
                onClick={onOpenScanner}
                className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
              >
                <ScanLine className="h-4 w-4" />
                <span>Punch In / Scan QR</span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Right 2 Columns: Attendance History & Permitted Payroll Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shift Telemetry Visual Analytics */}
          <ScrollReveal delay={0.06} direction="up" distance={24}>
            <div className="rounded-2xl border border-cyan-500/25 dark:border-cyan-500/35 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                    <span>Shift Hours & Telemetry</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Daily logged duration vs standard 8h operational shift</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-cyan-600 dark:text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Target: 8.0h
                  </span>
                </div>
              </div>

              <div className="mt-4 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={shiftTelemetryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <filter id="empHoursGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.85" />
                      </filter>
                      <linearGradient id="empHoursGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                        <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#06b6d4" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={{ stroke: '#334155', strokeWidth: 1 }} tickLine={false} />
                    <YAxis domain={[0, 'dataMax + 2']} tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip
                      cursor={{ stroke: '#06b6d4', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid rgba(6, 182, 212, 0.5)',
                        color: '#fff',
                        fontSize: '11px',
                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)',
                        backdropFilter: 'blur(8px)',
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#67e8f9', fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="HoursWorked"
                      name="Logged Hours"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#empHoursGrad)"
                      style={{ filter: 'url(#empHoursGlow)' }}
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      activeDot={{
                        r: 6,
                        stroke: '#06b6d4',
                        strokeWidth: 3,
                        fill: '#030712',
                        style: { filter: 'drop-shadow(0 0 10px #06b6d4)' },
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ScrollReveal>

          {/* Attendance History */}
          <ScrollReveal delay={0.1} direction="up" distance={24}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Attendance History</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your logged punch timestamps and computed work hours</p>
                </div>
                <button
                  onClick={() => setActivePage('attendance')}
                  className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  <span>Full Logs</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {attendanceLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No attendance logs found yet. Scan your QR code at the terminal to check in!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Date</th>
                        <th className="px-3.5 py-2.5 font-semibold">Check In</th>
                        <th className="px-3.5 py-2.5 font-semibold">Check Out</th>
                        <th className="px-3.5 py-2.5 font-semibold">Hours</th>
                        <th className="px-3.5 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {attendanceLogs.slice(0, 5).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                          <td className="px-3.5 py-3 font-semibold text-slate-900 dark:text-white">{log.attendanceDate}</td>
                          <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 font-mono font-medium">{log.checkIn}</td>
                          <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 font-mono">{log.checkOut || <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>}</td>
                          <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">{log.workingHours}h {log.overtimeHours ? `(+${log.overtimeHours}h OT)` : ''}</td>
                          <td className="px-3.5 py-3">
                            <Badge variant={log.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Permitted Payroll History & Overtime Claims */}
          <ScrollReveal delay={0.18} direction="up" distance={24}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payslips */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">My Payslips</h4>
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                {payrollRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No payroll statements published yet.</p>
                ) : (
                  <div className="space-y-2">
                    {payrollRecords.slice(0, 3).map((pay) => (
                      <div
                        key={pay.id}
                        onClick={() => setSelectedPayslip(pay)}
                        className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs flex items-center justify-between hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Period: {pay.payrollPeriod || pay.period}</p>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">{currency}{parseFloat(pay.netSalary.toString()).toFixed(2)}</span>
                        </div>
                        <button className="flex items-center space-x-1 rounded-lg bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <FileText className="h-3 w-3" />
                          <span>View</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overtime Claims History */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Overtime Claims</h4>
                  <button
                    onClick={() => setIsOTModalOpen(true)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    + New Claim
                  </button>
                </div>
                {overtimeClaims.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No overtime claims submitted.</p>
                ) : (
                  <div className="space-y-2">
                    {overtimeClaims.slice(0, 3).map((ot) => (
                      <div key={ot.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{ot.overtimeDate}</p>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{ot.hours} Hours • {ot.reason || 'Project'}</span>
                        </div>
                        <Badge variant={ot.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Modals */}
      <OvertimeRequestModal
        isOpen={isOTModalOpen}
        onClose={() => setIsOTModalOpen(false)}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      <PayslipModal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        record={selectedPayslip}
        currency={currency}
      />
    </div>
  );
};
