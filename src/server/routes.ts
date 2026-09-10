import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.ts';
import { users, roles, employees, qrCodes } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  authenticateToken,
  authorizeRoles,
  generateToken,
  AuthRequest,
} from './authMiddleware.ts';
import {
  getSettingsMap,
  updateSetting,
  recordAudit,
  getRoles,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getQRCodeByEmployeeId,
  regenerateEmployeeQRCode,
  getAllQRCodes,
  processQRScan,
  processOfflineBatchSync,
  getAttendanceList,
  createManualAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getOvertimeList,
  createOvertimeRecord,
  updateOvertimeRecord,
  approveOvertimeRecord,
  rejectOvertimeRecord,
  deleteOvertimeRecord,
  getPayrollList,
  previewPayrollForPeriod,
  generatePayrollForPeriod,
  updatePayrollRecord,
  approvePayrollRecord,
  deletePayrollRecord,
  processAllPayrollForPeriod,
  getDashboardStats,
  getDatabaseStatus,
  bulkImportEmployees,
  bulkImportAttendance,
} from './dbServices.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import { runDatabaseSeed } from './seed.ts';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & DEMO ACCOUNTS
// ==========================================

// Get demo accounts for 1-click testing
apiRouter.get('/auth/demo-accounts', async (req: Request, res: Response) => {
  try {
    const list = [
      { id: 'admin', username: 'admin', role: 'Administrator', roleName: 'Administrator', desc: 'Osman A. Mansaray • Full System Administration & IT Governance', defaultPass: 'password123', name: 'Osman A. Mansaray' },
      { id: 'hr.officer', username: 'hr.officer', role: 'HR Officer', roleName: 'HR Officer', desc: 'Fatmata Sesay • Staff Records, Departments & Attendance', defaultPass: 'password123', name: 'Fatmata Sesay' },
      { id: 'payroll.officer', username: 'payroll.officer', role: 'Payroll Officer', roleName: 'Payroll Officer', desc: 'Mohamed S. Kamara • NLe Payroll & NASSIT/PAYE Processing', defaultPass: 'password123', name: 'Mohamed S. Kamara' },
      { id: 'aminata.turay', username: 'aminata.turay', role: 'Employee', roleName: 'Employee', desc: 'Aminata Turay • Personal QR Attendance & Digital Payslips', defaultPass: 'password123', name: 'Aminata Turay' },
      { id: 'management', username: 'management', role: 'Management', roleName: 'Management', desc: 'Alie Badara Koroma • Executive Analytics & Approvals', defaultPass: 'password123', name: 'Alie Badara Koroma' },
    ];
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Standard Login (Username & Password or Employee Code)
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide valid username and password credentials.' });
    }

    const cleanInput = username.trim();

    // Check if matching username directly
    let [user] = await db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        roleId: users.roleId,
        roleName: roles.roleName,
        employeeId: users.employeeId,
        status: users.status,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.username, cleanInput.toLowerCase()));

    // If not found by username, check if it's an employee code (e.g. EMP-1001)
    if (!user && cleanInput.toUpperCase().startsWith('EMP-')) {
      const [empRecord] = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeCode, cleanInput.toUpperCase()));

      if (empRecord) {
        const [userByEmp] = await db
          .select({
            id: users.id,
            username: users.username,
            passwordHash: users.passwordHash,
            roleId: users.roleId,
            roleName: roles.roleName,
            employeeId: users.employeeId,
            status: users.status,
          })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.employeeId, empRecord.id));

        if (userByEmp) {
          user = userByEmp;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This user account is inactive. Please contact your system administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Fetch linked employee if present & verify active status
    let employeeData = null;
    if (user.employeeId) {
      employeeData = await getEmployeeById(user.employeeId);
      if (employeeData && employeeData.status !== 'active') {
        return res.status(403).json({ error: 'Your employee profile is inactive. Please contact HR.' });
      }
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
      employeeId: user.employeeId,
    };

    const token = generateToken(tokenPayload);

    await recordAudit(user.id, user.username, 'LOGIN_SUCCESS', 'auth', user.id.toString(), 'User authenticated via password credentials');

    const photoUrl =
      employeeData?.photoUrl ||
      (employeeData?.employeeCode ? `/uploads/employees/${employeeData.employeeCode}.jpg` : null) ||
      (user.employeeId ? `/uploads/employees/EMP-${user.employeeId}.jpg` : null);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        roleName: user.roleName,
        employeeId: user.employeeId,
        employee: employeeData,
        photoUrl,
        status: user.status,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Authentication service unavailable. Please try again.' });
  }
});

