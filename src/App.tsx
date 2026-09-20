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
import { NotificationCenterPage } from './pages/NotificationCenterPage.tsx';
import { AIAssistantPage } from './pages/AIAssistantPage.tsx';
import { QRScannerModal } from './components/attendance/QRScannerModal.tsx';
import { MobileBottomNav } from './components/layout/MobileBottomNav.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { AIFloatingWidget } from './components/ai/AIFloatingWidget.tsx';
import { RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';

const PAGE_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
  'ai-assistant': ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
  employees: ['Administrator', 'HR Officer', 'Management'],
  departments: ['Administrator', 'HR Officer', 'Management'],
  qrcodes: ['Administrator', 'HR Officer'],
  attendance: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
  payroll: ['Administrator', 'Payroll Officer', 'Management', 'Employee'],
  reports: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
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

  // Collapsible sidebar state with local storage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('apex_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('apex_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      case 'ai-assistant':
        return <AIAssistantPage />;
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
    <div className="relative h-screen w-screen bg-slate-100/90 dark:bg-[#040816] text-slate-900 dark:text-slate-100 font-sans p-2 sm:p-3 md:p-3.5 flex gap-3 md:gap-3.5 overflow-hidden transition-colors duration-150">
      {/* 1. Bento Box: Sidebar / Navigation Menu */}
      <Sidebar
        activePage={safeActivePage}
        setActivePage={setActivePage}
        onRefreshData={() => setRefreshKey((k) => k + 1)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenScanner={() => setIsScannerOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Right Column Bento Container: Top Navigation Bar + Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col gap-3 md:gap-3.5 h-full min-w-0 overflow-hidden">
        {/* 2. Bento Box: Top Navigation Bar */}
        <Navbar
          onOpenScanner={() => setIsScannerOpen(true)}
          activePage={safeActivePage}
          setActivePage={setActivePage}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* 3. Bento Box: Main Content Area */}
        <main
          className="relative flex-1 w-full rounded-2xl md:rounded-3xl border border-cyan-500/20 dark:border-cyan-500/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.3),0_0_20px_rgba(6,182,212,0.08)] overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-24 md:pb-6 transition-all"
          key={refreshKey}
        >
          <div className="relative z-10 max-w-7xl mx-auto">
            <ErrorBoundary fallbackTitle="View Display Interrupted">
              {renderActivePage()}
            </ErrorBoundary>
          </div>
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

      {/* Global Floating AI Assistant Widget */}
      <AIFloatingWidget
        activePage={safeActivePage}
        onNavigateToAIPage={() => setActivePage('ai-assistant')}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Apex Workspace Interrupted">
      <ThemeProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
