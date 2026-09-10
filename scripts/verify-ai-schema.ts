import { db } from '../src/db/index.ts';
import {
  users,
  employees,
  aiConversations,
  aiMessages,
  aiActivityLogs,
  notifications,
  notificationPreferences,
  aiAutomations,
  aiAutomationExecutions,
  aiAnomalies,
} from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

async function verifyAiSchema() {
  console.log('========================================================');
  console.log('VERIFYING PHASE 1: AI & NOTIFICATION SCHEMA TABLES');
  console.log('========================================================\n');

  // 1. Verify existence of all 8 tables in PostgreSQL 18
  const tableCheck = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'ai_conversations',
        'ai_messages',
        'ai_activity_logs',
        'notifications',
        'notification_preferences',
        'ai_automations',
        'ai_automation_executions',
        'ai_anomalies'
      )
    ORDER BY table_name;
  `);

  const foundTables = (tableCheck.rows as any[]).map((r) => r.table_name);
  console.log(`Found ${foundTables.length}/8 AI tables in PostgreSQL 18:`);
  foundTables.forEach((t) => console.log(`  ${t}`));

  if (foundTables.length !== 8) {
    throw new Error(`Expected 8 tables, found ${foundTables.length}`);
  }

  // 2. Fetch a test user and employee for foreign key verification
  const [testUser] = await db.select().from(users).limit(1);
  const [testEmp] = await db.select().from(employees).limit(1);

  if (!testUser || !testEmp) {
    throw new Error('Database requires at least 1 existing user and employee for relational verification.');
  }

  console.log(`\nUsing User ID ${testUser.id} and Employee ID ${testEmp.id} for relational validation.\n`);

  // 3. Test aiConversations & aiMessages
  console.log('Testing aiConversations & aiMessages...');
  const [createdConv] = await db
    .insert(aiConversations)
    .values({
      userId: testUser.id,
      title: 'Verification Test Conversation',
      roleName: 'Administrator',
    })
    .returning();

  const [createdMsg] = await db
    .insert(aiMessages)
    .values({
      conversationId: createdConv.id,
      role: 'user',
      content: 'Summarise today attendance',
      toolCalls: JSON.stringify([{ id: 'call_1', name: 'get_attendance_summary', args: {} }]),
    })
    .returning();

  console.log(`   Created conversation ID ${createdConv.id} and message ID ${createdMsg.id}`);

  // 4. Test aiActivityLogs
  console.log('Testing aiActivityLogs...');
  const [createdLog] = await db
    .insert(aiActivityLogs)
    .values({
      userId: testUser.id,
      username: testUser.username,
      role: 'Administrator',
      operation: 'chat_query',
      toolInvoked: 'get_attendance_summary',
      targetEntity: 'attendance',
      status: 'success',
      details: 'Audit test record verification',
    })
    .returning();
  console.log(`   Created activity log ID ${createdLog.id}`);

  // 5. Test notifications & notificationPreferences
  console.log('Testing notifications & notificationPreferences...');
  const [createdNotif] = await db
    .insert(notifications)
    .values({
      userId: testUser.id,
      employeeId: testEmp.id,
      title: 'Test Notification',
      message: 'This is an automated system verification test notification.',
      category: 'System',
      priority: 'high',
      channel: 'in_app',
      status: 'pending',
    })
    .returning();

  // Upsert preference for employee
  await db
    .insert(notificationPreferences)
    .values({
      employeeId: testEmp.id,
      attendanceAlerts: true,
      payrollAlerts: true,
      hrAnnouncements: true,
      preferredChannel: 'in_app',
    })
    .onConflictDoUpdate({
      target: notificationPreferences.employeeId,
      set: { updatedAt: new Date() },
    });
  console.log(`   Created notification ID ${createdNotif.id} and verified notificationPreferences`);

  // 6. Test aiAutomations & aiAutomationExecutions
  console.log('Testing aiAutomations & aiAutomationExecutions...');
  const [createdAuto] = await db
    .insert(aiAutomations)
    .values({
      name: 'Verification Morning Attendance Reminder',
      description: 'Test automation rule',
      triggerType: 'scheduled_time',
      triggerConfig: JSON.stringify({ time: '08:30:00' }),
      conditionConfig: JSON.stringify({ check_in_missing: true }),
      actionConfig: JSON.stringify({ template: 'attendance_reminder' }),
      channel: 'in_app',
      isActive: false, // safe default
      createdBy: testUser.id,
    })
    .returning();

  const [createdExec] = await db
    .insert(aiAutomationExecutions)
    .values({
      automationId: createdAuto.id,
      triggeredBy: 'manual_test',
      status: 'success',
      summary: 'Triggered verification test execution successfully',
      affectedCount: 1,
    })
    .returning();
  console.log(`   Created automation ID ${createdAuto.id} and execution log ID ${createdExec.id}`);

  // 7. Test aiAnomalies
  console.log('Testing aiAnomalies...');
  const [createdAnomaly] = await db
    .insert(aiAnomalies)
    .values({
      anomalyType: 'excessive_overtime',
      severity: 'HIGH',
      entityType: 'attendance',
      entityId: '101',
      description: 'Employee logged 7.5 hours of overtime in a single shift',
      details: JSON.stringify({ threshold: 4.0, detected: 7.5 }),
      status: 'open',
    })
    .returning();
  console.log(`   Created anomaly record ID ${createdAnomaly.id}`);

  // 8. Clean up test records
  console.log('\nCleaning up test records...');
  await db.delete(aiAnomalies).where(eq(aiAnomalies.id, createdAnomaly.id));
  await db.delete(aiAutomationExecutions).where(eq(aiAutomationExecutions.id, createdExec.id));
  await db.delete(aiAutomations).where(eq(aiAutomations.id, createdAuto.id));
  await db.delete(notifications).where(eq(notifications.id, createdNotif.id));
  await db.delete(aiActivityLogs).where(eq(aiActivityLogs.id, createdLog.id));
  await db.delete(aiMessages).where(eq(aiMessages.id, createdMsg.id));
  await db.delete(aiConversations).where(eq(aiConversations.id, createdConv.id));
  console.log('   All test records cleaned up cleanly.');

  console.log('\n========================================================');
  console.log('PHASE 1 VERIFICATION COMPLETED: ALL 8 TABLES 100% OK!');
  console.log('========================================================\n');
  process.exit(0);
}

verifyAiSchema().catch((err) => {
  console.error('Phase 1 verification failed:', err);
  process.exit(1);
});
