import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { EmployeesPage } from './pages/EmployeesPage.tsx';
import { DepartmentsPage } from './pages/DepartmentsPage.tsx';
import { QRCodesPage } from './pages/QRCodesPage.tsx';
import { AttendancePage } from './pages/AttendancePage.tsx';
import { PayrollPage } from './pages/PayrollPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { QRScannerModal } from './components/attendance/QRScannerModal.tsx';
import { MobileBottomNav } from './components/layout/MobileBottomNav.tsx';
import { RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';

const PAGE_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
  employees: ['Administrator', 'HR Officer', 'Management'],
  departments: ['Administrator', 'HR Officer', 'Management'],
  qrcodes: ['Administrator', 'HR Officer'],
  attendance: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
  payroll: ['Administrator', 'Payroll Officer', 'Management', 'Employee'],
  reports: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
  users: ['Administrator'],
  settings: ['Administrator'],
  profile: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
};

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/20">
            <RefreshCw className="h-6 w-6 animate-spin text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-300">Initializing Apex Enterprise Security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Frontend route authorization check
  const allowedRoles = PAGE_PERMISSIONS[activePage] || ['Administrator'];
  const hasAccess = user.roleName === 'Administrator' || allowedRoles.includes(user.roleName);

  const renderAccessDenied = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4 shadow-md">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Access Denied (403 Forbidden)</h2>
      <p className="mt-2 max-w-md text-xs text-slate-600">
        Your assigned role (<span className="font-bold text-slate-900">{user.roleName}</span>) does not have permission to access the <span className="font-bold capitalize text-slate-900">{activePage}</span> module.
      </p>
      <div className="mt-3 rounded-xl bg-slate-100 px-3.5 py-2 text-[11px] text-slate-500 border border-slate-200">
        Permitted roles: {allowedRoles.join(', ')}
      </div>
      <button
        onClick={() => setActivePage('dashboard')}
        className="mt-6 flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Safe Dashboard</span>
      </button>
    </div>
  );

  const renderActivePage = () => {
    if (!hasAccess) {
      return renderAccessDenied();
    }

    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onOpenScanner={() => setIsScannerOpen(true)}
            setActivePage={setActivePage}
          />
        );
      case 'employees':
        return <EmployeesPage />;
      case 'departments':
        return <DepartmentsPage />;
      case 'qrcodes':
        return <QRCodesPage />;
      case 'attendance':
        return <AttendancePage onOpenScanner={() => setIsScannerOpen(true)} />;
      case 'payroll':
        return <PayrollPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <DashboardPage
            onOpenScanner={() => setIsScannerOpen(true)}
            setActivePage={setActivePage}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-150">
      {/* Top Navbar */}
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        activePage={activePage}
        setActivePage={setActivePage}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Workspace Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          onRefreshData={() => setRefreshKey((k) => k + 1)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-8 pb-24 md:pb-8" key={refreshKey}>
          <div className="max-w-7xl mx-auto">{renderActivePage()}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
      />

      {/* Global QR Attendance Scanner Terminal Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
