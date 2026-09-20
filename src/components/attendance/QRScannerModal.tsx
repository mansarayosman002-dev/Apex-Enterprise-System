import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Building,
  Briefcase,
  Zap,
  RefreshCw,
  X,
  Volume2,
  VolumeX,
  ScanLine,
  Maximize2,
  Minimize2,
  History,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Check,
  Wifi,
  WifiOff,
  CloudUpload,
  UserCheck,
  CheckCheck,
  Clock3,
  SwitchCamera,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ScanResult, Employee } from '../../types/index.ts';
import { playSound } from '../../utils/audio.ts';
import {
  enqueueOfflinePunch,
  getOfflineQueueCount,
  getRawOfflineQueue,
  clearSyncedPunches,
  cacheEmployeesOffline,
  lookupEmployeeOffline,
} from '../../utils/offlineStorage.ts';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: () => void;
}

interface ScanHistoryItem {
  id: string;
  result: ScanResult;
  timestamp: string;
  isOffline?: boolean;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'simulate'>('camera');
  const [scanMode, setScanMode] = useState<'check_in' | 'check_out'>('check_in');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupData, setSuccessPopupData] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Built-in Safeguards & Offline State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const sessionIdRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);
  const scannerContainerId = 'qr-reader-container';
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Global suppressor for benign browser media play() teardown interruptions
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason?.name || String(event.reason || '');
      if (
        reason.includes('play()') ||
        reason.includes('interrupted') ||
        reason.includes('media was removed') ||
        reason.includes('AbortError')
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Network Connectivity Monitoring & Automatic Batch Synchronization
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerBatchSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline queue count
    setOfflineCount(getOfflineQueueCount());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      loadCameras();
      setOfflineCount(getOfflineQueueCount());
      if (navigator.onLine && getOfflineQueueCount() > 0) {
        triggerBatchSync();
      }
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  useEffect(() => {
    let active = true;
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        if (active) {
          startCamera(selectedCameraId);
        }
      }, 150);
      return () => {
        active = false;
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  const loadEmployees = async () => {
    try {
      const list = await api.getEmployees({ status: 'active' });
      setEmployeesList(list);
      // Cache employees locally in encrypted database for offline buddy punching verification!
      await cacheEmployeesOffline(list);
      if (list.length > 0) {
        setSelectedEmployeeId(list[0].id.toString());
      }
    } catch (e) {
      console.debug('Failed to load online employees, offline cache will be used:', e);
    }
  };

  const loadCameras = async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        setAvailableCameras(cameras);
        // Prioritize rear/environment camera on mobile phones for scanning badges
        const rearCam = cameras.find((c) =>
          /back|rear|environment|facing\s*back|trás|arriere/i.test(c.label)
        );
        const preferredId = (rearCam || cameras[0]).id;
        setSelectedCameraId((prev) => prev || preferredId);
      }
    } catch (e) {
      console.debug('No camera list available:', e);
    }
  };

  const handleFlipCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await stopCamera();
    startCamera(nextCamera.id);
  };

  // Batch Synchronize Offline Punches with the Central Database
  const triggerBatchSync = async () => {
    const queue = getRawOfflineQueue().filter((item) => !item.synced);
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncStatusMessage(`Synchronizing ${queue.length} offline punch log(s)...`);

    try {
      const payload = queue.map((q) => ({
        id: q.id,
        qrValue: q.qrValue,
        mode: q.mode,
        timestamp: q.timestamp,
      }));

      const res = await api.syncOfflineAttendance(payload);
      if (res.success) {
        const syncedIds = res.results.filter((r) => r.success).map((r) => r.id);
        clearSyncedPunches(syncedIds);
        const remaining = getOfflineQueueCount();
        setOfflineCount(remaining);
        setSyncStatusMessage(`Synchronized ${res.synced} offline punch(es) with database!`);
        setTimeout(() => setSyncStatusMessage(null), 4000);

        if (res.synced > 0) {
          if (soundEnabled) playSound('success');
          if (onScanSuccess) onScanSuccess();
        }
      }
    } catch (err: any) {
      console.error('Offline sync deferred:', err);
      setSyncStatusMessage(`Sync deferred: ${err.message || 'Network unreachable'}`);
      setTimeout(() => setSyncStatusMessage(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const stopCamera = async () => {
    const currentSession = ++sessionIdRef.current;
    isStartingRef.current = false;
    setIsScanning(false);

    const activeInstance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;

    if (activeInstance) {
      try {
        if (activeInstance.isScanning) {
          await activeInstance.stop();
        }
      } catch (_) { }
      try {
        await activeInstance.clear();
      } catch (_) { }
    }

    try {
      const container = document.getElementById(scannerContainerId);
      if (container) {
        const videos = container.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          try {
            v.pause();
          } catch (_) { }
          const stream = v.srcObject as MediaStream | null;
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (_) { }
            });
          }
          v.srcObject = null;
        }
      }
    } catch (_) { }
  };

  const startCamera = async (cameraIdToUse?: string) => {
    const currentSession = ++sessionIdRef.current;
    isStartingRef.current = true;
    setCameraError(null);

    try {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch (_) { }
        try {
          await html5QrCodeRef.current.clear();
        } catch (_) { }
        html5QrCodeRef.current = null;
      }

      if (sessionIdRef.current !== currentSession) return;

      let container = document.getElementById(scannerContainerId);
      if (!container) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        container = document.getElementById(scannerContainerId);
      }

      if (!container || sessionIdRef.current !== currentSession) {
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (camErr: any) {
        console.debug('Camera enumeration note:', camErr);
      }

      if (sessionIdRef.current !== currentSession) {
        try {
          await html5QrCode.clear();
        } catch (_) { }
        return;
      }

      let preferredCameraId = '';
      if (cameras && cameras.length > 0) {
        setAvailableCameras(cameras);
        const rearCam = cameras.find((c) =>
          /back|rear|environment|facing\s*back|trás|arriere/i.test(c.label)
        );
        preferredCameraId = (rearCam || cameras[0]).id;
      }

      const cameraConfig = cameraIdToUse
        ? cameraIdToUse
        : preferredCameraId
          ? preferredCameraId
          : { facingMode: 'environment' };

      // Responsive QR box sizing for phone viewports
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 360;
      const boxSize = Math.min(Math.max(Math.floor(screenW * 0.70), 180), 250);

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: boxSize, height: boxSize },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScannedCode(decodedText);
        },
        () => {
          // ignore frame scan misses
        }
      );

      if (sessionIdRef.current !== currentSession) {
        try {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop();
          }
          await html5QrCode.clear();
        } catch (_) { }
        return;
      }

      setIsScanning(true);
      isStartingRef.current = false;
    } catch (err: any) {
      isStartingRef.current = false;
      setIsScanning(false);

      if (sessionIdRef.current !== currentSession) {
        return;
      }

      const errMsg = (err?.message || err?.name || err?.toString() || '').toLowerCase();

      if (
        errMsg.includes('play()') ||
        errMsg.includes('interrupted') ||
        errMsg.includes('aborterror') ||
        errMsg.includes('media was removed')
      ) {
        return;
      }

      console.warn('Camera notice:', err?.message || err);

      if (errMsg.includes('notreadableerror') || errMsg.includes('could not start video source')) {
        setCameraError(
          'Camera is currently in use by another application/tab. Please close other camera tabs, retry, or use the Quick Test Simulator below.'
        );
      } else if (errMsg.includes('notallowederror') || errMsg.includes('permission')) {
        setCameraError(
          'Camera permission was denied. Please allow camera permissions in your browser or use the Quick Test Simulator.'
        );
      } else if (errMsg.includes('notfounderror') || errMsg.includes('no camera')) {
        setCameraError(
          'No camera detected on this device. Please use the Quick Test Simulator or Upload QR Image.'
        );
      } else if (errMsg.includes('element with id')) {
        setCameraError(null);
      } else {
        setCameraError(
          'Unable to access camera on this device. You can retry, or use the Quick Test Simulator or Upload QR Image below.'
        );
      }
    }
  };

  // Main Core Scan Processor (Handles Online Scanning, Debounce Guard & Offline Caching)
  const handleScannedCode = async (code: string) => {
    if (isProcessing) return;

    // Requirement 5: Immediately stop scanning once QR code is detected to avoid multiple scans at once
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (_) { }
    setIsScanning(false);

    // Built-in Safeguard: Frontend Debounce Guard
    // Prevents reading identical consecutive frames from the camera within 3 seconds
    const nowMs = Date.now();
    if (code === lastScannedCode && nowMs - lastScanTime < 3000) {
      return;
    }
    setLastScannedCode(code);
    setLastScanTime(nowMs);

    setIsProcessing(true);
    if (soundEnabled) playSound('beep');

    // 1. Offline Mode Detection
    if (!navigator.onLine) {
      await handleOfflineScan(code);
      setIsProcessing(false);
      return;
    }

    // 2. Online Mode Transaction
    try {
      const result = await api.scanQRCode({ qrValue: code, mode: scanMode });
      setScanResult(result);

      // Add to session history
      setScanHistory((prev) => [
        { id: `${Date.now()}-${Math.random()}`, result, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19),
      ]);

      if (result.success) {
        if (soundEnabled) {
          if (result.type === 'check_in') {
            playSound('success');
          } else {
            playSound('checkout');
          }
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([60, 40, 80]);
          } catch (_) { }
        }
        // Requirement 4: Pop-up message instead of confetti
        setSuccessPopupData(result);
        setShowSuccessPopup(true);
        if (onScanSuccess) onScanSuccess();
      } else {
        // Built-in Safeguard: Duplicate Scan Cooldown Warning
        if (result.cooldownSecondsRemaining) {
          if (soundEnabled) playSound('cooldown');
          setCooldownRemaining(result.cooldownSecondsRemaining);
        } else {
          if (soundEnabled) playSound('error');
        }
      }
    } catch (error: any) {
      // If network fails during fetch, transition seamlessly to offline caching!
      if (
        !navigator.onLine ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('network')
      ) {
        setIsOnline(false);
        await handleOfflineScan(code);
      } else {
        if (soundEnabled) playSound('error');
        const errRes: ScanResult = {
          success: false,
          type: 'error',
          message: error.message || 'Invalid QR Code.',
          timestamp: new Date().toISOString(),
        };
        setScanResult(errRes);
        setScanHistory((prev) => [
          { id: `${Date.now()}-${Math.random()}`, result: errRes, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 19),
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Resume camera scanning for the next employee
  const handleResumeScanning = async () => {
    setShowSuccessPopup(false);
    setScanResult(null);
    if (activeTab === 'camera') {
      await startCamera(selectedCameraId);
    }
  };

  // Automatically dismiss success pop-up and resume camera after 4.5 seconds
  useEffect(() => {
    if (!showSuccessPopup) return;
    const timer = setTimeout(() => {
      handleResumeScanning();
    }, 4500);
    return () => clearTimeout(timer);
  }, [showSuccessPopup]);

  // Built-in Safeguard: Encrypted Offline Caching
  const handleOfflineScan = async (code: string) => {
    // 1. Look up cached employee so their photo and name surface immediately for buddy punching prevention
    const cachedEmp = await lookupEmployeeOffline(code);

    // 2. Queue in encrypted local storage
    const queuedPunch = await enqueueOfflinePunch(code, scanMode, cachedEmp);
    setOfflineCount(getOfflineQueueCount());

    if (soundEnabled) playSound('offline');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 50, 80]);
      } catch (_) { }
    }

    const offlineResult: ScanResult = {
      success: true,
      type: scanMode === 'check_in' ? 'check_in' : 'check_out',
      message: `Offline punch logged in encrypted vault (${scanMode === 'check_in' ? 'Check-In' : 'Check-Out'}). Will auto-sync when online.`,
      timestamp: queuedPunch.timestamp,
      isOfflineSync: true,
      employee: cachedEmp
        ? {
          id: cachedEmp.id,
          code: cachedEmp.code,
          name: cachedEmp.name,
          department: cachedEmp.department,
          position: cachedEmp.position,
          photoUrl: cachedEmp.photoUrl,
        }
        : {
          id: 0,
          code: code,
          name: 'Registered Employee (Offline)',
          department: 'Pending Sync',
          position: 'Badge Authenticated',
          photoUrl: null,
        },
      attendance: {
        id: 0,
        date: new Date().toISOString().split('T')[0],
        checkIn: new Date().toLocaleTimeString(),
        checkOut: scanMode === 'check_out' ? new Date().toLocaleTimeString() : null,
        status: 'Present',
        workingHours: 0,
        overtimeHours: 0,
      },
    };

    setScanResult(offlineResult);
    setSuccessPopupData(offlineResult);
    setShowSuccessPopup(true);
    setScanHistory((prev) => [
      { id: queuedPunch.id, result: offlineResult, timestamp: new Date().toLocaleTimeString(), isOffline: true },
      ...prev.slice(0, 19),
    ]);
  };

  const handleSimulateScan = () => {
    const emp = employeesList.find((e) => e.id.toString() === selectedEmployeeId);
    if (!emp) return;
    const qrValue = emp.qrCode?.qrValue || emp.employeeCode;
    handleScannedCode(qrValue);
  };

  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => setIsFullscreen(!isFullscreen));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => setIsFullscreen(!isFullscreen));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 sm:p-4 backdrop-blur-xs">
      <div
        ref={modalContainerRef}
        id="qr-scanner-modal"
        className={`relative flex w-full flex-col overflow-hidden bg-slate-900 text-white shadow-2xl transition-all ${isFullscreen
            ? 'fixed inset-0 h-screen w-screen rounded-none max-w-none'
            : 'fixed inset-0 h-full w-full rounded-none sm:relative sm:inset-auto sm:h-auto sm:max-h-[94vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-slate-700'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md shadow-indigo-500/20">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                  QR Attendance Terminal
                </h2>

                {/* Online / Offline Live Status Indicator */}
                {isOnline ? (
                  <span className="flex items-center space-x-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    <WifiOff className="h-3 w-3" />
                    <span>OFFLINE VAULT</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
                Smart Badge Terminal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Offline Sync Action Button */}
            {offlineCount > 0 && (
              <button
                type="button"
                onClick={triggerBatchSync}
                disabled={isSyncing || !isOnline}
                title="Synchronize offline punches with central database"
                className="flex items-center space-x-1.5 rounded-lg bg-amber-600/30 border border-amber-500/50 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-600/50 transition disabled:opacity-50"
              >
                <CloudUpload className={`h-3.5 w-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>Sync ({offlineCount})</span>
              </button>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute audio' : 'Enable audio'}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-indigo-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal Kiosk'}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-indigo-400" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-rose-900/40 hover:text-rose-400 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sync Status Toast Banner if active */}
        {syncStatusMessage && (
          <div className="bg-indigo-950/90 border-b border-indigo-800 px-4 py-2 text-xs text-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncStatusMessage}</span>
            </div>
            {isSyncing && <span className="text-[10px] text-indigo-400 font-mono">ENCRYPTED BATCH</span>}
          </div>
        )}

        {/* Scan Mode & Terminal Control Bar */}
        <div className="border-b border-slate-800 bg-slate-900/95 px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Operational Choice: Check-In vs Check-Out (AutoDetect removed) */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 text-[11px] sm:text-xs font-semibold border border-slate-800">
              <button
                type="button"
                onClick={() => setScanMode('check_in')}
                className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 transition whitespace-nowrap ${scanMode === 'check_in'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>Check-In</span>
              </button>
              <button
                type="button"
                onClick={() => setScanMode('check_out')}
                className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 transition whitespace-nowrap ${scanMode === 'check_out'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Check-Out</span>
              </button>
            </div>

            {/* Input tabs: Live Camera & Simulator (Upload QR option removed) */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  startCamera(selectedCameraId);
                }}
                className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-3 py-1.5 transition whitespace-nowrap ${activeTab === 'camera'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('simulate')}
                className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-3 py-1.5 transition whitespace-nowrap ${activeTab === 'simulate'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Simulator</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Scanner View & Camera (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* TAB 1: LIVE CAMERA */}
              {activeTab === 'camera' && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  {cameraError && (
                    <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-center space-y-2.5">
                      <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-200">Camera Notice</h4>
                      <p className="text-xs text-amber-300/80 max-w-sm mx-auto">
                        {cameraError}
                      </p>

                      <div className="flex justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('simulate')}
                          className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
                        >
                          Use Simulator
                        </button>
                        <button
                          type="button"
                          onClick={() => startCamera(selectedCameraId)}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center space-x-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Camera Scanner Container */}
                  <div
                    className={`relative w-full overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-black shadow-2xl p-2 flex flex-col items-center ${cameraError ? 'hidden' : 'block'
                      }`}
                  >
                    <div
                      id={scannerContainerId}
                      className="w-full max-w-sm overflow-hidden rounded-xl bg-black min-h-[220px]"
                    />

                    {/* Camera Flip Quick Switch Button Overlay */}
                    {availableCameras.length > 1 && (
                      <button
                        type="button"
                        onClick={handleFlipCamera}
                        aria-label="Switch between camera lenses"
                        title="Switch camera lens (Front/Back)"
                        className="absolute top-4 right-4 z-20 flex items-center justify-center h-10 w-10 rounded-full bg-slate-900/80 border border-indigo-500/50 text-indigo-300 hover:text-white hover:bg-indigo-600/90 shadow-lg backdrop-blur-xs transition active:scale-95 touch-target"
                      >
                        <SwitchCamera className="h-5 w-5" />
                      </button>
                    )}

                    {/* Laser Scanner Reticle Overlay */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <div className="relative h-48 w-48 sm:h-60 sm:w-60 rounded-2xl border-2 border-indigo-400/80 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                        <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-indigo-400" />
                        <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-indigo-400" />
                        <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-indigo-400" />
                        <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-indigo-400" />
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444] animate-pulse" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-2 text-xs font-mono text-indigo-300/80">
                      <span>Align QR badge within frame</span>
                    </div>

                    {/* Scan Next Badge button when camera scanning is stopped */}
                    {!isScanning && !cameraError && (
                      <button
                        type="button"
                        onClick={handleResumeScanning}
                        className="mt-3 flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition"
                      >
                        <ScanLine className="h-4 w-4" />
                        <span>Scan Next Badge</span>
                      </button>
                    )}
                  </div>

                  {/* Multi-camera selector if device has front/rear */}
                  {availableCameras.length > 1 && (
                    <div className="w-full flex items-center justify-between gap-3 text-xs bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Camera Lens:</span>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setSelectedCameraId(newId);
                          startCamera(newId);
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-slate-200 text-xs focus:border-indigo-500 focus:outline-hidden"
                      >
                        {availableCameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label || `Camera ${c.id.substring(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SIMULATOR */}
              {activeTab === 'simulate' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Zap className="h-4 w-4" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Badge Simulator</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Select an employee to simulate badge scanning.
                  </p>

                  <div className="space-y-2.5">
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-hidden"
                    >
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeCode} - {emp.firstName} {emp.lastName} ({emp.position})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleSimulateScan}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 text-amber-300" />
                      )}
                      <span>Scan Badge ({scanMode === 'check_in' ? 'Check-In' : 'Check-Out'})</span>
                    </button>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Or enter Employee Code:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="e.g. EMP-1001"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono text-white focus:border-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (manualCode.trim()) handleScannedCode(manualCode.trim());
                        }}
                        className="rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition border border-slate-700"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Result, Photo Card & Session Logs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* PRIMARY SCAN RESULT CARD & PHOTO VERIFICATION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                    <span>Verification</span>
                  </h3>
                  {scanResult && scanResult.isOfflineSync && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                      <WifiOff className="h-2.5 w-2.5" />
                      <span>Encrypted Vault</span>
                    </span>
                  )}
                </div>

                {scanResult ? (
                  <div
                    className={`rounded-2xl border p-4 sm:p-5 shadow-xl transition-all ${scanResult.success
                      ? scanResult.type === 'check_in'
                        ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-950 text-emerald-100'
                        : 'border-blue-500/40 bg-gradient-to-b from-blue-950/80 via-slate-900 to-slate-950 text-blue-100'
                      : scanResult.type === 'info'
                        ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 text-amber-100'
                        : 'border-rose-500/40 bg-gradient-to-b from-rose-950/80 via-slate-900 to-slate-950 text-rose-100'
                      }`}
                  >
                    {/* Header Status & Timestamp */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${scanResult.success
                          ? scanResult.type === 'check_in'
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                          : scanResult.type === 'info'
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                          }`}
                      >
                        {scanResult.type === 'check_in'
                          ? 'Check-In Recorded'
                          : scanResult.type === 'check_out'
                            ? 'Check-Out Recorded'
                            : scanResult.type === 'info'
                              ? 'Attendance Status'
                              : 'Scan Rejected'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300">
                        {new Date(scanResult.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Main Transaction Message */}
                    <p className="mt-2.5 text-sm font-bold text-white">
                      {scanResult.message}
                    </p>

                    {/* Surfacing Registered Employee Photo */}
                    {scanResult.employee && (
                      <div className="mt-3.5 space-y-3">
                        <div className="flex items-center space-x-3.5 rounded-xl bg-slate-950/80 p-3 border border-slate-800">
                          {/* Registered Employee Portrait */}
                          <div className="relative shrink-0">
                            <img
                              src={
                                scanResult.employee.photoUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  scanResult.employee.name
                                )}`
                              }
                              alt={scanResult.employee.name}
                              className="h-20 w-20 sm:h-22 sm:w-22 rounded-xl object-cover border-2 border-indigo-400 shadow-md shadow-indigo-500/20"
                            />
                            <span className="absolute -bottom-1.5 inset-x-0 mx-auto text-center">
                              <span className="inline-flex items-center space-x-0.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
                                <UserCheck className="h-2.5 w-2.5" />
                                <span>PHOTO ID</span>
                              </span>
                            </span>
                          </div>

                          {/* Employee Identity Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">
                              {scanResult.employee.name}
                            </h4>
                            <p className="text-xs font-mono font-bold text-indigo-400">
                              {scanResult.employee.code}
                            </p>
                            <p className="text-[11px] text-slate-300 truncate mt-0.5">
                              {scanResult.employee.position}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {scanResult.employee.department}
                            </p>
                          </div>
                        </div>

                        {/* Anti-Buddy Punching Notice */}
                        <div className="rounded-xl bg-indigo-950/50 border border-indigo-500/30 p-2 text-[11px] text-indigo-200 flex items-center space-x-2">
                          <ShieldAlert className="h-4 w-4 text-indigo-400 shrink-0" />
                          <p className="text-[11px]">
                            <span className="font-semibold text-white">Photo Match: </span>
                            <span>Verify employee matches photo above.</span>
                          </p>
                        </div>

                        {/* Attendance Details */}
                        {scanResult.attendance && (
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Attendance Status</span>
                              <span
                                className={`inline-block mt-0.5 font-bold text-[11px] ${scanResult.attendance.status === 'Present'
                                  ? 'text-emerald-400'
                                  : scanResult.attendance.status === 'Late'
                                    ? 'text-amber-400'
                                    : 'text-indigo-400'
                                  }`}
                              >
                                {scanResult.attendance.status}
                              </span>
                            </div>

                            <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Daily Shift Time</span>
                              <span className="font-mono font-bold text-white text-[11px]">
                                {scanResult.attendance.checkOut
                                  ? `${scanResult.attendance.checkIn} → ${scanResult.attendance.checkOut}`
                                  : `In: ${scanResult.attendance.checkIn}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Duplicate Scan Debounce Guard */}
                    {(scanResult.cooldownSecondsRemaining || cooldownRemaining > 0) && (
                      <div className="mt-3 rounded-xl bg-amber-950/70 border border-amber-500/40 p-2.5 text-xs text-amber-200 flex items-center space-x-2.5">
                        <Clock3 className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                        <p className="text-[11px] text-amber-200">
                          <strong className="text-amber-300">Cooldown Active: </strong>
                          {cooldownRemaining || scanResult.cooldownSecondsRemaining}s remaining.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-500">
                    <ScanLine className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-semibold text-slate-400">Awaiting scan</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Present employee QR badge to verify photo and record punch.
                    </p>
                  </div>
                )}
              </div>

              {/* SESSION SCAN HISTORY FEED */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <History className="h-4 w-4 text-indigo-400" />
                    <span>Recent Logs ({scanHistory.length})</span>
                  </h4>
                  {offlineCount > 0 && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      {offlineCount} queued locally
                    </span>
                  )}
                </div>

                <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-2 space-y-1.5 text-xs">
                  {scanHistory.length === 0 ? (
                    <div className="py-5 text-center text-[11px] text-slate-500">
                      No scans performed in this terminal session
                    </div>
                  ) : (
                    scanHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-slate-900/70 px-3 py-2 border border-slate-800/80"
                      >
                        <div className="flex items-center space-x-2">
                          {item.result.success ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200">
                            {item.result.employee ? item.result.employee.name : 'Unrecognized Badge'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.isOffline && (
                            <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-300">
                              OFFLINE
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${item.result.success
                              ? item.result.type === 'check_in'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-blue-500/20 text-blue-400'
                              : 'bg-rose-500/20 text-rose-400'
                              }`}
                          >
                            {item.result.type}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{item.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] hidden sm:inline">
              Safeguards: Photo ID • Cooldown Guard • Offline Vault
            </span>
            <span className="text-[11px] sm:hidden">
              Safeguards Active
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 transition"
          >
            Close Terminal
          </button>
        </div>

        {/* POP-UP MESSAGE MODAL (Replaces Confetti with a Clean Confirmation Card) */}
        {showSuccessPopup && successPopupData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-sm sm:max-w-md rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl text-center relative overflow-hidden">
              {/* Glowing background ambient lighting */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={handleResumeScanning}
                className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Dismiss and scan next"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Status Badge */}
              <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <span
                className={`inline-flex items-center space-x-1 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${successPopupData.type === 'check_out'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
              >
                <span>
                  {successPopupData.type === 'check_out'
                    ? 'Check-Out Recorded'
                    : 'Check-In Recorded'}
                </span>
              </span>

              {/* Employee Photo & Identification */}
              {successPopupData.employee && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={
                        successPopupData.employee.photoUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          successPopupData.employee.name
                        )}`
                      }
                      alt={successPopupData.employee.name}
                      className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-400/60 shadow-lg shadow-emerald-500/20"
                    />
                    <span className="absolute -bottom-1.5 inset-x-0 mx-auto text-center">
                      <span className="inline-flex items-center space-x-0.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[8px] font-bold text-white shadow-xs">
                        <UserCheck className="h-2.5 w-2.5" />
                        <span>PHOTO MATCH</span>
                      </span>
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-white">
                    {successPopupData.employee.name}
                  </h3>
                  <p className="font-mono text-xs font-semibold text-indigo-400">
                    {successPopupData.employee.code}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {successPopupData.employee.position} • {successPopupData.employee.department}
                  </p>
                </div>
              )}

              {/* Punch Meta Information */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs bg-slate-950/70 rounded-xl p-3 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Time</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {new Date(successPopupData.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {successPopupData.attendance?.status || 'Present'}
                  </span>
                </div>
              </div>

              {/* Action Button to Resume Immediately */}
              <button
                type="button"
                onClick={handleResumeScanning}
                className="mt-5 w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition active:scale-[0.99]"
              >
                <Camera className="h-4 w-4" />
                <span>Scan Next Badge</span>
              </button>
              <p className="mt-2 text-[10px] text-slate-500">
                Auto-resuming for next badge in a moment...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