// Firebase Sign-In (OAuth Google verification)
apiRouter.post('/auth/firebase-login', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || `${decoded.uid}@google.com`).toLowerCase().trim();

    // Check if user exists in database with this username/email or firebase_uid
    let [existingUser] = await db
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

    if (!existingUser) {
      // First user becomes Administrator, subsequent become Employee or HR
      const allUsers = await db.select().from(users);
      const defaultRoleName = allUsers.length === 0 ? 'Administrator' : 'Administrator';
      const [role] = await db.select().from(roles).where(eq(roles.roleName, defaultRoleName));

      const randomManagedPass = await bcrypt.hash(`google-auth-${Date.now()}-${decoded.uid}`, 10);

      const [created] = await db
        .insert(users)
        .values({
          username: email,
          passwordHash: randomManagedPass,
          roleId: role?.id || 1,
          firebaseUid: decoded.uid,
          status: 'active',
        })
        .returning();

      existingUser = {
        id: created.id,
        username: created.username,
        roleId: created.roleId,
        roleName: role?.roleName || 'Administrator',
        employeeId: null,
        status: 'active',
      };
    }

    if (existingUser.status !== 'active') {
      return res.status(403).json({ error: 'This user account is inactive. Access denied.' });
    }

    let employeeData = null;
    if (existingUser.employeeId) {
      employeeData = await getEmployeeById(existingUser.employeeId);
      if (employeeData && employeeData.status !== 'active') {
        return res.status(403).json({ error: 'Your employee profile is inactive. Please contact HR.' });
      }
    }

    const tokenPayload = {
      id: existingUser.id,
      username: existingUser.username,
      roleId: existingUser.roleId,
      roleName: existingUser.roleName,
      employeeId: existingUser.employeeId,
    };

    const token = generateToken(tokenPayload);

    await recordAudit(existingUser.id, existingUser.username, 'LOGIN_SUCCESS_OAUTH', 'auth', existingUser.id.toString(), 'User authenticated via Google Identity');

    const photoUrl =
      employeeData?.photoUrl ||
      (employeeData?.employeeCode ? `/uploads/employees/${employeeData.employeeCode}.jpg` : null) ||
      (existingUser.employeeId ? `/uploads/employees/EMP-${existingUser.employeeId}.jpg` : null);

    return res.json({
      user: {
        ...existingUser,
        employee: employeeData,
        photoUrl,
      },
      token,
    });
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return res.status(401).json({ error: 'Failed to verify Firebase authentication session.' });
  }
});

// Current User Profile
apiRouter.get('/auth/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not found in session' });
    }

    const [user] = await db
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
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let employeeData = null;
    if (user.employeeId) {
      employeeData = await getEmployeeById(user.employeeId);
    }

    const photoUrl =
      employeeData?.photoUrl ||
      (employeeData?.employeeCode ? `/uploads/employees/${employeeData.employeeCode}.jpg` : null) ||
      (user.employeeId ? `/uploads/employees/EMP-${user.employeeId}.jpg` : null);

    res.json({
      ...user,
      employee: employeeData,
      photoUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Unable to retrieve user profile.' });
  }
});

// Change Password
apiRouter.post('/auth/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const userId = req.user!.id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

    await recordAudit(userId, user.username, 'PASSWORD_CHANGE', 'users', userId.toString(), 'User updated their password');

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ==========================================
// 2. ROLES & USER MANAGEMENT (Admin)
// ==========================================
apiRouter.get('/roles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const r = await getRoles();
    res.json(r);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/users', authenticateToken, authorizeRoles('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const u = await getUsers();
    res.json(u);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/users', authenticateToken, authorizeRoles('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, roleId, employeeId } = req.body;
    if (!username || !password || !roleId) {
      return res.status(400).json({ error: 'Username, password and role are required.' });
    }

    const newUser = await createUser({ username, password, roleId: Number(roleId), employeeId: employeeId ? Number(employeeId) : null });
    await recordAudit(req.user?.id || null, req.user?.username || 'ADMIN', 'USER_CREATED', 'users', newUser.id.toString(), `Created user ${username}`);
    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create user.' });
  }
});

