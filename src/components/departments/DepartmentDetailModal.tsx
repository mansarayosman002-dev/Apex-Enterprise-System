import React, { useState, useEffect } from 'react';
import { Department, Employee } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import {
  X,
  Building,
  Users,
  DollarSign,
  Calendar,
  Eye,
  UserCheck,
  AlertCircle,
  Briefcase,
  Mail,
  RefreshCw,
  Plus,
  Edit2,
} from 'lucide-react';

interface DepartmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  onEdit?: (department: Department) => void;
  onViewEmployee?: (employeeId: number) => void;
  currency?: string;
}

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  isOpen,
  onClose,
  department,
  onEdit,
  onViewEmployee,
  currency = 'NLe ',
}) => {
  const [assignedEmployees, setAssignedEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && department) {
      loadDepartmentStaff(department.id);
    }
  }, [isOpen, department]);

  const loadDepartmentStaff = async (deptId: number) => {
    setLoading(true);
    try {
      const allEmployees = await api.getEmployees({ departmentId: deptId });
      setAssignedEmployees(allEmployees);
    } catch (e) {
      console.error('Failed to load department employees:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !department) return null;

  const totalPayroll = assignedEmployees
    .filter((e) => e.status === 'active')
    .reduce((sum, e) => sum + parseFloat(e.basicSalary.toString() || '0'), 0);

  const activeCount = assignedEmployees.filter((e) => e.status === 'active').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{department.departmentName}</h3>
                <span className="rounded-md bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  ID #{department.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {department.description || 'No description provided.'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(department);
                }}
                className="flex items-center space-x-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Department Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Staff</span>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{assignedEmployees.length}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Assigned members</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active Staff</span>
              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Active workforce</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Monthly Budget</span>
              <p className="mt-1 text-xl font-bold text-indigo-700 dark:text-indigo-400">
                {currency}{totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Base salary commitment</p>
            </div>
          </div>

          {/* Assigned Staff List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Assigned Department Staff ({assignedEmployees.length})</span>
              </h4>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
            ) : assignedEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center bg-slate-50/50 dark:bg-slate-800/30">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No employees assigned yet</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Employees can be assigned to this department from the Employee Management screen.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Employee</th>
                      <th className="px-4 py-2.5 font-bold">Position</th>
                      <th className="px-4 py-2.5 font-bold">Salary</th>
                      <th className="px-4 py-2.5 font-bold">Status</th>
                      <th className="px-4 py-2.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assignedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300 text-[10px]">
                              {emp.firstName.charAt(0)}
                              {emp.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{emp.employeeCode}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{emp.position}</td>

                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {currency}{parseFloat(emp.basicSalary.toString()).toFixed(2)}
                        </td>

                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              emp.status === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>

                        <td className="px-4 py-2.5 text-right">
                          {onViewEmployee && (
                            <button
                              onClick={() => {
                                onClose();
                                onViewEmployee(emp.id);
                              }}
                              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                              title="View Employee Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
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
    </div>
  );
};
