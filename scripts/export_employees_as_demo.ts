import { pool } from '../src/db/index.ts';

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.department_id,
        d.department_name,
        e.position,
        e.photo_url,
        e.basic_salary,
        e.status,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.id ASC
    `);

    console.log(`Found ${res.rows.length} current employees in database:`);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
