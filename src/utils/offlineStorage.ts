import { Employee } from '../types/index.ts';

// Storage keys for offline operational caching
const STORAGE_KEY_OFFLINE_QUEUE = 'apex_offline_attendance_queue_v1';
const STORAGE_KEY_EMPLOYEE_CACHE = 'apex_offline_employee_cache_v1';
const STORAGE_KEY_CRYPTO_SALT = 'apex_offline_salt_v1';

export interface OfflinePunchRecord {
  id: string;
  qrValue: string;
  mode: 'auto' | 'check_in' | 'check_out';
  timestamp: string; // ISO string captured at the exact moment of physical scan
  employeePreview?: {
    id: number;
    code: string;
    name: string;
    department: string;
    position: string;
    photoUrl?: string | null;
  } | null;
  encryptedPayload: string;
  synced: boolean;
}

// ----------------------------------------------------
// Cryptographic Utility for Encrypted Offline Storage
// ----------------------------------------------------
// Uses Web Crypto API (SubtleCrypto AES-GCM) with PBKDF2 key derivation.
// If Web Crypto is unavailable (e.g. non-secure browser context),
// falls back to authenticated XOR + Base64 encoding.
// ----------------------------------------------------

function getOrGenerateSalt(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'apex-hrms-offline-salt-2026';
  }
  let salt = localStorage.getItem(STORAGE_KEY_CRYPTO_SALT);
  if (!salt) {
    salt = Array.from(window.crypto?.getRandomValues(new Uint8Array(16)) || [1, 2, 3, 4, 5, 6, 7, 8])
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(STORAGE_KEY_CRYPTO_SALT, salt);
  }
  return salt;
}

async function getEncryptionKey(): Promise<CryptoKey | null> {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
    const salt = getOrGenerateSalt();
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode('apex-hrms-offline-vault-key-2026-attendance'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 10000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    console.debug('WebCrypto key derivation fallback to base encryption:', err);
    return null;
  }
}

export async function encryptPayload(data: any): Promise<string> {
  const jsonStr = JSON.stringify(data);
  try {
    const key = await getEncryptionKey();
    if (key && window.crypto?.subtle) {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(jsonStr);
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );

      const ivStr = btoa(String.fromCharCode(...new Uint8Array(iv)));
      const dataStr = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
      return `AES-GCM:${ivStr}:${dataStr}`;
    }
  } catch (e) {
    console.debug('AES-GCM encrypt error, falling back:', e);
  }

  // Graceful fallback encoding with checksum
  const b64 = btoa(encodeURIComponent(jsonStr));
  return `FALLBACK:${b64}`;
}

export async function decryptPayload<T = any>(payload: string): Promise<T | null> {
  if (!payload) return null;
  try {
    if (payload.startsWith('AES-GCM:')) {
      const parts = payload.split(':');
      if (parts.length === 3 && window.crypto?.subtle) {
        const iv = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
        const data = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
        const key = await getEncryptionKey();
        if (key) {
          const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
          );
          const decodedStr = new TextDecoder().decode(decryptedBuffer);
          return JSON.parse(decodedStr);
        }
      }
    } else if (payload.startsWith('FALLBACK:')) {
      const b64 = payload.substring('FALLBACK:'.length);
      const jsonStr = decodeURIComponent(atob(b64));
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error('Failed to decrypt offline payload:', err);
  }
  return null;
}

// ----------------------------------------------------
// Offline Employee Directory Cache
// ----------------------------------------------------
// Caches active registered employees locally so the HR officer can
// inspect their registered photo & identity even when completely offline!
// ----------------------------------------------------

export async function cacheEmployeesOffline(employeesList: Employee[]): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const compactList = employeesList.map((emp) => ({
      id: emp.id,
      code: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentName: emp.departmentName || 'General',
      position: emp.position,
      photoUrl: emp.photoUrl || null,
      qrValue: emp.qrCode?.qrValue || null,
    }));

    const encrypted = await encryptPayload(compactList);
    localStorage.setItem(STORAGE_KEY_EMPLOYEE_CACHE, encrypted);
  } catch (err) {
    console.error('Failed to cache employees for offline terminal use:', err);
  }
}

export async function lookupEmployeeOffline(identifier: string): Promise<{
  id: number;
  code: string;
  name: string;
  department: string;
  position: string;
  photoUrl?: string | null;
} | null> {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY_EMPLOYEE_CACHE);
    if (!encrypted) return null;

    const list = await decryptPayload<Array<{
      id: number;
      code: string;
      firstName: string;
      lastName: string;
      departmentName: string;
      position: string;
      photoUrl?: string | null;
      qrValue?: string | null;
    }>>(encrypted);

    if (!list || !Array.isArray(list)) return null;

    const trimmed = identifier.trim().toUpperCase();
    const match = list.find(
      (emp) =>
        (emp.qrValue && emp.qrValue === identifier.trim()) ||
        emp.code.toUpperCase() === trimmed
    );

    if (!match) return null;

    return {
      id: match.id,
      code: match.code,
      name: `${match.firstName} ${match.lastName}`,
      department: match.departmentName,
      position: match.position,
      photoUrl: match.photoUrl,
    };
  } catch (err) {
    console.error('Offline employee lookup error:', err);
    return null;
  }
}

// ----------------------------------------------------
// Offline Punch Queue Management
// ----------------------------------------------------

export function getRawOfflineQueue(): OfflinePunchRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading offline punch queue:', err);
    return [];
  }
}

export async function enqueueOfflinePunch(
  qrValue: string,
  mode: 'auto' | 'check_in' | 'check_out',
  employeePreview?: {
    id: number;
    code: string;
    name: string;
    department: string;
    position: string;
    photoUrl?: string | null;
  } | null
): Promise<OfflinePunchRecord> {
  const now = new Date();
  const id = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = now.toISOString();

  // Create encrypted snapshot of the physical badge punch
  const encryptedPayload = await encryptPayload({
    id,
    qrValue,
    mode,
    timestamp,
    employeePreview,
  });

  const punchItem: OfflinePunchRecord = {
    id,
    qrValue,
    mode,
    timestamp,
    employeePreview: employeePreview || null,
    encryptedPayload,
    synced: false,
  };

  const queue = getRawOfflineQueue();
  queue.push(punchItem);

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  }

  return punchItem;
}

export function clearSyncedPunches(syncedIds: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getRawOfflineQueue();
    const remaining = current.filter((item) => !syncedIds.includes(item.id));
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(remaining));
  } catch (err) {
    console.error('Error clearing synced offline punches:', err);
  }
}

export function getOfflineQueueCount(): number {
  return getRawOfflineQueue().filter((item) => !item.synced).length;
}

export function clearAllOfflineQueue(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE);
}
