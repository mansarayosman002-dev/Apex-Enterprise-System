import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.SQL_HOST || 'localhost';
const dbPort = parseInt(process.env.SQL_PORT || '5432');
const dbUser = process.env.SQL_USER || 'postgres';
const dbPassword = process.env.SQL_PASSWORD || 'postgres';
const targetDb = process.env.SQL_DB_NAME || 'apex_hrms_db';

async function setup() {
  console.log(`[1/3] Connecting to PostgreSQL at ${dbHost}:${dbPort} as user ${dbUser}...`);
  const rootClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    console.log('Connected to PostgreSQL root database.');

    const checkRes = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (checkRes.rowCount === 0) {
      console.log(`Creating database "${targetDb}"...`);
      await rootClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Database "${targetDb}" created successfully.`);
    } else {
      console.log(`Database "${targetDb}" already exists.`);
    }
  } finally {
    await rootClient.end();
  }

  console.log(`[2/3] Connecting to "${targetDb}" to ensure table schemas exist...`);
  const appClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: targetDb,
  });

  try {
    await appClient.connect();

    const ddl = `
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        department_name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_code TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
        position TEXT NOT NULL,
        basic_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
        qr_value TEXT NOT NULL UNIQUE,
        generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        firebase_uid TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        attendance_date TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT,
        working_hours NUMERIC(6, 2) DEFAULT '0.00' NOT NULL,
        overtime_hours NUMERIC(6, 2) DEFAULT '0.00' NOT NULL,
        status TEXT DEFAULT 'Present' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS overtime (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        overtime_date TEXT NOT NULL,
        hours NUMERIC(6, 2) DEFAULT '0.00' NOT NULL,
        rate_multiplier NUMERIC(4, 2) DEFAULT '1.50' NOT NULL,
        amount NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'Pending' NOT NULL,
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        payroll_period TEXT NOT NULL,
        basic_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        overtime_amount NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        allowances NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        deductions NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        gross_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        net_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
        status TEXT DEFAULT 'Pending' NOT NULL,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username TEXT,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await appClient.query(ddl);
    console.log('Database tables verified / created.');
  } finally {
    await appClient.end();
  }

  console.log('[3/3] Running database seed...');
  const { runDatabaseSeed } = await import('../src/server/seed.ts');
  await runDatabaseSeed(true);
  console.log('Database setup and seed finished successfully!');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