apiRouter.put('/users/:id', authenticateToken, authorizeRoles('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { roleId, employeeId, status, password } = req.body;
    const updated = await updateUser(id, {
      roleId: roleId !== undefined ? Number(roleId) : undefined,
      employeeId: employeeId !== undefined ? (employeeId ? Number(employeeId) : null) : undefined,
      status,
      password,
    });
    await recordAudit(req.user?.id || null, req.user?.username || 'ADMIN', 'USER_UPDATED', 'users', id.toString(), `Updated user ID ${id}`);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update user.' });
  }
});

apiRouter.delete('/users/:id', authenticateToken, authorizeRoles('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteUser(id);
    await recordAudit(req.user?.id || null, req.user?.username || 'ADMIN', 'USER_DEACTIVATED', 'users', id.toString(), `Deactivated user ID ${id}`);
    res.json({ success: true, message: 'User deactivated successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to deactivate user.' });
  }
});

// ==========================================
// 3. DEPARTMENT MANAGEMENT
// ==========================================
apiRouter.get('/departments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const depts = await getDepartments();
    res.json(depts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/departments', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { departmentName, description } = req.body;
    if (!departmentName) {
      return res.status(400).json({ error: 'Department name is required.' });
    }
    const created = await createDepartment(departmentName, description);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'DEPARTMENT_CREATED', 'departments', created.id.toString(), `Created department ${departmentName}`);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create department' });
  }
});

apiRouter.put('/departments/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { departmentName, description } = req.body;
    if (!departmentName) {
      return res.status(400).json({ error: 'Department name is required.' });
    }
    const updated = await updateDepartment(id, departmentName, description);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'DEPARTMENT_UPDATED', 'departments', id.toString(), `Updated department ${departmentName}`);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update department' });
  }
});

apiRouter.delete('/departments/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteDepartment(id);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'DEPARTMENT_DELETED', 'departments', id.toString(), `Deleted department ID ${id}`);
    res.json({ success: true, message: 'Department deleted successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4. EMPLOYEE MANAGEMENT & QR CODES
// ==========================================
apiRouter.get('/employees', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : undefined;
    const status = req.query.status as string;

    // If role is Employee, only allow viewing self unless elevated
    if (req.user?.roleName === 'Employee' && req.user.employeeId) {
      const emp = await getEmployeeById(req.user.employeeId);
      return res.json(emp ? [emp] : []);
    }

    const emps = await getEmployees({ search, departmentId, status });
    res.json(emps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/employees/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user?.roleName === 'Employee' && req.user.employeeId !== id) {
      return res.status(403).json({ error: 'You do not have permission to view other employee profiles.' });
    }

    const emp = await getEmployeeById(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });
    res.json(emp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to store base64 uploaded photo to public/uploads/employees/
function saveBase64EmployeePhoto(photoData: string, identifier: string): string | null {
  if (!photoData || typeof photoData !== 'string') return null;
  if (!photoData.startsWith('data:image/')) return photoData;

  const matches = photoData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  let ext = matches[1].toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';
  const base64Buffer = Buffer.from(matches[2], 'base64');

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'employees');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanIdentifier}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, base64Buffer);

  // Also defensively update base filename (e.g. EMP-1001.jpg)
  try {
    const baseFilePath = path.join(uploadDir, `${cleanIdentifier}.${ext}`);
    fs.writeFileSync(baseFilePath, base64Buffer);
  } catch {
    // Ignore if file is locked
  }

  return `/uploads/employees/${filename}`;
}

apiRouter.post('/employees', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeCode, firstName, lastName, email, phone, departmentId, position, basicSalary, photoUrl, photoData, createAccount, username, password, roleId } = req.body;

    if (!employeeCode || !firstName || !lastName || !email || !departmentId || !position) {
      return res.status(400).json({ error: 'Please complete all required employee information.' });
    }

    let resolvedPhotoUrl = photoUrl;
    const incomingData = photoData || (photoUrl && photoUrl.startsWith('data:image/') ? photoUrl : null);
    if (incomingData) {
      const savedPath = saveBase64EmployeePhoto(incomingData, employeeCode);
      if (savedPath) resolvedPhotoUrl = savedPath;
    }

    const result = await createEmployee({
      employeeCode,
      firstName,
      lastName,
      email,
      phone: phone || '',
      departmentId: Number(departmentId),
      position,
      basicSalary: basicSalary || '0.00',
      photoUrl: resolvedPhotoUrl,
      createAccount,
      username,
      password,
      roleId: roleId ? Number(roleId) : undefined,
    });

    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'EMPLOYEE_CREATED', 'employees', result.employee.id.toString(), `Created employee ${employeeCode} (${firstName} ${lastName})`);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create employee' });
  }
});

