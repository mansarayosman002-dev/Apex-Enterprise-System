import React from 'react';
import { Employee } from '../../types/index.ts';
import { AlertTriangle, UserX, UserCheck, X } from 'lucide-react';

interface EmployeeDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  employee: Employee | null;
  isDeactivating: boolean;
}

export const EmployeeDeleteConfirmModal: React.FC<EmployeeDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  employee,
  isDeactivating,
}) => {
  if (!isOpen || !employee) return null;

  const isCurrentlyActive = employee.status === 'active';
  const actionText = isCurrentlyActive ? 'Deactivate' : 'Reactivate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isCurrentlyActive ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isCurrentlyActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{actionText} Employee</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {employee.firstName} {employee.lastName}
            </p>
            <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono">{employee.employeeCode}</span>
              <span>•</span>
              <span>{employee.position}</span>
              <span>•</span>
              <span>{employee.departmentName || 'General'}</span>
            </div>
          </div>

          {isCurrentlyActive ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Notice on Deactivation</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Deactivating this employee will immediately revoke their active attendance QR token and suspend any linked system user login accounts.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Reactivating this employee will restore their active profile, re-enable system user access, and reinstate QR code attendance scanning.
            </p>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeactivating}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeactivating}
              className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 ${
                isCurrentlyActive
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isDeactivating ? 'Processing...' : `Yes, ${actionText} Employee`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
