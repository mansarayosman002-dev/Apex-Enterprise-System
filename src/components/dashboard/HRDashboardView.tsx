import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Building,
  Clock,
  CalendarCheck,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  Search,
  ScanLine,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardStats, AttendanceRecord, Employee, Department } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';

interface HRDashboardViewProps {
  stats: DashboardStats | null;
  recentLogs: AttendanceRecord[];
  employees?: Employee[];
  departments?: Department[];
  onOpenScanner: () => void;
  setActivePage: (page: string) => void;
}

export const HRDashboardView: React.FC<HRDashboardViewProps> = ({
  stats,
  recentLogs,
  employees = [],
  departments = [],
  onOpenScanner,
  setActivePage,
}) => {
  const totalEmployees = stats?.totalEmployees || employees.length || 0;
  const activeEmployees = employees.filter((e) => e.status === 'Active').length || totalEmployees;
  const inactiveEmployees = totalEmployees - activeEmployees;
  const presentToday = stats?.presentToday ?? stats?.todayAttendance?.present ?? 0;
  const absentToday = stats?.absentToday ?? stats?.todayAttendance?.absent ?? Math.max(0, totalEmployees - presentToday);
  const lateToday = stats?.lateToday ?? stats?.todayAttendance?.late ?? 0;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  // Department distribution data for charts
  const deptData = departments.map((d) => ({
    name: d.departmentName,
    Employees: d.employeeCount || 0,
    Present: Math.min(d.employeeCount || 0, Math.round((d.employeeCount || 1) * (attendanceRate / 100))),
  }));

  const statusPieData = [
    { name: 'Present Today', value: presentToday, color: '#10b981' },
    { name: 'Late Today', value: lateToday, color: '#f59e0b' },
    { name: 'Absent Today', value: absentToday, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-300 backdrop-blur-xs border border-blue-500/30">
            <Users className="h-3.5 w-3.5" />
            <span>HR Operations Console</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Human Resources Intelligence</h1>
          <p className="text-xs text-slate-300">
            Headcount analytics, attendance compliance, department management, and workforce roster
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActivePage('employees')}
            className="flex items-center space-x-1.5 rounded-xl border border-blue-400/40 bg-blue-500/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500/30 transition shadow-xs"
          >
            <Plus className="h-4 w-4 text-blue-300" />
            <span>Add Employee</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
          >
            <ScanLine className="h-4 w-4" />
            <span>Attendance Terminal</span>
          </button>
        </div>
      </div>

      {/* 1. Employee Statistics Cards */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Workforce & Attendance Monitoring
        </h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            title="Total Headcount"
            value={totalEmployees}
            subtitle="Registered employees"
            icon={Users}
            iconBgColor="bg-blue-50 dark:bg-blue-950/60"
            iconTextColor="text-blue-600 dark:text-blue-400"
            onClick={() => setActivePage('employees')}
          />
          <StatCard
            title="Active Roster"
            value={activeEmployees}
            subtitle="Operational staff"
            icon={UserCheck}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            badge="Active"
            badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
            onClick={() => setActivePage('employees')}
          />
          <StatCard
            title="Present Today"
            value={presentToday}
            subtitle={`${attendanceRate}% turn-out rate`}
            icon={CalendarCheck}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            onClick={() => setActivePage('attendance')}
          />
          <StatCard
            title="Absent Today"
            value={absentToday}
            subtitle="Unverified absence"
            icon={UserX}
            iconBgColor="bg-rose-50 dark:bg-rose-950/60"
            iconTextColor="text-rose-600 dark:text-rose-400"
            onClick={() => setActivePage('attendance')}
          />
          <StatCard
            title="Punctuality Alert"
            value={lateToday}
            subtitle="Late check-ins"
            icon={Clock}
            iconBgColor="bg-amber-50 dark:bg-amber-950/60"
            iconTextColor="text-amber-600 dark:text-amber-400"
            onClick={() => setActivePage('attendance')}
          />
          <StatCard
            title="Departments"
            value={departments.length || stats?.totalDepartments || 0}
            subtitle="Organizational units"
            icon={Building}
            iconBgColor="bg-purple-50 dark:bg-purple-950/60"
            iconTextColor="text-purple-600 dark:text-purple-400"
            onClick={() => setActivePage('departments')}
          />
        </div>
      </div>

      {/* Visual Charts: Department Headcount vs Attendance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Workforce Distribution</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Headcount vs present count across divisions</p>
            </div>
            <button
              onClick={() => setActivePage('departments')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Manage Units →
            </button>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Employees" name="Total Staff" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Present" name="Present Today" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Breakdown Donut */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Presence Ratio</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time attendance proportions</p>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {attendanceRate}% Compliance
            </span>
          </div>

          <div className="mt-4 h-64 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {statusPieData.map((d) => (
                <div key={d.name} className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Department Information & Recent Activity Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Information Cards */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Overview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Operating units and shift assignments</p>
            </div>
            <button
              onClick={() => setActivePage('departments')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {departments.map((dept) => (
              <div key={dept.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">{dept.departmentName}</h4>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                    {dept.employeeCount || 0} Staff
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Shift: {dept.startShift} - {dept.endShift}</span>
                  <span className="font-mono text-slate-400 dark:text-slate-500">Grace: {dept.gracePeriodMinutes || 15}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Employee Activity */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Employee Activity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time attendance logs, registrations, and check-ins</p>
            </div>
            <button
              onClick={() => setActivePage('attendance')}
              className="flex items-center space-x-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <span>Full Activity Stream</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
              No employee activities logged today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Employee</th>
                    <th className="px-3.5 py-2.5 font-semibold">Department</th>
                    <th className="px-3.5 py-2.5 font-semibold">Check In</th>
                    <th className="px-3.5 py-2.5 font-semibold">Check Out</th>
                    <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                      <td className="px-3.5 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{log.employeeName}</p>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{log.employeeCode}</span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">{log.departmentName}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-700 dark:text-slate-300 font-medium">{log.checkIn}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-700 dark:text-slate-300">{log.checkOut || <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>}</td>
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
      </div>
    </div>
  );
};
