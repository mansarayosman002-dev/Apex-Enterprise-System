import { pool } from '../src/db/index.ts';

async function migrateAITables() {
  console.log('=== Migrating AI Assistant PostgreSQL Tables ===');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Chat',
        role_name TEXT NOT NULL DEFAULT 'Employee',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at);

      CREATE TABLE IF NOT EXISTS ai_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tool_calls TEXT,
        tool_call_id TEXT,
        tool_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at);

      CREATE TABLE IF NOT EXISTS ai_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username TEXT,
        role TEXT,
        operation TEXT NOT NULL,
        tool_invoked TEXT,
        target_entity TEXT,
        entity_id TEXT,
        status TEXT NOT NULL DEFAULT 'success',
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_activity_user ON ai_activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_activity_op ON ai_activity_logs(operation);
      CREATE INDEX IF NOT EXISTS idx_ai_activity_created ON ai_activity_logs(created_at);

      CREATE TABLE IF NOT EXISTS ai_automations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT,
        condition_config TEXT,
        action_config TEXT,
        channel TEXT NOT NULL DEFAULT 'in_app',
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_automations_active ON ai_automations(is_active);
      CREATE INDEX IF NOT EXISTS idx_ai_automations_trigger ON ai_automations(trigger_type);

      CREATE TABLE IF NOT EXISTS ai_automation_executions (
        id SERIAL PRIMARY KEY,
        automation_id INTEGER NOT NULL REFERENCES ai_automations(id) ON DELETE CASCADE,
        triggered_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'success',
        summary TEXT,
        affected_count INTEGER DEFAULT 0,
        error_details TEXT,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_exec_automation ON ai_automation_executions(automation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_exec_time ON ai_automation_executions(executed_at);

      CREATE TABLE IF NOT EXISTS ai_anomalies (
        id SERIAL PRIMARY KEY,
        anomaly_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        description TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_anomalies_status ON ai_anomalies(status);
      CREATE INDEX IF NOT EXISTS idx_ai_anomalies_severity ON ai_anomalies(severity);
      CREATE INDEX IF NOT EXISTS idx_ai_anomalies_detected ON ai_anomalies(detected_at);
    `);

    // Seed default Enterprise Automations if table is empty
    const checkAutomations = await client.query('SELECT COUNT(*) FROM ai_automations');
    if (parseInt(checkAutomations.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO ai_automations (name, description, trigger_type, trigger_config, condition_config, action_config, channel, is_active)
        VALUES
        (
          'Daily Morning Late Arrival Scanner',
          'Scans attendance punches at 08:35 AM and dispatches notifications for all employees marked late.',
          'scheduled_time',
          '{"time": "08:35"}',
          '{"condition": "status = ''Late''"}',
          '{"action": "notify_hr_and_employee", "template": "LATE_ATTENDANCE"}',
          'in_app',
          true
        ),
        (
          'Evening Unclosed Shift Reconciler',
          'Identifies active employees with check-in records who have not checked out by 17:30 PM.',
          'scheduled_time',
          '{"time": "17:30"}',
          '{"condition": "check_out_time IS NULL"}',
          '{"action": "flag_missing_checkout", "severity": "MEDIUM"}',
          'in_app',
          true
        ),
        (
          'Payroll Calculation & Anomaly Auditor',
          'Audits the current payroll period for negative net pay, missing tax withholdings, or excessive overtime.',
          'manual_trigger',
          '{}',
          '{"check": "anomalies"}',
          '{"action": "audit_payroll"}',
          'in_app',
          true
        ),
        (
          'Weekly Attendance & Punctuality Digest',
          'Compiles overall enterprise punctuality and attendance statistics for executive management.',
          'scheduled_time',
          '{"day": "Friday", "time": "17:00"}',
          '{}',
          '{"action": "generate_weekly_digest"}',
          'in_app',
          false
        );
      `);
      console.log('Seeded 4 default enterprise automations.');
    }

    console.log('AI Assistant tables successfully migrated and verified.');
  } finally {
    client.release();
  }
}

migrateAITables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
