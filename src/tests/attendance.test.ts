import {
  calculateAttendanceMetrics,
  timeStringToSeconds,
  secondsToTimeString,
  isValidTimeFormat,
  isValidDateFormat,
} from '../server/attendanceEngine.ts';
import { processQRScan, createEmployee } from '../server/dbServices.ts';
import { db } from '../db/index.ts';
import { employees, qrCodes, attendance, departments, users } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function runAttendanceTests() {
  console.log('====================================================');
  console.log('⏱️  [5/9] STARTING ATTENDANCE ENGINE TEST SUITE');
  console.log('====================================================');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Punctual Check-In Only
  {
    const result = calculateAttendanceMetrics({
      checkIn: '08:00:00',
      checkOut: null,
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      standardWorkingHours: 8,
      unpaidBreakHours: 1,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
    });
    assert(result.status === 'Present', 'Punctual Check-In returns Present', `Got ${result.status}`);
    assert(result.workingHours === 0, 'Check-In only has 0 working hours');
    assert(result.overtimeHours === 0, 'Check-In only has 0 overtime hours');
  }

  // 2. Late Check-In (Check-in past grace threshold of 15 min)
  {
    const result = calculateAttendanceMetrics({
      checkIn: '08:20:00',
      checkOut: null,
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      standardWorkingHours: 8,
      unpaidBreakHours: 1,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
    });
    assert(result.status === 'Late', 'Check-In at 08:20:00 with 15m grace is Late', `Got ${result.status}`);
  }

  // 3. Punctual Check-Out with Standard Shift (08:00 to 17:00, 1h break = 8h)
  {
    const result = calculateAttendanceMetrics({
      checkIn: '08:00:00',
      checkOut: '17:00:00',
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      standardWorkingHours: 8,
      unpaidBreakHours: 1,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
    });
    assert(result.status === 'Present', 'Full standard shift is Present', `Got ${result.status}`);
    assert(result.workingHours === 8, 'Full standard shift gives 8.00 working hours', `Got ${result.workingHours}`);
    assert(result.overtimeHours === 0, 'Full standard shift has 0 overtime', `Got ${result.overtimeHours}`);
  }

  // 4. Overtime Calculation (08:00 to 19:30 => 11.5 - 1 = 10.5 working hours, 2.5 overtime)
  {
    const result = calculateAttendanceMetrics({
      checkIn: '08:00:00',
      checkOut: '19:30:00',
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      standardWorkingHours: 8,
      unpaidBreakHours: 1,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
    });
    assert(result.status === 'Overtime', 'Overtime shift status is Overtime', `Got ${result.status}`);
    assert(result.workingHours === 10.5, 'Overtime working hours = 10.50', `Got ${result.workingHours}`);
    assert(result.overtimeHours === 2.5, 'Overtime hours = 2.50', `Got ${result.overtimeHours}`);
  }

  // 5. Early Departure (08:00 to 15:00 => 7 - 1 = 6 hours < 8 hours - 30m)
  {
    const result = calculateAttendanceMetrics({
      checkIn: '08:00:00',
      checkOut: '15:00:00',
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      standardWorkingHours: 8,
      unpaidBreakHours: 1,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
    });
    assert(result.status === 'Early Departure', 'Early departure status is Early Departure', `Got ${result.status}`);
    assert(result.workingHours === 6, 'Early departure working hours = 6.00', `Got ${result.workingHours}`);
    assert(result.overtimeHours === 0, 'Early departure overtime = 0', `Got ${result.overtimeHours}`);
  }

  // 6. Formats and Helpers
  {
    assert(isValidDateFormat('2026-05-15'), '2026-05-15 is a valid date format');
    assert(!isValidDateFormat('15-05-2026'), '15-05-2026 is invalid date format');
    assert(isValidTimeFormat('08:30:00'), '08:30:00 is valid time');
    assert(isValidTimeFormat('08:30'), '08:30 is valid time');
    assert(!isValidTimeFormat('25:00:00'), '25:00:00 is invalid time');
    assert(timeStringToSeconds('01:00:00') === 3600, 'timeStringToSeconds(01:00:00) === 3600');
    assert(secondsToTimeString(3665) === '01:01:05', 'secondsToTimeString(3665) === 01:01:05');
  }

  // 7. Live Attendance Workflow & Edge Case Tests
  const [firstDept] = await db.select().from(departments).limit(1);
  let testEmpId: number | null = null;
  let testQrValue: string = '';

  try {
    const code = `ATT${Date.now().toString().slice(-4)}`;
    const emp = await createEmployee({
      employeeCode: code,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: `att_test_${Date.now()}@apexcorp.com`,
      phone: '+1 555 123 4567',
      departmentId: firstDept?.id || 1,
      position: 'Systems Analyst',
      basicSalary: '4800.00',
    });
    testEmpId = emp.employee.id;
    testQrValue = emp.qrCode.qrValue;

    // A. Invalid Check-Out without prior Check-In
    const invalidCheckOut = await processQRScan(testQrValue, 'check_out');
    assert(!invalidCheckOut.success, 'Invalid check-out without prior check-in is rejected');

    // B. Valid Check-In
    const validCheckIn = await processQRScan(testQrValue, 'check_in');
    assert(validCheckIn.success, 'Valid check-in processed successfully');
    assert(validCheckIn.type === 'check_in', 'Scan result marked as check_in');

    // C. Duplicate Check-In Attempt
    const duplicateCheckIn = await processQRScan(testQrValue, 'check_in');
    assert(
      !duplicateCheckIn.success || duplicateCheckIn.type === 'info',
      'Duplicate check-in safely detected and prevented'
    );
    assert(
      duplicateCheckIn.message.includes('already recorded'),
      'Duplicate check-in returns informational message'
    );

    // D. Valid Check-Out
    const validCheckOut = await processQRScan(testQrValue, 'check_out');
    assert(validCheckOut.success, 'Valid check-out processed successfully');
    assert(validCheckOut.type === 'check_out', 'Scan result marked as check_out');

    // E. Re-scan after completed daily shift
    const completeReScan = await processQRScan(testQrValue, 'auto');
    assert(
      completeReScan.type === 'info' && completeReScan.message.includes('already recorded'),
      'Re-scan after full completed shift informs user attendance is already recorded'
    );
  } catch (e: any) {
    assert(false, 'Live attendance workflow check', e.message);
  }

  // Cleanup test employee & attendance
  if (testEmpId) {
    try {
      await db.delete(attendance).where(eq(attendance.employeeId, testEmpId));
      await db.delete(qrCodes).where(eq(qrCodes.employeeId, testEmpId));
      await db.delete(users).where(eq(users.employeeId, testEmpId));
      await db.delete(employees).where(eq(employees.id, testEmpId));
    } catch (e) {}
  }

  console.log(`--- Attendance Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
