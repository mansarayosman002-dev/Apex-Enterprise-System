import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { QRCodeData } from '../types/index.ts';
import {
  QrCode,
  Download,
  Printer,
  RefreshCw,
  Search,
  Building,
  User,
  ShieldCheck,
} from 'lucide-react';
import { EmployeeProfileModal } from '../components/employees/EmployeeProfileModal.tsx';
import {
  EmployeeIDBadge,
  EmployeeBadgeData,
  printEmployeeBadge,
  printAllBadgesSheet,
} from '../components/common/EmployeeIDBadge.tsx';
import { PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail, withPhotoCacheBuster } from '../utils/photoSync.ts';

export const QRCodesPage: React.FC = () => {
  const [qrcodes, setQrcodes] = useState<QRCodeData[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);

  useEffect(() => {
    loadQRCodes();
  }, []);

  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;
      const detId = detail.employeeId != null ? detail.employeeId.toString() : '';
      const detCode = (detail.employeeCode || '').trim().toLowerCase();

      setQrcodes((prev) =>
        prev.map((item) => {
          const itemId = item.employeeId != null ? item.employeeId.toString() : '';
          const itemCode = (item.employeeCode || item.employee?.employeeCode || '').trim().toLowerCase();
          const matches =
            (itemId && detId && itemId === detId) ||
            (itemCode && detCode && itemCode === detCode) ||
            (detId && itemCode === `emp-${detId}`) ||
            (detId && itemCode === `emp-${detId.padStart(4, '0')}`);

          if (matches) {
            const cacheBusted = withPhotoCacheBuster(detail.photoUrl, detail.timestamp);
            return {
              ...item,
              photoUrl: cacheBusted,
              employee: item.employee ? { ...item.employee, photoUrl: cacheBusted } : item.employee,
            };
          }
          return item;
        })
      );
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
      }
    };
  }, []);

  const loadQRCodes = async () => {
    setIsLoading(true);
    try {
      const list = await api.getAllQRCodes();
      setQrcodes(list);
    } catch (e) {
      console.error('Failed to load QR codes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = qrcodes.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.employeeName?.toLowerCase().includes(s) ||
      item.employeeCode?.toLowerCase().includes(s) ||
      item.departmentName?.toLowerCase().includes(s)
    );
  });

  const handlePrintAll = () => {
    if (filtered.length === 0) return;
    const badgesData: EmployeeBadgeData[] = filtered.map((item) => ({
      fullName: item.employeeName || `${item.employee?.firstName} ${item.employee?.lastName}`,
      jobTitle: item.position || item.employee?.position || 'Staff Member',
      department: item.departmentName || item.employee?.departmentName || 'General',
      employeeId: item.employeeCode || item.employee?.employeeCode || `EMP-${item.employeeId}`,
      rawEmployeeId: item.employeeId,
      employeeCode: item.employeeCode || item.employee?.employeeCode,
      photoUrl: item.photoUrl || item.employee?.photoUrl,
      qrCodeUrl: item.dataUrl,
      status: item.status,
    }));
    printAllBadgesSheet(badgesData);
  };

  const handleDownloadSingle = (item: QRCodeData) => {
    if (!item.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `QR_${item.employeeCode}_${item.employeeName?.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Employee QR Badges Gallery</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official cryptographic QR access credentials for physical terminals and smartphone attendance
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handlePrintAll}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
          >
            <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Print All Badges</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs print:hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name, code, or department..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Badges Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <QrCode className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No QR badges match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => {
            const badgeData: EmployeeBadgeData = {
              fullName: item.employeeName || `${item.employee?.firstName} ${item.employee?.lastName}`,
              jobTitle: item.position || item.employee?.position || 'Staff Member',
              department: item.departmentName || item.employee?.departmentName || 'General',
              employeeId: item.employeeCode || item.employee?.employeeCode || `EMP-${item.employeeId}`,
              rawEmployeeId: item.employeeId,
              employeeCode: item.employeeCode || item.employee?.employeeCode,
              photoUrl: item.photoUrl || item.employee?.photoUrl,
              qrCodeUrl: item.dataUrl,
              status: item.status,
            };

            return (
              <div
                key={item.id}
                className="flex flex-col items-center justify-between rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition text-center group"
              >
                {/* Portrait ID Badge Component (53.98 x 85.60 mm) */}
                <div className="w-full flex justify-center py-1">
                  <EmployeeIDBadge badge={badgeData} variant="compact" />
                </div>

                {/* Badge Action Buttons */}
                <div className="w-full flex items-center justify-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 print:hidden mt-2">
                  <button
                    onClick={() => printEmployeeBadge(badgeData)}
                    className="flex-1 flex items-center justify-center space-x-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 text-[11px] font-semibold transition shadow-2xs"
                    title="Print portrait badge (53.98 × 85.60 mm)"
                  >
                    <Printer className="h-3.5 w-3.5 text-white" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSingle(item)}
                    className="flex items-center space-x-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    title="Download QR code"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>QR</span>
                  </button>
                  <button
                    onClick={() => setSelectedEmpId(item.employeeId)}
                    className="flex items-center space-x-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                    title="Inspect employee profile and badge"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Modal */}
      <EmployeeProfileModal
        isOpen={!!selectedEmpId}
        onClose={() => setSelectedEmpId(null)}
        employeeId={selectedEmpId}
        onRegenerateQR={loadQRCodes}
        onPhotoUpdated={loadQRCodes}
      />
    </div>
  );
};
