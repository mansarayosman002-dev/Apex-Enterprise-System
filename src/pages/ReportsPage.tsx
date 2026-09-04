import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Department, Employee, AttendanceRecord, PayrollRecord } from '../types/index.ts';
import {
  Calendar,
  DollarSign,
  Printer,
  Download,
  Filter,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  X,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;

export const ReportsPage: React.FC = () => {
  const { user, hasRole } = useAuth();

  // Role Access Checks
  const isEmployee = user?.roleName === 'Employee';
  const isHROfficer = user?.roleName === 'HR Officer';
  const isPayrollOfficer = user?.roleName === 'Payroll Officer';
  const isManagement = user?.roleName === 'Management';
  const isAdmin = user?.roleName === 'Administrator';

  // Determine allowed tabs based on RBAC:
  // - Employees must never access organisation-wide payroll reports.
  // - HR should receive HR/attendance reports.
  // - Payroll officers should receive payroll reports.
  // - Management & Admin have access to both.
  const canAccessAttendance = isAdmin || isHROfficer || isManagement || isPayrollOfficer;
  const canAccessPayroll = (isAdmin || isPayrollOfficer || isManagement) && !isEmployee && !isHROfficer;

  // Active Tab: default based on user role
  const [activeTab, setActiveTab] = useState<'attendance' | 'payroll'>(() => {
    if (isPayrollOfficer && !isHROfficer) return 'payroll';
    return 'attendance';
  });

  // Common Lookups
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currency, setCurrency] = useState<string>('NLe ');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------------
  // ATTENDANCE REPORT STATE & FILTERS
  // ----------------------------------------------------
  const todayStr = new Date().toISOString().substring(0, 10);
  const [attStartDate, setAttStartDate] = useState('');
  const [attEndDate, setAttEndDate] = useState('');
  const [attDept, setAttDept] = useState('');
  const [attEmployeeId, setAttEmployeeId] = useState('');
  const [attStatus, setAttStatus] = useState('');
  const [attSearch, setAttSearch] = useState('');
  const [attSortField, setAttSortField] = useState<keyof AttendanceRecord | 'employeeCode' | 'employeeName'>('attendanceDate');
  const [attSortDirection, setAttSortDirection] = useState<SortDirection>('desc');
  const [attPage, setAttPage] = useState(1);
  const [attPageSize, setAttPageSize] = useState(10);
  const [attendanceData, setAttendanceData] = useState<{
    summary: {
      totalRecords: number;
      uniqueEmployees: number;
      presentCount: number;
      lateCount: number;
      overtimeCount: number;
      earlyDepartureCount: number;
      absentCount: number;
      totalWorkingHours: number;
      totalOvertimeHours: number;
      averageDailyHours: number;
      attendanceRate: number;
    };
    records: AttendanceRecord[];
  } | null>(null);

  // ----------------------------------------------------
  // PAYROLL REPORT STATE & FILTERS
  // ----------------------------------------------------
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [payPeriod, setPayPeriod] = useState(currentMonthStr);
  const [payDept, setPayDept] = useState('');
  const [payEmployeeId, setPayEmployeeId] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [paySearch, setPaySearch] = useState('');
  const [paySortField, setPaySortField] = useState<keyof PayrollRecord | 'employeeCode' | 'employeeName'>('netSalary');
  const [paySortDirection, setPaySortDirection] = useState<SortDirection>('desc');
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);
  const [payrollData, setPayrollData] = useState<{
    summary: {
      totalEmployees: number;
      totalRecords: number;
      totalBasicSalary: number;
      totalOvertime: number;
      totalAllowances: number;
      totalDeductions: number;
      totalGrossSalary: number;
      totalNetSalary: number;
    };
    records: PayrollRecord[];
  } | null>(null);

  // Load lookup lists
  useEffect(() => {
    loadLookups();
  }, []);

  // Fetch Attendance Report when filters change
  useEffect(() => {
    if (activeTab === 'attendance' && canAccessAttendance) {
      loadAttendanceReport();
    }
  }, [activeTab, attStartDate, attEndDate, attDept, attEmployeeId, attStatus]);

  // Fetch Payroll Report when filters change
  useEffect(() => {
    if (activeTab === 'payroll' && canAccessPayroll) {
      loadPayrollReport();
    }
  }, [activeTab, payPeriod, payDept, payEmployeeId, payStatus]);

  const loadLookups = async () => {
    try {
      const [deptList, empList, settingsData] = await Promise.all([
        api.getDepartments(),
        api.getEmployees(),
        api.getSettings().catch(() => null),
      ]);
      setDepartments(deptList);
      setEmployees(empList);
      if (settingsData?.currencySymbol) {
        const sym = settingsData.currencySymbol;
        setCurrency(sym.endsWith(' ') ? sym : `${sym} `);
      }
    } catch (e: any) {
      console.error('Failed to load lookup data:', e);
    }
  };

  const loadAttendanceReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAttendanceReport({
        startDate: attStartDate || undefined,
        endDate: attEndDate || undefined,
        departmentId: attDept ? Number(attDept) : undefined,
        employeeId: attEmployeeId ? Number(attEmployeeId) : undefined,
        status: attStatus || undefined,
      });
      setAttendanceData(res);
      setAttPage(1);
    } catch (e: any) {
      setError(e.message || 'Failed to generate attendance report');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayrollReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getPayrollReport({
        period: payPeriod || undefined,
        departmentId: payDept ? Number(payDept) : undefined,
        employeeId: payEmployeeId ? Number(payEmployeeId) : undefined,
        status: payStatus || undefined,
      });
      setPayrollData(res);
      setPayPage(1);
    } catch (e: any) {
      setError(e.message || 'Failed to generate payroll report');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Preset Handlers for Attendance Dates
  const setDatePreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'clear') => {
    const now = new Date();
    if (preset === 'today') {
      const d = now.toISOString().substring(0, 10);
      setAttStartDate(d);
      setAttEndDate(d);
    } else if (preset === 'this_week') {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay() + 1; // Monday
      const last = first + 6; // Sunday
      const firstDay = new Date(curr.setDate(first)).toISOString().substring(0, 10);
      const lastDay = new Date(curr.setDate(last)).toISOString().substring(0, 10);
      setAttStartDate(firstDay);
      setAttEndDate(lastDay);
    } else if (preset === 'this_month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setAttStartDate(`${y}-${m}-01`);
      setAttEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prev.getMonth() + 1, 0).getDate();
      setAttStartDate(`${y}-${m}-01`);
      setAttEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else {
      setAttStartDate('');
      setAttEndDate('');
    }
  };

  // Sorting handlers
  const handleAttSort = (field: keyof AttendanceRecord | 'employeeCode' | 'employeeName') => {
    if (attSortField === field) {
      if (attSortDirection === 'asc') setAttSortDirection('desc');
      else if (attSortDirection === 'desc') setAttSortDirection(null);
      else setAttSortDirection('asc');
    } else {
      setAttSortField(field);
      setAttSortDirection('asc');
    }
  };

  const handlePaySort = (field: keyof PayrollRecord | 'employeeCode' | 'employeeName') => {
    if (paySortField === field) {
      if (paySortDirection === 'asc') setPaySortDirection('desc');
      else if (paySortDirection === 'desc') setPaySortDirection(null);
      else setPaySortDirection('asc');
    } else {
      setPaySortField(field);
      setPaySortDirection('asc');
    }
  };

  // Filtered & Sorted Attendance Records
  const processedAttendanceRecords = useMemo(() => {
    if (!attendanceData?.records) return [];
    let list = [...attendanceData.records];

    // Client-side search filtering
    if (attSearch.trim()) {
      const q = attSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.employeeName?.toLowerCase().includes(q) ||
          r.employeeCode?.toLowerCase().includes(q) ||
          r.departmentName?.toLowerCase().includes(q) ||
          r.position?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          r.attendanceDate?.includes(q)
      );
    }

    // Sorting
    if (attSortField && attSortDirection) {
      list.sort((a: any, b: any) => {
        let valA = a[attSortField] ?? '';
        let valB = b[attSortField] ?? '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        // Numeric handling for hours
        if (attSortField === 'workingHours' || attSortField === 'overtimeHours') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        }

        if (valA < valB) return attSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return attSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [attendanceData, attSearch, attSortField, attSortDirection]);

  // Paginated Attendance Records
  const paginatedAttendanceRecords = useMemo(() => {
    const start = (attPage - 1) * attPageSize;
    return processedAttendanceRecords.slice(start, start + attPageSize);
  }, [processedAttendanceRecords, attPage, attPageSize]);

  const totalAttPages = Math.ceil(processedAttendanceRecords.length / attPageSize) || 1;

  // Filtered & Sorted Payroll Records
  const processedPayrollRecords = useMemo(() => {
    if (!payrollData?.records) return [];
    let list = [...payrollData.records];

    // Client-side search
    if (paySearch.trim()) {
      const q = paySearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.employeeName?.toLowerCase().includes(q) ||
          r.employeeCode?.toLowerCase().includes(q) ||
          r.departmentName?.toLowerCase().includes(q) ||
          r.position?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          r.payrollPeriod?.includes(q)
      );
    }

    // Sorting
    if (paySortField && paySortDirection) {
      list.sort((a: any, b: any) => {
        let valA = a[paySortField] ?? '';
        let valB = b[paySortField] ?? '';

        // Numeric sorting for monetary amounts
        const numericFields = [
          'basicSalary',
          'overtimeAmount',
          'allowances',
          'deductions',
          'grossSalary',
          'netSalary',
        ];
        if (numericFields.includes(paySortField as string)) {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return paySortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return paySortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [payrollData, paySearch, paySortField, paySortDirection]);

  // Paginated Payroll Records
  const paginatedPayrollRecords = useMemo(() => {
    const start = (payPage - 1) * payPageSize;
    return processedPayrollRecords.slice(start, start + payPageSize);
  }, [processedPayrollRecords, payPage, payPageSize]);

  const totalPayPages = Math.ceil(processedPayrollRecords.length / payPageSize) || 1;

  // Export Attendance CSV
  const exportAttendanceCSV = () => {
    if (!processedAttendanceRecords.length) return;
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Date',
      'Check-In',
      'Check-Out',
      'Working Hours',
      'Overtime Hours',
      'Status',
    ];
    const rows = processedAttendanceRecords.map((r) => [
      `"${r.employeeCode || ''}"`,
      `"${r.employeeName || ''}"`,
      `"${r.departmentName || ''}"`,
      `"${r.attendanceDate}"`,
      `"${r.checkIn}"`,
      `"${r.checkOut || 'Active'}"`,
      `"${r.workingHours}"`,
      `"${r.overtimeHours}"`,
      `"${r.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apex_Attendance_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Payroll CSV
  const exportPayrollCSV = () => {
    if (!processedPayrollRecords.length) return;
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Payroll Period',
      'Basic Salary',
      'Overtime Pay',
      'Allowances',
      'Deductions',
      'Gross Salary',
      'Net Salary',
      'Status',
    ];
    const rows = processedPayrollRecords.map((r) => [
      `"${r.employeeCode || ''}"`,
      `"${r.employeeName || ''}"`,
      `"${r.departmentName || ''}"`,
      `"${r.payrollPeriod}"`,
      `"${parseFloat(r.basicSalary.toString()).toFixed(2)}"`,
      `"${parseFloat(r.overtimeAmount.toString()).toFixed(2)}"`,
      `"${parseFloat(r.allowances.toString()).toFixed(2)}"`,
      `"${parseFloat(r.deductions.toString()).toFixed(2)}"`,
      `"${parseFloat(r.grossSalary.toString()).toFixed(2)}"`,
      `"${parseFloat(r.netSalary.toString()).toFixed(2)}"`,
      `"${r.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apex_Payroll_Report_${payPeriod || todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Render Status Badge
  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Present
          </span>
        );
      case 'Late':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Late
          </span>
        );
      case 'Early Departure':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            Early Dep.
          </span>
        );
      case 'Overtime':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Overtime
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Absent
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Paid
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Approved
          </span>
        );
      case 'Processed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Processed
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Sort Header Icon Component
  const renderSortIndicator = (field: string, currentField: string, direction: SortDirection) => {
    if (field !== currentField || !direction) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100" />;
    }
    return direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-indigo-600 dark:text-indigo-400 font-bold" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-indigo-600 dark:text-indigo-400 font-bold" />
    );
  };

  // Unauthorized screen for general employees trying to access full reports
  if (isEmployee) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-8 text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="h-12 w-12 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Restricted Audit Access</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
          Organisation-wide executive reports and financial payroll records are restricted to HR, Payroll Officers, and Management.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Please check your personal attendance history and monthly payslips directly in your Employee Dashboard or Profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =================================================== */}
      {/* 1. PRINT HEADER (Visible only when printing)        */}
      {/* =================================================== */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">APEX ENTERPRISE SYSTEMS</h1>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-0.5">
              Official Corporate Workforce Audit & Financial Intelligence
            </p>
            <h2 className="text-base font-bold text-indigo-950 mt-2">
              {activeTab === 'attendance' ? 'Workforce Attendance Audit Report' : 'Executive Payroll Statement & Compensation Report'}
            </h2>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p className="font-semibold text-slate-800">Generated: {new Date().toLocaleString()}</p>
            <p>Auditor: {user?.username} ({user?.roleName})</p>
            <p className="font-mono text-[10px] text-slate-400">Security Classification: INTERNAL AUDIT ONLY</p>
          </div>
        </div>

        {/* Print Filter Parameter summary */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded bg-slate-50 p-2 text-[10px] text-slate-700 border border-slate-200">
          {activeTab === 'attendance' ? (
            <>
              <span><strong>Date Range:</strong> {attStartDate || 'All Time'} to {attEndDate || 'Present'}</span>
              <span><strong>Department:</strong> {departments.find(d => String(d.id) === attDept)?.departmentName || 'All Departments'}</span>
              <span><strong>Status:</strong> {attStatus || 'All Statuses'}</span>
              <span><strong>Total Records:</strong> {processedAttendanceRecords.length}</span>
            </>
          ) : (
            <>
              <span><strong>Payroll Period:</strong> {payPeriod || 'All Periods'}</span>
              <span><strong>Department:</strong> {departments.find(d => String(d.id) === payDept)?.departmentName || 'All Departments'}</span>
              <span><strong>Status:</strong> {payStatus || 'All Statuses'}</span>
              <span><strong>Total Headcount:</strong> {processedPayrollRecords.length}</span>
            </>
          )}
        </div>
      </div>

      {/* =================================================== */}
      {/* 2. ON-SCREEN HEADER & CONTROLS                     */}
      {/* =================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Reports & Analytics</h1>
            {isManagement && (
              <span className="inline-flex items-center space-x-1 rounded-md bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Eye className="h-3 w-3" />
                <span>Management Read-Only</span>
              </span>
            )}
            {isHROfficer && (
              <span className="inline-flex items-center space-x-1 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <ShieldCheck className="h-3 w-3" />
                <span>HR Audit Authority</span>
              </span>
            )}
            {isPayrollOfficer && (
              <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <DollarSign className="h-3 w-3" />
                <span>Payroll Audit Access</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-ready workforce timesheets, overtime tracking, and aggregated payroll distribution statements
          </p>
        </div>

        {/* Global Actions (Export CSV, Print, Refresh) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={activeTab === 'attendance' ? loadAttendanceReport : loadPayrollReport}
            disabled={isLoading}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
            title="Refresh current report dataset"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={activeTab === 'attendance' ? exportAttendanceCSV : exportPayrollCSV}
            disabled={isLoading || (activeTab === 'attendance' ? !processedAttendanceRecords.length : !processedPayrollRecords.length)}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition disabled:opacity-50"
            title="Export filtered records as CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isLoading}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            title="Open print dialog with formal report layout"
          >
            <Printer className="h-4 w-4 text-white" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* =================================================== */}
      {/* 3. REPORT SELECTOR TABS (RBAC Managed)             */}
      {/* =================================================== */}
      <div className="flex rounded-xl bg-slate-200/60 dark:bg-slate-800 p-1 text-xs font-semibold max-w-md print:hidden">
        {canAccessAttendance && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 flex items-center justify-center space-x-1.5 rounded-lg py-2 transition ${
              activeTab === 'attendance'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Attendance Report</span>
          </button>
        )}

        {canAccessPayroll ? (
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex-1 flex items-center justify-center space-x-1.5 rounded-lg py-2 transition ${
              activeTab === 'payroll'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Payroll Report</span>
          </button>
        ) : isHROfficer ? (
          <div
            className="flex-1 flex items-center justify-center space-x-1 rounded-lg py-2 text-slate-400 dark:text-slate-500 cursor-not-allowed text-[11px]"
            title="Organisation-wide payroll is restricted to Payroll Officers & Management"
          >
            <ShieldAlert className="h-3 w-3 text-slate-400" />
            <span>Payroll (Restricted)</span>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* =================================================== */}
      {/* 4. ATTENDANCE REPORT VIEW                           */}
      {/* =================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Filters Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Attendance Filter Parameters</span>
              </div>
              <div className="flex items-center space-x-1 text-[11px]">
                <span className="text-slate-400 dark:text-slate-500 mr-1">Presets:</span>
                <button
                  onClick={() => setDatePreset('today')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 px-2 py-0.5 text-slate-600 dark:text-slate-300 transition"
                >
                  Today
                </button>
                <button
                  onClick={() => setDatePreset('this_week')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 px-2 py-0.5 text-slate-600 dark:text-slate-300 transition"
                >
                  This Week
                </button>
                <button
                  onClick={() => setDatePreset('this_month')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 px-2 py-0.5 text-slate-600 dark:text-slate-300 transition"
                >
                  This Month
                </button>
                <button
                  onClick={() => setDatePreset('last_month')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 px-2 py-0.5 text-slate-600 dark:text-slate-300 transition"
                >
                  Last Month
                </button>
                <button
                  onClick={() => setDatePreset('clear')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-0.5 text-slate-500 dark:text-slate-400 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={attStartDate}
                  onChange={(e) => setAttStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={attEndDate}
                  onChange={(e) => setAttEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
                <select
                  value={attDept}
                  onChange={(e) => setAttDept(e.target.value)}
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

              {/* Employee Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Employee</label>
                <select
                  value={attEmployeeId}
                  onChange={(e) => setAttEmployeeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Early Departure">Early Departure</option>
                  <option value="Overtime">Overtime</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>

            {/* Keyword Search Field */}
            <div className="pt-1 flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in attendance results by employee name, code, department, position..."
                  value={attSearch}
                  onChange={(e) => setAttSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
                />
                {attSearch && (
                  <button
                    onClick={() => setAttSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Attendance Summary Statistics Cards */}
          {attendanceData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Total Shifts</span>
                  <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{attendanceData.summary.totalRecords}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{attendanceData.summary.uniqueEmployees} Active Employees</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/30 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <span>Present</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{attendanceData.summary.presentCount}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{attendanceData.summary.attendanceRate}% Rate</p>
              </div>

              <div className="rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/30 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  <span>Late Arrivals</span>
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="mt-1 text-xl font-black text-amber-700 dark:text-amber-300">{attendanceData.summary.lateCount}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Threshold &gt;15 min</p>
              </div>

              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-800 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  <span>Overtime Hours</span>
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="mt-1 text-xl font-black text-indigo-700 dark:text-indigo-300">
                  {Number(attendanceData.summary.totalOvertimeHours).toFixed(1)} <span className="text-xs font-normal">hrs</span>
                </p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">{attendanceData.summary.overtimeCount} Overtime Logs</p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Working Hours</span>
                  <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {Number(attendanceData.summary.totalWorkingHours).toFixed(1)} <span className="text-xs font-normal">hrs</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Avg {attendanceData.summary.averageDailyHours} hrs/shift</p>
              </div>

              <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/30 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                  <span>Early Departure</span>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="mt-1 text-xl font-black text-rose-700 dark:text-rose-300">{attendanceData.summary.earlyDepartureCount || 0}</p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Shift incomplete</p>
              </div>
            </div>
          )}

          {/* Attendance Records Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800 print:bg-white print:border-b-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Attendance Audit Ledger</span>
                <span className="rounded bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  {processedAttendanceRecords.length} records
                </span>
              </div>

              {/* Page size selector */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 print:hidden">
                <span>Show:</span>
                <select
                  value={attPageSize}
                  onChange={(e) => {
                    setAttPageSize(Number(e.target.value));
                    setAttPage(1);
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th
                      onClick={() => handleAttSort('employeeCode')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Employee ID</span>
                        {renderSortIndicator('employeeCode', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('employeeName')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Employee Name</span>
                        {renderSortIndicator('employeeName', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('departmentName')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Department</span>
                        {renderSortIndicator('departmentName', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('attendanceDate')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Date</span>
                        {renderSortIndicator('attendanceDate', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('checkIn')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Check-In</span>
                        {renderSortIndicator('checkIn', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('checkOut')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Check-Out</span>
                        {renderSortIndicator('checkOut', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('workingHours')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Working Hours</span>
                        {renderSortIndicator('workingHours', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('overtimeHours')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Overtime</span>
                        {renderSortIndicator('overtimeHours', attSortField, attSortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleAttSort('status')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Status</span>
                        {renderSortIndicator('status', attSortField, attSortDirection)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {paginatedAttendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">No attendance records found</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Try adjusting your date range or filter criteria</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendanceRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                          {r.employeeCode || `EMP-${r.employeeId}`}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                          {r.employeeName}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.departmentName}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{r.attendanceDate}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          {r.checkIn}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {r.checkOut || <span className="italic text-amber-600 dark:text-amber-400">Active</span>}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                          {r.workingHours} hrs
                        </td>
                        <td className="px-4 py-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                          {parseFloat(r.overtimeHours.toString()) > 0 ? (
                            <span>+{r.overtimeHours} hrs</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-normal">0.0 hrs</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {renderStatusBadge(r.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Attendance Pagination Controls */}
            {processedAttendanceRecords.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 gap-3 print:hidden">
                <div>
                  Showing{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.min((attPage - 1) * attPageSize + 1, processedAttendanceRecords.length)}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.min(attPage * attPageSize, processedAttendanceRecords.length)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-900 dark:text-white">{processedAttendanceRecords.length}</span> entries
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setAttPage(1)}
                    disabled={attPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAttPage((p) => Math.max(p - 1, 1))}
                    disabled={attPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    Page {attPage} of {totalAttPages}
                  </span>

                  <button
                    onClick={() => setAttPage((p) => Math.min(p + 1, totalAttPages))}
                    disabled={attPage === totalAttPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAttPage(totalAttPages)}
                    disabled={attPage === totalAttPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* 5. PAYROLL REPORT VIEW                              */}
      {/* =================================================== */}
      {activeTab === 'payroll' && canAccessPayroll && (
        <div className="space-y-6">
          {/* Payroll Filters Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Payroll Filter Parameters</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Period: <strong className="text-slate-800 dark:text-slate-200">{payPeriod || 'All'}</strong>
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Payroll Period */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Payroll Period (YYYY-MM)</label>
                <input
                  type="month"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
                <select
                  value={payDept}
                  onChange={(e) => setPayDept(e.target.value)}
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

              {/* Employee Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Employee</label>
                <select
                  value={payEmployeeId}
                  onChange={(e) => setPayEmployeeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                <select
                  value={payStatus}
                  onChange={(e) => setPayStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Processed">Processed</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Keyword Search Field */}
            <div className="pt-1 flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in payroll records by employee name, code, department..."
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
                />
                {paySearch && (
                  <button
                    onClick={() => setPaySearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Payroll Summary Statistics Box (All 7 required summary metrics) */}
          {payrollData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* 1. Total Employees */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Employees</span>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{payrollData.summary.totalEmployees}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{payrollData.summary.totalRecords} Records</p>
              </div>

              {/* 2. Total Basic Salary */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Basic</span>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {currency}{payrollData.summary.totalBasicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Base wages</p>
              </div>

              {/* 3. Total Overtime */}
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/30 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">Total Overtime</span>
                <p className="mt-1 text-lg font-black text-indigo-700 dark:text-indigo-300">
                  +{currency}{payrollData.summary.totalOvertime.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">1.5x Multiplier</p>
              </div>

              {/* 4. Total Allowances */}
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/30 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Total Allowances</span>
                <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
                  +{currency}{payrollData.summary.totalAllowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Bonuses & benefits</p>
              </div>

              {/* 5. Total Deductions */}
              <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/30 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Total Deductions</span>
                <p className="mt-1 text-lg font-black text-rose-700 dark:text-rose-300">
                  -{currency}{payrollData.summary.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Taxes & withholdings</p>
              </div>

              {/* 6. Total Gross Salary */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross Salary</span>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {currency}{payrollData.summary.totalGrossSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Basic + OT + Allow</p>
              </div>

              {/* 7. Total Net Salary */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">Total Net Salary</span>
                <p className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-300">
                  {currency}{payrollData.summary.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">Net Disbursement</p>
              </div>
            </div>
          )}

          {/* Payroll Records Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800 print:bg-white print:border-b-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Payroll Disbursement Statement</span>
                <span className="rounded bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  {processedPayrollRecords.length} records
                </span>
              </div>

              {/* Page size selector */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 print:hidden">
                <span>Show:</span>
                <select
                  value={payPageSize}
                  onChange={(e) => {
                    setPayPageSize(Number(e.target.value));
                    setPayPage(1);
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th
                      onClick={() => handlePaySort('employeeCode')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Employee ID</span>
                        {renderSortIndicator('employeeCode', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('employeeName')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Employee Name</span>
                        {renderSortIndicator('employeeName', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('departmentName')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Department</span>
                        {renderSortIndicator('departmentName', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('payrollPeriod')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Period</span>
                        {renderSortIndicator('payrollPeriod', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('basicSalary')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Basic Salary</span>
                        {renderSortIndicator('basicSalary', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('overtimeAmount')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Overtime</span>
                        {renderSortIndicator('overtimeAmount', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('allowances')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Allowances</span>
                        {renderSortIndicator('allowances', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('deductions')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Deductions</span>
                        {renderSortIndicator('deductions', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('grossSalary')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Gross Salary</span>
                        {renderSortIndicator('grossSalary', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('netSalary')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Net Salary</span>
                        {renderSortIndicator('netSalary', paySortField, paySortDirection)}
                      </div>
                    </th>
                    <th
                      onClick={() => handlePaySort('status')}
                      className="group cursor-pointer px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center">
                        <span>Status</span>
                        {renderSortIndicator('status', paySortField, paySortDirection)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {paginatedPayrollRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">No payroll records found</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Try selecting a different period or clearing filters</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayrollRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                          {r.employeeCode || `EMP-${r.employeeId}`}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{r.employeeName}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.departmentName}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{r.payrollPeriod}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                          {currency}{parseFloat(r.basicSalary.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                          +{currency}{parseFloat(r.overtimeAmount.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">
                          +{currency}{parseFloat(r.allowances.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-rose-600 dark:text-rose-400">
                          -{currency}{parseFloat(r.deductions.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {currency}{parseFloat(r.grossSalary.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 font-black text-emerald-700 dark:text-emerald-300">
                          {currency}{parseFloat(r.netSalary.toString()).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5">{renderStatusBadge(r.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payroll Pagination Controls */}
            {processedPayrollRecords.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 gap-3 print:hidden">
                <div>
                  Showing{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.min((payPage - 1) * payPageSize + 1, processedPayrollRecords.length)}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.min(payPage * payPageSize, processedPayrollRecords.length)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-900 dark:text-white">{processedPayrollRecords.length}</span> entries
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setPayPage(1)}
                    disabled={payPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPayPage((p) => Math.max(p - 1, 1))}
                    disabled={payPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    Page {payPage} of {totalPayPages}
                  </span>

                  <button
                    onClick={() => setPayPage((p) => Math.min(p + 1, totalPayPages))}
                    disabled={payPage === totalPayPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPayPage(totalPayPages)}
                    disabled={payPage === totalPayPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* 6. PRINT FOOTER & AUDIT SIGN-OFF                   */}
      {/* =================================================== */}
      <div className="hidden print:block pt-8 mt-12 border-t-2 border-slate-300 text-xs text-slate-700">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="font-bold text-slate-900">Prepared By:</p>
            <div className="mt-8 border-b border-slate-400" />
            <p className="mt-1 text-[11px] text-slate-500">Name & Title: {user?.username} ({user?.roleName})</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Verified By (HR/Payroll):</p>
            <div className="mt-8 border-b border-slate-400" />
            <p className="mt-1 text-[11px] text-slate-500">Signature / Date</p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Approved By (Executive Management):</p>
            <div className="mt-8 border-b border-slate-400" />
            <p className="mt-1 text-[11px] text-slate-500">Signature / Date</p>
          </div>
        </div>
        <div className="text-center text-[10px] text-slate-400 mt-6 font-mono">
          Apex Enterprise Management System • Confidential Audit Document • Page 1 of 1
        </div>
      </div>
    </div>
  );
};
