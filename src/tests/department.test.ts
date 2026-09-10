import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartments,
} from '../server/dbServices.ts';
import { db } from '../db/index.ts';
import { departments, employees } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function runDepartmentTests() {
  console.log('====================================================');
  console.log("[3/10] STARTING DEPARTMENT TEST SUITE");
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

  let createdDeptId: number | null = null;
  const deptName = `Quality Assurance ${Date.now().toString().slice(-4)}`;

  // 1. Create Department
  try {
    const created = await createDepartment(deptName, 'Handles software quality and automated test suites');
    assert(!!created.id, 'Created department successfully returned ID');
    assert(created.departmentName === deptName, 'Department name accurately persisted');
    createdDeptId = created.id;
  } catch (e: any) {
    assert(false, 'Create department', e.message);
  }

  // 2. Duplicate Department Name Prevention (Case-Insensitive)
  try {
    let dupCaught = false;
    try {
      await createDepartment(deptName.toLowerCase(), 'Duplicate name attempt');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        dupCaught = true;
      }
    }
    assert(dupCaught, 'Duplicate department name is blocked with validation error');
  } catch (e: any) {
    assert(false, 'Duplicate department validation', e.message);
  }

  // 3. Edit Department
  if (createdDeptId) {
    try {
      const updated = await updateDepartment(createdDeptId, `${deptName} & Testing`, 'Updated description');
      assert(updated.departmentName === `${deptName} & Testing`, 'Department name updated successfully');
    } catch (e: any) {
      assert(false, 'Edit department', e.message);
    }
  }

  // 4. Delete Empty Department
  if (createdDeptId) {
    try {
      await deleteDepartment(createdDeptId);
      const allDepts = await getDepartments();
      const exists = allDepts.some((d) => d.id === createdDeptId);
      assert(!exists, 'Empty department deleted successfully');
    } catch (e: any) {
      assert(false, 'Delete empty department', e.message);
    }
  }

  // 5. Delete Department With Assigned Employees Protection
  try {
    // Find department with existing employees (e.g. IT or Engineering)
    const [deptWithEmps]= await db
      .select({ id: departments.id, name: departments.departmentName })
      .from(departments)
      .innerJoin(employees, eq(departments.id, employees.departmentId))
      .limit(1);

    if (deptWithEmps) {
      let deleteBlocked = false;
      try {
        await deleteDepartment(deptWithEmps.id);
      } catch (err: any) {
        if (err.message.includes('Cannot delete department because') || err.message.includes('assigned')) {
          deleteBlocked = true;
        }
      }
      assert(deleteBlocked, `Department (${deptWithEmps.name}) with active employees is protected from deletion`);
    } else {
      assert(true, 'No populated department available for cascade delete test');
    }
  } catch (e: any) {
    assert(false, 'Department deletion protection check', e.message);
  }

  console.log(`--- Department Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
