import React, { useState, useEffect } from 'react';
import { Department, Employee } from '../../types/index.ts';
import { X, User, Mail, Phone, Building, Briefcase, DollarSign, Key, AlertCircle, RefreshCw, Sparkles, Check } from 'lucide-react';
import { api } from '../../services/api.ts';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  employee?: Employee | null;
  departments: Department[];
  rolesList?: any[];
  currency?: string;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
  departments,
  rolesList = [],
  currency = 'NLe',
}) => {
  const isEdit = !!employee;
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    position: '',
    basicSalary: '',
    status: 'active' as 'active' | 'inactive',
    createAccount: false,
    username: '',
    password: 'password123',
    roleId: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `EMP-${randomNum}`;
  };

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeCode: employee.employeeCode || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        departmentId: employee.departmentId ? employee.departmentId.toString() : '',
        position: employee.position || '',
        basicSalary: employee.basicSalary != null ? employee.basicSalary.toString() : '',
        status: employee.status || 'active',
        createAccount: false,
        username: '',
        password: '',
        roleId: '',
      });
    } else {
      setFormData({
        employeeCode: generateCode(),
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: departments[0]?.id ? departments[0].id.toString() : '',
        position: '',
        basicSalary: '4500.00',
        status: 'active',
        createAccount: true,
        username: '',
        password: 'password123',
        roleId: rolesList.find((r) => r.roleName === 'Employee')?.id?.toString() || (rolesList[0]?.id?.toString() || '4'),
      });
    }
    setError(null);
  }, [employee, departments, isOpen, rolesList]);

  if (!isOpen) return null;

  const validateForm = () => {
    if (!formData.employeeCode.trim()) {
      setError('Employee Code is required.');
      return false;
    }
    if (!formData.firstName.trim()) {
      setError('First name is required.');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please provide a valid email address (e.g. employee@company.com).');
      return false;
    }
    if (!formData.departmentId) {
      setError('Please select a valid department.');
      return false;
    }
    if (!formData.position.trim()) {
      setError('Position / job title is required.');
      return false;
    }
    const salary = parseFloat(formData.basicSalary);
    if (isNaN(salary) || salary < 0) {
      setError('Basic monthly salary must be a valid positive number.');
      return false;
    }
    if (!isEdit && formData.createAccount) {
      if (formData.username && formData.username.trim().length < 3) {
        setError('Login username must be at least 3 characters long.');
        return false;
      }
      if (formData.password && formData.password.length < 6) {
        setError('Login initial password must be at least 6 characters.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && employee) {
        await api.updateEmployee(employee.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          departmentId: Number(formData.departmentId),
          position: formData.position,
          basicSalary: formData.basicSalary,
          status: formData.status,
        });
        onSuccess(`Employee ${formData.firstName} ${formData.lastName} updated successfully.`);
      } else {
        await api.createEmployee({
          employeeCode: formData.employeeCode,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          departmentId: Number(formData.departmentId),
          position: formData.position,
          basicSalary: formData.basicSalary,
          createAccount: formData.createAccount,
          username: formData.username || formData.email.split('@')[0],
          password: formData.password || 'password123',
          roleId: formData.roleId ? Number(formData.roleId) : undefined,
        });
        onSuccess(`Employee ${formData.firstName} ${formData.lastName} registered and QR badge created.`);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 sm:px-6 py-3.5 sm:py-4">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Employee Details' : 'Register New Employee'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? 'Update personnel record, contact information, and departmental assignment'
                : 'Fills personnel roster and generates an authentic attendance QR badge'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3.5 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Code and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee Code <span className="text-rose-500">*</span>
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, employeeCode: generateCode() })}
                    className="flex items-center space-x-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                    title="Generate Random Code"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Regen</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.employeeCode || ''}
                disabled={isEdit}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-500"
                placeholder="e.g. EMP-1001"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Row 2: Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Osman"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Mansaray"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Row 3: Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="osman.mansaray@apexenterprise.sl"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+232 76 892 411"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 4: Department & Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.departmentId || ''}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Position / Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g. Lead Software Engineer"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Row 5: Salary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Basic Monthly Salary ({currency.trim()}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {currency.trim()}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.basicSalary || ''}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                placeholder="5500.00"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-12 pr-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Provision User Account Section (For new registrations) */}
          {!isEdit && (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-4 space-y-3">
              <label className="flex items-center space-x-2.5 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.createAccount}
                  onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="flex items-center space-x-1.5">
                  <Key className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Provision System User Login Account</span>
                </span>
              </label>

              {formData.createAccount && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/60">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Username</label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder={formData.email ? formData.email.split('@')[0] : 'username'}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Password</label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Assigned Role</label>
                    <select
                      value={formData.roleId || ''}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                    >
                      {rolesList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roleName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Record...</span>
                </>
              ) : isEdit ? (
                <span>Save Changes</span>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Register & Create Badge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
