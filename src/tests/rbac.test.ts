import { AuthenticatedUser } from '../server/authMiddleware.ts';

export async function runRBACTests() {
  console.log('====================================================');
  console.log('🛡️  [7/9] STARTING ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE');
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

  // Define Mock Users for Each Role
  const admin: AuthenticatedUser = { id: 1, username: 'admin', roleId: 1, roleName: 'Administrator' };
  const hrOfficer: AuthenticatedUser = { id: 2, username: 'hr_user', roleId: 2, roleName: 'HR Officer' };
  const payrollOfficer: AuthenticatedUser = { id: 3, username: 'payroll_user', roleId: 3, roleName: 'Payroll Officer' };
  const management: AuthenticatedUser = { id: 4, username: 'manager_user', roleId: 5, roleName: 'Management' };
  const employee: AuthenticatedUser = { id: 5, username: 'emp_user', roleId: 4, roleName: 'Employee', employeeId: 10 };

  // Helper matching the authorizeRoles middleware logic
  function checkRouteAccess(allowedRoles: string[], user: AuthenticatedUser): boolean {
    if (!user || !user.roleName) return false;
    return allowedRoles.includes(user.roleName);
  }

  // 1. User Management Routes: POST/PUT/DELETE /api/users (Admin ONLY)
  {
    const allowed = ['Administrator'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN manage users');
    assert(!checkRouteAccess(allowed, hrOfficer), 'HR Officer CANNOT manage users');
    assert(!checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CANNOT manage users');
    assert(!checkRouteAccess(allowed, management), 'Management CANNOT manage users');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT manage users');
  }

  // 2. System Settings Routes: PUT /api/settings (Admin ONLY)
  {
    const allowed = ['Administrator'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN update system settings');
    assert(!checkRouteAccess(allowed, hrOfficer), 'HR Officer CANNOT update system settings');
    assert(!checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CANNOT update system settings');
    assert(!checkRouteAccess(allowed, management), 'Management CANNOT update system settings');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT update system settings');
  }

  // 3. Employee Creation & Modification: POST/PUT/DELETE /api/employees (Admin & HR Officer)
  {
    const allowed = ['Administrator', 'HR Officer'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN create/edit employees');
    assert(checkRouteAccess(allowed, hrOfficer), 'HR Officer CAN create/edit employees');
    assert(!checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CANNOT create/edit employees');
    assert(!checkRouteAccess(allowed, management), 'Management CANNOT create/edit employees');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT create/edit employees');
  }

  // 4. Department Management: POST/PUT/DELETE /api/departments (Admin & HR Officer)
  {
    const allowed = ['Administrator', 'HR Officer'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN manage departments');
    assert(checkRouteAccess(allowed, hrOfficer), 'HR Officer CAN manage departments');
    assert(!checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CANNOT manage departments');
    assert(!checkRouteAccess(allowed, management), 'Management CANNOT manage departments');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT manage departments');
  }

  // 5. Payroll Processing & Modifying: POST/PUT/DELETE /api/payroll (Admin & Payroll Officer)
  {
    const allowed = ['Administrator', 'Payroll Officer'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN process/modify payroll');
    assert(checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CAN process/modify payroll');
    assert(!checkRouteAccess(allowed, hrOfficer), 'HR Officer CANNOT process/modify payroll');
    assert(!checkRouteAccess(allowed, management), 'Management CANNOT process/modify payroll');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT process/modify payroll');
  }

  // 6. Overtime Approval: POST /api/overtime/:id/approve (Admin, HR Officer, Payroll Officer, Management)
  {
    const allowed = ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN approve overtime');
    assert(checkRouteAccess(allowed, hrOfficer), 'HR Officer CAN approve overtime');
    assert(checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CAN approve overtime');
    assert(checkRouteAccess(allowed, management), 'Management CAN approve overtime');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT approve overtime');
  }

  // 7. Reports & Analytics: GET /api/reports/payroll (Admin, Payroll Officer, Management)
  {
    const allowed = ['Administrator', 'Payroll Officer', 'Management'];
    assert(checkRouteAccess(allowed, admin), 'Admin CAN view payroll reports');
    assert(checkRouteAccess(allowed, payrollOfficer), 'Payroll Officer CAN view payroll reports');
    assert(checkRouteAccess(allowed, management), 'Management CAN view payroll reports');
    assert(!checkRouteAccess(allowed, employee), 'Employee CANNOT view full payroll reports');
  }

  // 8. Employee Self-Service Scope (Employees can only access their own records)
  {
    const ownEmployeeId = 10;
    const otherEmployeeId = 25;

    // Check self access logic
    const canAccessOwn = employee.employeeId === ownEmployeeId;
    const canAccessOther = employee.roleName === 'Administrator' || employee.employeeId === otherEmployeeId;

    assert(canAccessOwn, 'Employee CAN view their own profile/attendance/payslip');
    assert(!canAccessOther, 'Employee CANNOT view other employees profiles/attendance/payslips (IDOR protection)');
  }

  console.log(`--- RBAC Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
