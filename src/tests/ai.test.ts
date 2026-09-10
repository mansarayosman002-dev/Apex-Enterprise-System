import { AIPermissionValidator, filterAllowedTools, validateToolExecution } from '../ai/ai.permissions.ts';
import { aiTools } from '../ai/ai.tools.ts';
import { AIService } from '../ai/ai.service.ts';
import { AutomationEngine } from '../ai/ai.automation.ts';
import { UserContext } from '../ai/ai.types.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export async function runAITests(): Promise<{ passed: number; failed: number }> {
  console.log('\n====================================================');
  console.log("[10/10] STARTING AI, AUTOMATION & PERMISSIONS TEST SUITE");
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    const dbUsers = await db.select().from(users).limit(10);
    const firstUserId = dbUsers.length > 0 ? dbUsers[0].id : 1;

    // Contexts
    const adminUser: UserContext = {
      userId: firstUserId,
      username: 'admin',
      roleName: 'Administrator',
      employeeId: null,
    };

    const hrUser: UserContext = {
      userId: firstUserId,
      username: 'hrofficer',
      roleName: 'HR Officer',
      employeeId: null,
    };

    const mgmtUser: UserContext = {
      userId: firstUserId,
      username: 'director',
      roleName: 'Management',
      employeeId: null,
    };

    const empUser: UserContext = {
      userId: firstUserId,
      username: 'johndoe',
      roleName: 'Employee',
      employeeId: 2,
    };

    // 1. Tool Access Tests
    const deactTool = aiTools.find((t) => t.name === 'deactivate_employee')!;
    const payrollSummaryTool = aiTools.find((t) => t.name === 'get_payroll_summary')!;
    const myPayrollTool = aiTools.find((t) => t.name === 'get_my_payroll')!;

    assert(
      AIPermissionValidator.validateToolAccess(deactTool, adminUser).allowed === true,
      'Administrator CAN execute sensitive write action deactivate_employee');

    assert(
      AIPermissionValidator.validateToolAccess(deactTool, empUser).allowed === false,
      'Employee CANNOT execute sensitive write action deactivate_employee');

    assert(
      AIPermissionValidator.validateToolAccess(deactTool, mgmtUser).allowed === false,
      'Management CANNOT execute write action deactivate_employee (Strict Read-Only)');

    assert(
      AIPermissionValidator.validateToolAccess(payrollSummaryTool, empUser).allowed === false,
      'Employee CANNOT execute get_payroll_summary (Enterprise payroll confidentiality)');

    assert(
      AIPermissionValidator.validateToolAccess(myPayrollTool, empUser).allowed === true,
      'Employee CAN execute get_my_payroll for personal payslip');

    // 2. IDOR Protection Tests for Employee Role
    const idorViolation = AIPermissionValidator.sanitizeAndValidateToolParams(
      'get_employee_attendance',
      { employeeId: 99 },
      empUser
    );
    assert(
      idorViolation.valid === false && idorViolation.error?.includes('Access Denied'),
      'Employee attempting IDOR on foreign employeeId is strictly rejected');

    const validSelfQuery = AIPermissionValidator.sanitizeAndValidateToolParams(
      'get_employee_attendance',
      { employeeId: 2 },
      empUser
    );
    assert(
      validSelfQuery.valid === true,
      'Employee querying their own matching employeeId is permitted');

    const autoPinQuery = AIPermissionValidator.sanitizeAndValidateToolParams(
      'get_employee_attendance',
      {},
      empUser
    );
    assert(
      autoPinQuery.valid === true && autoPinQuery.sanitizedArgs.employeeId === 2,
      'Employee query without employeeId parameter is automatically pinned to user profile');

    // 3. Allowed Tools Filtering
    const adminTools = filterAllowedTools(aiTools, 'Administrator');
    const empTools = filterAllowedTools(aiTools, 'Employee');
    assert(adminTools.length >= 10, 'Administrator receives full tool suite');
    assert(empTools.length <= 4, 'Employee receives restricted personal self-service tools only');

    // 4. AIService Chat Handling
    const chatSelf = await AIService.handleChat({
      user: empUser,
      message: 'Who am I and what is my role?',
    });
    assert(
      chatSelf.message.includes('johndoe') || chatSelf.message.includes('Employee'),
      'AIService successfully answers user identity query with authenticated context');

    const chatLate = await AIService.handleChat({
      user: hrUser,
      message: 'Who is late today?',
    });
    assert(
      chatLate.message.length > 0 && !chatLate.message.includes('Access Denied'),
      'HR Officer can query late employees report through AI chat');

    const chatCompany = await AIService.handleChat({
      user: empUser,
      message: 'Tell me about Apex Enterprise and its services',
    });
    assert(
      chatCompany.message.includes('Apex Enterprise') && (chatCompany.message.includes('Services') || chatCompany.message.includes('services')),
      'AI Assistant successfully retrieves Apex Enterprise corporate and services data');

    // 5. Sensitive Write Action Confirmation Enforcement
    const chatWriteAction = await AIService.handleChat({
      user: adminUser,
      message: 'Deactivate employee 5',
    });
    assert(
      chatWriteAction.requiresConfirmation === true && !!chatWriteAction.pendingAction,
      'Sensitive action deactivate_employee triggers confirmation requirement before mutation');

    // 6. Automation Engine
    await AutomationEngine.seedAutomationsIfEmpty();
    const automations = await AutomationEngine.listAutomations();
    assert(automations.length === 10, 'All 10 preloaded automation templates exist in database');

    const allInactive = automations.every((a) => a.isActive === false);
    assert(allInactive, 'All preloaded automations are strictly inactive by default');

    if (automations.length > 0) {
      const firstId = automations[0].id;
      const toggled = await AutomationEngine.toggleAutomation(firstId, true);
      assert(toggled.isActive === true, 'Automation active state successfully toggled');
      // Revert
      await AutomationEngine.toggleAutomation(firstId, false);
    }

    // 7. Anomaly Scan
    const anomalies = await AutomationEngine.scanForAnomalies();
    assert(Array.isArray(anomalies), 'Anomaly detection engine executes and returns anomaly array');
  } catch (err: any) {
    console.error('AI Suite Exception:', err);
    failed++;
  }

  console.log(`--- AI & Automation Test Results: ${passed} Passed, ${failed} Failed ---`);
  return { passed, failed };
}
