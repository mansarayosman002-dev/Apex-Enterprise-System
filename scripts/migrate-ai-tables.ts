import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function runMigration() {
  console.log('========================================================');
  console.log('RUNNING PHASE 1 MIGRATION: AI & NOTIFICATION TABLES');
  console.log('========================================================\n');

  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.SQL_USER || 'postgres'}:${encodeURIComponent(process.env.SQL_PASSWORD || 'postgres')}@${process.env.SQL_HOST || 'localhost'}:${process.env.SQL_PORT || '5432'}/${process.env.SQL_DB_NAME || 'apex_hrms_db'}`;

  const client = new Client({ connectionString });
  await client.connect();
  console.log(' Connected to PostgreSQL 18 on port 5432.');

  try {
    await client.query('BEGIN;');

    // 1. ai_conversations
    console.log('Creating table ai_conversations...');
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
    `);

    // 2. ai_messages
    console.log('Creating table ai_messages...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tool_calls TEXT,
        tool_call_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at);
    `);

    // 3. ai_activity_logs
    console.log('Creating table ai_activity_logs...');
    await client.query(`
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
    `);

    // 4. notifications
    console.log('Creating table notifications...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'System',
        priority TEXT NOT NULL DEFAULT 'medium',
        channel TEXT NOT NULL DEFAULT 'in_app',
        status TEXT NOT NULL DEFAULT 'pending',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMP,
        scheduled_for TIMESTAMP,
        failure_reason TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_emp ON notifications(employee_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
    `);

    // 5. notification_preferences
    console.log('Creating table notification_preferences...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
        attendance_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        payroll_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        hr_announcements BOOLEAN NOT NULL DEFAULT TRUE,
        system_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        preferred_channel TEXT NOT NULL DEFAULT 'in_app',
        email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_pref_emp ON notification_preferences(employee_id);
    `);

    // 6. ai_automations
    console.log('Creating table ai_automations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_automations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT,
        condition_config TEXT,
        action_config TEXT,
        channel TEXT NOT NULL DEFAULT 'in_app',
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_automations_active ON ai_automations(is_active);
      CREATE INDEX IF NOT EXISTS idx_ai_automations_trigger ON ai_automations(trigger_type);
    `);

    // 7. ai_automation_executions
    console.log('Creating table ai_automation_executions...');
    await client.query(`
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
    `);

    // 8. ai_anomalies
    console.log('Creating table ai_anomalies...');
    await client.query(`
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

    await client.query('COMMIT;');
    console.log('\nAll 8 AI & Notification tables successfully created in PostgreSQL 18!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