apiRouter.post('/employees/bulk-import', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : req.body.employees;
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of employee records to upload.' });
    }

    const result = await bulkImportEmployees(rawItems, req.user?.username || 'HR');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to bulk import employees' });
  }
});

apiRouter.put('/employees/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatePayload = { ...req.body };

    const incomingPhoto = updatePayload.photoData || (updatePayload.photoUrl && updatePayload.photoUrl.startsWith('data:image/') ? updatePayload.photoUrl : null);
    if (incomingPhoto) {
      const emp = await getEmployeeById(id);
      const code = emp?.employeeCode || `EMP-${id}`;
      const savedPath = saveBase64EmployeePhoto(incomingPhoto, code);
      if (savedPath) {
        updatePayload.photoUrl = savedPath;
      }
      delete updatePayload.photoData;
    }

    const updated = await updateEmployee(id, updatePayload);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'EMPLOYEE_UPDATED', 'employees', id.toString(), `Updated employee ID ${id}`);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update employee' });
  }
});

// Dedicated photo upload and update endpoint for single-click employee photo updates
apiRouter.post('/employees/:id/photo', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { photoData, photoUrl } = req.body;

    const emp = await getEmployeeById(id);
    if (!emp) {
      return res.status(404).json({ error: 'Employee record not found.' });
    }

    let finalPhotoUrl = photoUrl;
    const incomingData = photoData || (photoUrl && photoUrl.startsWith('data:image/') ? photoUrl : null);

    if (incomingData) {
      const saved = saveBase64EmployeePhoto(incomingData, emp.employeeCode);
      if (!saved) {
        return res.status(400).json({ error: 'Failed to process image. Please upload a valid JPEG, PNG, or WEBP image file.' });
      }
      finalPhotoUrl = saved;
    } else if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://') || photoUrl.startsWith('/uploads/'))) {
      finalPhotoUrl = photoUrl.trim();
    } else {
      return res.status(400).json({ error: 'Please provide either photoData (image file) or a valid photoUrl.' });
    }

    const updated = await updateEmployee(id, { photoUrl: finalPhotoUrl });
    await recordAudit(
      req.user?.id || null,
      req.user?.username || 'HR',
      'EMPLOYEE_PHOTO_UPDATED',
      'employees',
      id.toString(),
      `Updated photo for employee ${emp.employeeCode} (${emp.firstName} ${emp.lastName})`
    );

    res.json({
      success: true,
      message: 'Employee photo updated successfully.',
      photoUrl: finalPhotoUrl,
      employee: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update employee photo.' });
  }
});

apiRouter.delete('/employees/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deactivated = await deleteEmployee(id);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'EMPLOYEE_DEACTIVATED', 'employees', id.toString(), `Deactivated employee ID ${id}`);
    res.json({ success: true, message: 'Employee deactivated successfully.', employee: deactivated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete employee' });
  }
});

apiRouter.post('/qrcodes/:employeeId', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const updatedQr = await regenerateEmployeeQRCode(employeeId);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'QR_REGENERATED', 'qr_codes', employeeId.toString(), `Regenerated QR Code for Employee ID ${employeeId}`);
    res.json(updatedQr);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to regenerate QR code' });
  }
});

