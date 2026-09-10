import React, { useState, useEffect } from 'react';
import { ApexLogo } from './ApexLogo.tsx';
import logoImg from '../../assets/apex_logo.jpg';
import { Building2, ShieldCheck, QrCode as QrIcon } from 'lucide-react';
import { PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail, withPhotoCacheBuster } from '../../utils/photoSync.ts';

export interface EmployeeBadgeData {
  fullName: string;
  jobTitle: string;
  department: string;
  employeeId: string;
  rawEmployeeId?: number;
  employeeCode?: string;
  photoUrl?: string | null;
  qrCodeUrl?: string | null;
  companyName?: string;
  issueDate?: string;
  status?: string;
}

interface EmployeeIDBadgeProps {
  badge: EmployeeBadgeData;
  variant?: 'standard' | 'compact' | 'print';
  className?: string;
  showLanyardSlot?: boolean;
}

/**
 * Standard ISO/IEC 7810 ID-1 CR80 ID Badge
 * Dimensions: 53.98 mm width x 85.60 mm height (Portrait)
 * Aspect Ratio: 53.98 / 85.60 (~0.6306)
 */
export const EmployeeIDBadge: React.FC<EmployeeIDBadgeProps> = ({
  badge,
  variant = 'standard',
  className = '',
  showLanyardSlot = true,
}) => {
  const companyName = badge.companyName || 'Apex Enterprise Solutions';
  const [livePhotoUrl, setLivePhotoUrl] = useState<string | null | undefined>(badge.photoUrl);
  const [photoVersion, setPhotoVersion] = useState<number>(Date.now());
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setLivePhotoUrl(badge.photoUrl);
    setPhotoVersion(Date.now());
    setImgError(false);
  }, [badge.photoUrl]);

  useEffect(() => {
    const handlePhotoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;

      const rawIdStr = badge.rawEmployeeId != null ? badge.rawEmployeeId.toString() : '';
      const bId = (badge.employeeId || '').toString().trim().toLowerCase();
      const bCode = (badge.employeeCode || '').trim().toLowerCase();

      const detId = detail.employeeId != null ? detail.employeeId.toString() : '';
      const detCode = (detail.employeeCode || '').trim().toLowerCase();

      // Normalize digits from bId if it's like 'EMP-1001' or '1001'
      const bDigits = bId.replace(/\D/g, '');
      const detDigits = detId.replace(/\D/g, '');
      const detCodeDigits = detCode.replace(/\D/g, '');

      const matches =
        (rawIdStr && detId && rawIdStr === detId) ||
        (bId && detId && bId === detId) ||
        (bId && detId && bId === `emp-${detId}`) ||
        (bId && detId && bId === `emp-${detId.padStart(4, '0')}`) ||
        (bId && detCode && bId === detCode) ||
        (bCode && detCode && bCode === detCode) ||
        (bCode && detId && bCode === detId) ||
        (bCode && detId && bCode === `emp-${detId}`) ||
        (bCode && detId && bCode === `emp-${detId.padStart(4, '0')}`) ||
        (bDigits && detDigits && bDigits === detDigits) ||
        (bDigits && detCodeDigits && bDigits === detCodeDigits);

      if (matches) {
        setLivePhotoUrl(detail.photoUrl);
        setPhotoVersion(detail.timestamp || Date.now());
        setImgError(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdate);
      }
    };
  }, [badge.employeeId, badge.rawEmployeeId, badge.employeeCode]);

  const basePhoto =
    livePhotoUrl !== undefined
      ? livePhotoUrl
      : (badge.employeeCode ? `/uploads/employees/${badge.employeeCode}.jpg` : null) ||
        (badge.employeeId ? `/uploads/employees/${badge.employeeId}.jpg` : null);

  const resolvedPhoto = withPhotoCacheBuster(basePhoto, photoVersion);

  useEffect(() => {
    setImgError(false);
  }, [resolvedPhoto]);

  // Sizing styles:
  // variant 'print': exact physical card dimensions 53.98mm x 85.60mm
  // variant 'standard': 320px x 507px (exact 53.98/85.60 aspect ratio for desktop & modal display)
  // variant 'compact': max-w-[260px] aspect-[53.98/85.60] (for cards gallery)
  const sizeClasses =
    variant === 'print'
      ? 'w-[53.98mm] h-[85.60mm] max-w-[53.98mm] max-h-[85.60mm] p-[3mm]'
      : variant === 'compact'
      ? 'w-full max-w-[270px] aspect-[53.98/85.60] p-3.5'
      : 'w-full max-w-[320px] aspect-[53.98/85.60] p-4';

  const isPrint = variant === 'print';

  return (
    <div
      className={`relative select-none overflow-hidden rounded-[14px] bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl border border-indigo-500/30 flex flex-col justify-between items-center text-center font-sans ${sizeClasses} ${className}`}
      style={{
        aspectRatio: isPrint ? undefined : '53.98 / 85.60',
      }}
    >
      {/* Subtle Security Guilloche Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-indigo-600/10 blur-2xl pointer-events-none" />

      {/* TOP SECTION: Lanyard Slot + Company Header */}
      <div className="w-full flex flex-col items-center relative z-10 space-y-1">
        {/* Lanyard Punch Hole Indicator */}
        {showLanyardSlot && (
          <div className="h-1.5 w-8 rounded-full bg-slate-800/90 border border-slate-700/60 shadow-inner mb-1" />
        )}

        {/* Company Header with Logo */}
        <div className="w-full flex items-center justify-between border-b border-indigo-500/20 pb-1.5 px-0.5">
          <div className="flex items-center space-x-1.5">
            <div className="relative shrink-0">
              <img
                src={logoImg}
                alt="Logo"
                className={`${isPrint ? 'h-4 w-4' : 'h-5 w-5'} rounded-md object-cover ring-1 ring-cyan-400/40`}
              />
            </div>
            <div className="text-left leading-none">
              <span className={`font-black tracking-tight ${isPrint ? 'text-[6pt]' : 'text-[10px]'} text-white`}>
                APEX<span className="text-cyan-400 ml-0.5">ENTERPRISE</span>
              </span>
              <p className={`${isPrint ? 'text-[4.5pt]' : 'text-[8px]'} text-indigo-300/80 uppercase tracking-widest font-semibold`}>
                Security ID
              </p>
            </div>
          </div>

          <span className="inline-flex items-center space-x-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 border border-emerald-400/30 text-emerald-300 font-mono text-[8px] font-bold uppercase">
            <ShieldCheck className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
            <span>Verified</span>
          </span>
        </div>
      </div>

      {/* MIDDLE SECTION: Passport-Style Photograph & Employee Identity */}
      <div className="w-full flex flex-col items-center relative z-10 my-auto py-1">
        {/* Passport-Style Photograph (Standard 35:45 vertical ratio) */}
        <div className="relative group">
          <div
            className={`overflow-hidden rounded-xl border-2 border-white/90 bg-slate-800 shadow-md flex items-center justify-center relative ${
              isPrint ? 'w-[23mm] h-[29mm]' : 'w-20 h-25 sm:w-22 sm:h-28'
            }`}
            style={{
              aspectRatio: '35 / 45',
            }}
          >
            {resolvedPhoto && !imgError ? (
              <img
                key={resolvedPhoto}
                src={resolvedPhoto}
                alt={badge.fullName}
                className="h-full w-full object-cover object-top"
                onError={() => setImgError(true)}
              />
            ) : null}
            <div
              className="h-full w-full flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-indigo-950 text-indigo-200"
              style={{ display: resolvedPhoto && !imgError ? 'none' : 'flex' }}
            >
              <span className="text-xl sm:text-2xl font-black">
                {badge.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                Passport
              </span>
            </div>
          </div>

          {/* Micro security hologram badge in corner of photo */}
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 border border-white shadow-xs flex items-center justify-center text-[7px] text-slate-950 font-black">
            SL
          </div>
        </div>

        {/* Employee Full Name */}
        <div className="mt-2 w-full px-1">
          <h2 className={`font-black tracking-tight text-white leading-tight truncate ${
            isPrint ? 'text-[8.5pt]' : 'text-sm sm:text-base'
          }`}>
            {badge.fullName}
          </h2>

          {/* Job Title */}
          <p className={`font-bold text-cyan-400 truncate mt-0.5 ${
            isPrint ? 'text-[6pt]' : 'text-[11px] sm:text-xs'
          }`}>
            {badge.jobTitle}
          </p>

          {/* Department */}
          <div className="mt-1 flex items-center justify-center space-x-1 text-slate-300">
            <Building2 className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
            <span className={`truncate font-medium ${isPrint ? 'text-[5pt]' : 'text-[9.5px]'}`}>
              {badge.department}
            </span>
          </div>

          {/* Employee ID Badge Code */}
          <div className="mt-1.5 flex items-center justify-center">
            <span className={`inline-block font-mono font-bold tracking-wider rounded-md bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 ${
              isPrint ? 'text-[5.5pt]' : 'text-[10px]'
            }`}>
              ID: {badge.employeeId}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Official Scannable QR Code & Security Footer */}
      <div className="w-full flex flex-col items-center relative z-10 pt-1">
        {/* QR Code Container */}
        <div className="rounded-lg bg-white p-1.5 shadow-md flex flex-col items-center border border-indigo-200">
          {badge.qrCodeUrl ? (
            <img
              src={badge.qrCodeUrl}
              alt={`QR Code ${badge.employeeId}`}
              className={`${isPrint ? 'h-[16mm] w-[16mm]' : 'h-16 w-16 sm:h-18 sm:w-18'} object-contain`}
            />
          ) : (
            <div className={`${isPrint ? 'h-[16mm] w-[16mm]' : 'h-16 w-16 sm:h-18 sm:w-18'} flex items-center justify-center bg-slate-100 text-slate-400`}>
              <QrIcon className="h-8 w-8" />
            </div>
          )}
        </div>
        <span className={`font-mono text-indigo-300/80 font-bold uppercase tracking-widest mt-1 ${
          isPrint ? 'text-[4pt]' : 'text-[8px]'
        }`}>
          Attendance & Security Token
        </span>

        {/* Corporate Micro Footer */}
        <div className="w-full border-t border-indigo-500/20 mt-1 pt-1 text-center">
          <p className={`font-mono text-slate-400 uppercase tracking-tighter truncate ${
            isPrint ? 'text-[3.8pt]' : 'text-[7.5px]'
          }`}>
            {companyName} • 53.98 × 85.60 mm
          </p>
        </div>
      </div>
    </div>
  );
};

function toAbsoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${cleanPath}`;
}

/**
 * Print single ID badge in a dedicated window with exact 53.98mm x 85.60mm portrait layout
 */
export function printEmployeeBadge(badge: EmployeeBadgeData) {
  const printWindow = window.open('', '_blank', 'width=450,height=700');
  if (!printWindow) {
    alert('Please allow popups to print the official ID badge.');
    return;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const rawPhoto =
    badge.photoUrl ||
    (badge.employeeCode ? `/uploads/employees/${badge.employeeCode}.jpg` : null) ||
    (badge.employeeId ? `/uploads/employees/${badge.employeeId}.jpg` : null);

  const resolvedPhoto = toAbsoluteUrl(withPhotoCacheBuster(rawPhoto, Date.now()));
  const resolvedQr = toAbsoluteUrl(badge.qrCodeUrl);
  const resolvedLogo = toAbsoluteUrl(logoImg);

  const initials = badge.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <title>ID Badge - ${badge.fullName} (${badge.employeeId})</title>
  <style>
    @page {
      size: 53.98mm 85.60mm portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 53.98mm;
      height: 85.60mm;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .badge-card {
      width: 53.98mm;
      height: 85.60mm;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 3mm 3mm 2.5mm 3mm;
      background: linear-gradient(160deg, #050814 0%, #0f172a 45%, #1e1b4b 100%);
      color: #ffffff;
      border-radius: 3.5mm;
      border: 0.35mm solid rgba(99, 102, 241, 0.45);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .slot {
      width: 9mm;
      height: 1.8mm;
      background: rgba(30, 41, 59, 0.9);
      border: 0.25mm solid rgba(71, 85, 105, 0.6);
      border-radius: 1mm;
      margin-bottom: 1mm;
    }
    .header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 0.25mm solid rgba(99, 102, 241, 0.3);
      padding-bottom: 1.2mm;
    }
    .header-logo {
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }
    .header-title {
      font-weight: 900;
      font-size: 7pt;
      letter-spacing: 0.2px;
      color: #ffffff;
    }
    .header-title span {
      color: #22d3ee;
    }
    .header-sub {
      font-size: 4.5pt;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .verified-pill {
      font-size: 5pt;
      font-weight: 700;
      color: #6ee7b7;
      background: rgba(16, 185, 129, 0.2);
      border: 0.2mm solid rgba(16, 185, 129, 0.4);
      padding: 0.5mm 1.5mm;
      border-radius: 2mm;
      text-transform: uppercase;
    }
    .photo-frame {
      width: 23mm;
      height: 29mm;
      border: 0.4mm solid #ffffff;
      border-radius: 2.2mm;
      overflow: hidden;
      background: #1e293b;
      margin: 1.2mm 0;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 1mm 2mm rgba(0,0,0,0.3);
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      font-size: 11pt;
      font-weight: 900;
      color: #c7d2fe;
    }
    .emp-name {
      font-size: 8.5pt;
      font-weight: 900;
      color: #ffffff;
      text-align: center;
      margin: 0;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 48mm;
    }
    .emp-title {
      font-size: 6.2pt;
      font-weight: 700;
      color: #22d3ee;
      text-align: center;
      margin: 0.4mm 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 48mm;
    }
    .emp-dept {
      font-size: 5.2pt;
      color: #cbd5e1;
      text-align: center;
      margin: 0.4mm 0 0 0;
    }
    .emp-id-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 5.5pt;
      font-weight: 700;
      background: rgba(99, 102, 241, 0.25);
      border: 0.2mm solid rgba(129, 140, 248, 0.4);
      color: #c7d2fe;
      padding: 0.4mm 1.8mm;
      border-radius: 1mm;
      display: inline-block;
      margin-top: 0.8mm;
    }
    .qr-box {
      background: #ffffff;
      padding: 1mm;
      border-radius: 1.8mm;
      box-shadow: 0 1mm 2mm rgba(0,0,0,0.2);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .qr-img {
      width: 17mm;
      height: 17mm;
      object-fit: contain;
      display: block;
    }
    .qr-caption {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 4pt;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-top: 0.6mm;
      font-weight: 700;
    }
    .footer {
      width: 100%;
      border-top: 0.2mm solid rgba(99, 102, 241, 0.25);
      padding-top: 0.8mm;
      text-align: center;
      font-size: 4pt;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
  </style>
</head>
<body>
  <div class="badge-card">
    <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <div class="slot"></div>
      <div class="header">
        <div class="header-logo">
          <div style="text-align: left; line-height: 1;">
            <div class="header-title">APEX<span>ENTERPRISE</span></div>
            <div class="header-sub">Corporate ID Card</div>
          </div>
        </div>
        <div class="verified-pill">Verified Pass</div>
      </div>
    </div>

    <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <div class="photo-frame">
        ${
          resolvedPhoto
            ? `<img src="${resolvedPhoto}" class="photo-img" alt="Photo" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
               <div class="photo-placeholder" style="display:none;">${initials}</div>`
            : `<div class="photo-placeholder">${initials}</div>`
        }
      </div>
      <div class="emp-name">${badge.fullName}</div>
      <div class="emp-title">${badge.jobTitle}</div>
      <div class="emp-dept">${badge.department}</div>
      <div>
        <span class="emp-id-pill">ID: ${badge.employeeId}</span>
      </div>
    </div>

    <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <div class="qr-box">
        ${
          resolvedQr || badge.qrCodeUrl
            ? `<img src="${resolvedQr || badge.qrCodeUrl}" class="qr-img" alt="QR" />`
            : `<div style="width:17mm;height:17mm;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#64748b;">QR TOKEN</div>`
        }
      </div>
      <div class="qr-caption">Encrypted Attendance Token</div>
      <div class="footer">
        Apex Enterprise (SL) Ltd • Portrait 53.98 × 85.60 mm
      </div>
    </div>
  </div>

  <script>
    function triggerPrintWhenImagesReady() {
      var images = Array.from(document.querySelectorAll('img'));
      if (images.length === 0) {
        window.print();
        return;
      }
      var loadedCount = 0;
      function checkDone() {
        loadedCount++;
        if (loadedCount >= images.length) {
          setTimeout(function() { window.print(); }, 200);
        }
      }
      images.forEach(function(img) {
        if (img.complete) {
          checkDone();
        } else {
          img.addEventListener('load', checkDone);
          img.addEventListener('error', checkDone);
        }
      });
      setTimeout(function() {
        if (loadedCount < images.length) {
          window.print();
        }
      }, 2500);
    }

    if (document.readyState === 'complete') {
      triggerPrintWhenImagesReady();
    } else {
      window.addEventListener('load', triggerPrintWhenImagesReady);
    }
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Print batch of ID badges arranged in standard CR80 grid (53.98mm x 85.60mm each)
 */
export function printAllBadgesSheet(badges: EmployeeBadgeData[]) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to print official ID badges.');
    return;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const resolvedLogo = toAbsoluteUrl(logoImg);

  const cardsHtml = badges
    .map((b) => {
      const initials = b.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const rawPhoto =
        b.photoUrl ||
        (b.employeeCode ? `/uploads/employees/${b.employeeCode}.jpg` : null) ||
        (b.employeeId ? `/uploads/employees/${b.employeeId}.jpg` : null);

      const resolvedPhoto = toAbsoluteUrl(withPhotoCacheBuster(rawPhoto, Date.now()));
      const resolvedQr = toAbsoluteUrl(b.qrCodeUrl);

      return `
    <div class="badge-card">
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
        <div class="slot"></div>
        <div class="header">
          <div class="header-logo">
            <div style="text-align: left; line-height: 1;">
              <div class="header-title">APEX<span>ENTERPRISE</span></div>
              <div class="header-sub">Corporate ID Card</div>
            </div>
          </div>
          <div class="verified-pill">Verified</div>
        </div>
      </div>

      <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
        <div class="photo-frame">
          ${
            resolvedPhoto
              ? `<img src="${resolvedPhoto}" class="photo-img" alt="Photo" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                 <div class="photo-placeholder" style="display:none;">${initials}</div>`
              : `<div class="photo-placeholder">${initials}</div>`
          }
        </div>
        <div class="emp-name">${b.fullName}</div>
        <div class="emp-title">${b.jobTitle}</div>
        <div class="emp-dept">${b.department}</div>
        <div>
          <span class="emp-id-pill">ID: ${b.employeeId}</span>
        </div>
      </div>

      <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
        <div class="qr-box">
          ${
            resolvedQr || b.qrCodeUrl
              ? `<img src="${resolvedQr || b.qrCodeUrl}" class="qr-img" alt="QR" />`
              : `<div style="width:16mm;height:16mm;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#64748b;">QR</div>`
          }
        </div>
        <div class="qr-caption">Encrypted Attendance Token</div>
        <div class="footer">
          Apex Enterprise (SL) Ltd • 53.98 × 85.60 mm
        </div>
      </div>
    </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <title>Apex Enterprise - Batch ID Badges</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #ffffff;
    }
    .sheet-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 5mm;
    }
    .badge-card {
      width: 53.98mm;
      height: 85.60mm;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 2.8mm 2.8mm 2.2mm 2.8mm;
      background: linear-gradient(160deg, #050814 0%, #0f172a 45%, #1e1b4b 100%);
      color: #ffffff;
      border-radius: 3.2mm;
      border: 0.3mm solid rgba(99, 102, 241, 0.45);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .slot {
      width: 8mm;
      height: 1.6mm;
      background: rgba(30, 41, 59, 0.9);
      border: 0.2mm solid rgba(71, 85, 105, 0.6);
      border-radius: 0.8mm;
      margin-bottom: 0.8mm;
    }
    .header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 0.2mm solid rgba(99, 102, 241, 0.3);
      padding-bottom: 1mm;
    }
    .header-logo {
      display: flex;
      align-items: center;
      gap: 1.2mm;
    }
    .header-title {
      font-weight: 900;
      font-size: 6.5pt;
      letter-spacing: 0.2px;
      color: #ffffff;
    }
    .header-title span {
      color: #22d3ee;
    }
    .header-sub {
      font-size: 4pt;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .verified-pill {
      font-size: 4.5pt;
      font-weight: 700;
      color: #6ee7b7;
      background: rgba(16, 185, 129, 0.2);
      border: 0.2mm solid rgba(16, 185, 129, 0.4);
      padding: 0.4mm 1.2mm;
      border-radius: 1.5mm;
      text-transform: uppercase;
    }
    .photo-frame {
      width: 22mm;
      height: 28mm;
      border: 0.4mm solid #ffffff;
      border-radius: 2mm;
      overflow: hidden;
      background: #1e293b;
      margin: 1mm 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      font-size: 11pt;
      font-weight: 900;
      color: #c7d2fe;
    }
    .emp-name {
      font-size: 8.2pt;
      font-weight: 900;
      color: #ffffff;
      text-align: center;
      margin: 0;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 48mm;
    }
    .emp-title {
      font-size: 6pt;
      font-weight: 700;
      color: #22d3ee;
      text-align: center;
      margin: 0.4mm 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 48mm;
    }
    .emp-dept {
      font-size: 5pt;
      color: #cbd5e1;
      text-align: center;
      margin: 0.4mm 0 0 0;
    }
    .emp-id-pill {
      font-family: ui-monospace, monospace;
      font-size: 5.2pt;
      font-weight: 700;
      background: rgba(99, 102, 241, 0.25);
      border: 0.2mm solid rgba(129, 140, 248, 0.4);
      color: #c7d2fe;
      padding: 0.4mm 1.6mm;
      border-radius: 1mm;
      display: inline-block;
      margin-top: 0.6mm;
    }
    .qr-box {
      background: #ffffff;
      padding: 0.8mm;
      border-radius: 1.6mm;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .qr-img {
      width: 16mm;
      height: 16mm;
      object-fit: contain;
      display: block;
    }
    .qr-caption {
      font-family: ui-monospace, monospace;
      font-size: 3.8pt;
      color: #a5b4fc;
      text-transform: uppercase;
      margin-top: 0.5mm;
      font-weight: 700;
    }
    .footer {
      width: 100%;
      border-top: 0.2mm solid rgba(99, 102, 241, 0.25);
      padding-top: 0.6mm;
      text-align: center;
      font-size: 3.8pt;
      font-family: ui-monospace, monospace;
      color: #94a3b8;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="sheet-grid">
    ${cardsHtml}
  </div>

  <script>
    function triggerPrintWhenImagesReady() {
      var images = Array.from(document.querySelectorAll('img'));
      if (images.length === 0) {
        window.print();
        return;
      }
      var loadedCount = 0;
      function checkDone() {
        loadedCount++;
        if (loadedCount >= images.length) {
          setTimeout(function() { window.print(); }, 250);
        }
      }
      images.forEach(function(img) {
        if (img.complete) {
          checkDone();
        } else {
          img.addEventListener('load', checkDone);
          img.addEventListener('error', checkDone);
        }
      });
      setTimeout(function() {
        if (loadedCount < images.length) {
          window.print();
        }
      }, 3000);
    }

    if (document.readyState === 'complete') {
      triggerPrintWhenImagesReady();
    } else {
      window.addEventListener('load', triggerPrintWhenImagesReady);
    }
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
