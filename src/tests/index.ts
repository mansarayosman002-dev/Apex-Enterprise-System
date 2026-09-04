import { runAuthTests } from './auth.test.ts';
import { runEmployeeTests } from './employee.test.ts';
import { runDepartmentTests } from './department.test.ts';
import { runQRTests } from './qr.test.ts';
import { runAttendanceTests } from './attendance.test.ts';
import { runPayrollTests } from './payroll.test.ts';
import { runRBACTests } from './rbac.test.ts';
import { runSecurityTests } from './security.test.ts';
import { runUITests } from './ui.test.ts';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  SMART ATTENDANCE & PAYROLL MANAGEMENT SYSTEM - QA TEST SUITE    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const suiteResults: Array<{ name: string; passed: number; failed: number }> = [];

  try {
    const authRes = await runAuthTests();
    suiteResults.push({ name: 'Authentication Suite', ...authRes });

    const empRes = await runEmployeeTests();
    suiteResults.push({ name: 'Employee Management Suite', ...empRes });

    const deptRes = await runDepartmentTests();
    suiteResults.push({ name: 'Department Management Suite', ...deptRes });

    const qrRes = await runQRTests();
    suiteResults.push({ name: 'QR Code Engine Suite', ...qrRes });

    const attRes = await runAttendanceTests();
    suiteResults.push({ name: 'Attendance Calculation Suite', ...attRes });

    const payRes = await runPayrollTests();
    suiteResults.push({ name: 'Payroll Engine Suite', ...payRes });

    const rbacRes = await runRBACTests();
    suiteResults.push({ name: 'RBAC Authorization Suite', ...rbacRes });

    const secRes = await runSecurityTests();
    suiteResults.push({ name: 'Security & Vulnerability Suite', ...secRes });

    const uiRes = await runUITests();
    suiteResults.push({ name: 'UI/UX & State Suite', ...uiRes });

    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                     FINAL QA AUDIT SUMMARY                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    let totalPassed = 0;
    let totalFailed = 0;

    for (const suite of suiteResults) {
      const statusIcon = suite.failed === 0 ? '✅' : '❌';
      const paddedName = suite.name.padEnd(35, ' ');
      console.log(`║ ${statusIcon} ${paddedName} : ${suite.passed} Passed, ${suite.failed} Failed ║`);
      totalPassed += suite.passed;
      totalFailed += suite.failed;
    }

    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║ TOTAL TESTS EXECUTED: ${String(totalPassed + totalFailed).padEnd(4, ' ')} | PASSED: ${String(totalPassed).padEnd(4, ' ')} | FAILED: ${String(totalFailed).padEnd(4, ' ')} ║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    if (totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    console.error('Fatal error during test suite execution:', error);
    process.exit(1);
  }
}

main();