apiRouter.get('/qrcodes/:employeeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    if (req.user?.roleName === 'Employee' && req.user.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Unauthorized to view QR code for other employees.' });
    }
    const qr = await getQRCodeByEmployeeId(employeeId);
    res.json(qr);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'QR code not found' });
  }
});

apiRouter.post('/employees/:id/regenerate-qr', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatedQr = await regenerateEmployeeQRCode(id);
    await recordAudit(req.user?.id || null, req.user?.username || 'HR', 'QR_REGENERATED', 'qr_codes', id.toString(), `Regenerated QR Code for Employee ID ${id}`);
    res.json(updatedQr);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to regenerate QR code' });
  }
});

apiRouter.get('/qrcodes', authenticateToken, authorizeRoles('Administrator', 'HR Officer', 'Management'), async (req: AuthRequest, res: Response) => {
  try {
    const list = await getAllQRCodes();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. QR ATTENDANCE SCANNER & ATTENDANCE LOGS
// ==========================================

// Main Scanner API (Called by the QR Scanner view upon camera decode or manual code submit)
apiRouter.post('/attendance/scan', async (req: Request, res: Response) => {
  try {
    const { qrValue, mode } = req.body;
    if (!qrValue) {
      return res.status(400).json({
        success: false,
        type: 'error',
        message: 'The QR Code could not be recognised. No code provided.',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await processQRScan(qrValue, mode || 'auto');
    if (!result.success && result.type === 'error') {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error: any) {
    console.error('Scan API error:', error);
    return res.status(500).json({
      success: false,
      type: 'error',
      message: 'Server error processing attendance scan.',
      timestamp: new Date().toISOString(),
    });
  }
});

// Offline Attendance Batch Sync API (called when terminal restores connectivity)
apiRouter.post('/attendance/sync-offline', async (req: Request, res: Response) => {
  try {
    const { punches } = req.body;
    if (!Array.isArray(punches) || punches.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No offline punches array provided.',
        synced: 0,
        failed: 0,
        results: [],
      });
    }

    const syncResult = await processOfflineBatchSync(punches);
    return res.json(syncResult);
  } catch (error: any) {
    console.error('Offline batch sync route error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error processing offline batch sync.',
      synced: 0,
      failed: 0,
      results: [],
    });
  }
});

apiRouter.get('/attendance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const date = req.query.date as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : undefined;
    const status = req.query.status as string;
    let employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string, 10) : undefined;

    // Enforce Employee role view restriction
    if (req.user?.roleName === 'Employee' && req.user.employeeId) {
      employeeId = req.user.employeeId;
    }

    const records = await getAttendanceList({
      date,
      startDate,
      endDate,
      departmentId,
      status,
      employeeId,
    });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/attendance/bulk-import', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : req.body.records;
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of attendance records to upload.' });
    }

    const result = await bulkImportAttendance(rawItems, req.user?.username || 'HR');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to bulk import attendance records' });
  }
});

apiRouter.post('/attendance/manual', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, attendanceDate, checkIn, checkOut, workingHours, overtimeHours, status, notes } = req.body;
    if (!employeeId || !attendanceDate || !checkIn) {
      return res.status(400).json({ error: 'Employee ID, date and check-in time are required.' });
    }

    const created = await createManualAttendance({
      employeeId: Number(employeeId),
      attendanceDate,
      checkIn,
      checkOut,
      workingHours,
      overtimeHours,
      status,
      notes,
      adminUsername: req.user?.username,
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create manual attendance' });
  }
});

apiRouter.put('/attendance/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await updateAttendanceRecord(id, req.body, req.user?.username);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update attendance record' });
  }
});

apiRouter.delete('/attendance/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteAttendanceRecord(id, req.user?.username);
    res.json({ success: true, message: 'Attendance record deleted successfully.', record: deleted });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete attendance record' });
  }
});

// ==========================================
// 6. PAYROLL MANAGEMENT
// ==========================================
apiRouter.get('/payroll', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = req.query.period as string;
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : undefined;
    const status = req.query.status as string;
    const search = req.query.search as string;
    let employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string, 10) : undefined;

    if (req.user?.roleName === 'Employee' && req.user.employeeId) {
      employeeId = req.user.employeeId;
    }

    const list = await getPayrollList({ period, departmentId, status, employeeId, search });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Payroll Preview (Calculates payroll for period without saving to DB)
