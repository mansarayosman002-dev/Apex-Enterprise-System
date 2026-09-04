import React, { useState, useEffect } from 'react';
import { X, Shield, Key, User, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.ts';
import { Employee } from '../../types/index.ts';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any | null;
  roles: any[];
  employees: Employee[];
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  roles,
  employees,
}) => {
  const isEdit = !!user;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setPassword('');
      setRoleId(user.roleId != null ? user.roleId.toString() : '');
      setEmployeeId(user.employeeId != null ? user.employeeId.toString() : '');
      setStatus(user.status || 'active');
    } else {
      setUsername('');
      setPassword('password123');
      setRoleId(roles[0]?.id ? roles[0].id.toString() : '1');
      setEmployeeId('');
      setStatus('active');
    }
    setError(null);
  }, [user, roles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !roleId) {
      setError('Username and Role are required.');
      return;
    }

    if (!isEdit && !password) {
      setError('Initial password is required for new accounts.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && user) {
        await api.updateUser(user.id, {
          roleId: Number(roleId),
          employeeId: employeeId ? Number(employeeId) : null,
          status,
          password: password.trim() ? password.trim() : undefined,
        });
      } else {
        await api.createUser({
          username,
          password,
          roleId: Number(roleId),
          employeeId: employeeId ? Number(employeeId) : null,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {isEdit ? 'Edit System User' : 'Create System Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Username / Login ID *</label>
            <input
              type="text"
              value={username || ''}
              disabled={isEdit}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. hr.manager"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-100 dark:disabled:bg-slate-800/40 dark:disabled:text-slate-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEdit ? 'Reset Password (leave blank to keep unchanged)' : 'Password *'}
            </label>
            <input
              type="password"
              value={password || ''}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Enter new password...' : 'Minimum 6 characters'}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              required={!isEdit}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned System Role *</label>
            <select
              value={roleId || ''}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roleName} ({r.description?.substring(0, 45)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Link to Registered Employee (Optional)</label>
            <select
              value={employeeId || ''}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="">-- None (Standalone Account) --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} - {emp.firstName} {emp.lastName} ({emp.position})
                </option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
              <select
                value={status || 'active'}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="active">Active (Access Allowed)</option>
                <option value="inactive">Inactive (Access Blocked)</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
