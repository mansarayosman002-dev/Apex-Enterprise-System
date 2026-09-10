import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateToken, AuthenticatedUser } from '../server/authMiddleware.ts';
import { db } from '../db/index.ts';
import { users, roles, employees } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function runAuthTests() {
  console.log('====================================================');
  console.log("[1/10] STARTING AUTHENTICATION TEST SUITE");
  console.log('====================================================');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Valid Login Credential Verification
  try {
    const [adminUser]= await db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.roleName,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.username, 'admin'));

    assert(!!adminUser, 'Admin user exists in database');
    if (adminUser) {
      const isValidPassword = await bcrypt.compare('password123', adminUser.passwordHash);
      assert(isValidPassword, 'Admin valid password matches bcrypt hash');
      assert(adminUser.status === 'active', 'Admin user account is active');
      assert(adminUser.roleName === 'Administrator', 'Admin user has Administrator role');
    }
  } catch (e: any) {
    assert(false, 'Valid login verification', e.message);
  }

  // 2. Invalid Login Password
  try {
    const [adminUser]= await db.select().from(users).where(eq(users.username, 'admin'));
    if (adminUser) {
      const isWrongPassword = await bcrypt.compare('wrongPassword_123', adminUser.passwordHash);
      assert(!isWrongPassword, 'Invalid password correctly fails bcrypt compare');
    }
  } catch (e: any) {
    assert(false, 'Invalid login password check', e.message);
  }

  // 3. Inactive Account Login Check
  try {
    const [anyRole]= await db.select().from(roles).limit(1);
    // Create temporary inactive user for test
    const dummyPasswordHash = await bcrypt.hash('testpass123', 10);
    const [inactiveUser]= await db
      .insert(users)
      .values({
        username: `inactive_test_${Date.now()}`,
        passwordHash: dummyPasswordHash,
        roleId: anyRole?.id || 1,
        status: 'inactive',
      })
      .returning();

    assert(inactiveUser.status === 'inactive', 'Inactive user status confirmed as inactive');

    // Clean up
    await db.delete(users).where(eq(users.id, inactiveUser.id));
  } catch (e: any) {
    assert(false, 'Inactive account check', e.message);
  }

  // 4. Token Generation & Claims Verification
  try {
    const payload: AuthenticatedUser = {
      id: 999,
      username: 'qa_tester',
      roleId: 1,
      roleName: 'Administrator',
    };

    const token = generateToken(payload);
    assert(typeof token === 'string'&& token.length > 20, 'JWT Token generated successfully');

    const decoded = jwt.decode(token) as any;
    assert(decoded.id === 999, 'JWT decoded contains correct user ID');
    assert(decoded.username === 'qa_tester', 'JWT decoded contains correct username');
    assert(decoded.roleName === 'Administrator', 'JWT decoded contains correct roleName');
    assert(typeof decoded.exp === 'number', 'JWT contains expiration claim (exp)');
  } catch (e: any) {
    assert(false, 'Token generation & claims check', e.message);
  }

  // 5. Expired Token Handling
  try {
    const expiredToken = jwt.sign(
      { id: 999, username: 'expired_user', roleName: 'Employee', roleId: 4 },
      process.env.JWT_SECRET || 'apex-smart-attendance-payroll-secret-2026',
      { expiresIn: -10 } // Expired 10 seconds ago
    );

    let expiredCaught = false;
    try {
      jwt.verify(expiredToken, process.env.JWT_SECRET || 'apex-smart-attendance-payroll-secret-2026');
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        expiredCaught = true;
      }
    }
    assert(expiredCaught, 'Expired JWT token is rejected with TokenExpiredError');
  } catch (e: any) {
    assert(false, 'Expired token check', e.message);
  }

  // 6. Tampered / Invalid Signature JWT Handling
  try {
    const validToken = generateToken({ id: 1, username: 'admin', roleId: 1, roleName: 'Administrator'});
    const forgedToken = validToken.substring(0, validToken.length - 8) + 'FAKE1234';

    let signatureRejected = false;
    try {
      jwt.verify(forgedToken, process.env.JWT_SECRET || 'apex-smart-attendance-payroll-secret-2026');
    } catch (err: any) {
      if (err.name === 'JsonWebTokenError') {
        signatureRejected = true;
      }
    }
    assert(signatureRejected, 'Forged JWT signature is strictly rejected');
  } catch (e: any) {
    assert(false, 'Forged JWT check', e.message);
  }

  console.log(`--- Auth Test Results: ${passed} Passed, ${failed} Failed ---\n`);
  return { passed, failed };
}