apiRouter.post('/payroll/preview', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { period, departmentId, employeeId, defaultAllowances, defaultDeductions } = req.body;
    if (!period) {
      return res.status(400).json({ error: 'Payroll period (YYYY-MM) is required.' });
    }

    const summary = await previewPayrollForPeriod(period, {
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      defaultAllowances: defaultAllowances !== undefined ? parseFloat(defaultAllowances) : undefined,
      defaultDeductions: defaultDeductions !== undefined ? parseFloat(defaultDeductions) : undefined,
    });

    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to generate payroll preview.' });
  }
});

// Process / Generate Payroll
apiRouter.post('/payroll/process', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { period, action, status, defaultAllowances, defaultDeductions, customItems } = req.body;
    if (!period) {
      return res.status(400).json({ error: 'Payroll period (YYYY-MM) is required.' });
    }

    if (action === 'process-all' || action === 'finalize') {
      const targetStatus = status || 'Approved';
      const result = await processAllPayrollForPeriod(period, targetStatus, req.user?.username);
      return res.json({
        success: true,
        message: `Batch processed ${result.length} payroll records for ${period} to status ${targetStatus}.`,
        records: result,
      });
    }

    const result = await generatePayrollForPeriod(
      period,
      {
        status: status || 'Draft',
        defaultAllowances: defaultAllowances !== undefined ? parseFloat(defaultAllowances) : undefined,
        defaultDeductions: defaultDeductions !== undefined ? parseFloat(defaultDeductions) : undefined,
        customItems,
      },
      req.user?.username
    );

    return res.json({
      success: true,
      message: `Successfully calculated and generated payroll records for period ${period}.`,
      count: result.length,
      records: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process payroll' });
  }
});

apiRouter.post('/payroll/generate', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { period, status, defaultAllowances, defaultDeductions, customItems } = req.body;
    if (!period) {
      return res.status(400).json({ error: 'Payroll period (YYYY-MM) is required.' });
    }

    const result = await generatePayrollForPeriod(
      period,
      {
        status: status || 'Draft',
        defaultAllowances: defaultAllowances !== undefined ? parseFloat(defaultAllowances) : undefined,
        defaultDeductions: defaultDeductions !== undefined ? parseFloat(defaultDeductions) : undefined,
        customItems,
      },
      req.user?.username
    );

    res.json({
      success: true,
      message: `Successfully calculated and generated payroll records for period ${period}.`,
      count: result.length,
      records: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to generate payroll' });
  }
});

apiRouter.put('/payroll/:id', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await updatePayrollRecord(id, req.body, req.user?.username);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payroll' });
  }
});

apiRouter.post('/payroll/:id/approve', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const approved = await approvePayrollRecord(id, req.user?.username);
    res.json({ success: true, message: `Payroll record ID ${id} approved successfully.`, record: approved });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to approve payroll' });
  }
});

apiRouter.delete('/payroll/:id', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deletePayrollRecord(id, req.user?.username);
    res.json({ success: true, message: `Payroll record ID ${id} deleted successfully.`, record: deleted });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete payroll record' });
  }
});

apiRouter.post('/payroll/process-all', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { period, status } = req.body;
    if (!period) return res.status(400).json({ error: 'Payroll period is required' });

    const targetStatus = status || 'Approved';
    const result = await processAllPayrollForPeriod(period, targetStatus, req.user?.username);
    res.json({
      success: true,
      message: `Batch processed ${result.length} payroll records for ${period} to status ${targetStatus}.`,
      records: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 6B. OVERTIME MANAGEMENT
// ==========================================
apiRouter.get('/overtime', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, startDate, endDate, departmentId } = req.query;
    let employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string, 10) : undefined;

    if (req.user?.roleName === 'Employee' && req.user.employeeId) {
      employeeId = req.user.employeeId;
    }

    const list = await getOvertimeList({
      employeeId,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      departmentId: departmentId ? parseInt(departmentId as string, 10) : undefined,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/overtime', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let { employeeId, overtimeDate, hours, rateMultiplier, reason, status } = req.body;

    if (req.user?.roleName === 'Employee') {
      employeeId = req.user.employeeId;
      status = 'Pending';
    }

    if (!employeeId || !overtimeDate || !hours) {
      return res.status(400).json({ error: 'Employee ID, date, and overtime hours are required.' });
    }

    const created = await createOvertimeRecord({
      employeeId: Number(employeeId),
      overtimeDate,
      hours,
      rateMultiplier,
      reason,
      status: status || 'Pending',
      approvedBy: status === 'Approved' ? req.user?.id : undefined,
      username: req.user?.username,
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create overtime record' });
  }
});

apiRouter.put('/overtime/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await updateOvertimeRecord(id, req.body, req.user?.username);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update overtime record' });
  }
});

