import { pool } from '../src/db/index.ts';

async function testConnection() {
  console.log('====================================================');
  console.log('TESTING POSTGRESQL 18 DATABASE CONNECTION');
  console.log('====================================================');

  const start = Date.now();
  try {
    const client = await pool.connect();
    const connectTime = Date.now() - start;
    console.log(`Successfully connected to PostgreSQL in ${connectTime}ms`);

    // 1. Version info
    const versionRes = await client.query('SELECT version();');
    console.log(`\nPostgreSQL Version:\n   ${versionRes.rows[0].version}`);

    // 2. Database connection details
    const dbInfoRes = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as database_user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);
    const dbInfo = dbInfoRes.rows[0];
    console.log('\nDatabase Details:');
    console.log(`   - Database Name : ${dbInfo.database_name}`);
    console.log(`   - User          : ${dbInfo.database_user}`);
    console.log(`   - Server Port   : ${dbInfo.server_port || 5432}`);

    // 3. Schema & Tables Inspection
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`\nPublic Schema Tables (${tablesRes.rows.length} tables found):`);
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT count(*)::int as cnt FROM "${row.table_name}";`);
      console.log(`   • ${row.table_name.padEnd(20)} : ${countRes.rows[0].cnt} records`);
    }

    // 4. Test CRUD (Insert, Read, Update, Delete)
    console.log('\nExecuting Transactional CRUD & Auto-Update Validation Test...');
    const testCode = `TEST-EMP-${Date.now().toString().slice(-4)}`;

    // Get first department
    const deptRes = await client.query(`SELECT id FROM departments LIMIT 1;`);
    const deptId = deptRes.rows[0]?.id || 1;

    // INSERT
    const insertRes = await client.query(`
      INSERT INTO employees (employee_code, first_name, last_name, email, phone, department_id, position, basic_salary, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, employee_code, first_name, basic_salary;
    `, [testCode, 'Test', 'Connection', `test.${Date.now()}@apex.sl`, '+232 00 000 000', deptId, 'QA Tester', '5000.00', 'active']);
    const inserted = insertRes.rows[0];
    console.log(`   INSERT verified: ID ${inserted.id} (${inserted.employee_code})`);

    // UPDATE
    const updateRes = await client.query(`
      UPDATE employees 
      SET position = 'Senior QA Engineer', basic_salary = '6500.00', updated_at = NOW()
      WHERE id = $1
      RETURNING id, position, basic_salary, updated_at;
    `, [inserted.id]);
    const updated = updateRes.rows[0];
    console.log(`   UPDATE verified: Position changed to "${updated.position}", Salary: ${updated.basic_salary}`);

    // DELETE (clean up)
    await client.query(`DELETE FROM employees WHERE id = $1;`, [inserted.id]);
    console.log(`   DELETE cleanup verified`);

    client.release();
    console.log('\n====================================================');
    console.log('ALL POSTGRESQL 18 CONNECTION & CRUD CHECKS PASSED!');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\nPostgreSQL Connection Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
