import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  ScanLine,
  DollarSign,
  Menu,
  Users,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface MobileBottomNavProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onOpenScanner: () => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  setActivePage,
  onOpenScanner,
  onOpenMenu,
}) => {
  const { user } = useAuth();

  const isEmployee = user?.roleName === 'Employee';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors duration-150 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activePage === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activePage === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* 2. Attendance */}
        <button
          type="button"
          onClick={() => setActivePage('attendance')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activePage === 'attendance'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activePage === 'attendance' ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
            <CalendarCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Attendance</span>
        </button>

        {/* 3. Center Elevated QR Scanner Action */}
        <div className="flex items-center justify-center flex-1 -mt-5">
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex flex-col items-center justify-center h-13 w-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95 transition ring-4 ring-white dark:ring-slate-900"
            aria-label="Scan QR Code"
          >
            <ScanLine className="h-6 w-6" />
          </button>
        </div>

        {/* 4. Payroll or Personal QR */}
        {isEmployee ? (
          <button
            type="button"
            onClick={() => setActivePage('profile')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activePage === 'profile'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activePage === 'profile' ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
              <QrCode className="h-5 w-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">My Badge</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActivePage('payroll')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activePage === 'payroll'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activePage === 'payroll' ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Payroll</span>
          </button>
        )}

        {/* 5. More Menu (Drawer Trigger) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          <div className="p-1 rounded-xl">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
};
