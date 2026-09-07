import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Employee, Department } from '../types/index.ts';
import { EmployeeModal } from '../components/employees/EmployeeModal.tsx';
import { EmployeeProfileModal } from '../components/employees/EmployeeProfileModal.tsx';
import { EmployeeDeleteConfirmModal } from '../components/employees/EmployeeDeleteConfirmModal.tsx';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  QrCode,
  Edit2,
  Download,
  Building,
  Mail,
  Phone,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  ArrowUpDown,
  LayoutGrid,
  List,
  CheckCircle2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [profileEmployeeId, setProfileEmployeeId] = useState<number | null>(null);
  const [confirmDeactivateEmp, setConfirmDeactivateEmp] = useState<Employee | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('NLe ');

  useEffect(() => {
    loadData();
  }, [search, selectedDept, selectedStatus]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDept, selectedStatus, sortBy, itemsPerPage]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, deptList, rList, settingsData] = await Promise.all([
        api.getEmployees({
          search: search || undefined,
          departmentId: selectedDept ? Number(selectedDept) : undefined,
          status: selectedStatus || undefined,
        }),
        api.getDepartments(),
        api.getRoles(),
        api.getSettings().catch(() => null),
      ]);
      setEmployees(empList);
      setDepartments(deptList);
      setRolesList(rList);
      if (settingsData?.currencySymbol) {
        const sym = settingsData.currencySymbol;
        setCurrency(sym.endsWith(' ') ? sym : `${sym} `);
      }
    } catch (e) {
      console.error('Failed to load employees:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sorting logic
  const sortedEmployees = useMemo(() => {
    const sorted = [...employees];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name-desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case 'code-asc':
          return a.employeeCode.localeCompare(b.employeeCode);
        case 'salary-desc':
          return parseFloat(b.basicSalary.toString()) - parseFloat(a.basicSalary.toString());
        case 'salary-asc':
          return parseFloat(a.basicSalary.toString()) - parseFloat(b.basicSalary.toString());
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
    return sorted;
  }, [employees, sortBy]);

  // Pagination slice
  const totalItems = sortedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedEmployees.slice(start, start + itemsPerPage);
  }, [sortedEmployees, currentPage, itemsPerPage]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'active').length;
    const inactive = total - active;
    const payrollBase = employees
      .filter((e) => e.status === 'active')
      .reduce((sum, e) => sum + parseFloat(e.basicSalary.toString() || '0'), 0);
    return { total, active, inactive, payrollBase };
  }, [employees]);

  // Toggle Deactivate / Reactivate
  const handleToggleStatus = async () => {
    if (!confirmDeactivateEmp) return;
    setIsDeactivating(true);
    try {
      const isCurrentlyActive = confirmDeactivateEmp.status === 'active';
      if (isCurrentlyActive) {
        await api.deleteEmployee(confirmDeactivateEmp.id);
        showToast(`Employee ${confirmDeactivateEmp.firstName} ${confirmDeactivateEmp.lastName} deactivated.`);
      } else {
        await api.updateEmployee(confirmDeactivateEmp.id, { status: 'active' });
        showToast(`Employee ${confirmDeactivateEmp.firstName} ${confirmDeactivateEmp.lastName} reactivated.`);
      }
      setConfirmDeactivateEmp(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee status.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const exportCSV = () => {
    if (employees.length === 0) return;
    const headers = [
      'Employee Code',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Position',
      'Basic Salary',
      'Status',
      'Created Date',
    ];
    const rows = sortedEmployees.map((e) => [
      e.employeeCode,
      e.firstName,
      e.lastName,
      e.email,
      e.phone || '',
      e.departmentName || '',
      e.position,
      parseFloat(e.basicSalary.toString()).toFixed(2),
      e.status,
      e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employees_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Employee roster exported as CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center space-x-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-4 py-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Employee Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Maintain employee records, departments, positions, salaries, and security QR badges
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
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Workforce</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Total registered profiles</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Staff</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Valid QR credentials</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Departments</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{departments.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Organizational units</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Base Payroll</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {currency}{stats.payrollBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Active base commitment</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row flex-1 gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name, code, position, or email..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-36">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Sorting and View Switch */}
        <div className="flex items-center space-x-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="code-asc">Employee Code</option>
              <option value="salary-desc">Salary (High to Low)</option>
              <option value="salary-asc">Salary (Low to High)</option>
              <option value="newest">Newest Joined</option>
            </select>
          </div>

          <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading workforce records...</p>
        </div>
      ) : paginatedEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No employees match your search criteria</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            Try adjusting your search terms, clearing the department filter, or registering a new team member.
          </p>
          {(search || selectedDept || selectedStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedDept('');
                setSelectedStatus('');
              }}
              className="mt-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Employee</th>
                  <th className="px-4 py-3.5 font-bold">Department & Position</th>
                  <th className="px-4 py-3.5 font-bold">Contact Info</th>
                  <th className="px-4 py-3.5 font-bold">Basic Salary</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-4 py-3.5 font-bold text-center">QR Badge</th>
                  <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    {/* Name & Code */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs">
                          {emp.firstName.charAt(0)}
                          {emp.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            {emp.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Position */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{emp.departmentName || 'Unassigned'}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{emp.position}</p>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      <p className="text-[11px] font-medium text-slate-900 dark:text-white">{emp.email}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{emp.phone || '—'}</p>
                    </td>

                    {/* Salary */}
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {currency}{parseFloat(emp.basicSalary.toString()).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          emp.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{emp.status === 'active' ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>

                    {/* QR Thumbnail */}
                    <td className="px-4 py-3.5 text-center">
                      {emp.qrCode?.dataUrl ? (
                        <button
                          onClick={() => setProfileEmployeeId(emp.id)}
                          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 p-1 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition group"
                          title="Click to view & print QR Badge"
                        >
                          <img
                            src={emp.qrCode.dataUrl}
                            alt="QR thumbnail"
                            className="h-7 w-7 object-contain rounded bg-white"
                          />
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 pr-1">
                            Badge
                          </span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">None</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setProfileEmployeeId(emp.id)}
                          title="View Profile & Identification"
                          className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          title="Edit Employee"
                          className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeactivateEmp(emp)}
                          title={emp.status === 'active' ? 'Deactivate Employee' : 'Reactivate Employee'}
                          className={`rounded-lg p-1.5 transition ${
                            emp.status === 'active'
                              ? 'text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300'
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300'
                          }`}
                        >
                          {emp.status === 'active' ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedEmployees.map((emp) => (
            <div
              key={emp.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300 text-sm shadow-2xs">
                      {emp.firstName.charAt(0)}
                      {emp.lastName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {emp.firstName} {emp.lastName}
                      </h3>
                      <p className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{emp.employeeCode}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      emp.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {emp.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500">Position:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.position}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.departmentName || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500">Basic Salary:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {currency}{parseFloat(emp.basicSalary.toString()).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500">Email:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{emp.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                {emp.qrCode?.dataUrl ? (
                  <button
                    onClick={() => setProfileEmployeeId(emp.id)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>View Badge</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">No QR</span>
                )}

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setProfileEmployeeId(emp.id)}
                    title="Profile Details"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingEmployee(emp)}
                    title="Edit Employee"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeactivateEmp(emp)}
                    title={emp.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    className={`rounded-lg p-1.5 transition ${
                      emp.status === 'active'
                        ? 'text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300'
                        : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    {emp.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && sortedEmployees.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>
            <span>to</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>
            <span>of</span>
            <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span>
            <span>employees</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EmployeeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(msg) => {
          showToast(msg || 'Employee registered successfully.');
          loadData();
        }}
        departments={departments}
        rolesList={rolesList}
        currency={currency}
      />

      <EmployeeModal
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSuccess={(msg) => {
          showToast(msg || 'Employee details updated.');
          loadData();
        }}
        employee={editingEmployee}
        departments={departments}
        rolesList={rolesList}
        currency={currency}
      />

      <EmployeeProfileModal
        isOpen={!!profileEmployeeId}
        onClose={() => setProfileEmployeeId(null)}
        employeeId={profileEmployeeId}
        onRegenerateQR={loadData}
        onEdit={(emp) => setEditingEmployee(emp)}
        currency={currency}
      />

      <EmployeeDeleteConfirmModal
        isOpen={!!confirmDeactivateEmp}
        onClose={() => setConfirmDeactivateEmp(null)}
        onConfirm={handleToggleStatus}
        employee={confirmDeactivateEmp}
        isDeactivating={isDeactivating}
      />
    </div>
  );
};
