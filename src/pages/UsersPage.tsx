import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { UserModal } from '../components/users/UserModal.tsx';
import { Employee } from '../types/index.ts';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  User,
  RefreshCw,
  Key,
  ShieldAlert,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userList, roleList, empList] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getEmployees(),
      ]);
      setUsers(userList);
      setRoles(roleList);
      setEmployees(empList);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Are you sure you want to delete the user account "${u.username}"?`)) return;
    try {
      await api.deleteUser(u.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">User Access & Role Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure system authentication accounts, assign RBAC permissions, and link with employee profiles
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>Create User Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No users found</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md screens) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-600 dark:text-indigo-400">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{u.username}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Role</span>
                      <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 text-[11px]">
                        {u.roleName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Linked Employee</span>
                      {u.employee ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {u.employee.firstName} {u.employee.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">System Admin</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setIsModalOpen(true);
                      }}
                      className="flex items-center space-x-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="flex items-center space-x-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User Login ID</th>
                    <th className="px-4 py-3 font-semibold">Assigned Role</th>
                    <th className="px-4 py-3 font-semibold">Linked Employee</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                          {u.roleName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.employee ? (
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {u.employee.firstName} {u.employee.lastName}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {u.employee.employeeCode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">None (System Admin)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
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
          </>
        )}
      </div>

      {/* Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={loadData}
        user={editingUser}
        roles={roles}
        employees={employees}
      />
    </div>
  );
};
