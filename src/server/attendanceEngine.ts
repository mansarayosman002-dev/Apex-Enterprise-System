import { AttendanceStatus, SystemSettings } from '../types/index.ts';

export interface AttendanceCalculationParams {
  checkIn: string; // "HH:MM:SS" or "HH:MM"
  checkOut?: string | null; // "HH:MM:SS" or "HH:MM"
  standardCheckIn?: string; // "08:00:00"
  standardCheckOut?: string; // "17:00:00"
  standardWorkingHours?: number; // 8.0
  unpaidBreakHours?: number; // 1.0
  lateThresholdMinutes?: number; // 15
  earlyDepartureThresholdMinutes?: number; // 30
}

export interface AttendanceCalculationResult {
  workingHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  isLate: boolean;
  isEarlyDeparture: boolean;
  isOvertime: boolean;
}

/**
 * Convert time string (HH:MM:SS or HH:MM) to seconds from midnight
 */
export function timeStringToSeconds(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map((v) => parseInt(v, 10) || 0);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Convert seconds from midnight to formatted HH:MM:SS string
 */
export function secondsToTimeString(sec: number): string {
  const normalized = Math.max(0, Math.floor(sec));
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  const s = Math.floor(normalized % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Validate time format (HH:MM:SS or HH:MM)
 */
export function isValidTimeFormat(t: string): boolean {
  if (!t || typeof t !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return timeRegex.test(t.trim());
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(d: string): boolean {
  if (!d || typeof d !== 'string') return false;
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(d.trim())) return false;
  const parsed = new Date(d);
  return !isNaN(parsed.getTime());
}

/**
 * Core attendance calculation engine for working hours, overtime, and status
 */
export function calculateAttendanceMetrics(params: AttendanceCalculationParams): AttendanceCalculationResult {
  const standardCheckIn = params.standardCheckIn || '08:00:00';
  const standardCheckOut = params.standardCheckOut || '17:00:00';
  const standardWorkingHours = params.standardWorkingHours !== undefined ? params.standardWorkingHours : 8.0;
  const unpaidBreakHours = params.unpaidBreakHours !== undefined ? params.unpaidBreakHours : 1.0;
  const lateThresholdMinutes = params.lateThresholdMinutes !== undefined ? params.lateThresholdMinutes : 15;
  const earlyDepartureThresholdMinutes = params.earlyDepartureThresholdMinutes !== undefined ? params.earlyDepartureThresholdMinutes : 30;

  const checkInSec = timeStringToSeconds(params.checkIn);
  const stdCheckInSec = timeStringToSeconds(standardCheckIn);
  const lateCutoffSec = stdCheckInSec + lateThresholdMinutes * 60;

  const isLate = checkInSec > lateCutoffSec;

  if (!params.checkOut) {
    return {
      workingHours: 0,
      overtimeHours: 0,
      status: isLate ? 'Late' : 'Present',
      isLate,
      isEarlyDeparture: false,
      isOvertime: false,
    };
  }

  const checkOutSec = timeStringToSeconds(params.checkOut);
  const stdCheckOutSec = timeStringToSeconds(standardCheckOut);
  const earlyDepartureCutoffSec = stdCheckOutSec - earlyDepartureThresholdMinutes * 60;

  // Total gross duration in hours
  const totalDurationHours = Math.max(0, (checkOutSec - checkInSec) / 3600);

  // Formula: Working Hours = Check-Out - Check-In - Configured Unpaid Break
  let workingHours = totalDurationHours > unpaidBreakHours
    ? totalDurationHours - unpaidBreakHours
    : Math.max(0, totalDurationHours);
  workingHours = Math.round(workingHours * 100) / 100;

  // Formula:
  // If Working Hours > Standard Working Hours:
  // Overtime = Working Hours - Standard Working Hours
  // Otherwise: Overtime = 0
  let overtimeHours = 0;
  let isOvertime = false;
  if (workingHours > standardWorkingHours) {
    overtimeHours = Math.round((workingHours - standardWorkingHours) * 100) / 100;
    isOvertime = true;
  }

  // Early Departure check:
  // 1. Check out before early departure threshold time AND working hours < standard working hours
  const isEarlyDeparture = (checkOutSec < earlyDepartureCutoffSec || workingHours < (standardWorkingHours - (earlyDepartureThresholdMinutes / 60))) && !isOvertime;

  // Determine final status
  let status: AttendanceStatus = 'Present';
  if (isOvertime) {
    status = 'Overtime';
  } else if (isLate) {
    status = 'Late';
  } else if (isEarlyDeparture) {
    status = 'Early Departure';
  } else {
    status = 'Present';
  }

  return {
    workingHours,
    overtimeHours,
    status,
    isLate,
    isEarlyDeparture,
    isOvertime,
  };
}
