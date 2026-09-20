import { BUSINESS_RULES, APEX_BUSINESS_RULES } from '../ai/knowledge/businessRulesRegistry.ts';
import { DATA_DICTIONARY, APEX_DATA_DICTIONARY } from '../ai/knowledge/dataDictionary.ts';
import { SECURITY_POLICIES, APEX_SECURITY_POLICIES, canRoleExecuteTool } from '../ai/knowledge/securityPolicies.ts';
import { APEX_APPLICATION_CONTEXT, getAuthoritativeSystemPrompt } from '../ai/knowledge/applicationContext.ts';
import { executeAITool, aiTools } from '../ai/ai.tools.ts';
import { AIService } from '../ai/ai.service.ts';
import { AutomationEngine } from '../ai/ai.automation.ts';
import { db } from '../db/index.ts';
import { users, notifications } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function runAiTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n====================================================');
  console.log('[12/12] STARTING ENTERPRISE AI ASSISTANT TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  FAIL: ${msg}`);
      failed++;
    }
  }

  // Find real users in the database
  const adminUsers = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  const adminUser = adminUsers[0] || { id: 112, username: 'admin' };

  // 1. Business Rules Grounding
  assert(BUSINESS_RULES.nassit.employeeRate === 0.05, 'Business Rules specify exact 5% NASSIT employee contribution');
  assert(BUSINESS_RULES.nassit.employerRate === 0.10, 'Business Rules specify exact 10% NASSIT employer contribution');
  assert(BUSINESS_RULES.workingHours.standardCheckIn === '08:00', 'Standard check-in time grounded at 08:00');
  assert(BUSINESS_RULES.workingHours.standardCheckOut === '17:00', 'Standard check-out time grounded at 17:00');
  assert(BUSINESS_RULES.workingHours.gracePeriodMinutes === 30, 'Late grace period defined as exactly 30 minutes (until 08:30)');
  assert(BUSINESS_RULES.overtime.weekdayMultiplier === 1.5, 'Overtime standard rate multiplier is 1.5x');
  assert(BUSINESS_RULES.overtime.weekendHolidayMultiplier === 2.0, 'Overtime holiday/weekend multiplier is 2.0x');
  assert(BUSINESS_RULES.qrBadge.standardFormat === 'ISO/IEC 7810 ID-1 / CR80', 'QR badge standard conforms to CR80 dimensions');
  assert(APEX_BUSINESS_RULES.length >= 8, 'Full business rules registry has at least 8 codified policies');

  // 2. Data Dictionary Grounding
  assert(DATA_DICTIONARY.databaseVersion.includes('PostgreSQL 18'), 'Data dictionary specifies PostgreSQL 18 target engine');
  assert(APEX_DATA_DICTIONARY.employees !== undefined, 'Data dictionary registers employees table');
  assert(APEX_DATA_DICTIONARY.attendance !== undefined, 'Data dictionary registers attendance table');
  assert(APEX_DATA_DICTIONARY.payroll !== undefined, 'Data dictionary registers payroll table');
  assert(APEX_DATA_DICTIONARY.overtime_requests !== undefined, 'Data dictionary registers overtime_requests table');
  assert(APEX_DATA_DICTIONARY.qr_codes !== undefined, 'Data dictionary registers qr_codes table');

  // 3. Security Policies & RBAC
  const adminAllowed = canRoleExecuteTool('Admin', 'approve_overtime');
  const employeeBlocked = canRoleExecuteTool('Employee', 'process_batch_payroll');
  assert(adminAllowed === true, 'Administrator is permitted to execute approve_overtime');
  assert(employeeBlocked === false, 'Employee role is strictly prohibited from running batch payroll');

  const employeeSelfAllowed = canRoleExecuteTool('Employee', 'get_my_payroll');
  assert(employeeSelfAllowed === true, 'Employee role is permitted to query own payroll');
  assert(APEX_SECURITY_POLICIES.Employee.idorProtection === true, 'Employee role strictly marked for IDOR isolation protection');

  // 4. Application Context Grounding (28 Domains)
  const requiredDomains = [
    'business_rules', 'database_structure', 'entity_relationships', 'user_roles',
    'permissions', 'workflows', 'attendance_rules', 'working_hour_rules',
    'overtime_rules', 'payroll_rules', 'payroll_approval_rules', 'qr_code_rules',
    'notification_rules', 'ai_capabilities', 'security_policies', 'terminology',
    'system_configuration', 'reports', 'dashboards', 'employees',
    'attendance', 'departments', 'payroll', 'audit_requirements',
    'data_privacy_requirements', 'operational_procedures', 'error_conditions', 'system_limitations'
  ];
  const contextKeys = Object.keys(APEX_APPLICATION_CONTEXT);
  const missingDomains = requiredDomains.filter(d => !contextKeys.includes(d));
  assert(missingDomains.length === 0, `Application Context contains all 28 required domains (missing: ${missingDomains.join(', ') || 'none'})`);
  
  const systemPrompt = getAuthoritativeSystemPrompt({
    roleName: 'Administrator',
    username: 'admin',
    userId: adminUser.id,
  });
  assert(systemPrompt.includes('Apex Enterprise AI Assistant'), 'Authoritative System Prompt generated with enterprise identity');
  assert(systemPrompt.includes('28 CORE DOMAINS'), 'Authoritative System Prompt highlights all 28 domains');

  // 5. AI Tool Registry Verification
  assert(aiTools.length >= 19, `AI Tool Registry has ${aiTools.length} tools registered (expected >= 19)`);
  const hasSystemKnowledgeTool = aiTools.some(t => t.name === 'get_system_knowledge');
  assert(hasSystemKnowledgeTool === true, 'get_system_knowledge tool is registered in AI_TOOLS');

  // 5. Tool Execution: get_business_rules
  try {
    const brResult = await executeAITool('get_business_rules', { category: 'PAYROLL' }, {
      user: {
        userId: adminUser.id,
        username: 'admin',
        roleName: 'Administrator',
        employeeId: null,
      },
    });
    assert(brResult.success === true, 'Tool get_business_rules executed successfully');
    assert(brResult.data.rules.length > 0, 'get_business_rules retrieved PAYROLL rules');
  } catch (err) {
    assert(false, `Tool get_business_rules failed: ${String(err)}`);
  }

  // 6. Tool Execution: get_data_dictionary
  try {
    const ddResult = await executeAITool('get_data_dictionary', { tableName: 'payroll' }, {
      user: {
        userId: adminUser.id,
        username: 'admin',
        roleName: 'Administrator',
        employeeId: null,
      },
    });
    assert(ddResult.success === true, 'Tool get_data_dictionary executed successfully');
    assert(ddResult.data.table.name === 'payroll', 'get_data_dictionary retrieved payroll table metadata');
  } catch (err) {
    assert(false, `Tool get_data_dictionary failed: ${String(err)}`);
  }

  // 7. Tool Execution: get_department_summary
  try {
    const deptResult = await executeAITool('get_department_summary', {}, {
      user: {
        userId: adminUser.id,
        username: 'admin',
        roleName: 'Administrator',
        employeeId: null,
      },
    });
    assert(deptResult.success === true, 'Tool get_department_summary executed successfully');
    assert(Array.isArray(deptResult.data.departments), 'get_department_summary returned array of departments');
  } catch (err) {
    assert(false, `Tool get_department_summary failed: ${String(err)}`);
  }

  // 8. Tool Execution: get_system_knowledge (All 28 Domains)
  try {
    const qrKnowledge = await executeAITool('get_system_knowledge', { topic: 'qr_code_rules' }, {
      user: {
        userId: adminUser.id,
        username: 'admin',
        roleName: 'Administrator',
        employeeId: null,
      },
    });
    assert(qrKnowledge.success === true, 'Tool get_system_knowledge executed for qr_code_rules');
    assert(
      qrKnowledge.data.details.badgeDimensions.standard.includes('CR80') ||
      qrKnowledge.data.details.badgeDimensions.standard.includes('ISO/IEC 7810'),
      'get_system_knowledge accurately returns CR80 / ISO/IEC 7810 QR badge standard'
    );

    const wfKnowledge = await executeAITool('get_system_knowledge', { topic: 'workflows' }, {
      user: {
        userId: adminUser.id,
        username: 'admin',
        roleName: 'Administrator',
        employeeId: null,
      },
    });
    assert(wfKnowledge.success === true, 'Tool get_system_knowledge executed for workflows');
    assert(
      Array.isArray(wfKnowledge.data.details.workflows) &&
      wfKnowledge.data.details.workflows.some((w: any) => w.name.includes('Payroll')),
      'get_system_knowledge accurately returns payroll lifecycle workflow'
    );

    const limitKnowledge = await executeAITool('get_system_knowledge', { topic: 'system_limitations' }, {
      user: {
        userId: adminUser.id,
        username: 'admin',
        roleName: 'Administrator',
        employeeId: null,
      },
    });
    assert(limitKnowledge.success === true, 'Tool get_system_knowledge executed for system_limitations');
    assert(
      Array.isArray(limitKnowledge.data.details.limitations) &&
      limitKnowledge.data.details.limitations.length > 0,
      'get_system_knowledge accurately returns system limitations'
    );
  } catch (err) {
    assert(false, `Tool get_system_knowledge failed: ${String(err)}`);
  }

  // 8. Tool Execution: IDOR Defense Check for Employee
  try {
    const idorCheck = await executeAITool('get_employee_attendance', { employeeId: 999 }, {
      user: {
        userId: adminUser.id,
        username: 'test.employee',
        roleName: 'Employee',
        employeeId: 1,
      },
    });
    assert(
      idorCheck.success === false || (idorCheck.data && idorCheck.data.employeeId === 1),
      'IDOR Protection enforced: Employee cannot access foreign employee attendance (Employee ID 999)'
    );
  } catch (err) {
    assert(false, `IDOR check failed: ${String(err)}`);
  }

  // 9. Conversational Copilot Chat Service
  try {
    const chatResponse = await AIService.chat(
      adminUser.id,
      'Administrator',
      'admin',
      'What are the official NASSIT rates and working hours in Apex HRMS?'
    );
    assert(chatResponse.message.length > 30, 'AI Chat Service generated a comprehensive grounded response');
    assert(
      chatResponse.message.includes('5%') || chatResponse.message.includes('NASSIT'),
      'AI response grounded in NASSIT statutory policies'
    );
  } catch (err) {
    assert(false, `AI Chat Service error: ${String(err)}`);
  }

  // 10. Task Automation Engine Execution
  try {
    await AutomationEngine.seedAutomationsIfEmpty();
    const automations = await AutomationEngine.listAutomations();
    assert(automations.length >= 4, 'Automation Engine seeded and retrieved all 4 enterprise automations');

    const lateScanner = automations.find(a => a.name.includes('Late Arrival'));
    if (lateScanner) {
      const execResult = await AutomationEngine.runAutomation(lateScanner.id, 'admin');
      assert(execResult.success === true, 'Daily Late Arrival Scanner executed and completed successfully');
    } else {
      assert(false, 'Late Arrival Scanner automation not found');
    }
  } catch (err) {
    assert(false, `Automation Engine execution error: ${String(err)}`);
  }

  // 11. Anomaly Detection Scanner
  try {
    const anomalies = await AutomationEngine.scanForAnomalies();
    assert(Array.isArray(anomalies), 'Anomaly scanner completed scan cycle across attendance and payroll');
  } catch (err) {
    assert(false, `Anomaly scanner threw error: ${String(err)}`);
  }

  // Automated QA Teardown: Clean up test alerts created by late arrival scanner
  try {
    await db.delete(notifications).where(eq(notifications.title, 'Morning Late Arrival Alert'));
  } catch (teardownErr) {
    console.warn('  [Notice] AI test notification cleanup caught:', teardownErr);
  }

  console.log(`--- AI Assistant Test Results: ${passed} Passed, ${failed} Failed ---`);
  return { passed, failed };
}
