import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
} from '../server/dbServices.ts';
import { db } from '../db/index.ts';
import { employees, qrCodes, users, departments } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function runEmployeeTests() {
  console.log('====================================================');
  console.log("[2/10] STARTING EMPLOYEE TEST SUITE");
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

  // Get a valid department ID for tests
  const [firstDept]= await db.select().from(departments).limit(1);
  const deptId = firstDept?.id || 1;

  let createdEmpId: number | null = null;
  const uniqueCode = `QA${Date.now().toString().slice(-4)}`;
  const uniqueEmail = `qa_emp_${Date.now()}@apexcorp.com`;

  // 1. Create Employee with Valid Data
  try {
    const result = await createEmployee({
      employeeCode: uniqueCode,
      firstName: 'Samantha',
      lastName: 'Vance',
      email: uniqueEmail,
      phone: '+1 (555) 890-1234',
      departmentId: deptId,
      position: 'QA Automation Engineer',
      basicSalary: '4500.00',
    });

    assert(!!result.employee.id, 'Successfully created employee with generated ID');
    assert(result.employee.employeeCode === uniqueCode, 'Employee code matches expected unique code');
    assert(result.employee.status === 'active', 'Initial employee status is active');
    assert(!!result.qrCode?.qrValue, 'QR Code automatically created during employee creation');
    createdEmpId = result.employee.id;
  } catch (e: any) {
    assert(false, 'Create employee with valid data', e.message);
  }

  // 2. Duplicate Employee Code Validation
  try {
    let duplicateCodeCaught = false;
    try {
      await createEmployee({
        employeeCode: uniqueCode, // Duplicate code
        firstName: 'Duplicate',
        lastName: 'Tester',
        email: `dup_code_${Date.now()}@apexcorp.com`,
        phone: '+1 (555) 000-1111',
        departmentId: deptId,
        position: 'Tester',
        basicSalary: '4000.00',
      });
    } catch (err: any) {
      if (err.message.includes('already assigned')) {
        duplicateCodeCaught = true;
      }
    }
    assert(duplicateCodeCaught, 'Duplicate employee code is rejected with validation error');
  } catch (e: any) {
    assert(false, 'Duplicate employee code validation', e.message);
  }

  // 3. Duplicate Email Validation
  try {
    let duplicateEmailCaught = false;
    try {
      await createEmployee({
        employeeCode: `QA${Date.now().toString().slice(-4)}B`,
        firstName: 'Duplicate',
        lastName: 'Email',
        email: uniqueEmail, // Duplicate email
        phone: '+1 (555) 000-2222',
        departmentId: deptId,
        position: 'Tester',
        basicSalary: '4000.00',
      });
    } catch (err: any) {
      if (err.message.includes('already registered')) {
        duplicateEmailCaught = true;
      }
    }
    assert(duplicateEmailCaught, 'Duplicate email address is rejected with validation error');
  } catch (e: any) {
    assert(false, 'Duplicate email validation', e.message);
  }

  // 4. Invalid Basic Salary Validation (negative & non-numeric)
  try {
    let negativeSalaryCaught = false;
    try {
      await createEmployee({
        employeeCode: `QA${Date.now().toString().slice(-4)}C`,
        firstName: 'Negative',
        lastName: 'Salary',
        email: `neg_sal_${Date.now()}@apexcorp.com`,
        phone: '+1 (555) 000-3333',
        departmentId: deptId,
        position: 'Tester',
        basicSalary: '-2500.00',
      });
    } catch (err: any) {
      if (err.message.includes('positive number')) {
        negativeSalaryCaught = true;
      }
    }
    assert(negativeSalaryCaught, 'Negative basic salary is rejected with validation error');
  } catch (e: any) {
    assert(false, 'Negative basic salary check', e.message);
  }

  // 5. Invalid Department ID Validation
  try {
    let invalidDeptCaught = false;
    try {
      await createEmployee({
        employeeCode: `QA${Date.now().toString().slice(-4)}D`,
        firstName: 'Invalid',
        lastName: 'Dept',
        email: `inv_dept_${Date.now()}@apexcorp.com`,
        phone: '+1 (555) 000-4444',
        departmentId: 999999, // Non-existent department ID
        position: 'Tester',
        basicSalary: '4000.00',
      });
    } catch (err: any) {
      if (err.message.includes('department is invalid')) {
        invalidDeptCaught = true;
      }
    }
    assert(invalidDeptCaught, 'Non-existent department ID is rejected with validation error');
  } catch (e: any) {
    assert(false, 'Invalid department ID check', e.message);
  }

  // 6. Edit Employee
  if (createdEmpId) {
    try {
      const updated = await updateEmployee(createdEmpId, {
        position: 'Lead QA Engineer',
        basicSalary: '5200.00',
      });
      assert(updated.position === 'Lead QA Engineer', 'Employee position successfully updated');
      assert(parseFloat(updated.basicSalary.toString()) === 5200, 'Employee basic salary updated to 5200.00');
    } catch (e: any) {
      assert(false, 'Edit employee', e.message);
    }
  }

  // 7. Deactivate Employee (Soft Delete & Cascade Security)
  if (createdEmpId) {
    try {
      const deactivated = await deleteEmployee(createdEmpId);
      assert(deactivated.status === 'inactive', 'Employee status changed to inactive');

      const [qr]= await db.select().from(qrCodes).where(eq(qrCodes.employeeId, createdEmpId));
      assert(qr?.status === 'revoked', 'Employee QR code status changed to revoked');
    } catch (e: any) {
      assert(false, 'Deactivate employee check', e.message);
    }
  }

  // Cleanup test employee
  if (createdEmpId) {
    try {
      await db.delete(qrCodes).where(eq(qrCodes.employeeId, createdEmpId));
      await db.delete(users).where(eq(users.employeeId, createdEmpId));
      await db.delete(employees).where(eq(employees.id, createdEmpId));
    } catch (e) {}
  }

  console.log(`--- Employee Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
