import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Building,
  UserX,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  ScanLine,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { DashboardStats, AttendanceRecord, PayrollRecord } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';
import { LiveActivityFeed } from './LiveActivityFeed.tsx';
import { ScrollReveal, ScrollStagger, ScrollStaggerItem } from '../common/ScrollReveal.tsx';

interface AdminDashboardViewProps {
  stats: DashboardStats | null;
  recentLogs: AttendanceRecord[];
  pendingOvertime: any[];
  currency?: string;
  onOpenScanner: () => void;
  setActivePage: (page: string) => void;
  onApproveOT?: (id: number) => void;
  onRejectOT?: (id: number) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  recentLogs,
  pendingOvertime,
  currency = 'NLe ',
  onOpenScanner,
  setActivePage,
  onApproveOT,
  onRejectOT,
}) => {
  // Normalize numbers from stats
  const totalEmployees = stats?.totalEmployees || 0;
  const presentToday = stats?.presentToday ?? stats?.todayAttendance?.present ?? 0;
  const absentToday = stats?.absentToday ?? stats?.todayAttendance?.absent ?? Math.max(0, totalEmployees - presentToday);
  const lateToday = stats?.lateToday ?? stats?.todayAttendance?.late ?? 0;
  const overtimeCount = stats?.overtimeToday ?? stats?.todayAttendance?.overtime ?? 0;
  const totalPayroll = stats?.payroll?.totalNetSalary || stats?.totalPayroll || 0;
  const departmentsCount = stats?.totalDepartments || 0;
  const punctualityRate = presentToday > 0 ? Math.round((Math.max(0, presentToday - lateToday) / presentToday) * 100) : 100;
  const pendingApprovalsCount = pendingOvertime.length;

  // Chart Data Preparation
  // 1. Attendance Trend Chart
  const attendanceTrendData = (stats?.weeklyAttendance || [
    { day: 'Mon', present: Math.max(1, presentToday - 1), late: 1, absent: 0 },
    { day: 'Tue', present: presentToday, late: 2, absent: 1 },
    { day: 'Wed', present: Math.max(2, presentToday), late: lateToday, absent: absentToday },
    { day: 'Thu', present: presentToday, late: 0, absent: 1 },
    { day: 'Fri', present: Math.max(1, presentToday - 2), late: 1, absent: 2 },
  ]).map((d) => ({
    name: d.day || d.date || 'Day',
    Present: d.present || 0,
    Late: d.late || 0,
    Absent: d.absent || 0,
  }));

  // 2. Department Attendance Chart
  const deptAttendanceData = (stats?.departmentAttendance || [
    { name: 'Engineering', rate: 95, present: 18, total: 19 },
    { name: 'Operations', rate: 88, present: 14, total: 16 },
    { name: 'Human Resources', rate: 100, present: 5, total: 5 },
    { name: 'Finance & Payroll', rate: 92, present: 6, total: 7 },
    { name: 'Sales & Marketing', rate: 85, present: 10, total: 12 },
  ]).map((d) => ({
    name: d.departmentName || d.name,
    AttendanceRate: d.attendanceRate ?? d.rate ?? 90,
    Present: d.present ?? d.presentCount ?? 10,
  }));

  // 3. Payroll Summary Breakdown
  const payrollSummaryData = [
    { name: 'Basic Salary', value: stats?.payroll?.totalBasicSalary || totalPayroll * 0.85, color: '#4f46e5' },
    { name: 'Overtime', value: stats?.payroll?.totalOvertimeAmount || totalPayroll * 0.08, color: '#f59e0b' },
    { name: 'Allowances', value: stats?.payroll?.totalAllowances || totalPayroll * 0.07, color: '#10b981' },
    { name: 'Deductions', value: stats?.payroll?.totalDeductions || totalPayroll * 0.05, color: '#ef4444' },
  ];

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [hoveredDeptBar, setHoveredDeptBar] = useState<number | null>(null);

  const totalPayrollValue = payrollSummaryData.reduce((acc, curr) => acc + curr.value, 0);

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
      {/* 7 Required Admin Metric Cards with Live Real-Time Animated Counters */}
      <ScrollReveal direction="up" distance={20}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-mono font-bold text-slate-500 dark:text-cyan-400/80 uppercase tracking-widest flex items-center space-x-2">
            <span>OPERATIONAL METRICS</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </h2>
        </div>

        <ScrollStagger className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-7" staggerDelay={0.05}>
          {/* 1. Total Active Employees */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-employees"
              title="Total Staff"
              value={totalEmployees}
              subtitle="Active staff"
              icon={Users}
              iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
              iconTextColor="text-indigo-600 dark:text-indigo-400"
              isLive={true}
              onClick={() => setActivePage('employees')}
            />
          </ScrollStaggerItem>

          {/* 2. Today's Check-In Headcount */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-present"
              title="Check-Ins"
              value={presentToday}
              subtitle={`${Math.round((presentToday / Math.max(1, totalEmployees)) * 100)}% turn-out`}
              icon={CheckCircle2}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              badge="On Duty"
              badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              isLive={true}
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>

          {/* 3. Punctuality Rate % */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-punctuality"
              title="Punctuality"
              value={`${punctualityRate}%`}
              subtitle="Arrival rate"
              icon={Clock}
              iconBgColor="bg-cyan-50 dark:bg-cyan-950/60"
              iconTextColor="text-cyan-600 dark:text-cyan-400"
              badge={punctualityRate >= 90 ? 'Optimal' : 'Review'}
              badgeColor={
                punctualityRate >= 90
                  ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
              }
              isLive={true}
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>

          {/* 4. Pending Approvals */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-pending"
              title="Pending"
              value={pendingApprovalsCount}
              subtitle="Needs review"
              icon={AlertTriangle}
              iconBgColor="bg-amber-50 dark:bg-amber-950/60"
              iconTextColor="text-amber-600 dark:text-amber-400"
              badge={pendingApprovalsCount > 0 ? 'Pending' : 'Clear'}
              badgeColor={
                pendingApprovalsCount > 0
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }
              isLive={pendingApprovalsCount > 0}
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>

          {/* 5. Overtime */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-overtime"
              title="Overtime"
              value={overtimeCount}
              subtitle="Logged shifts"
              icon={TrendingUp}
              iconBgColor="bg-purple-50 dark:bg-purple-950/60"
              iconTextColor="text-purple-600 dark:text-purple-400"
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>

          {/* 6. Net Payroll */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-payroll"
              title="Net Payroll"
              value={`${currency}${totalPayroll > 1000 ? (totalPayroll / 1000).toFixed(1) + 'k' : totalPayroll.toFixed(0)}`}
              subtitle="Month total"
              icon={DollarSign}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 7. Departments */}
          <ScrollStaggerItem>
            <StatCard
              id="card-admin-departments"
              title="Departments"
              value={departmentsCount}
              subtitle="Active units"
              icon={Building}
              iconBgColor="bg-blue-50 dark:bg-blue-950/60"
              iconTextColor="text-blue-600 dark:text-blue-400"
              onClick={() => setActivePage('departments')}
            />
          </ScrollStaggerItem>
        </ScrollStagger>
      </ScrollReveal>

      {/* 3 Required Administrator Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: Attendance Trend */}
        <ScrollReveal delay={0} direction="up" distance={24} className="h-full">
          <div className="h-full rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Attendance Trend</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Present vs Late volume</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-cyan-600 dark:text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                5-Day
              </span>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.65} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <filter id="presentNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#10b981" floodOpacity="0.85" />
                    </filter>
                    <filter id="lateNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#06b6d4" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={{ stroke: '#334155', strokeWidth: 1 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: '#06b6d4', strokeWidth: 1.5, strokeDasharray: '4 4' }}
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
                    itemStyle={{ color: '#67e8f9', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="Present"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#presentGrad)"
                    isAnimationActive={true}
                    animationDuration={1600}
                    animationEasing="ease-out"
                    animationBegin={150}
                    style={{ filter: 'url(#presentNeonGlow)' }}
                    activeDot={{
                      r: 6,
                      stroke: '#10b981',
                      strokeWidth: 3,
                      fill: '#030712',
                      style: { filter: 'drop-shadow(0 0 10px #10b981)' },
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Late"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#lateGrad)"
                    isAnimationActive={true}
                    animationDuration={1800}
                    animationEasing="ease-out"
                    animationBegin={300}
                    style={{ filter: 'url(#lateNeonGlow)' }}
                    activeDot={{
                      r: 5,
                      stroke: '#f59e0b',
                      strokeWidth: 2.5,
                      fill: '#030712',
                      style: { filter: 'drop-shadow(0 0 8px #f59e0b)' },
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollReveal>

        {/* Chart 2: Department Attendance */}
        <ScrollReveal delay={0.1} direction="up" distance={24} className="h-full">
          <div className="h-full rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Department Attendance</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Punctuality by unit</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-cyan-600 dark:text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                Active
              </span>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptAttendanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onMouseMove={(state: any) => {
                    if (state?.isTooltipActive) {
                      setHoveredDeptBar(state.activeTooltipIndex ?? null);
                    } else {
                      setHoveredDeptBar(null);
                    }
                  }}
                  onMouseLeave={() => setHoveredDeptBar(null)}
                >
                  <defs>
                    <linearGradient id="cyanBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="cyanBarGradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#67e8f9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.95} />
                    </linearGradient>
                    <filter id="barNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#22d3ee" floodOpacity="0.85" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#06b6d4" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={{ stroke: '#334155', strokeWidth: 1 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} unit="%" />
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
                    itemStyle={{ color: '#22d3ee', fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="AttendanceRate"
                    name="Attendance %"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1400}
                    animationEasing="ease-out"
                    animationBegin={200}
                  >
                    {deptAttendanceData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={hoveredDeptBar === index ? 'url(#cyanBarGradActive)' : 'url(#cyanBarGrad)'}
                        style={{
                          filter: hoveredDeptBar === index ? 'url(#barNeonGlow)' : 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.3))',
                          opacity: hoveredDeptBar !== null && hoveredDeptBar !== index ? 0.45 : 1,
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

        {/* Chart 3: Payroll Summary */}
        <ScrollReveal delay={0.2} direction="up" distance={24} className="h-full">
          <div className="h-full rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Payroll Allocation</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Cost component breakdown</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                {stats?.currentPeriod || 'Current Period'}
              </span>
            </div>

            <div className="mt-2 h-64 w-full flex flex-col items-center justify-center">
              <div className="relative h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                      activeShape={renderActivePieShape}
                      data={payrollSummaryData}
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
                      {payrollSummaryData.map((entry, index) => (
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
                      formatter={(val: any) => [`${currency}${Number(val).toFixed(2)}`, 'Amount']}
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
                      itemStyle={{ color: '#22d3ee', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Holographic Center HUD */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    {activePieIndex !== null ? (
                      <motion.div
                        key={`pie-active-${activePieIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="text-center px-1"
                      >
                        <p className="text-[9px] font-sans uppercase text-slate-400 truncate max-w-[80px]">
                          {payrollSummaryData[activePieIndex].name}
                        </p>
                        <p className="text-xs font-sans font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                          {totalPayrollValue > 0
                            ? `${Math.round((payrollSummaryData[activePieIndex].value / totalPayrollValue) * 100)}%`
                            : '0%'}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pie-idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <p className="text-[9px] font-sans tracking-widest text-slate-500 dark:text-cyan-400/70 uppercase">TOTAL</p>
                        <p className="text-xs font-sans font-bold text-slate-800 dark:text-slate-200">
                          {currency}{totalPayrollValue > 1000 ? (totalPayrollValue / 1000).toFixed(0) + 'k' : totalPayrollValue.toFixed(0)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Interactive Legend with Hover Highlights */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300 font-sans font-medium pt-1 w-full px-2">
                {payrollSummaryData.map((d, idx) => (
                  <div
                    key={d.name}
                    onMouseEnter={() => setActivePieIndex(idx)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    className={`flex items-center space-x-1.5 px-2 py-1 rounded-md transition cursor-pointer ${activePieIndex === idx ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
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
                    <span className="truncate">{d.name}: {currency}{d.value > 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Recent Activity & Management Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Live Recent Attendance Activity Feed with Filters & Animations */}
        <ScrollReveal className="lg:col-span-2" delay={0.05} direction="up" distance={28}>
          <LiveActivityFeed
            recentLogs={recentLogs}
            pendingOvertimeCount={pendingOvertime.length}
            onViewAll={() => setActivePage('attendance')}
            onOpenScanner={onOpenScanner}
          />
        </ScrollReveal>

        {/* Right Column: Pending Overtime Claims & Quick Actions */}
        <div className="space-y-6">
          <ScrollReveal delay={0.15} direction="up" distance={28}>
            <div className="rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/90 dark:bg-slate-900/85 p-6 shadow-xs backdrop-blur-md cyber-corners space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">Pending Overtime</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{pendingOvertime.length} in queue</p>
                </div>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-mono font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                  {pendingOvertime.length} QUEUED
                </span>
              </div>

              {pendingOvertime.length === 0 ? (
                <div className="rounded-xl border border-dashed border-cyan-500/20 bg-slate-50/50 dark:bg-slate-800/30 p-6 text-center text-xs font-mono text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                  All overtime claims processed.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {pendingOvertime.map((ot) => (
                    <div key={ot.id} className="rounded-xl border border-cyan-500/20 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-xs space-y-2 hover:border-cyan-400/40 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{ot.employeeName}</p>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">{ot.overtimeDate} • {ot.hours} Hours</span>
                        </div>
                        <Badge variant="pending" />
                      </div>
                      {ot.reason && <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1 font-mono">"{ot.reason}"</p>}
                      <div className="flex justify-end space-x-2 pt-1">
                        {onRejectOT && (
                          <button
                            onClick={() => onRejectOT(ot.id)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                        {onApproveOT && (
                          <button
                            onClick={() => onApproveOT(ot.id)}
                            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1 text-[11px] font-mono font-semibold text-white hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition cursor-pointer"
                          >
                            Approve OT
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Quick Terminal Launch Card */}
          <ScrollReveal delay={0.25} direction="up" distance={24}>
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-indigo-950/50 p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-between cyber-corners">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">QR SCAN TERMINAL</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Launch QR camera scanner</p>
              </div>
              <button
                onClick={onOpenScanner}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40 hover:from-cyan-500 hover:to-blue-500 transition cursor-pointer"
              >
                <ScanLine className="h-4 w-4" />
                <span>TERMINAL</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};
