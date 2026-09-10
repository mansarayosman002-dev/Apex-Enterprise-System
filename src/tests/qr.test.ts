import {
  getQRCodeByEmployeeId,
  regenerateEmployeeQRCode,
  processQRScan,
  createEmployee,
  deleteEmployee,
  getAllQRCodes,
} from '../server/dbServices.ts';
import { db } from '../db/index.ts';
import { employees, qrCodes, departments, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function runQRTests() {
  console.log('====================================================');
  console.log("[4/10] STARTING QR CODE TEST SUITE");
  console.log('====================================================');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  const [firstDept]= await db.select().from(departments).limit(1);
  const deptId = firstDept?.id || 1;

  let testEmpId: number | null = null;
  let testQrValue: string = '';

  // Setup test employee
  try {
    const uniqueCode = `QR${Date.now().toString().slice(-4)}`;
    const empRes = await createEmployee({
      employeeCode: uniqueCode,
      firstName: 'Alan',
      lastName: 'Turing',
      email: `qr_test_${Date.now()}@apexcorp.com`,
      phone: '+1 (555) 777-8888',
      departmentId: deptId,
      position: 'Cryptographer',
      basicSalary: '6000.00',
    });
    testEmpId = empRes.employee.id;
    testQrValue = empRes.qrCode.qrValue;
  } catch (e: any) {
    console.error('Setup failed for QR tests:', e);
  }

  // 1. Generate QR & Fetch with Data URL
  if (testEmpId) {
    try {
      const qrData = await getQRCodeByEmployeeId(testEmpId);
      assert(!!qrData.qrValue, 'QR Code has valid alphanumeric value');
      assert(qrData.status === 'active', 'QR Code status is active');
      assert(qrData.dataUrl.startsWith('data:image/png;base64,'), 'QR Code returns valid Base64 PNG data URL');
    } catch (e: any) {
      assert(false, 'Generate and fetch QR code', e.message);
    }
  }

  // 2. Valid QR Recognition in Scanner
  if (testQrValue) {
    try {
      const scanRes = await processQRScan(testQrValue, 'auto');
      // Should succeed as check-in or info if already checked in
      assert(scanRes.success || scanRes.type === 'info', 'Valid QR code recognised by scanner engine');
      assert(scanRes.employee?.name.includes('Alan'), 'Scanned employee name correctly identified');
    } catch (e: any) {
      assert(false, 'Valid QR recognition', e.message);
    }
  }

  // 3. Invalid QR Code Scan Rejection
  try {
    const invalidScan = await processQRScan('APEX-INVALID-QR-NONEXISTENT-CODE', 'auto');
    assert(!invalidScan.success && invalidScan.type === 'error', 'Invalid/Non-existent QR is rejected by scanner');
    assert(invalidScan.message.includes('Invalid QR Code'), 'Error message states Invalid QR Code');
  } catch (e: any) {
    assert(false, 'Invalid QR code scan check', e.message);
  }

  // 4. Inactive Employee QR Scan Rejection
  if (testEmpId && testQrValue) {
    try {
      // Deactivate employee
      await deleteEmployee(testEmpId);

      const inactiveScan = await processQRScan(testQrValue, 'auto');
      assert(!inactiveScan.success, 'Scanning QR code for inactive employee is blocked');
    } catch (e: any) {
      assert(false, 'Inactive employee QR rejection', e.message);
    }
  }

  // 5. QR Code Regeneration
  if (testEmpId) {
    try {
      // Reactivate employee for regeneration test
      await db.update(employees).set({ status: 'active'}).where(eq(employees.id, testEmpId));

      const oldQrValue = testQrValue;
      const regen = await regenerateEmployeeQRCode(testEmpId);

      assert(regen.qrValue !== oldQrValue, 'Regenerated QR value is distinct from previous QR value');
      assert(regen.status === 'active', 'Regenerated QR status is active');
      assert(regen.dataUrl.startsWith('data:image/png;base64,'), 'Regenerated QR has valid PNG data URL');

      // Previous QR should now fail
      const oldScan = await processQRScan(oldQrValue, 'auto');
      assert(!oldScan.success, 'Old revoked QR code is no longer accepted after regeneration');
    } catch (e: any) {
      assert(false, 'QR code regeneration check', e.message);
    }
  }

  // 6. Bulk QR Codes Listing
  try {
    const allQrs = await getAllQRCodes();
    assert(Array.isArray(allQrs) && allQrs.length > 0, 'getAllQRCodes returns valid array of QR codes');
    assert(allQrs.every((q) => typeof q.qrValue === 'string'&& typeof q.employeeName === 'string'), 'All QR items contain required metadata');
  } catch (e: any) {
    assert(false, 'Bulk QR code listing', e.message);
  }

  // Cleanup test employee
  if (testEmpId) {
    try {
      await db.delete(qrCodes).where(eq(qrCodes.employeeId, testEmpId));
      await db.delete(users).where(eq(users.employeeId, testEmpId));
      await db.delete(employees).where(eq(employees.id, testEmpId));
    } catch (e) {}
  }

  console.log(`--- QR Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
