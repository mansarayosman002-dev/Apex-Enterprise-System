export interface EmployeePhotoUpdateDetail {
  employeeId: number;
  employeeCode?: string | null;
  photoUrl: string | null;
  timestamp: number;
}

export const PHOTO_UPDATED_EVENT = 'apex:employee-photo-updated';

/**
 * Broadcasts an employee photo change locally and across browser tabs.
 */
export function broadcastEmployeePhotoUpdated(
  employeeId: number,
  photoUrl: string | null,
  employeeCode?: string | null
) {
  const detail: EmployeePhotoUpdateDetail = {
    employeeId,
    employeeCode: employeeCode || null,
    photoUrl: photoUrl || null,
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    // 1. Dispatch custom event for current window
    window.dispatchEvent(new CustomEvent(PHOTO_UPDATED_EVENT, { detail }));

    // 2. Broadcast across tabs via localStorage
    try {
      localStorage.setItem('apex:last-photo-update', JSON.stringify(detail));
    } catch {
      // Ignore localStorage write restrictions
    }
  }
}

export function withPhotoCacheBuster(
  url?: string | null,
  version?: number | string
): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Base64 data URLs do not need cache-busting
  if (trimmed.startsWith('data:image/')) return trimmed;

  const v = version || Date.now();
  // Strip any existing v= parameter from query string
  const cleanUrl = trimmed.replace(/([?&])v=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  const sep = cleanUrl.includes('?') ? '&' : '?';
  return `${cleanUrl}${sep}v=${v}`;
}
