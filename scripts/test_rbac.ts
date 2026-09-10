import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'apex-smart-attendance-payroll-secret-2026';
const BASE_URL = 'http://127.0.0.1:3000';

interface TestCase {
  name: string;
  method: string;
  url: string;
  role: string;
  tokenPayload: { id: number; username: string; roleId: number; roleName: string; employeeId?: number | null };
  expectedStatus: number[]; // e.g. [200] or [403]
  body?: any;
}

const users = {
  admin: { id: 1, username: 'admin@apex.local', roleId: 1, roleName: 'Administrator', employeeId: null },
  hr: { id: 2, username: 'hr@apex.local', roleId: 2, roleName: 'HR Officer', employeeId: 2 },
  payroll: { id: 3, username: 'payroll@apex.local', roleId: 3, roleName: 'Payroll Officer', employeeId: 3 },
  mgmt: { id: 4, username: 'mgmt@apex.local', roleId: 4, roleName: 'Management', employeeId: 4 },
  employee: { id: 5, username: 'dev.chen@apex.local', roleId: 5, roleName: 'Employee', employeeId: 1 },
};

function makeToken(userPayload: any) {
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('=== RUNNING RBAC & ENDPOINT SECURITY VERIFICATION MATRIX ===\n');

  const tests: TestCase[] = [
    // 1. Unauthenticated checks
    {
      name: 'Unauthenticated -> /api/users (should 401)',
      method: 'GET',
      url: '/api/users',
      role: 'Anonymous',
      tokenPayload: { id: 0, username: '', roleId: 0, roleName: '' },
      expectedStatus: [401],
    },
    {
      name: 'Unauthenticated -> /api/settings (should 401)',
      method: 'GET',
      url: '/api/settings',
      role: 'Anonymous',
      tokenPayload: { id: 0, username: '', roleId: 0, roleName: '' },
      expectedStatus: [401],
    },

    // 2. Administrator tests (Universal Access)
    {
      name: 'Administrator -> GET /api/users (allowed)',
      method: 'GET',
      url: '/api/users',
      role: 'Administrator',
      tokenPayload: users.admin,
      expectedStatus: [200],
    },
    {
      name: 'Administrator -> GET /api/settings (allowed)',
      method: 'GET',
      url: '/api/settings',
      role: 'Administrator',
      tokenPayload: users.admin,
      expectedStatus: [200],
    },
    {
      name: 'Administrator -> GET /api/payroll (allowed)',
      method: 'GET',
      url: '/api/payroll',
      role: 'Administrator',
      tokenPayload: users.admin,
      expectedStatus: [200],
    },

    // 3. HR Officer tests
    {
      name: 'HR Officer -> GET /api/employees (allowed)',
      method: 'GET',
      url: '/api/employees',
      role: 'HR Officer',
      tokenPayload: users.hr,
      expectedStatus: [200],
    },
    {
      name: 'HR Officer -> GET /api/qrcodes (allowed)',
      method: 'GET',
      url: '/api/qrcodes',
      role: 'HR Officer',
      tokenPayload: users.hr,
      expectedStatus: [200],
    },
    {
      name: 'HR Officer -> GET /api/users (forbidden - 403)',
      method: 'GET',
      url: '/api/users',
      role: 'HR Officer',
      tokenPayload: users.hr,
      expectedStatus: [403],
    },
    {
      name: 'HR Officer -> PUT /api/settings (forbidden - 403)',
      method: 'PUT',
      url: '/api/settings',
      role: 'HR Officer',
      tokenPayload: users.hr,
      expectedStatus: [403],
      body: { company_name: 'Hacked' },
    },
    {
      name: 'HR Officer -> POST /api/payroll/generate (forbidden - 403)',
      method: 'POST',
      url: '/api/payroll/generate',
      role: 'HR Officer',
      tokenPayload: users.hr,
      expectedStatus: [403],
      body: { period: '2026-03' },
    },

    // 4. Payroll Officer tests
    {
      name: 'Payroll Officer -> GET /api/payroll (allowed)',
      method: 'GET',
      url: '/api/payroll',
      role: 'Payroll Officer',
      tokenPayload: users.payroll,
      expectedStatus: [200],
    },
    {
      name: 'Payroll Officer -> GET /api/reports/payroll (allowed)',
      method: 'GET',
      url: '/api/reports/payroll',
      role: 'Payroll Officer',
      tokenPayload: users.payroll,
      expectedStatus: [200],
    },
    {
      name: 'Payroll Officer -> GET /api/users (forbidden - 403)',
      method: 'GET',
      url: '/api/users',
      role: 'Payroll Officer',
      tokenPayload: users.payroll,
      expectedStatus: [403],
    },
    {
      name: 'Payroll Officer -> POST /api/employees (forbidden - 403)',
      method: 'POST',
      url: '/api/employees',
      role: 'Payroll Officer',
      tokenPayload: users.payroll,
      expectedStatus: [403],
      body: { firstName: 'Test' },
    },
    {
      name: 'Payroll Officer -> PUT /api/settings (forbidden - 403)',
      method: 'PUT',
      url: '/api/settings',
      role: 'Payroll Officer',
      tokenPayload: users.payroll,
      expectedStatus: [403],
      body: {},
    },

    // 5. Management tests
    {
      name: 'Management -> GET /api/reports/attendance (allowed)',
      method: 'GET',
      url: '/api/reports/attendance',
      role: 'Management',
      tokenPayload: users.mgmt,
      expectedStatus: [200],
    },
    {
      name: 'Management -> GET /api/reports/payroll (allowed)',
      method: 'GET',
      url: '/api/reports/payroll',
      role: 'Management',
      tokenPayload: users.mgmt,
      expectedStatus: [200],
    },
    {
      name: 'Management -> POST /api/employees (forbidden - 403)',
      method: 'POST',
      url: '/api/employees',
      role: 'Management',
      tokenPayload: users.mgmt,
      expectedStatus: [403],
      body: { firstName: 'Unauthorized' },
    },
    {
      name: 'Management -> POST /api/payroll/generate (forbidden - 403)',
      method: 'POST',
      url: '/api/payroll/generate',
      role: 'Management',
      tokenPayload: users.mgmt,
      expectedStatus: [403],
      body: { period: '2026-03' },
    },
    {
      name: 'Management -> PUT /api/settings (forbidden - 403)',
      method: 'PUT',
      url: '/api/settings',
      role: 'Management',
      tokenPayload: users.mgmt,
      expectedStatus: [403],
      body: {},
    },

    // 6. Employee tests (Strict Privacy & Scope Bounds)
    {
      name: 'Employee -> GET /api/users (forbidden - 403)',
      method: 'GET',
      url: '/api/users',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [403],
    },
    {
      name: 'Employee -> GET /api/qrcodes (forbidden - 403)',
      method: 'GET',
      url: '/api/qrcodes',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [403],
    },
    {
      name: 'Employee -> POST /api/employees (forbidden - 403)',
      method: 'POST',
      url: '/api/employees',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [403],
      body: {},
    },
    {
      name: 'Employee -> POST /api/payroll/generate (forbidden - 403)',
      method: 'POST',
      url: '/api/payroll/generate',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [403],
      body: {},
    },
    {
      name: 'Employee -> GET /api/employees/2 (other profile forbidden - 403)',
      method: 'GET',
      url: '/api/employees/2',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [403],
    },
    {
      name: 'Employee -> GET /api/employees/1 (own profile allowed - 200)',
      method: 'GET',
      url: '/api/employees/1',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [200],
    },
    {
      name: 'Employee -> GET /api/qrcodes/1 (own QR code allowed - 200)',
      method: 'GET',
      url: '/api/qrcodes/1',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [200],
    },
    {
      name: 'Employee -> GET /api/qrcodes/2 (other QR code forbidden - 403)',
      method: 'GET',
      url: '/api/qrcodes/2',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [403],
    },
    {
      name: 'Employee -> GET /api/attendance (scoped to self - 200)',
      method: 'GET',
      url: '/api/attendance',
      role: 'Employee',
      tokenPayload: users.employee,
      expectedStatus: [200],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (test.role !== 'Anonymous') {
      headers['Authorization'] = `Bearer ${makeToken(test.tokenPayload)}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${test.url}`, {
        method: test.method,
        headers,
        body: test.body ? JSON.stringify(test.body) : undefined,
      });

      const status = response.status;
      const isExpected = test.expectedStatus.includes(status);

      if (isExpected) {
        console.log(`PASS: [${test.role}] ${test.name} -> HTTP ${status}`);
        passed++;
      } else {
        const bodyText = await response.text();
        console.error(`FAIL: [${test.role}] ${test.name} -> Got HTTP ${status}, Expected ${test.expectedStatus.join(', ')}. Response: ${bodyText.slice(0, 150)}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`ERROR: [${test.role}] ${test.name} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\n==============================================`);
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed out of ${tests.length} Security Tests`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
