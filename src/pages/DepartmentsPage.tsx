import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Department } from '../types/index.ts';
import { DepartmentModal } from '../components/departments/DepartmentModal.tsx';
import { DepartmentDetailModal } from '../components/departments/DepartmentDetailModal.tsx';
import { EmployeeProfileModal } from '../components/employees/EmployeeProfileModal.tsx';
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  Users,
  RefreshCw,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Award,
  Calendar,
} from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [detailDepartment, setDetailDepartment] = useState<Department | null>(null);
  const [viewEmployeeId, setViewEmployeeId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const list = await api.getDepartments();
      setDepartments(list);
    } catch (e) {
      console.error('Failed to load departments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDelete = async (dept: Department) => {
    if (
      !confirm(
        `Are you sure you want to delete the department "${dept.departmentName}"?\n\nNote: Departments with active assigned employees cannot be deleted.`
      )
    )
      return;

    try {
      await api.deleteDepartment(dept.id);
      showToast(`Department "${dept.departmentName}" was deleted.`);
      loadDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete department.');
    }
  };

  // Filter & Sort
  const filteredAndSortedDepartments = useMemo(() => {
    let result = departments.filter((d) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const matchName = d.departmentName.toLowerCase().includes(s);
      const matchDesc = (d.description || '').toLowerCase().includes(s);
      return matchName || matchDesc;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.departmentName.localeCompare(b.departmentName);
        case 'name-desc':
          return b.departmentName.localeCompare(a.departmentName);
        case 'staff-desc':
          return (b.employeeCount || 0) - (a.employeeCount || 0);
        case 'staff-asc':
          return (a.employeeCount || 0) - (b.employeeCount || 0);
        case 'id-asc':
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return result;
  }, [departments, search, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const totalDepts = departments.length;
    const totalStaff = departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0);
    const avgStaff = totalDepts > 0 ? (totalStaff / totalDepts).toFixed(1) : '0';
    let largestDept = 'None';
    let maxStaff = 0;
    departments.forEach((d) => {
      if ((d.employeeCount || 0) > maxStaff) {
        maxStaff = d.employeeCount || 0;
        largestDept = d.departmentName;
      }
    });
    return { totalDepts, totalStaff, avgStaff, largestDept, maxStaff };
  }, [departments]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center space-x-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-4 py-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Department Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure business units, organizational divisions, and monitor departmental staffing distribution
          </p>
        </div>

        <button
          onClick={() => {
            setEditingDepartment(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Departments</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDepts}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Active divisions</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned Staff</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStaff}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Distributed employees</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Staff / Dept</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.avgStaff}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Members per unit</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Largest Division</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900 dark:text-white truncate" title={stats.largestDept}>
            {stats.largestDept}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {stats.maxStaff} staff member{stats.maxStaff !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter and View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments by name or description..."
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

        {/* Sort and View Toggle */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="staff-desc">Staff Count (High → Low)</option>
              <option value="staff-asc">Staff Count (Low → High)</option>
              <option value="id-asc">Department ID</option>
            </select>
          </div>

          <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading department structures...</p>
        </div>
      ) : filteredAndSortedDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3">
            <Building className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No departments match your query</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            Try adjusting your search criteria or create a new organizational department.
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Reset Search
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedDepartments.map((dept) => (
            <div
              key={dept.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setDetailDepartment(dept)}
                      title="View Details & Staff"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingDepartment(dept);
                        setIsModalOpen(true);
                      }}
                      title="Edit Department"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      title="Delete Department"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">{dept.departmentName}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                  {dept.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5 text-xs text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => setDetailDepartment(dept)}
                  className="flex items-center space-x-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  <Users className="h-4 w-4" />
                  <span>{dept.employeeCount || 0} Staff Members</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium">ID #{dept.id}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Department ID</th>
                  <th className="px-4 py-3.5 font-bold">Department Name</th>
                  <th className="px-4 py-3.5 font-bold">Description</th>
                  <th className="px-4 py-3.5 font-bold">Assigned Staff</th>
                  <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-500 dark:text-slate-400">#{dept.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          <Building className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{dept.departmentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-md truncate">
                      {dept.description || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setDetailDepartment(dept)}
                        className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{dept.employeeCount || 0} Staff</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setDetailDepartment(dept)}
                          title="View Details"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDepartment(dept);
                            setIsModalOpen(true);
                          }}
                          title="Edit Department"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          title="Delete Department"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDepartment(null);
        }}
        onSuccess={(msg) => {
          showToast(msg || 'Department saved successfully.');
          loadDepartments();
        }}
        department={editingDepartment}
      />

      <DepartmentDetailModal
        isOpen={!!detailDepartment}
        onClose={() => setDetailDepartment(null)}
        department={detailDepartment}
        onEdit={(dept) => {
          setEditingDepartment(dept);
          setIsModalOpen(true);
        }}
        onViewEmployee={(empId) => setViewEmployeeId(empId)}
      />

      <EmployeeProfileModal
        isOpen={!!viewEmployeeId}
        onClose={() => setViewEmployeeId(null)}
        employeeId={viewEmployeeId}
        onRegenerateQR={loadDepartments}
        onPhotoUpdated={loadDepartments}
      />
    </div>
  );
};
