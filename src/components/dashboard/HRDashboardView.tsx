import React, { useState } from 'react';
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
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardStats, AttendanceRecord, Employee, Department } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';
import { LiveActivityFeed } from './LiveActivityFeed.tsx';
import { ScrollReveal, ScrollStagger, ScrollStaggerItem } from '../common/ScrollReveal.tsx';

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

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const totalPresenceValue = statusPieData.reduce((acc, curr) => acc + curr.value, 0);

  const renderActivePieShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 7}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: `drop-shadow(0 0 10px ${fill})`, transition: 'all 0.3s ease' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 12}
          fill={fill}
          style={{ opacity: 0.85 }}
        />
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <ScrollReveal direction="down" distance={20}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 p-6 text-white shadow-[0_0_25px_rgba(6,182,212,0.15)] border border-cyan-500/30 cyber-corners backdrop-blur-md">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.25)]">
              <Users className="h-3.5 w-3.5" />
              <span>HR OVERVIEW</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">HR Overview</h1>
            <p className="text-xs text-slate-300 font-mono">
              Workforce headcount, attendance compliance, and units.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActivePage('employees')}
              className="flex items-center space-x-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-3.5 py-2 text-xs font-mono font-bold text-white hover:bg-cyan-500/30 transition shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 text-cyan-300" />
              <span>ADD STAFF</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-300/40 hover:from-cyan-500 hover:to-blue-500 transition cursor-pointer"
            >
              <ScanLine className="h-4 w-4" />
              <span>TERMINAL</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 1. Employee Statistics Cards */}
      <ScrollReveal direction="up" distance={20}>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Workforce Overview
        </h2>
        <ScrollStagger className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6" staggerDelay={0.06}>
          <ScrollStaggerItem>
            <StatCard
              title="Headcount"
              value={totalEmployees}
              subtitle="Total staff"
              icon={Users}
              iconBgColor="bg-blue-50 dark:bg-blue-950/60"
              iconTextColor="text-blue-600 dark:text-blue-400"
              onClick={() => setActivePage('employees')}
            />
          </ScrollStaggerItem>
          <ScrollStaggerItem>
            <StatCard
              title="Active Roster"
              value={activeEmployees}
              subtitle="On roster"
              icon={UserCheck}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              badge="Active"
              badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              onClick={() => setActivePage('employees')}
            />
          </ScrollStaggerItem>
          <ScrollStaggerItem>
            <StatCard
              title="Present"
              value={presentToday}
              subtitle={`${attendanceRate}% rate`}
              icon={CalendarCheck}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>
          <ScrollStaggerItem>
            <StatCard
              title="Absent"
              value={absentToday}
              subtitle="Not in"
              icon={UserX}
              iconBgColor="bg-rose-50 dark:bg-rose-950/60"
              iconTextColor="text-rose-600 dark:text-rose-400"
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>
          <ScrollStaggerItem>
            <StatCard
              title="Late"
              value={lateToday}
              subtitle="Late arrivals"
              icon={Clock}
              iconBgColor="bg-amber-50 dark:bg-amber-950/60"
              iconTextColor="text-amber-600 dark:text-amber-400"
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>
          <ScrollStaggerItem>
            <StatCard
              title="Departments"
              value={departments.length || stats?.totalDepartments || 0}
              subtitle="Active units"
              icon={Building}
              iconBgColor="bg-purple-50 dark:bg-purple-950/60"
              iconTextColor="text-purple-600 dark:text-purple-400"
              onClick={() => setActivePage('departments')}
            />
          </ScrollStaggerItem>
        </ScrollStagger>
      </ScrollReveal>

      {/* Visual Charts: Department Headcount vs Attendance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ScrollReveal className="lg:col-span-2 h-full" delay={0} direction="up" distance={24}>
          <div className="h-full rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Workforce vs Today's Presence</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Headcount vs present count across divisions</p>
              </div>
              <button
                onClick={() => setActivePage('departments')}
                className="text-xs font-sans font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition"
              >
                MANAGE UNITS →
              </button>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onMouseMove={(state: any) => {
                    if (state?.isTooltipActive) {
                      setHoveredBarIndex(state.activeTooltipIndex ?? null);
                    } else {
                      setHoveredBarIndex(null);
                    }
                  }}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <defs>
                    <linearGradient id="hrStaffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#475569" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="hrPresentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="hrPresentGradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#67e8f9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.95} />
                    </linearGradient>
                    <filter id="hrBarGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#38bdf8" floodOpacity="0.85" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#06b6d4" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={{ stroke: '#334155', strokeWidth: 1 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(6, 182, 212, 0.08)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid rgba(6, 182, 212, 0.5)',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 0 20px rgba(6,182,212,0.35)',
                      backdropFilter: 'blur(8px)',
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="Employees"
                    name="Total Staff"
                    fill="url(#hrStaffGrad)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1300}
                    animationEasing="ease-out"
                    animationBegin={100}
                  >
                    {deptData.map((_entry, index) => (
                      <Cell
                        key={`emp-cell-${index}`}
                        style={{
                          opacity: hoveredBarIndex !== null && hoveredBarIndex !== index ? 0.35 : 0.85,
                          transition: 'all 0.25s ease',
                        }}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="Present"
                    name="Present Today"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1600}
                    animationEasing="ease-out"
                    animationBegin={250}
                  >
                    {deptData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={hoveredBarIndex === index ? 'url(#hrPresentGradActive)' : 'url(#hrPresentGrad)'}
                        style={{
                          filter: hoveredBarIndex === index ? 'url(#hrBarGlow)' : 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.3))',
                          opacity: hoveredBarIndex !== null && hoveredBarIndex !== index ? 0.45 : 1,
                          transition: 'all 0.25s ease',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollReveal>

        {/* Attendance Breakdown Donut */}
        <ScrollReveal delay={0.12} direction="up" distance={24} className="h-full">
          <div className="h-full rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Today's Presence Ratio</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Real-time attendance proportions</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                {attendanceRate}% Compliance
              </span>
            </div>

            <div className="mt-2 h-64 w-full flex flex-col items-center justify-center">
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                      activeShape={renderActivePieShape}
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      animationBegin={150}
                      onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid rgba(6, 182, 212, 0.5)',
                        color: '#fff',
                        fontSize: '11px',
                        boxShadow: '0 0 20px rgba(6,182,212,0.35)',
                        backdropFilter: 'blur(8px)',
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Holographic Center HUD */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    {activePieIndex !== null ? (
                      <motion.div
                        key={`hr-pie-active-${activePieIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="text-center px-1"
                      >
                        <p className="text-[9px] font-sans uppercase text-slate-400 truncate max-w-[80px]">
                          {statusPieData[activePieIndex].name}
                        </p>
                        <p className="text-xs font-sans font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                          {totalPresenceValue > 0
                            ? `${Math.round((statusPieData[activePieIndex].value / totalPresenceValue) * 100)}%`
                            : '0%'}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hr-pie-idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <p className="text-[9px] font-sans tracking-widest text-slate-500 dark:text-cyan-400/70 uppercase">TOTAL</p>
                        <p className="text-xs font-sans font-bold text-slate-800 dark:text-slate-200">
                          {totalPresenceValue} Staff
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Interactive Legend with Hover Highlights */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-600 dark:text-slate-300 font-sans font-medium pt-2 w-full px-1">
                {statusPieData.map((d, idx) => (
                  <div
                    key={d.name}
                    onMouseEnter={() => setActivePieIndex(idx)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    className={`flex items-center space-x-1.5 px-2 py-1 rounded-md transition cursor-pointer ${
                      activePieIndex === idx ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: d.color,
                        transform: activePieIndex === idx ? 'scale(1.4)' : 'scale(1)',
                        boxShadow: activePieIndex === idx ? `0 0 8px ${d.color}` : 'none',
                      }}
                    />
                    <span>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* 2. Department Information & Recent Activity Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Information Cards */}
        <ScrollReveal className="lg:col-span-1" delay={0} direction="up" distance={24}>
          <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
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
        </ScrollReveal>

        {/* Recent Employee Activity Feed */}
        <ScrollReveal className="lg:col-span-2" delay={0.1} direction="up" distance={24}>
          <LiveActivityFeed
            recentLogs={recentLogs}
            onViewAll={() => setActivePage('attendance')}
            onOpenScanner={onOpenScanner}
          />
        </ScrollReveal>
      </div>
    </div>
  );
};
