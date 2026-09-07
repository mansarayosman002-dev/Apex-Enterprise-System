import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Building,
  Briefcase,
  Sparkles,
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
  Check,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ScanResult, Employee } from '../../types/index.ts';
import { playSound } from '../../utils/audio.ts';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: () => void;
}

interface ScanHistoryItem {
  id: string;
  result: ScanResult;
  timestamp: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'simulate'>('camera');
  const [scanMode, setScanMode] = useState<'auto' | 'check_in' | 'check_out'>('auto');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

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

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      loadCameras();
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
      if (list.length > 0) {
        setSelectedEmployeeId(list[0].id.toString());
      }
    } catch (e) {
      console.error('Failed to load employees for scanner simulator:', e);
    }
  };

  const loadCameras = async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        setAvailableCameras(cameras);
      }
    } catch (e) {
      console.debug('No camera list available:', e);
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

    // Safely pause and release any active video streams in the container
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
      // 1. Stop any existing camera instance
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

      // 2. Ensure container exists in DOM
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

      if (cameras && cameras.length > 0) {
        setAvailableCameras(cameras);
      }

      const cameraConfig = cameraIdToUse
        ? cameraIdToUse
        : cameras && cameras.length > 0
          ? cameras[0].id
          : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
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

      // Benign play interruption when switching tabs or closing modal
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
          'Camera is currently in use by another application/tab or video source is locked. Please close other camera tabs, retry, or use the Quick Test Simulator below.'
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

  const handleScannedCode = async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (soundEnabled) playSound('beep');

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
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        if (onScanSuccess) onScanSuccess();
      } else {
        if (soundEnabled) playSound('error');
      }
    } catch (error: any) {
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
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let html5QrCode: Html5Qrcode | null = null;
    try {
      html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScannedCode(decodedText);
    } catch (err: any) {
      if (soundEnabled) playSound('error');
      const errRes: ScanResult = {
        success: false,
        type: 'error',
        message: 'Invalid QR Code image.',
        timestamp: new Date().toISOString(),
      };
      setScanResult(errRes);
      setScanHistory((prev) => [
        { id: `${Date.now()}-${Math.random()}`, result: errRes, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19),
      ]);
    } finally {
      if (html5QrCode) {
        try {
          await html5QrCode.clear();
        } catch (_) { }
      }
      e.target.value = '';
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-1.5 sm:p-4 backdrop-blur-xs">
      <div
        ref={modalContainerRef}
        id="qr-scanner-modal"
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl transition-all ${isFullscreen
            ? 'fixed inset-0 h-screen w-screen rounded-none max-w-none'
            : 'max-h-[96vh] sm:max-h-[94vh] max-w-4xl'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight">QR Attendance Terminal</h2>
                <span className="rounded-full bg-emerald-500/20 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
                Official cryptographic check-in & check-out validation system
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute audio' : 'Enable audio'}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-indigo-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal Kiosk'}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-indigo-400" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-rose-900/40 hover:text-rose-400 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scan Mode & Input Selection Bar */}
        <div className="border-b border-slate-800 bg-slate-900/90 px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Mode selection */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 text-[11px] sm:text-xs font-semibold border border-slate-800 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setScanMode('auto')}
                className={`rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 transition whitespace-nowrap ${scanMode === 'auto'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Auto Detect
              </button>
              <button
                type="button"
                onClick={() => setScanMode('check_in')}
                className={`rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 transition whitespace-nowrap ${scanMode === 'check_in'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Check-In Only
              </button>
              <button
                type="button"
                onClick={() => setScanMode('check_out')}
                className={`rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 transition whitespace-nowrap ${scanMode === 'check_out'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Check-Out Only
              </button>
            </div>

            {/* Input tabs */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs font-semibold overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 transition whitespace-nowrap ${activeTab === 'camera'
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
                className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 transition whitespace-nowrap ${activeTab === 'simulate'
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 transition whitespace-nowrap ${activeTab === 'upload'
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload QR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Scanner View (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* TAB 1: CAMERA */}
              {activeTab === 'camera' && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  {cameraError && (
                    <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-950/40 p-6 text-center">
                      <AlertTriangle className="mx-auto h-10 w-10 text-amber-400 mb-3" />
                      <h4 className="text-sm font-bold text-amber-200">Camera Device Notice</h4>
                      <p className="mt-1 text-xs text-amber-300/80 leading-relaxed max-w-md mx-auto">{cameraError}</p>

                      {/* Android Chrome Security Note */}
                      <div className="mt-3 p-3 rounded-xl bg-black/40 border border-amber-500/20 text-[11px] text-slate-300 text-left max-w-md mx-auto space-y-1.5">
                        <p className="font-bold text-amber-300 flex items-center space-x-1">
                          <span> Android Chrome Security Rule:</span>
                        </p>
                        <p className="text-slate-400">
                          Chrome blocks live video streaming over local network IP addresses (<code className="text-amber-200">http://10.159...</code>) unless enabled in Chrome.
                        </p>
                        <p className="text-slate-300 font-medium">
                          <strong className="text-white">Option 1 (Instant):</strong> Tap <strong className="text-cyan-300">"Snap Photo with Camera"</strong> below to scan directly!
                        </p>
                        <p className="text-slate-400">
                          <strong className="text-white">Option 2 (Live Stream):</strong> Open <code className="text-cyan-300">chrome://flags</code> in Chrome, search <code className="text-cyan-300">unsafely-treat-insecure-origin-as-secure</code>, add this URL, and tap Relaunch.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                        {/* Direct Mobile Photo Snap Button */}
                        <label className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:from-cyan-500 hover:to-indigo-500 transition cursor-pointer">
                          <Camera className="h-4 w-4" />
                          <span> Snap Photo with Camera</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setActiveTab('simulate')}
                          className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-700 transition"
                        >
                          Quick Simulator
                        </button>

                        <button
                          type="button"
                          onClick={() => startCamera(selectedCameraId)}
                          className="rounded-xl border border-slate-700 bg-slate-850 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition flex items-center space-x-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Always keep camera scanner container in the DOM so HTML5Qrcode can bind safely */}
                  <div className={`relative w-full overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-black shadow-2xl p-2 flex flex-col items-center ${cameraError ? 'hidden' : 'block'}`}>
                    <div id={scannerContainerId} className="w-full max-w-sm overflow-hidden rounded-xl bg-black min-h-[220px]" />

                    {/* Laser scanner target overlay */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <div className="relative h-48 w-48 sm:h-60 sm:w-60 rounded-2xl border-2 border-indigo-400/80 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                        {/* Corner Reticles */}
                        <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-indigo-400" />
                        <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-indigo-400" />
                        <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-indigo-400" />
                        <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-indigo-400" />

                        {/* Animated laser line */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444] animate-pulse" />
                      </div>
                    </div>

                    <div className="mt-3 text-center text-xs font-mono text-indigo-300/80">
                      Present employee cryptographic QR badge to the terminal camera
                    </div>
                  </div>

                  {/* Camera selector if multiple */}
                  {availableCameras.length > 1 && (
                    <div className="w-full flex items-center justify-between gap-3 text-xs bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Select Terminal Camera:</span>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="text-sm font-bold text-white">Instant QR Presentation Simulator</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select any registered employee below to simulate presenting their official cryptographic QR badge at this terminal.
                  </p>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-300">Registered Employee</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-medium text-white shadow-inner focus:border-indigo-500 focus:outline-hidden"
                    >
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeCode} - {emp.firstName} {emp.lastName} ({emp.position} • {emp.departmentName})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleSimulateScan}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      <span>Simulate Presenting QR Code at Terminal</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Or manually enter Employee Code / QR Token string:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="e.g. EMP-1001"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (manualCode.trim()) handleScannedCode(manualCode.trim());
                        }}
                        className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition border border-slate-700"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: UPLOAD */}
              {activeTab === 'upload' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
                  <div id="file-scanner-temp" className="hidden" />
                  <Upload className="mx-auto h-12 w-12 text-indigo-400 mb-3" />
                  <h4 className="text-sm font-bold text-white">Upload QR Badge Image</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-5">
                    Select a photo or screenshot containing the employee QR code to decode
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full max-w-xs mx-auto text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Live Result & Session Activity Feed (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* PRIMARY SCAN RESULT CARD */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  <span>Validation Status</span>
                </h3>

                {scanResult ? (
                  <div
                    className={`rounded-2xl border p-5 shadow-lg transition-all ${scanResult.success
                        ? scanResult.type === 'check_in'
                          ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/80 to-slate-950 text-emerald-100'
                          : 'border-blue-500/40 bg-gradient-to-b from-blue-950/80 to-slate-950 text-blue-100'
                        : scanResult.type === 'info'
                          ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/80 to-slate-950 text-amber-100'
                          : 'border-rose-500/40 bg-gradient-to-b from-rose-950/80 to-slate-950 text-rose-100'
                      }`}
                  >
                    <div className="flex items-start space-x-3">
                      {scanResult.success ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                      ) : scanResult.type === 'info' ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Clock className="h-6 w-6" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <XCircle className="h-6 w-6" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${scanResult.success
                                ? scanResult.type === 'check_in'
                                  ? 'bg-emerald-500/30 text-emerald-300'
                                  : 'bg-blue-500/30 text-blue-300'
                                : scanResult.type === 'info'
                                  ? 'bg-amber-500/30 text-amber-300'
                                  : 'bg-rose-500/30 text-rose-300'
                              }`}
                          >
                            {scanResult.type === 'check_in'
                              ? 'Check-In'
                              : scanResult.type === 'check_out'
                                ? 'Check-Out'
                                : scanResult.type === 'info'
                                  ? 'Attendance Status'
                                  : 'Scan Rejected'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(scanResult.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Main Message */}
                        <p className="mt-2 text-sm font-bold text-white">
                          {scanResult.message}
                        </p>

                        {/* Exact fields required: Employee Name, Employee ID, Department, Time, Attendance Status */}
                        {scanResult.employee && (
                          <div className="mt-4 space-y-2 rounded-xl bg-slate-900/90 p-3.5 text-xs border border-slate-800 text-slate-200">
                            <div className="flex justify-between border-b border-slate-800 pb-1.5">
                              <span className="text-slate-400">Employee Name:</span>
                              <span className="font-bold text-white">{scanResult.employee.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1.5">
                              <span className="text-slate-400">Employee ID:</span>
                              <span className="font-mono font-bold text-indigo-400">
                                #{scanResult.employee.id} ({scanResult.employee.code})
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1.5">
                              <span className="text-slate-400">Department:</span>
                              <span className="font-medium text-slate-300">{scanResult.employee.department}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1.5">
                              <span className="text-slate-400">Time:</span>
                              <span className="font-mono font-bold text-white">
                                {new Date(scanResult.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {scanResult.attendance && (
                              <div className="flex justify-between items-center pt-0.5">
                                <span className="text-slate-400">Attendance Status:</span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${scanResult.attendance.status === 'Present'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : scanResult.attendance.status === 'Late'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : scanResult.attendance.status === 'Overtime'
                                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                          : 'bg-slate-800 text-slate-300'
                                    }`}
                                >
                                  {scanResult.attendance.status}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-500">
                    <ScanLine className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-semibold text-slate-400">Awaiting QR scan...</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Scan or simulate an employee badge to verify attendance credentials.
                    </p>
                  </div>
                )}
              </div>

              {/* SESSION SCAN HISTORY FEED */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <History className="h-4 w-4 text-indigo-400" />
                  <span>Session Terminal Logs ({scanHistory.length})</span>
                </h4>

                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-2 space-y-1.5 text-xs">
                  {scanHistory.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-slate-500">
                      No scans performed in this kiosk session
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
                            {item.result.employee ? item.result.employee.name : 'Unknown Code'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
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
        <div className="border-t border-slate-800 bg-slate-950 px-6 py-3.5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px]">Terminal operational • Cryptographic QR verification active</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-700 transition"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

