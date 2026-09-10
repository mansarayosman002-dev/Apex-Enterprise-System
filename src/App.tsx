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
import { AIAssistantPage } from './pages/AIAssistantPage.tsx';
import { NotificationCenterPage } from './pages/NotificationCenterPage.tsx';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer.tsx';
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
  'ai-assistant': ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
  notifications: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
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

  // Track the logged in user ID to cleanly reset activePage on login, logout, or account switch
  const prevUserIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      prevUserIdRef.current = null;
      setActivePage('dashboard');
    } else if (user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      setActivePage('dashboard');
    }
  }, [user?.id]);

  // If user role does not have permission to access current activePage, automatically fall back to dashboard
  React.useEffect(() => {
    if (user) {
      const allowedRoles = PAGE_PERMISSIONS[activePage] || ['Administrator'];
      const hasAccess = user.roleName === 'Administrator' || allowedRoles.includes(user.roleName);
      if (!hasAccess) {
        setActivePage('dashboard');
      }
    }
  }, [user?.roleName, activePage]);

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
  const safeActivePage = hasAccess ? activePage : 'dashboard';

  const renderActivePage = () => {
    switch (safeActivePage) {
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
      case 'ai-assistant':
        return <AIAssistantPage />;
      case 'notifications':
        return <NotificationCenterPage onNavigate={setActivePage} />;
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
        activePage={safeActivePage}
        setActivePage={setActivePage}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Workspace Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activePage={safeActivePage}
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
        activePage={safeActivePage}
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

      {/* Persistent AI Copilot Assistant Drawer */}
      <AIAssistantDrawer onOpenHub={() => setActivePage('ai-assistant')} />
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
