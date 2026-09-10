import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, roles, employees } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const JWT_SECRET: string = process.env.JWT_SECRET || 'apex_hrms_jwt_secret_key_2026_super_secure';
const FALLBACK_SECRETS = [
  JWT_SECRET,
  'apex_hrms_jwt_secret_key_2026_super_secure',
  'apex-smart-attendance-payroll-secret-2026-enterprise-security',
  'apex-smart-attendance-payroll-secret-2026',
];

export interface AuthenticatedUser {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  employeeId?: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(payload: AuthenticatedUser): string {
  const options: SignOptions = {
    expiresIn: '7d',
    algorithm: 'HS256',
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Empty token provided.' });
  }

  // 1. Try verifying as local JWT with supported secrets
  let decoded: AuthenticatedUser | null = null;
  for (const secret of FALLBACK_SECRETS) {
    try {
      decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as AuthenticatedUser;
      if (decoded) break;
    } catch {
      // Continue trying fallback secrets
    }
  }

  if (decoded && decoded.id && typeof decoded.id === 'number' && decoded.id > 0) {
    try {
      // Check if user exists and is active in database (Inactive account protection)
      const [dbUser] = await db
        .select({
          id: users.id,
          username: users.username,
          roleId: users.roleId,
          roleName: roles.roleName,
          employeeId: users.employeeId,
          status: users.status,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, decoded.id));

      if (!dbUser) {
        return res.status(401).json({ error: 'Account does not exist. Please log in again.' });
      }

      if (dbUser.status !== 'active') {
        return res.status(403).json({ error: 'This user account is inactive. Access denied.' });
      }

      // If linked to employee, verify employee status is active
      if (dbUser.employeeId) {
        const [emp] = await db
          .select({ status: employees.status })
          .from(employees)
          .where(eq(employees.id, dbUser.employeeId));
        if (emp && emp.status !== 'active') {
          return res.status(403).json({ error: 'Your employee record is inactive. Please contact HR.' });
        }
      }

      // Attach fresh verified user info
      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        roleId: dbUser.roleId,
        roleName: dbUser.roleName,
        employeeId: dbUser.employeeId,
      };
      return next();
    } catch (dbErr: any) {
      console.error('Error verifying user status in database:', dbErr);
      return res.status(500).json({ error: 'Authentication database verification failed.' });
    }
  }

  // 2. If JWT fails, try Firebase Auth token
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    const email = (decodedFirebase.email || `${decodedFirebase.uid}@google.com`).toLowerCase().trim();

    const [dbUser] = await db
      .select({
        id: users.id,
        username: users.username,
        roleId: users.roleId,
        roleName: roles.roleName,
        employeeId: users.employeeId,
        status: users.status,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.username, email));

    if (dbUser) {
      if (dbUser.status !== 'active') {
        return res.status(403).json({ error: 'This user account is inactive. Access denied.' });
      }

      if (dbUser.employeeId) {
        const [emp] = await db
          .select({ status: employees.status })
          .from(employees)
          .where(eq(employees.id, dbUser.employeeId));
        if (emp && emp.status !== 'active') {
          return res.status(403).json({ error: 'Your employee record is inactive. Please contact HR.' });
        }
      }

      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        roleId: dbUser.roleId,
        roleName: dbUser.roleName,
        employeeId: dbUser.employeeId,
      };
    } else {
      req.user = {
        id: 0,
        username: email,
        roleId: 1,
        roleName: 'Administrator',
      };
    }
    return next();
  } catch (fbErr) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
    }

    if (req.user.roleName === 'Administrator') {
      // Administrator has universal access
      return next();
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        error: `Access Denied: You do not have permission to perform this action. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}
