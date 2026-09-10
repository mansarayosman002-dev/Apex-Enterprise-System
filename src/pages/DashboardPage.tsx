import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  DashboardStats,
  AttendanceRecord,
  PayrollRecord,
  Employee,
  Department,
  UserRole,
} from '../types/index.ts';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  Award,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { AdminDashboardView } from '../components/dashboard/AdminDashboardView.tsx';
import { HRDashboardView } from '../components/dashboard/HRDashboardView.tsx';
import { PayrollDashboardView } from '../components/dashboard/PayrollDashboardView.tsx';
import { EmployeeDashboardView } from '../components/dashboard/EmployeeDashboardView.tsx';
import { ManagementDashboardView } from '../components/dashboard/ManagementDashboardView.tsx';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton.tsx';
import { ErrorBanner } from '../components/common/ErrorBanner.tsx';
import { SuccessBanner } from '../components/common/SuccessBanner.tsx';
import { PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail, withPhotoCacheBuster } from '../utils/photoSync.ts';

interface DashboardPageProps {
  onOpenScanner: () => void;
  setActivePage: (page: string) => void;
}

type DashboardPerspective = 'Administrator' | 'HR Officer' | 'Payroll Officer' | 'Employee' | 'Management';

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenScanner, setActivePage }) => {
  const { user } = useAuth();
  
  // Active perspective (defaults to user's real role)
  const [perspective, setPerspective] = useState<DashboardPerspective>(
    (user?.roleName as DashboardPerspective) || 'Administrator'
  );

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [pendingOvertime, setPendingOvertime] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [myPayroll, setMyPayroll] = useState<PayrollRecord[]>([]);
  const [myOvertime, setMyOvertime] = useState<any[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<Employee | null>(null);
  const [currency, setCurrency] = useState<string>('NLe ');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync perspective if user changes
  useEffect(() => {
    if (user?.roleName) {
      setPerspective(user.roleName as DashboardPerspective);
    }
  }, [user?.roleName]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Parallel data load
      const [
        statsData,
        attData,
        empData,
        deptData,
        payData,
        otData,
        settingsData,
      ] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getAttendance().catch(() => []),
        api.getEmployees().catch(() => []),
        api.getDepartments().catch(() => []),
        api.getPayroll().catch(() => []),
        api.getOvertime().catch(() => []),
        api.getSettings().catch(() => null),
      ]);

      if (statsData) setStats(statsData);
      if (settingsData?.currencySymbol) {
        const sym = settingsData.currencySymbol;
        setCurrency(sym.endsWith(' ') ? sym : `${sym} `);
      }
      setRecentLogs(attData.slice(0, 10));
      setEmployees(empData);
      setDepartments(deptData);
      setPayrollRecords(payData);
      setPendingOvertime(otData.filter((o: any) => o.status === 'Pending'));

      // If user is tied to employee, fetch employee personal records
      const targetEmpId = user?.employeeId || (empData.length > 0 ? empData[0].id : undefined);
      if (targetEmpId) {
        try {
          const [profile, personalAtt, personalPay, personalOT] = await Promise.all([
            api.getEmployeeById(targetEmpId).catch(() => null),
            api.getAttendance({ employeeId: targetEmpId }).catch(() => []),
            api.getPayroll({ employeeId: targetEmpId }).catch(() => []),
            api.getOvertime({ employeeId: targetEmpId }).catch(() => []),
          ]);
          setEmployeeProfile(profile || (empData.find((e) => e.id === targetEmpId) || null));
          setMyAttendance(personalAtt);
          setMyPayroll(personalPay);
          setMyOvertime(personalOT);
        } catch (e) {
          console.error('Error fetching personal employee data:', e);
        }
      }
    } catch (e: any) {
      console.error('Failed to load dashboard:', e);
      setError(e?.message || 'Unable to load enterprise dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApproveOT = async (id: number) => {
    try {
      await api.approveOvertime(id);
      setSuccessMessage('Overtime request approved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (e: any) {
      setError(e?.message || 'Failed to approve overtime request.');
    }
  };

  const handleRejectOT = async (id: number) => {
    const reason = prompt('Optional rejection feedback:');
    if (reason === null) return;
    try {
      await api.rejectOvertime(id, reason || undefined);
      setSuccessMessage('Overtime request rejected.');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (e: any) {
      setError(e?.message || 'Failed to reject overtime request.');
    }
  };

  const [userPhotoError, setUserPhotoError] = useState<boolean>(false);
  const [photoVersion, setPhotoVersion] = useState<number>(Date.now());

  // Listen for real-time employee photo updates
  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;

      setEmployeeProfile((prev) => {
        if (!prev) return null;
        if (prev.id === detail.employeeId || prev.employeeCode === detail.employeeCode) {
          return { ...prev, photoUrl: detail.photoUrl };
        }
        return prev;
      });

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === detail.employeeId || emp.employeeCode === detail.employeeCode
            ? { ...emp, photoUrl: detail.photoUrl }
            : emp
        )
      );

      setPhotoVersion(Date.now());
      setUserPhotoError(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
      }
    };
  }, []);

  // Resolved signed-in employee identity & passport photo
  const currentEmp = user?.employee || employeeProfile;
  const signedInName = currentEmp ? `${currentEmp.firstName} ${currentEmp.lastName}` : (user?.username || 'Executive');
  const signedInRole = currentEmp?.position || user?.roleName || 'Staff';
  const signedInDept = currentEmp?.departmentName;
  const signedInEmpCode = currentEmp?.employeeCode || (user?.employeeId ? `EMP-${user.employeeId}` : null);
  const rawSignedInPhoto =
    currentEmp?.photoUrl ||
    user?.photoUrl ||
    (currentEmp?.employeeCode ? `/uploads/employees/${currentEmp.employeeCode}.jpg` : null) ||
    (signedInEmpCode ? `/uploads/employees/${signedInEmpCode}.jpg` : null);

  const signedInPhoto = withPhotoCacheBuster(rawSignedInPhoto, photoVersion);

  const signedInInitials = currentEmp
    ? `${currentEmp.firstName.charAt(0)}${currentEmp.lastName.charAt(0)}`.toUpperCase()
    : (user?.username?.substring(0, 2).toUpperCase() || 'EX');

  const perspectives: { role: DashboardPerspective; label: string; icon: any }[] = [
    { role: 'Administrator', label: 'Administrator', icon: LayoutDashboard },
    { role: 'HR Officer', label: 'HR Dashboard', icon: Users },
    { role: 'Payroll Officer', label: 'Payroll Dashboard', icon: CreditCard },
    { role: 'Employee', label: 'Employee Portal', icon: UserCheck },
    { role: 'Management', label: 'Management View', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Perspective Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {/* Signed-in Employee Profile Picture */}
          <div className="relative shrink-0">
            <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-2xl overflow-hidden ring-2 ring-indigo-500/30 dark:ring-indigo-400/40 bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center">
              {signedInPhoto && !userPhotoError ? (
                <img
                  src={signedInPhoto}
                  alt={signedInName}
                  className="h-full w-full object-cover object-top"
                  onError={() => setUserPhotoError(true)}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-indigo-600 text-white font-bold text-sm sm:text-base">
                  {signedInInitials}
                </div>
              )}
            </div>
            {/* Online/Active status indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5" title="Active Employee Session">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {perspective} Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Welcome, <strong className="font-semibold text-slate-800 dark:text-slate-200">{signedInName}</strong></span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{signedInRole}</span>
              {signedInDept && (
                <>
                  <span>•</span>
                  <span>{signedInDept}</span>
                </>
              )}
              {signedInEmpCode && (
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {signedInEmpCode}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Perspective / Role Selector Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-scroll max-w-full">
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-2xs shrink-0">
            {perspectives.map(({ role, label, icon: Icon }) => {
              const isActive = perspective === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setPerspective(role)}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh Metrics"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shadow-2xs transition shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success & Error Banners */}
      {successMessage && (
        <SuccessBanner message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}
      {error && (
        <ErrorBanner message={error} onRetry={loadData} onDismiss={() => setError(null)} />
      )}

      {/* Main Content Render */}
      {isLoading && !stats ? (
        <DashboardSkeleton />
      ) : (
        <>
          {perspective === 'Administrator' && (
            <AdminDashboardView
              stats={stats}
              recentLogs={recentLogs}
              pendingOvertime={pendingOvertime}
              currency={currency}
              onOpenScanner={onOpenScanner}
              setActivePage={setActivePage}
              onApproveOT={handleApproveOT}
              onRejectOT={handleRejectOT}
            />
          )}

          {perspective === 'HR Officer' && (
            <HRDashboardView
              stats={stats}
              recentLogs={recentLogs}
              employees={employees}
              departments={departments}
              onOpenScanner={onOpenScanner}
              setActivePage={setActivePage}
            />
          )}

          {perspective === 'Payroll Officer' && (
            <PayrollDashboardView
              stats={stats}
              payrollRecords={payrollRecords}
              currency={currency}
              setActivePage={setActivePage}
            />
          )}

          {perspective === 'Employee' && (
            <EmployeeDashboardView
              employee={employeeProfile}
              attendanceLogs={myAttendance}
              payrollRecords={myPayroll}
              overtimeClaims={myOvertime}
              currency={currency}
              onOpenScanner={onOpenScanner}
              setActivePage={setActivePage}
              onRefreshData={loadData}
            />
          )}

          {perspective === 'Management' && (
            <ManagementDashboardView
              stats={stats}
              departments={departments}
              currency={currency}
              setActivePage={setActivePage}
            />
          )}
        </>
      )}
    </div>
  );
};