apiRouter.post('/overtime/:id/approve', authenticateToken, authorizeRoles('Administrator', 'HR Officer', 'Payroll Officer', 'Management'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!req.user?.id) return res.status(401).json({ error: 'User not authenticated' });

    const approved = await approveOvertimeRecord(id, req.user.id, req.user.username);
    res.json({ success: true, message: 'Overtime request approved successfully.', record: approved });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to approve overtime' });
  }
});

apiRouter.post('/overtime/:id/reject', authenticateToken, authorizeRoles('Administrator', 'HR Officer', 'Payroll Officer', 'Management'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!req.user?.id) return res.status(401).json({ error: 'User not authenticated' });

    const { reason } = req.body;
    const rejected = await rejectOvertimeRecord(id, req.user.id, req.user.username, reason);
    res.json({ success: true, message: 'Overtime request rejected.', record: rejected });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reject overtime' });
  }
});

apiRouter.delete('/overtime/:id', authenticateToken, authorizeRoles('Administrator', 'HR Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await deleteOvertimeRecord(id, req.user?.username);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete overtime record' });
  }
});

// ==========================================
// 7. DASHBOARDS & REPORTS
// ==========================================
const handleDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

apiRouter.get('/reports/dashboard-stats', authenticateToken, handleDashboardStats);
apiRouter.get('/dashboard/stats', authenticateToken, handleDashboardStats);
apiRouter.get('/dashboard-stats', authenticateToken, handleDashboardStats);

