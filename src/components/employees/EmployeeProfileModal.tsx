import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord } from '../../types/index.ts';
import {
  X,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Briefcase,
  DollarSign,
  Calendar,
  CheckCircle2,
  Shield,
  User,
  Key,
  Clock,
  ExternalLink,
  Edit2,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ApexLogo } from '../common/ApexLogo.tsx';
import { EmployeeIDBadge, printEmployeeBadge } from '../common/EmployeeIDBadge.tsx';
import { broadcastEmployeePhotoUpdated, PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail } from '../../utils/photoSync.ts';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | null;
  onRegenerateQR?: () => void;
  onEdit?: (employee: Employee) => void;
  onPhotoUpdated?: () => void;
  currency?: string;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onRegenerateQR,
  onEdit,
  onPhotoUpdated,
  currency = 'NLe ',
}) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'badge' | 'details' | 'attendance'>('badge');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setIsUploadingPhoto(true);
      try {
        const res = await api.uploadEmployeePhoto(employee.id, dataUrl);
        setEmployee((prev: any) => ({ ...prev, photoUrl: res.photoUrl }));
        setFeedback('Employee portrait updated successfully.');
        broadcastEmployeePhotoUpdated(employee.id, res.photoUrl, employee.employeeCode);
        if (onPhotoUpdated) onPhotoUpdated();
      } catch (err: any) {
        alert(err.message || 'Failed to upload employee photo.');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (!employee) return;
    if (!confirm('Are you sure you want to remove this employee photo?')) return;

    setIsUploadingPhoto(true);
    try {
      await api.updateEmployee(employee.id, { photoUrl: null });
      setEmployee((prev: any) => ({ ...prev, photoUrl: null }));
      setFeedback('Employee photo removed.');
      broadcastEmployeePhotoUpdated(employee.id, null, employee.employeeCode);
      if (onPhotoUpdated) onPhotoUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      loadDetails(employeeId);
    }
  }, [isOpen, employeeId]);

  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;
      setEmployee((prev: any) => {
        if (!prev) return prev;
        const prevId = prev.id != null ? prev.id.toString() : '';
        const detId = detail.employeeId != null ? detail.employeeId.toString() : '';
        const prevCode = (prev.employeeCode || '').trim().toLowerCase();
        const detCode = (detail.employeeCode || '').trim().toLowerCase();

        const matches =
          (prevId && detId && prevId === detId) ||
          (prevCode && detCode && prevCode === detCode) ||
          (detId && prevCode === `emp-${detId}`) ||
          (detId && prevCode === `emp-${detId.padStart(4, '0')}`);

        if (matches) {
          return { ...prev, photoUrl: detail.photoUrl };
        }
        return prev;
      });
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

  const loadDetails = async (id: number) => {
    setLoading(true);
    setFeedback(null);
    try {
      const [empData, attData] = await Promise.all([
        api.getEmployeeById(id),
        api.getAttendance({ employeeId: id }),
      ]);
      setEmployee(empData);
      setRecentAttendance(attData.slice(0, 7));
    } catch (e) {
      console.error('Failed to load employee details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!employee) return;
    if (
      !confirm(
        'Are you sure you want to regenerate this QR code? The previous QR badge will be revoked and invalidated immediately.'
      )
    )
      return;

    setIsRegenerating(true);
    try {
      await api.regenerateQRCode(employee.id);
      await loadDetails(employee.id);
      setFeedback('New QR security token generated successfully.');
      if (onRegenerateQR) onRegenerateQR();
    } catch (e: any) {
      alert(e.message || 'Failed to regenerate QR code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadQR = () => {
    if (!employee?.qrCode?.dataUrl) return;
    const a = document.createElement('a');
    a.href = employee.qrCode.dataUrl;
    a.download = `QR_Badge_${employee.employeeCode}_${employee.firstName}_${employee.lastName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintBadge = () => {
    if (!employee) return;
    printEmployeeBadge({
      fullName: `${employee.firstName} ${employee.lastName}`,
      jobTitle: employee.position,
      department: employee.departmentName || 'General Operations',
      employeeId: employee.employeeCode,
      rawEmployeeId: employee.id,
      employeeCode: employee.employeeCode,
      photoUrl: employee.photoUrl,
      qrCodeUrl: employee.qrCode?.dataUrl,
      status: employee.status,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Profile & Digital Badge</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {employee?.employeeCode || 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {employee && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                className="flex items-center space-x-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 print:hidden">
          <button
            onClick={() => setActiveTab('badge')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'badge'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Digital QR Badge
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Employment & Contact Details
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Recent Attendance ({recentAttendance.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading || !employee ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading profile details...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedback && (
                <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 print:hidden">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* TAB 1: BADGE */}
              {activeTab === 'badge' && (
                <div className="space-y-4">
                  {/* Badge Specification Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Official CR80 Security Badge
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Portrait • 53.98 × 85.60 mm
                    </span>
                  </div>

                  {/* Printable ID Card Rendered in exact portrait dimensions */}
                  <div className="flex justify-center items-center py-2">
                    <EmployeeIDBadge
                      badge={{
                        fullName: `${employee.firstName} ${employee.lastName}`,
                        jobTitle: employee.position,
                        department: employee.departmentName || 'General Operations',
                        employeeId: employee.employeeCode,
                        rawEmployeeId: employee.id,
                        employeeCode: employee.employeeCode,
                        photoUrl: employee.photoUrl,
                        qrCodeUrl: employee.qrCode?.dataUrl,
                        status: employee.status,
                      }}
                      variant="standard"
                    />
                  </div>

                  {/* Actions for Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handlePrintBadge}
                        className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
                        title="Print official CR80 portrait badge (53.98 × 85.60 mm)"
                      >
                        <Printer className="h-3.5 w-3.5 text-white" />
                        <span>Print Badge (53.98 × 85.60 mm)</span>
                      </button>
                      <button
                        onClick={handleDownloadQR}
                        className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
                      >
                        <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Download QR PNG</span>
                      </button>
                    </div>

                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="flex items-center space-x-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate Secure QR</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* Profile Header Card with Quick Photo Upload */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/60 via-slate-50/60 to-white dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-slate-900 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                      {/* Photo with Quick Upload Action */}
                      <div className="relative group shrink-0">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center">
                          {employee.photoUrl ? (
                            <img
                              src={employee.photoUrl}
                              alt={`${employee.firstName} ${employee.lastName}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-bold text-xl text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80">
                              {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                            </div>
                          )}
                          {isUploadingPhoto && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                              <RefreshCw className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>

                        <label
                          className="absolute -bottom-1 -right-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white p-2 shadow-md cursor-pointer transition"
                          title="Upload / Change Photo"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={isUploadingPhoto}
                            onChange={handleDirectPhotoUpload}
                          />
                        </label>
                      </div>

                      {/* Text info and actions */}
                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                              {employee.firstName} {employee.lastName}
                            </h3>
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {employee.position}
                            </p>
                          </div>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <label className="inline-flex items-center space-x-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition">
                              <Upload className="h-3.5 w-3.5" />
                              <span>{employee.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={isUploadingPhoto}
                                onChange={handleDirectPhotoUpload}
                              />
                            </label>
                            {employee.photoUrl && (
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                disabled={isUploadingPhoto}
                                className="inline-flex items-center space-x-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 px-3 py-1.5 text-xs font-semibold transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {employee.departmentName} &bull; Code: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{employee.employeeCode}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Employment Information</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Employee ID:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">#{employee.id}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Employee Code:</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{employee.employeeCode}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Department:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{employee.departmentName}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Position / Title:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{employee.position}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Basic Salary:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {currency}{parseFloat(employee.basicSalary.toString()).toFixed(2)} / mo
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Created At:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {new Date(employee.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Contact & System Login</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Email:</span>
                          <span className="font-medium text-slate-900 dark:text-white">{employee.email}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                          <span className="font-medium text-slate-900 dark:text-white">{employee.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Linked Login User:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {employee.userAccount ? employee.userAccount.username : 'None provisioned'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                          <span className="text-slate-500 dark:text-slate-400">System Account Status:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {employee.userAccount ? (
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  employee.userAccount.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {employee.userAccount.status}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">QR Token Status:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {employee.qrCode?.status ? (
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  employee.qrCode.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {employee.qrCode.status}
                              </span>
                            ) : (
                              'Unassigned'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div className="space-y-3">
                  {recentAttendance.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 py-10 text-center">
                      <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No attendance records logged yet</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Attendance will appear automatically once employee scans their QR badge.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">Date</th>
                            <th className="px-4 py-2.5 font-semibold">Check-In</th>
                            <th className="px-4 py-2.5 font-semibold">Check-Out</th>
                            <th className="px-4 py-2.5 font-semibold">Total Hours</th>
                            <th className="px-4 py-2.5 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {recentAttendance.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                {rec.attendanceDate}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{rec.checkIn}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{rec.checkOut || 'Active'}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{rec.workingHours} hrs</td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    rec.status === 'Present'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                      : rec.status === 'Late'
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                      : rec.status === 'Overtime'
                                      ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {rec.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
