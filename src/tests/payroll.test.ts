import {
  calculateHourlyRate,
  calculateOvertimePay,
  calculateGrossSalary,
  calculateNetSalary,
  calculateEmployeePayroll,
  calculateBatchPayroll,
  roundCurrency,
  isValidPayrollPeriod,
} from '../server/payrollEngine.ts';
import {
  previewPayrollForPeriod,
  generatePayrollForPeriod,
  updatePayrollRecord,
  approvePayrollRecord,
  deletePayrollRecord,
} from '../server/dbServices.ts';

export async function runPayrollTests() {
  console.log('====================================================');
  console.log('💰 [6/9] STARTING PAYROLL ENGINE TEST SUITE');
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

  // 1. Hourly Rate Calculation
  {
    // 3520 / (22 * 8) = 3520 / 176 = 20.00
    const hourly = calculateHourlyRate(3520, 8, 22);
    assert(hourly === 20, 'Hourly rate for $3520 / (22*8) is 20.00', `Got ${hourly}`);
  }

  // 2. Overtime Pay Calculation
  {
    // 10 hours * 20.00/hr * 1.5 multiplier = 300.00
    const otPay = calculateOvertimePay(10, 20, 1.5);
    assert(otPay === 300, 'OT Pay for 10h @ $20/hr (1.5x) is 300.00', `Got ${otPay}`);
  }

  // 3. Gross Salary (Basic + OT + Allowances)
  {
    // 3520 + 300 + 150 = 3970.00
    const gross = calculateGrossSalary(3520, 300, 150);
    assert(gross === 3970, 'Gross salary is 3970.00', `Got ${gross}`);
  }

  // 4. Net Salary (Gross - Deductions)
  {
    // 3970 - 70 = 3900.00
    const net = calculateNetSalary(3970, 70);
    assert(net === 3900, 'Net salary is 3900.00', `Got ${net}`);
  }

  // 5. Full Employee Calculation
  {
    const item = calculateEmployeePayroll(
      {
        employeeId: 1,
        employeeCode: 'EMP001',
        employeeName: 'Sarah Jenkins',
        departmentName: 'Engineering',
        position: 'Senior Engineer',
        basicSalary: 4400,
        overtimeHours: 8,
        workingHours: 176,
        allowances: 200,
        deductions: 100,
      },
      {
        standardWorkingHours: 8,
        standardWorkingDaysPerMonth: 22,
        overtimeRateMultiplier: 1.5,
      },
      'Draft',
      '2026-05'
    );

    // Basic = 4400, Hourly = 4400/176 = 25, OT = 8 * 25 * 1.5 = 300, Gross = 4400 + 300 + 200 = 4900, Net = 4900 - 100 = 4800
    assert(item.hourlyRate === 25, 'Employee hourly rate is $25.00', `Got ${item.hourlyRate}`);
    assert(item.overtimeAmount === 300, 'Employee overtime amount is $300.00', `Got ${item.overtimeAmount}`);
    assert(item.grossSalary === 4900, 'Employee gross salary is $4900.00', `Got ${item.grossSalary}`);
    assert(item.netSalary === 4800, 'Employee net salary is $4800.00', `Got ${item.netSalary}`);
    assert(item.payrollPeriod === '2026-05', 'Employee payroll period matches 2026-05');
  }

  // 6. Batch Calculation & Summaries
  {
    const batch = calculateBatchPayroll(
      [
        {
          employeeId: 1,
          employeeCode: 'EMP001',
          employeeName: 'Sarah Jenkins',
          departmentName: 'Engineering',
          position: 'Engineer',
          basicSalary: 4400,
          overtimeHours: 0,
          allowances: 100,
          deductions: 50,
        },
        {
          employeeId: 2,
          employeeCode: 'EMP002',
          employeeName: 'David Chen',
          departmentName: 'Product',
          position: 'Designer',
          basicSalary: 3520,
          overtimeHours: 10,
          allowances: 150,
          deductions: 70,
        },
      ],
      '2026-05'
    );

    assert(batch.items.length === 2, 'Batch payroll contains 2 items');
    assert(batch.totalEmployees === 2, 'Total employees count is 2');
    assert(batch.totalBasicSalary === 7920, 'Total basic salary is $7920.00', `Got ${batch.totalBasicSalary}`);
    assert(batch.totalOvertimeAmount === 300, 'Total overtime amount is $300.00', `Got ${batch.totalOvertimeAmount}`);
    assert(batch.totalAllowances === 250, 'Total allowances is $250.00', `Got ${batch.totalAllowances}`);
    assert(batch.totalDeductions === 120, 'Total deductions is $120.00', `Got ${batch.totalDeductions}`);
    assert(batch.totalGrossSalary === 8470, 'Total gross salary is $8470.00', `Got ${batch.totalGrossSalary}`);
    assert(batch.totalNetSalary === 8350, 'Total net salary is $8350.00', `Got ${batch.totalNetSalary}`);
  }

  // 7. Payroll Period Validation & Edge Cases
  {
    assert(isValidPayrollPeriod('2026-05'), '2026-05 is valid payroll period');
    assert(isValidPayrollPeriod('2026-12'), '2026-12 is valid payroll period');
    assert(!isValidPayrollPeriod('2026-13'), '2026-13 is invalid month');
    assert(!isValidPayrollPeriod('2026-00'), '2026-00 is invalid month');
    assert(!isValidPayrollPeriod('05-2026'), '05-2026 is invalid format');
    assert(!isValidPayrollPeriod('invalid'), 'invalid string is rejected');
  }

  // 8. Live Database Payroll Service Operations
  try {
    const testPeriod = '2026-11';
    const preview = await previewPayrollForPeriod(testPeriod, {
      defaultAllowances: 150,
      defaultDeductions: 50,
    });
    assert(preview.items.length > 0, 'previewPayrollForPeriod returns employee items');
    assert(preview.totalNetSalary > 0, 'previewPayrollForPeriod calculates total net salary');

    // Generate Draft Payroll
    const generated = await generatePayrollForPeriod(testPeriod, { status: 'Draft' }, 'QA_ENGINEER');
    assert(generated.length > 0, 'generatePayrollForPeriod generated database records');

    const firstRecord = generated[0];
    if (firstRecord?.id) {
      // Update record
      const updated = await updatePayrollRecord(firstRecord.id, {
        allowances: 300.0,
        deductions: 60.0,
      });
      assert(parseFloat(updated.allowances.toString()) === 300, 'updatePayrollRecord updated allowances');

      // Approve record
      const approved = await approvePayrollRecord(firstRecord.id, 'QA_ENGINEER');
      assert(approved.status === 'Approved', 'approvePayrollRecord changed status to Approved');

      // Cleanup
      await deletePayrollRecord(firstRecord.id, 'QA_ENGINEER');
      assert(true, 'deletePayrollRecord successfully cleaned up record');
    }
  } catch (e: any) {
    assert(false, 'Live Payroll DB service operations', e.message);
  }

  console.log(`--- Payroll Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