apiRouter.get('/reports/attendance', authenticateToken, authorizeRoles('Administrator', 'HR Officer', 'Management', 'Payroll Officer'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, departmentId, employeeId, status, search } = req.query;
    const records = await getAttendanceList({
      startDate: startDate as string,
      endDate: endDate as string,
      departmentId: departmentId ? parseInt(departmentId as string, 10) : undefined,
      employeeId: employeeId ? parseInt(employeeId as string, 10) : undefined,
      status: status as string,
      search: search as string,
    });

    // Compute comprehensive summary aggregation
    const totalRecords = records.length;
    const uniqueEmployees = new Set(records.map((r) => r.employeeId)).size;
    const presentCount = records.filter((r) => r.status === 'Present').length;
    const lateCount = records.filter((r) => r.status === 'Late').length;
    const overtimeCount = records.filter((r) => r.status === 'Overtime' || parseFloat(r.overtimeHours.toString()) > 0).length;
    const earlyDepartureCount = records.filter((r) => r.status === 'Early Departure').length;
    const absentCount = records.filter((r) => r.status === 'Absent').length;

    const totalWorkingHours = records.reduce((sum, r) => sum + parseFloat(r.workingHours.toString() || '0'), 0);
    const totalOvertimeHours = records.reduce((sum, r) => sum + parseFloat(r.overtimeHours.toString() || '0'), 0);
    const averageDailyHours = totalRecords > 0 ? totalWorkingHours / totalRecords : 0;
    const attendanceRate = totalRecords > 0 ? ((presentCount + lateCount + overtimeCount) / totalRecords) * 100 : 0;

    res.json({
      summary: {
        totalRecords,
        uniqueEmployees,
        presentCount,
        lateCount,
        overtimeCount,
        earlyDepartureCount,
        absentCount,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        averageDailyHours: Math.round(averageDailyHours * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
      },
      records,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/reports/payroll', authenticateToken, authorizeRoles('Administrator', 'Payroll Officer', 'Management'), async (req: AuthRequest, res: Response) => {
  try {
    const { period, departmentId, employeeId, status, search } = req.query;
    const records = await getPayrollList({
      period: period as string,
      departmentId: departmentId ? parseInt(departmentId as string, 10) : undefined,
      employeeId: employeeId ? parseInt(employeeId as string, 10) : undefined,
      status: status as string,
      search: search as string,
    });

    const totalEmployees = new Set(records.map((r) => r.employeeId)).size;
    const totalBasic = records.reduce((sum, r) => sum + parseFloat(r.basicSalary.toString() || '0'), 0);
    const totalOvertime = records.reduce((sum, r) => sum + parseFloat(r.overtimeAmount.toString() || '0'), 0);
    const totalAllowances = records.reduce((sum, r) => sum + parseFloat(r.allowances.toString() || '0'), 0);
    const totalDeductions = records.reduce((sum, r) => sum + parseFloat(r.deductions.toString() || '0'), 0);
    const totalGross = records.reduce((sum, r) => sum + parseFloat(r.grossSalary.toString() || '0'), 0);
    const totalNet = records.reduce((sum, r) => sum + parseFloat(r.netSalary.toString() || '0'), 0);

    res.json({
      summary: {
        totalEmployees,
        totalRecords: records.length,
        totalBasicSalary: Math.round(totalBasic * 100) / 100,
        totalOvertime: Math.round(totalOvertime * 100) / 100,
        totalAllowances: Math.round(totalAllowances * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalGrossSalary: Math.round(totalGross * 100) / 100,
        totalNetSalary: Math.round(totalNet * 100) / 100,
      },
      records,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. SYSTEM SETTINGS (Admin)
// ==========================================
apiRouter.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const s = await getSettingsMap();
    res.json(s);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/settings', authenticateToken, authorizeRoles('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const settingsObj = req.body;
    const keyMap: Record<string, string> = {
      standard_check_in: 'standard_check_in',
      standardCheckIn: 'standard_check_in',
      workStartTime: 'standard_check_in',
      standard_check_out: 'standard_check_out',
      standardCheckOut: 'standard_check_out',
      workEndTime: 'standard_check_out',
      standard_working_hours: 'standard_working_hours',
      standardWorkingHours: 'standard_working_hours',
      late_grace_minutes: 'late_grace_minutes',
      lateGraceMinutes: 'late_grace_minutes',
      gracePeriodMinutes: 'late_grace_minutes',
      early_departure_threshold_minutes: 'early_departure_threshold_minutes',
      earlyDepartureThresholdMinutes: 'early_departure_threshold_minutes',
      unpaid_break_hours: 'unpaid_break_hours',
      unpaidBreakHours: 'unpaid_break_hours',
      overtime_rate_multiplier: 'overtime_rate_multiplier',
      overtimeRateMultiplier: 'overtime_rate_multiplier',
      company_name: 'company_name',
      companyName: 'company_name',
      currency_symbol: 'currency_symbol',
      currencySymbol: 'currency_symbol',
    };

    for (const [key, value] of Object.entries(settingsObj)) {
      const mappedKey = keyMap[key] || key;
      if (value !== undefined && value !== null) {
        let stringVal = String(value).trim();
        // If time format HH:MM, append :00 for standard check in/out
        if ((mappedKey === 'standard_check_in' || mappedKey === 'standard_check_out') && /^\d{2}:\d{2}$/.test(stringVal)) {
          stringVal = `${stringVal}:00`;
        }
        await updateSetting(mappedKey, stringVal);
      }
    }
    await recordAudit(req.user?.id || null, req.user?.username || 'ADMIN', 'SETTINGS_UPDATED', 'system_settings', null, 'System settings updated');
    const updated = await getSettingsMap();
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 9. DATABASE RE-SEED HELPER
// ==========================================
apiRouter.post('/seed', authenticateToken, authorizeRoles('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    await runDatabaseSeed(true);
    res.json({ success: true, message: 'Database successfully re-seeded with demo records.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. POSTGRESQL 18 DATABASE STATUS & DIAGNOSTICS
// ==========================================
apiRouter.get('/database/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const status = await getDatabaseStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to query PostgreSQL database status' });
  }
});

