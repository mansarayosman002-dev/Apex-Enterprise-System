import {
  getDatabaseStatus,
  bulkImportEmployees,
  bulkImportAttendance,
} from '../src/server/dbServices.ts';
import { db } from '../src/db/index.ts';
import { employees, attendance, qrCodes } from '../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

async function runUpsertVerification() {
  console.log('========================================================');
  console.log('TESTING POSTGRESQL 18 CONNECTION & AUTOMATIC UPSERT');
  console.log('========================================================\n');

  // Step 1: Database Status & Diagnostic
  console.log('1⃣ Querying live PostgreSQL 18 database status...');
  const dbStatus = await getDatabaseStatus();
  console.log(`   Engine:      ${dbStatus.engine}`);
  console.log(`   Version:     ${dbStatus.version.split('\n')[0]}`);
  console.log(`   Database:    ${dbStatus.database}`);
  console.log(`   User:        ${dbStatus.user}`);
  console.log(`   Port:        ${dbStatus.port}`);
  console.log(`   Ping Time:   ${dbStatus.latencyMs} ms`);
  console.log(`   Employees:   ${dbStatus.tableCounts.employees}`);
  console.log(`   Attendance:  ${dbStatus.tableCounts.attendance}`);
  console.log('   PostgreSQL 18 connection test PASSED!\n');

  // Step 2: Employee Initial Upload (Insertion)
  console.log('2⃣ Testing bulk employee initial upload (Auto-Insert)...');
  const initialEmployeeData = [
    {
      employeeCode: 'EMP-AUTO-01',
      firstName: 'Samantha',
      lastName: 'Jenkins',
      email: 'samantha.jenkins@apex.test',
      phone: '+232 76 999 888',
      department: 'Engineering',
      position: 'Staff AI Engineer',
      basicSalary: 9500,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256',
      status: 'active' as const,
    },
  ];

  const insertRes = await bulkImportEmployees(initialEmployeeData, 'SYSTEM_TEST');
  console.log(`   Inserted: ${insertRes.inserted}, Updated: ${insertRes.updated}, Errors: ${insertRes.errors.length}`);
  if (insertRes.inserted !== 1) {
    throw new Error(`Expected 1 inserted employee, got ${insertRes.inserted}`);
  }

  // Verify DB presence
  const [insertedEmp] = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeCode, 'EMP-AUTO-01'));
  if (!insertedEmp || insertedEmp.basicSalary !== '9500.00') {
    throw new Error('Employee was not inserted correctly in PostgreSQL 18');
  }
  console.log(`   Employee record EMP-AUTO-01 created in PostgreSQL 18 with ID: ${insertedEmp.id}`);

  // Step 3: Employee Re-Upload with Changes (Auto-Update / Upsert)
  console.log('\n3⃣ Testing bulk employee re-upload with changes (Auto-Update)...');
  const updatedEmployeeData = [
    {
      employeeCode: 'EMP-AUTO-01',
      firstName: 'Samantha',
      lastName: 'Jenkins-Promoted',
      email: 'samantha.jenkins@apex.test',
      phone: '+232 76 999 888',
      department: 'Engineering',
      position: 'Principal AI Architect',
      basicSalary: 12500,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256',
      status: 'active' as const,
    },
  ];

  const updateRes = await bulkImportEmployees(updatedEmployeeData, 'SYSTEM_TEST');
  console.log(`   Inserted: ${updateRes.inserted}, Updated: ${updateRes.updated}, Errors: ${updateRes.errors.length}`);
  if (updateRes.updated !== 1 || updateRes.inserted !== 0) {
    throw new Error(`Expected 0 inserted, 1 updated. Got inserted=${updateRes.inserted}, updated=${updateRes.updated}`);
  }

  // Verify updated in DB
  const [reloadedEmp] = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeCode, 'EMP-AUTO-01'));
  if (
    reloadedEmp.lastName !== 'Jenkins-Promoted' ||
    reloadedEmp.position !== 'Principal AI Architect' ||
    reloadedEmp.basicSalary !== '12500.00'
  ) {
    throw new Error('Employee changes were not updated in PostgreSQL 18');
  }
  console.log(`   Employee record updated automatically! Position is now "${reloadedEmp.position}", Salary: NLe ${reloadedEmp.basicSalary}`);

  // Step 4: Attendance Initial Upload (Insertion)
  console.log('\n4⃣ Testing bulk attendance upload (Auto-Insert)...');
  const testDate = '2026-09-08';
  const initialAttData = [
    {
      employeeCode: 'EMP-AUTO-01',
      attendanceDate: testDate,
      checkIn: '08:00:00',
      checkOut: undefined,
      notes: 'Initial morning check-in',
    },
  ];

  const attInsertRes = await bulkImportAttendance(initialAttData, 'SYSTEM_TEST');
  console.log(`   Inserted: ${attInsertRes.inserted}, Updated: ${attInsertRes.updated}, Errors: ${attInsertRes.errors.length}`);
  if (attInsertRes.inserted !== 1) {
    throw new Error(`Expected 1 inserted attendance record, got ${attInsertRes.inserted}`);
  }

  const [insertedAtt] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.employeeId, reloadedEmp.id), eq(attendance.attendanceDate, testDate)));
  if (!insertedAtt || insertedAtt.checkIn !== '08:00:00') {
    throw new Error('Attendance record was not inserted in PostgreSQL 18');
  }
  console.log(`   Attendance record created for date ${testDate} with check-in ${insertedAtt.checkIn}`);

  // Step 5: Attendance Re-Upload with Check-Out (Auto-Update / Upsert)
  console.log('\n5⃣ Testing bulk attendance re-upload with check-out (Auto-Update)...');
  const updatedAttData = [
    {
      employeeCode: 'EMP-AUTO-01',
      attendanceDate: testDate,
      checkIn: '08:00:00',
      checkOut: '17:00:00',
      notes: 'Full shift completed with check-out',
    },
  ];

  const attUpdateRes = await bulkImportAttendance(updatedAttData, 'SYSTEM_TEST');
  console.log(`   Inserted: ${attUpdateRes.inserted}, Updated: ${attUpdateRes.updated}, Errors: ${attUpdateRes.errors.length}`);
  if (attUpdateRes.updated !== 1 || attUpdateRes.inserted !== 0) {
    throw new Error(`Expected 0 inserted, 1 updated. Got inserted=${attUpdateRes.inserted}, updated=${attUpdateRes.updated}`);
  }

  const [reloadedAtt] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.employeeId, reloadedEmp.id), eq(attendance.attendanceDate, testDate)));
  if (!reloadedAtt.checkOut || reloadedAtt.workingHours !== '8.00') {
    throw new Error(`Attendance update failed. Working hours: ${reloadedAtt.workingHours}, CheckOut: ${reloadedAtt.checkOut}`);
  }
  console.log(`   Attendance updated automatically! Check-out: ${reloadedAtt.checkOut}, Working Hours: ${reloadedAtt.workingHours}, Status: ${reloadedAtt.status}`);

  // Step 6: Cleanup test data
  console.log('\n6⃣ Cleaning up verification test records...');
  await db.delete(attendance).where(eq(attendance.employeeId, reloadedEmp.id));
  await db.delete(qrCodes).where(eq(qrCodes.employeeId, reloadedEmp.id));
  await db.delete(employees).where(eq(employees.id, reloadedEmp.id));
  console.log('   Test records cleaned up successfully.');

  console.log('\n========================================================');
  console.log('ALL POSTGRESQL 18 & AUTOMATIC UPSERT TESTS PASSED 100%!');
  console.log('========================================================\n');
  process.exit(0);
}

runUpsertVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
