import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { db } from '../db/index.ts';
import {
  roles,
  departments,
  employees,
  qrCodes,
  users,
  attendance,
  overtime,
  payroll,
  systemSettings,
  auditLogs,
} from '../db/schema.ts';
import { eq, and, desc, asc, like, ilike, sql, inArray } from 'drizzle-orm';
import { Department, Employee, SystemSettings, AttendanceStatus, ScanResult, OvertimeRecord } from '../types/index.ts';
import {
  calculateAttendanceMetrics,
  timeStringToSeconds,
  secondsToTimeString,
  isValidTimeFormat,
  isValidDateFormat,
} from './attendanceEngine.ts';
import {
  calculateEmployeePayroll,
  calculateBatchPayroll,
  isValidPayrollPeriod,
  roundCurrency,
  PayrollStatus,
  EmployeePayrollInput,
  BatchPayrollSummary,
} from './payrollEngine.ts';
import { NotificationService } from '../notifications/notification.service.ts';
import {
  validateEmployeeInput,
  validateAttendanceInput,
  validateOvertimeInput,
  validatePayrollInput,
  validateDepartmentInput,
  validateUserInput,
  EMAIL_REGEX,
  DATE_REGEX,
  TIME_REGEX,
} from './validation.ts';

// ----------------------------------------------------
// System Settings Service
// ----------------------------------------------------
export async function getSettingsMap(): Promise<SystemSettings> {
  const defaults: SystemSettings = {
    standard_check_in: '08:00:00',
    standard_check_out: '17:00:00',
    standard_working_hours: '8.0',
    late_grace_minutes: '15',
    early_departure_threshold_minutes: '30',
    unpaid_break_hours: '1.0',
    overtime_rate_multiplier: '1.5',
    currency_symbol: 'NLe',
    company_name: 'Apex Enterprise Solutions',
  };

  try {
    const list = await db.select().from(systemSettings);
    list.forEach((item) => {
      if (item.settingKey in defaults) {
        (defaults as any)[item.settingKey] = item.settingValue;
      }
    });
    return defaults;
  } catch (error) {
    console.error('Failed to get settings, using defaults:', error);
    return defaults;
  }
}

export async function getCompanyKnowledge(): Promise<Record<string, string>> {
  try {
    const list = await db.select().from(systemSettings);
    const map: Record<string, string> = {};
    for (const item of list) {
      map[item.settingKey] = item.settingValue;
    }
    return map;
  } catch (err) {
    console.error('Failed to load company knowledge:', err);
    return {};
  }
}

export async function updateSetting(key: string, value: string, description?: string) {
  return await db
    .insert(systemSettings)
    .values({
      settingKey: key,
      settingValue: value,
      description: description || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.settingKey,
      set: {
        settingValue: value,
        updatedAt: new Date(),
      },
    });
}

// ----------------------------------------------------
// Audit Logger
// ----------------------------------------------------
export async function recordAudit(
  userId: number | null,
  username: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: string | null
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      username,
      action,
      entity,
      entityId: entityId || null,
      details: details || null,
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

// ----------------------------------------------------
// Role & User Services
// ----------------------------------------------------
export async function getRoles() {
  return await db.select().from(roles).orderBy(roles.id);
}

export async function getUsers() {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      roleId: users.roleId,
      roleName: roles.roleName,
      employeeId: users.employeeId,
      employeeCode: employees.employeeCode,
      employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(employees, eq(users.employeeId, employees.id))
    .orderBy(users.id);
  return result;
}

export async function createUser(data: {
  username: string;
  password: string;
  roleId: number;
  employeeId?: number | null;
}) {
  const val = validateUserInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const [created] = await db
    .insert(users)
    .values({
      username: data.username.toLowerCase().trim(),
      passwordHash: hashedPassword,
      roleId: data.roleId,
      employeeId: data.employeeId || null,
      status: 'active',
    })
    .returning();

  // Strip password hash from returned object
  const { passwordHash, ...safeUser } = created;
  return safeUser;
}

export async function updateUser(
  id: number,
  data: {
    roleId?: number;
    employeeId?: number | null;
    status?: string;
    password?: string;
  }
) {
  const val = validateUserInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const updateData: any = {};
  if (data.roleId !== undefined) updateData.roleId = data.roleId;
  if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
  if (!updated) throw new Error('User not found.');

  const { passwordHash, ...safeUser } = updated;
  return safeUser;
}

export async function deleteUser(id: number) {
  // Soft deactivate or delete
  return await db.update(users).set({ status: 'inactive' }).where(eq(users.id, id));
}

// ----------------------------------------------------
// Department Services
// ----------------------------------------------------
export async function getDepartments() {
  const depts = await db.select().from(departments).orderBy(departments.id);

  // Calculate employee counts per department
  const empCounts = await db
    .select({
      departmentId: employees.departmentId,
      count: sql<number>`count(${employees.id})::int`,
    })
    .from(employees)
    .groupBy(employees.departmentId);

  const countMap = new Map(empCounts.map((ec) => [ec.departmentId, ec.count]));

  return depts.map((d) => ({
    ...d,
    employeeCount: countMap.get(d.id) || 0,
  }));
}

export async function createDepartment(name: string, description?: string) {
  const val = validateDepartmentInput({ departmentName: name, description });
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(ilike(departments.departmentName, trimmed));

  if (existing) {
    throw new Error(`A department named "${trimmed}" already exists.`);
  }

  const [created] = await db
    .insert(departments)
    .values({
      departmentName: trimmed,
      description: description?.trim() || null,
    })
    .returning();
  return created;
}

export async function updateDepartment(id: number, name: string, description?: string) {
  const val = validateDepartmentInput({ departmentName: name, description });
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(ilike(departments.departmentName, trimmed));

  if (existing && existing.id !== id) {
    throw new Error(`Another department is already named "${trimmed}".`);
  }

  const [updated] = await db
    .update(departments)
    .set({
      departmentName: trimmed,
      description: description?.trim() || null,
    })
    .where(eq(departments.id, id))
    .returning();
  return updated;
}

export async function deleteDepartment(id: number) {
  // Check if any employees are in this department
  const assigned = await db
    .select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName })
    .from(employees)
    .where(eq(employees.departmentId, id));

  if (assigned.length > 0) {
    throw new Error(
      `Cannot delete department because ${assigned.length} employee(s) (${assigned.slice(0, 3).map(e => `${e.firstName} ${e.lastName}`).join(', ')}${assigned.length > 3 ? '...' : ''}) are currently assigned. Please reassign the employees first.`
    );
  }

  return await db.delete(departments).where(eq(departments.id, id));
}

// ----------------------------------------------------
// Employee & QR Services
// ----------------------------------------------------
export async function getEmployees(filters?: { search?: string; departmentId?: number; status?: string }) {
  let query = db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      email: employees.email,
      phone: employees.phone,
      departmentId: employees.departmentId,
      departmentName: departments.departmentName,
      position: employees.position,
      photoUrl: employees.photoUrl,
      basicSalary: employees.basicSalary,
      status: employees.status,
      createdAt: employees.createdAt,
      qrId: qrCodes.id,
      qrValue: qrCodes.qrValue,
      qrStatus: qrCodes.status,
      qrGeneratedAt: qrCodes.generatedAt,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(qrCodes, eq(employees.id, qrCodes.employeeId))
    .orderBy(employees.id);

  const results = await query;

  const filtered = results.filter((emp) => {
    if (filters?.departmentId && emp.departmentId !== filters.departmentId) return false;
    if (filters?.status && emp.status !== filters.status) return false;
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const matchesCode = emp.employeeCode.toLowerCase().includes(s);
      const matchesEmail = emp.email.toLowerCase().includes(s);
      const matchesPos = emp.position.toLowerCase().includes(s);
      if (!fullName.includes(s) && !matchesCode && !matchesEmail && !matchesPos) return false;
    }
    return true;
  });

  return await Promise.all(
    filtered.map(async (emp) => {
      let qrDataUrl = '';
      if (emp.qrValue) {
        try {
          qrDataUrl = await QRCode.toDataURL(emp.qrValue, { width: 140, margin: 1 });
        } catch (e) { }
      }

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName || 'Unassigned',
        position: emp.position,
        photoUrl: emp.photoUrl || (emp.employeeCode ? `/uploads/employees/${emp.employeeCode}.jpg` : null),
        basicSalary: emp.basicSalary,
        status: emp.status as 'active' | 'inactive',
        createdAt: emp.createdAt.toISOString(),
        qrCode: emp.qrId
          ? {
            id: emp.qrId,
            qrValue: emp.qrValue!,
            status: emp.qrStatus!,
            generatedAt: emp.qrGeneratedAt!.toISOString(),
            dataUrl: qrDataUrl || undefined,
          }
          : null,
      };
    })
  );
}

export async function getEmployeeById(id: number) {
  const [emp] = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      email: employees.email,
      phone: employees.phone,
      departmentId: employees.departmentId,
      departmentName: departments.departmentName,
      position: employees.position,
      photoUrl: employees.photoUrl,
      basicSalary: employees.basicSalary,
      status: employees.status,
      createdAt: employees.createdAt,
      qrId: qrCodes.id,
      qrValue: qrCodes.qrValue,
      qrStatus: qrCodes.status,
      qrGeneratedAt: qrCodes.generatedAt,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(qrCodes, eq(employees.id, qrCodes.employeeId))
    .where(eq(employees.id, id));

  if (!emp) return null;

  let qrDataUrl = '';
  if (emp.qrValue) {
    try {
      qrDataUrl = await QRCode.toDataURL(emp.qrValue, { width: 300, margin: 2 });
    } catch (e) {
      console.error('QR generation error:', e);
    }
  }

  // Get user account if exists
  const [userAcc] = await db
    .select({
      id: users.id,
      username: users.username,
      roleId: users.roleId,
      status: users.status,
    })
    .from(users)
    .where(eq(users.employeeId, id));

  return {
    id: emp.id,
    employeeCode: emp.employeeCode,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    phone: emp.phone,
    departmentId: emp.departmentId,
    departmentName: emp.departmentName || 'Unassigned',
    position: emp.position,
    photoUrl: emp.photoUrl || (emp.employeeCode ? `/uploads/employees/${emp.employeeCode}.jpg` : null),
    basicSalary: emp.basicSalary,
    status: emp.status as 'active' | 'inactive',
    createdAt: emp.createdAt.toISOString(),
    userAccount: userAcc || null,
    qrCode: emp.qrId
      ? {
        id: emp.qrId,
        qrValue: emp.qrValue!,
        status: emp.qrStatus!,
        generatedAt: emp.qrGeneratedAt!.toISOString(),
        dataUrl: qrDataUrl,
      }
      : null,
  };
}

export async function createEmployee(data: {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: number;
  position: string;
  basicSalary: string | number;
  photoUrl?: string;
  createAccount?: boolean;
  username?: string;
  password?: string;
  roleId?: number;
}) {
  const val = validateEmployeeInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const code = data.employeeCode.trim().toUpperCase();
  const emailTrimmed = data.email.trim().toLowerCase();

  // Validate Code Uniqueness
  const [existingCode] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.employeeCode, code));
  if (existingCode) {
    throw new Error(`Employee Code "${code}" is already assigned to another employee.`);
  }

  // Validate Email Uniqueness
  const [existingEmail] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.email, emailTrimmed));
  if (existingEmail) {
    throw new Error(`Email address "${emailTrimmed}" is already registered.`);
  }

  // Validate Department
  const [dept] = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, data.departmentId));
  if (!dept) {
    throw new Error(`Selected department is invalid or does not exist.`);
  }

  // Validate Salary
  const salaryNum = parseFloat(data.basicSalary.toString());
  if (isNaN(salaryNum) || salaryNum < 0) {
    throw new Error(`Basic salary must be a valid positive number.`);
  }

  // If user account is requested, validate username
  if (data.createAccount) {
    const un = (data.username || emailTrimmed.split('@')[0]).toLowerCase().trim();
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, un));
    if (existingUser) {
      throw new Error(`Username "${un}" is already taken for a system login account.`);
    }
  }

  const [newEmp] = await db
    .insert(employees)
    .values({
      employeeCode: code,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailTrimmed,
      phone: data.phone.trim(),
      departmentId: data.departmentId,
      position: data.position.trim(),
      photoUrl: data.photoUrl ? data.photoUrl.trim() : null,
      basicSalary: salaryNum.toFixed(2),
      status: 'active',
    })
    .returning();

  // Generate unique secure QR Value
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();
  const qrValue = `APEX-QR-${newEmp.employeeCode}-${randomSuffix}`;
  const [createdQr] = await db
    .insert(qrCodes)
    .values({
      employeeId: newEmp.id,
      qrValue,
      status: 'active',
    })
    .returning();

  // Create linked system user if requested
  if (data.createAccount && data.roleId) {
    const un = (data.username || emailTrimmed.split('@')[0]).toLowerCase().trim();
    const rawPass = data.password || 'password123';
    const hashedPassword = await bcrypt.hash(rawPass, 10);
    await db.insert(users).values({
      username: un,
      passwordHash: hashedPassword,
      roleId: data.roleId,
      employeeId: newEmp.id,
      status: 'active',
    });
  }

  return { employee: newEmp, qrCode: createdQr };
}

export async function updateEmployee(
  id: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    departmentId?: number;
    position?: string;
    basicSalary?: string | number;
    photoUrl?: string | null;
    status?: 'active' | 'inactive';
  }
) {
  const val = validateEmployeeInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const updateData: any = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();

  if (data.email !== undefined) {
    const emailTrimmed = data.email.trim().toLowerCase();
    const [existingEmail] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.email, emailTrimmed));
    if (existingEmail && existingEmail.id !== id) {
      throw new Error(`Email address "${emailTrimmed}" is already registered to another employee.`);
    }
    updateData.email = emailTrimmed;
  }

  if (data.phone !== undefined) updateData.phone = data.phone.trim();

  if (data.departmentId !== undefined) {
    const [dept] = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, data.departmentId));
    if (!dept) {
      throw new Error(`Selected department is invalid.`);
    }
    updateData.departmentId = data.departmentId;
  }

  if (data.position !== undefined) updateData.position = data.position.trim();
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl ? data.photoUrl.trim() : null;

  if (data.basicSalary !== undefined) {
    const salaryNum = parseFloat(data.basicSalary.toString());
    if (isNaN(salaryNum) || salaryNum < 0) {
      throw new Error(`Basic salary must be a valid positive number.`);
    }
    updateData.basicSalary = salaryNum.toFixed(2);
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'active') {
      // Reactivate QR Code & user if reactivated
      await db.update(qrCodes).set({ status: 'active' }).where(eq(qrCodes.employeeId, id));
      await db.update(users).set({ status: 'active' }).where(eq(users.employeeId, id));
    } else if (data.status === 'inactive') {
      await db.update(qrCodes).set({ status: 'revoked' }).where(eq(qrCodes.employeeId, id));
      await db.update(users).set({ status: 'inactive' }).where(eq(users.employeeId, id));
    }
  }

  const [updated] = await db.update(employees).set(updateData).where(eq(employees.id, id)).returning();
  return updated;
}

export async function deleteEmployee(id: number) {
  const [emp] = await db.select().from(employees).where(eq(employees.id, id));
  if (!emp) throw new Error('Employee not found');

  // Deactivate linked system user if any
  await db.update(users).set({ status: 'inactive' }).where(eq(users.employeeId, id));

  // Revoke QR code
  await db.update(qrCodes).set({ status: 'revoked' }).where(eq(qrCodes.employeeId, id));

  // Soft delete by marking employee as inactive
  const [deactivated] = await db
    .update(employees)
    .set({ status: 'inactive' })
    .where(eq(employees.id, id))
    .returning();

  return deactivated;
}

export async function getQRCodeByEmployeeId(employeeId: number) {
  const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId));
  if (!emp) throw new Error('Employee not found');

  let [qr] = await db.select().from(qrCodes).where(eq(qrCodes.employeeId, employeeId));
  if (!qr) {
    // Generate QR code if missing
    return regenerateEmployeeQRCode(employeeId);
  }

  const dataUrl = await QRCode.toDataURL(qr.qrValue, { width: 300, margin: 2 });
  return { ...qr, dataUrl, employee: emp };
}

export async function regenerateEmployeeQRCode(employeeId: number) {
  const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId));
  if (!emp) throw new Error('Employee not found');

  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();
  const newQrValue = `APEX-QR-${emp.employeeCode}-${randomSuffix}`;

  const [updatedQr] = await db
    .insert(qrCodes)
    .values({
      employeeId: emp.id,
      qrValue: newQrValue,
      status: 'active',
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: qrCodes.employeeId,
      set: {
        qrValue: newQrValue,
        status: 'active',
        generatedAt: new Date(),
      },
    })
    .returning();

  const dataUrl = await QRCode.toDataURL(newQrValue, { width: 300, margin: 2 });
  return { ...updatedQr, dataUrl };
}

export async function getAllQRCodes() {
  const results = await db
    .select({
      id: qrCodes.id,
      employeeId: qrCodes.employeeId,
      qrValue: qrCodes.qrValue,
      generatedAt: qrCodes.generatedAt,
      status: qrCodes.status,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      email: employees.email,
      position: employees.position,
      photoUrl: employees.photoUrl,
      departmentName: departments.departmentName,
    })
    .from(qrCodes)
    .innerJoin(employees, eq(qrCodes.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(desc(qrCodes.generatedAt));

  const list = await Promise.all(
    results.map(async (item) => {
      let dataUrl = '';
      try {
        dataUrl = await QRCode.toDataURL(item.qrValue, { width: 250, margin: 2 });
      } catch (e) { }
      return {
        id: item.id,
        employeeId: item.employeeId,
        employeeName: `${item.firstName} ${item.lastName}`,
        employeeCode: item.employeeCode,
        departmentName: item.departmentName || 'Unassigned',
        position: item.position,
        photoUrl: item.photoUrl || (item.employeeCode ? `/uploads/employees/${item.employeeCode}.jpg` : null),
        qrValue: item.qrValue,
        generatedAt: item.generatedAt.toISOString(),
        status: item.status as 'active' | 'revoked',
        dataUrl,
        employee: {
          id: item.employeeId,
          employeeCode: item.employeeCode,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          position: item.position,
          photoUrl: item.photoUrl || (item.employeeCode ? `/uploads/employees/${item.employeeCode}.jpg` : null),
          departmentName: item.departmentName || 'Unassigned',
        },
      };
    })
  );

  return list;
}

// ----------------------------------------------------
// QR Scanning & Attendance Core Engine
// ----------------------------------------------------
interface CooldownEntry {
  timestamp: number;
  actionType: string;
}
const scanCooldownStore = new Map<number, CooldownEntry>();
export const SCAN_COOLDOWN_SECONDS = 30;

export interface QRScanOptions {
  skipCooldown?: boolean;
  timestampOverride?: Date;
  isOfflineSync?: boolean;
}

export interface OfflinePunchItem {
  id: string;
  qrValue: string;
  mode?: 'auto' | 'check_in' | 'check_out';
  timestamp: string;
}

export async function processQRScan(
  identifier: string,
  actionType: 'auto' | 'check_in' | 'check_out' = 'auto',
  options?: QRScanOptions
): Promise<ScanResult> {
  const trimmed = identifier?.trim();
  if (!trimmed) {
    return {
      success: false,
      type: 'error',
      message: 'Invalid QR Code.',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // 1. Find matching QR Code or Employee Code
    let employeeId: number | null = null;

    const [matchedQr] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.qrValue, trimmed));

    if (matchedQr) {
      if (matchedQr.status !== 'active') {
        return {
          success: false,
          type: 'error',
          message: 'Invalid QR Code.',
          timestamp: new Date().toISOString(),
        };
      }
      employeeId = matchedQr.employeeId;
    } else {
      // Check if directly entered employee code
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.employeeCode, trimmed.toUpperCase()));
      if (emp) {
        employeeId = emp.id;
      }
    }

    if (!employeeId) {
      return {
        success: false,
        type: 'error',
        message: 'Invalid QR Code.',
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Fetch employee details and verify status
    const empDetails = await getEmployeeById(employeeId);
    if (!empDetails) {
      return {
        success: false,
        type: 'error',
        message: 'Employee not found.',
        timestamp: new Date().toISOString(),
      };
    }

    if (empDetails.status !== 'active') {
      return {
        success: false,
        type: 'error',
        message: 'Employee account is inactive.',
        timestamp: new Date().toISOString(),
        employee: {
          id: empDetails.id,
          code: empDetails.employeeCode,
          name: `${empDetails.firstName} ${empDetails.lastName}`,
          department: empDetails.departmentName,
          position: empDetails.position,
          photoUrl: empDetails.photoUrl || null,
        },
      };
    }

    const now = options?.timestampOverride instanceof Date ? options.timestampOverride : new Date();

    // 2b. Debounce / Duplicate Scan Guard (Backend Cooldown Threshold)
    if (!options?.skipCooldown) {
      const lastScan = scanCooldownStore.get(empDetails.id);
      if (lastScan && (lastScan.actionType === actionType || actionType === 'auto')) {
        const elapsedMs = Date.now() - lastScan.timestamp;
        if (elapsedMs < SCAN_COOLDOWN_SECONDS * 1000) {
          const cooldownRemaining = Math.ceil((SCAN_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
          return {
            success: false,
            type: 'info',
            message: `Attendance already recorded. Duplicate scan prevented (Cooldown active: ${cooldownRemaining}s remaining).`,
            timestamp: now.toISOString(),
            cooldownSecondsRemaining: cooldownRemaining,
            employee: {
              id: empDetails.id,
              code: empDetails.employeeCode,
              name: `${empDetails.firstName} ${empDetails.lastName}`,
              department: empDetails.departmentName,
              position: empDetails.position,
              photoUrl: empDetails.photoUrl || null,
            },
          };
        }
      }
    }

    // 3. Settings & Time calculation (Fetched dynamically, never hard-coded)
    const settings = await getSettingsMap();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const standardCheckIn = settings.standard_check_in || '08:00:00';
    const standardCheckOut = settings.standard_check_out || '17:00:00';
    const standardWorkingHours = parseFloat(settings.standard_working_hours) || 8.0;
    const unpaidBreakHours = parseFloat(settings.unpaid_break_hours) || 1.0;
    const lateThresholdMinutes = parseInt(settings.late_grace_minutes || '15', 10);
    const earlyDepartureThresholdMinutes = parseInt(settings.early_departure_threshold_minutes || '30', 10);

    // 4. Check existing attendance record for today (Duplicate attendance protection)
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.attendanceDate, todayStr)));

    // Case 1: Shift is already complete (Both checked in AND checked out)
    if (existingRecord && existingRecord.checkOut) {
      return {
        success: false,
        type: 'info',
        message: 'Attendance already recorded.',
        timestamp: now.toISOString(),
        employee: {
          id: empDetails.id,
          code: empDetails.employeeCode,
          name: `${empDetails.firstName} ${empDetails.lastName}`,
          department: empDetails.departmentName,
          position: empDetails.position,
          photoUrl: empDetails.photoUrl || null,
        },
        attendance: {
          id: existingRecord.id,
          date: existingRecord.attendanceDate,
          checkIn: existingRecord.checkIn,
          checkOut: existingRecord.checkOut,
          status: existingRecord.status as AttendanceStatus,
          workingHours: parseFloat(existingRecord.workingHours.toString()),
          overtimeHours: parseFloat(existingRecord.overtimeHours.toString()),
        },
      };
    }

    // Case 2: Employee wants check-in, but is already checked in and on shift
    if (existingRecord && actionType === 'check_in') {
      return {
        success: false,
        type: 'info',
        message: 'Attendance already recorded.',
        timestamp: now.toISOString(),
        employee: {
          id: empDetails.id,
          code: empDetails.employeeCode,
          name: `${empDetails.firstName} ${empDetails.lastName}`,
          department: empDetails.departmentName,
          position: empDetails.position,
          photoUrl: empDetails.photoUrl || null,
        },
        attendance: {
          id: existingRecord.id,
          date: existingRecord.attendanceDate,
          checkIn: existingRecord.checkIn,
          checkOut: null,
          status: existingRecord.status as AttendanceStatus,
          workingHours: 0,
          overtimeHours: 0,
        },
      };
    }

    // Case 3: No existing check-in, but action requested is check_out
    if (!existingRecord && actionType === 'check_out') {
      return {
        success: false,
        type: 'error',
        message: 'Cannot check out without a valid check-in.',
        timestamp: now.toISOString(),
      };
    }

    // Case 4: Check-In (First scan of the day)
    if (!existingRecord) {
      const calculation = calculateAttendanceMetrics({
        checkIn: currentTimeStr,
        checkOut: null,
        standardCheckIn,
        standardCheckOut,
        standardWorkingHours,
        unpaidBreakHours,
        lateThresholdMinutes,
        earlyDepartureThresholdMinutes,
      });

      const [newAtt] = await db
        .insert(attendance)
        .values({
          employeeId: empDetails.id,
          attendanceDate: todayStr,
          checkIn: currentTimeStr,
          checkOut: null,
          workingHours: '0.00',
          overtimeHours: '0.00',
          status: calculation.status,
        })
        .returning();

      // Record successful cooldown
      scanCooldownStore.set(empDetails.id, { timestamp: Date.now(), actionType: 'check_in' });

      await recordAudit(
        null,
        options?.isOfflineSync ? 'OFFLINE_SYNC' : 'QR_SCANNER',
        'CHECK_IN',
        'attendance',
        newAtt.id.toString(),
        `${empDetails.employeeCode} (${empDetails.firstName} ${empDetails.lastName}) checked in at ${currentTimeStr} [${calculation.status}]${options?.isOfflineSync ? ' (Synced from offline cache)' : ''}`
      );

      // Non-blocking Attendance Check-In / Late Notification Dispatch
      try {
        const isLate = calculation.status === 'Late';
        NotificationService.dispatch({
          employeeId: empDetails.id,
          title: isLate ? 'Late Attendance Notice' : 'Check-In Recorded',
          message: isLate
            ? `Your attendance was recorded after the configured start time at ${currentTimeStr}.`
            : `Your attendance has been successfully recorded at ${currentTimeStr}.`,
          category: 'Attendance',
          type: 'ATTENDANCE',
          priority: isLate ? 'normal' : 'low',
          actionUrl: '/attendance',
          idempotencyKey: `att-in-${empDetails.id}-${todayStr}`,
        }).catch((e) => console.warn('[Notification] Check-in alert dispatch error:', e));
      } catch (notifErr) {
        console.warn('[Notification] Check-in notification error ignored to preserve attendance transaction:', notifErr);
      }

      return {
        success: true,
        type: 'check_in',
        message: 'Attendance recorded successfully.',
        timestamp: now.toISOString(),
        isOfflineSync: options?.isOfflineSync || false,
        employee: {
          id: empDetails.id,
          code: empDetails.employeeCode,
          name: `${empDetails.firstName} ${empDetails.lastName}`,
          department: empDetails.departmentName,
          position: empDetails.position,
          photoUrl: empDetails.photoUrl || null,
        },
        attendance: {
          id: newAtt.id,
          date: newAtt.attendanceDate,
          checkIn: newAtt.checkIn,
          checkOut: null,
          status: newAtt.status as AttendanceStatus,
          workingHours: 0,
          overtimeHours: 0,
        },
      };
    }

    // Case 5: Check-Out (Existing check-in with no check-out, now completing shift)
    const calculation = calculateAttendanceMetrics({
      checkIn: existingRecord.checkIn,
      checkOut: currentTimeStr,
      standardCheckIn,
      standardCheckOut,
      standardWorkingHours,
      unpaidBreakHours,
      lateThresholdMinutes,
      earlyDepartureThresholdMinutes,
    });

    const [updatedAtt] = await db
      .update(attendance)
      .set({
        checkOut: currentTimeStr,
        workingHours: calculation.workingHours.toFixed(2),
        overtimeHours: calculation.overtimeHours.toFixed(2),
        status: calculation.status,
      })
      .where(eq(attendance.id, existingRecord.id))
      .returning();

    // Record successful cooldown
    scanCooldownStore.set(empDetails.id, { timestamp: Date.now(), actionType: 'check_out' });

    await recordAudit(
      null,
      options?.isOfflineSync ? 'OFFLINE_SYNC' : 'QR_SCANNER',
      'CHECK_OUT',
      'attendance',
      updatedAtt.id.toString(),
      `${empDetails.employeeCode} (${empDetails.firstName} ${empDetails.lastName}) checked out at ${currentTimeStr}. Hours: ${calculation.workingHours}, Overtime: ${calculation.overtimeHours}, Status: ${calculation.status}${options?.isOfflineSync ? ' (Synced from offline cache)' : ''}`
    );

    // Non-blocking Attendance Check-Out & Overtime Notification Dispatch
    try {
      NotificationService.dispatch({
        employeeId: empDetails.id,
        title: 'Check-Out Recorded',
        message: `Your attendance has been recorded successfully. Check-out time: ${currentTimeStr}. Working hours: ${calculation.workingHours}h.`,
        category: 'Attendance',
        type: 'ATTENDANCE',
        priority: 'low',
        actionUrl: '/attendance',
        idempotencyKey: `att-out-${empDetails.id}-${todayStr}`,
      }).catch((e) => console.warn('[Notification] Checkout alert dispatch error:', e));

      if (calculation.overtimeHours > 0) {
        NotificationService.dispatch({
          employeeId: empDetails.id,
          title: 'Overtime Detected',
          message: `Your attendance record indicates ${calculation.overtimeHours} hours of overtime today.`,
          category: 'Overtime',
          type: 'OVERTIME',
          priority: 'normal',
          actionUrl: '/attendance',
          idempotencyKey: `att-ot-${empDetails.id}-${todayStr}`,
        }).catch((e) => console.warn('[Notification] Overtime alert dispatch error:', e));
      }
    } catch (notifErr) {
      console.warn('[Notification] Checkout notification error ignored to preserve attendance transaction:', notifErr);
    }

    return {
      success: true,
      type: 'check_out',
      message: 'Attendance recorded successfully.',
      timestamp: now.toISOString(),
      isOfflineSync: options?.isOfflineSync || false,
      employee: {
        id: empDetails.id,
        code: empDetails.employeeCode,
        name: `${empDetails.firstName} ${empDetails.lastName}`,
        department: empDetails.departmentName,
        position: empDetails.position,
        photoUrl: empDetails.photoUrl || null,
      },
      attendance: {
        id: updatedAtt.id,
        date: updatedAtt.attendanceDate,
        checkIn: updatedAtt.checkIn,
        checkOut: updatedAtt.checkOut,
        status: updatedAtt.status as AttendanceStatus,
        workingHours: calculation.workingHours,
        overtimeHours: calculation.overtimeHours,
      },
    };
  } catch (err) {
    console.error('Scan processing error:', err);
    return {
      success: false,
      type: 'error',
      message: 'Attendance transaction failed.',
      timestamp: new Date().toISOString(),
    };
  }
}

// ----------------------------------------------------
// Offline Batch Synchronization Service
// ----------------------------------------------------
export async function processOfflineBatchSync(punches: OfflinePunchItem[]) {
  const sorted = [...punches].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const results = [];
  let synced = 0;
  let failed = 0;

  for (const punch of sorted) {
    try {
      const scanDate = new Date(punch.timestamp);
      const res = await processQRScan(punch.qrValue, punch.mode || 'auto', {
        skipCooldown: true, // Batch sync processes historically recorded punches
        timestampOverride: isNaN(scanDate.getTime()) ? new Date() : scanDate,
        isOfflineSync: true,
      });

      if (res.success || res.type === 'info') {
        synced++;
        results.push({
          id: punch.id,
          success: true,
          message: res.message,
          type: res.type,
          employee: res.employee,
          attendance: res.attendance,
        });
      } else {
        failed++;
        results.push({
          id: punch.id,
          success: false,
          message: res.message,
          type: res.type,
          employee: res.employee,
        });
      }
    } catch (err: any) {
      failed++;
      results.push({
        id: punch.id,
        success: false,
        message: err.message || 'Error processing offline punch',
        type: 'error',
      });
    }
  }

  return {
    success: true,
    total: punches.length,
    synced,
    failed,
    results,
  };
}

// ----------------------------------------------------
// Attendance Query & Filtering Services
// ----------------------------------------------------
export async function getAttendanceList(filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  departmentId?: number;
  status?: string;
  search?: string;
  limit?: number;
}) {
  const query = db
    .select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      departmentId: employees.departmentId,
      departmentName: departments.departmentName,
      position: employees.position,
      attendanceDate: attendance.attendanceDate,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      workingHours: attendance.workingHours,
      overtimeHours: attendance.overtimeHours,
      status: attendance.status,
      createdAt: attendance.createdAt,
    })
    .from(attendance)
    .innerJoin(employees, eq(attendance.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(desc(attendance.attendanceDate), desc(attendance.id));

  const records = await query;

  return records
    .filter((r) => {
      if (filters?.employeeId && r.employeeId !== filters.employeeId) return false;
      if (filters?.departmentId && r.departmentId !== filters.departmentId) return false;
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.date && r.attendanceDate !== filters.date) return false;
      if (filters?.startDate && r.attendanceDate < filters.startDate) return false;
      if (filters?.endDate && r.attendanceDate > filters.endDate) return false;
      if (filters?.search) {
        const s = filters.search.toLowerCase().trim();
        const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
        const code = (r.employeeCode || '').toLowerCase();
        const dept = (r.departmentName || '').toLowerCase();
        const pos = (r.position || '').toLowerCase();
        if (!fullName.includes(s) && !code.includes(s) && !dept.includes(s) && !pos.includes(s)) {
          return false;
        }
      }
      return true;
    })
    .slice(0, filters?.limit || 1000)
    .map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeCode: r.employeeCode,
      employeeName: `${r.firstName} ${r.lastName}`,
      departmentName: r.departmentName || 'Unassigned',
      position: r.position,
      attendanceDate: r.attendanceDate,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      workingHours: r.workingHours,
      overtimeHours: r.overtimeHours,
      status: r.status as AttendanceStatus,
      createdAt: r.createdAt.toISOString(),
    }));
}

export async function createManualAttendance(data: {
  employeeId: number;
  attendanceDate: string;
  checkIn: string;
  checkOut?: string | null;
  workingHours?: string | number;
  overtimeHours?: string | number;
  status?: AttendanceStatus;
  notes?: string;
  adminUsername?: string;
}) {
  const val = validateAttendanceInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  if (!isValidDateFormat(data.attendanceDate)) {
    throw new Error(`Invalid attendance date format: ${data.attendanceDate}. Expected YYYY-MM-DD.`);
  }

  if (!isValidTimeFormat(data.checkIn)) {
    throw new Error(`Invalid check-in time format: ${data.checkIn}. Expected HH:MM:SS or HH:MM.`);
  }

  if (data.checkOut && !isValidTimeFormat(data.checkOut)) {
    throw new Error(`Invalid check-out time format: ${data.checkOut}. Expected HH:MM:SS or HH:MM.`);
  }

  // Prevent duplicate check-in for the same employee on the same date
  const [existing] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.employeeId, data.employeeId), eq(attendance.attendanceDate, data.attendanceDate)));

  if (existing) {
    throw new Error(`An attendance record already exists for this employee on ${data.attendanceDate}. Duplicate attendance prevented.`);
  }

  const settings = await getSettingsMap();
  const standardCheckIn = settings.standard_check_in || '08:00:00';
  const standardCheckOut = settings.standard_check_out || '17:00:00';
  const standardWorkingHours = parseFloat(settings.standard_working_hours) || 8.0;
  const unpaidBreakHours = parseFloat(settings.unpaid_break_hours) || 1.0;
  const lateThresholdMinutes = parseInt(settings.late_grace_minutes || '15', 10);
  const earlyDepartureThresholdMinutes = parseInt(settings.early_departure_threshold_minutes || '30', 10);

  // Compute metrics using the central formula
  const calculated = calculateAttendanceMetrics({
    checkIn: data.checkIn,
    checkOut: data.checkOut || null,
    standardCheckIn,
    standardCheckOut,
    standardWorkingHours,
    unpaidBreakHours,
    lateThresholdMinutes,
    earlyDepartureThresholdMinutes,
  });

  const finalWorkingHours = data.workingHours !== undefined && data.workingHours !== ''
    ? parseFloat(data.workingHours.toString()).toFixed(2)
    : calculated.workingHours.toFixed(2);

  const finalOvertimeHours = data.overtimeHours !== undefined && data.overtimeHours !== ''
    ? parseFloat(data.overtimeHours.toString()).toFixed(2)
    : calculated.overtimeHours.toFixed(2);

  const finalStatus = data.status || calculated.status;

  const [created] = await db
    .insert(attendance)
    .values({
      employeeId: data.employeeId,
      attendanceDate: data.attendanceDate,
      checkIn: data.checkIn,
      checkOut: data.checkOut || null,
      workingHours: finalWorkingHours,
      overtimeHours: finalOvertimeHours,
      status: finalStatus,
    })
    .returning();

  await recordAudit(
    null,
    data.adminUsername || 'ADMIN',
    'MANUAL_ATTENDANCE_CREATE',
    'attendance',
    created.id.toString(),
    `Manual attendance created for Employee ID ${data.employeeId} on ${data.attendanceDate}: ${finalStatus} (${data.notes || 'No note'})`
  );

  return created;
}

export async function updateAttendanceRecord(
  id: number,
  data: {
    checkIn?: string;
    checkOut?: string | null;
    workingHours?: string | number;
    overtimeHours?: string | number;
    status?: AttendanceStatus;
    attendanceDate?: string;
  },
  adminUsername?: string
) {
  const val = validateAttendanceInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }
  const updateData: any = {};
  if (data.checkIn !== undefined) {
    if (!isValidTimeFormat(data.checkIn)) throw new Error('Invalid check-in time');
    updateData.checkIn = data.checkIn;
  }
  if (data.checkOut !== undefined) {
    if (data.checkOut && !isValidTimeFormat(data.checkOut)) throw new Error('Invalid check-out time');
    updateData.checkOut = data.checkOut;
  }
  if (data.workingHours !== undefined) updateData.workingHours = parseFloat(data.workingHours.toString()).toFixed(2);
  if (data.overtimeHours !== undefined) updateData.overtimeHours = parseFloat(data.overtimeHours.toString()).toFixed(2);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.attendanceDate !== undefined) {
    if (!isValidDateFormat(data.attendanceDate)) throw new Error('Invalid attendance date');
    updateData.attendanceDate = data.attendanceDate;
  }

  const [updated] = await db.update(attendance).set(updateData).where(eq(attendance.id, id)).returning();

  await recordAudit(
    null,
    adminUsername || 'ADMIN',
    'ATTENDANCE_UPDATED',
    'attendance',
    id.toString(),
    `Attendance ID ${id} updated by ${adminUsername || 'Admin'}`
  );

  return updated;
}

export async function deleteAttendanceRecord(id: number, adminUsername?: string) {
  const [deleted] = await db.delete(attendance).where(eq(attendance.id, id)).returning();
  await recordAudit(
    null,
    adminUsername || 'ADMIN',
    'ATTENDANCE_DELETED',
    'attendance',
    id.toString(),
    `Attendance record ID ${id} deleted by ${adminUsername || 'Admin'}`
  );
  return deleted;
}

// ----------------------------------------------------
// Overtime Management Services
// ----------------------------------------------------
export async function getOvertimeList(filters?: {
  employeeId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: number;
}) {
  const records = await db
    .select({
      id: overtime.id,
      employeeId: overtime.employeeId,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      departmentId: employees.departmentId,
      departmentName: departments.departmentName,
      position: employees.position,
      basicSalary: employees.basicSalary,
      overtimeDate: overtime.overtimeDate,
      hours: overtime.hours,
      rateMultiplier: overtime.rateMultiplier,
      amount: overtime.amount,
      reason: overtime.reason,
      status: overtime.status,
      approvedBy: overtime.approvedBy,
      approverUsername: users.username,
      approvedAt: overtime.approvedAt,
      createdAt: overtime.createdAt,
    })
    .from(overtime)
    .innerJoin(employees, eq(overtime.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(users, eq(overtime.approvedBy, users.id))
    .orderBy(desc(overtime.overtimeDate), desc(overtime.id));

  return records
    .filter((r) => {
      if (filters?.employeeId && r.employeeId !== filters.employeeId) return false;
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.startDate && r.overtimeDate < filters.startDate) return false;
      if (filters?.endDate && r.overtimeDate > filters.endDate) return false;
      if (filters?.departmentId && r.departmentId !== filters.departmentId) return false;
      return true;
    })
    .map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeCode: r.employeeCode,
      employeeName: `${r.firstName} ${r.lastName}`,
      departmentName: r.departmentName || 'Unassigned',
      position: r.position,
      overtimeDate: r.overtimeDate,
      hours: r.hours,
      rateMultiplier: r.rateMultiplier,
      amount: r.amount,
      reason: r.reason,
      status: r.status as 'Pending' | 'Approved' | 'Rejected',
      approvedBy: r.approvedBy,
      approverName: r.approverUsername || null,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
}

export async function createOvertimeRecord(data: {
  employeeId: number;
  overtimeDate: string;
  hours: number | string;
  rateMultiplier?: number | string;
  reason?: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: number;
  username?: string;
}) {
  const val = validateOvertimeInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const [emp] = await db.select().from(employees).where(eq(employees.id, data.employeeId));
  if (!emp) throw new Error('Employee not found');

  const settings = await getSettingsMap();
  const defaultMultiplier = parseFloat(settings.overtime_rate_multiplier) || 1.5;
  const multiplier = data.rateMultiplier !== undefined ? parseFloat(data.rateMultiplier.toString()) : defaultMultiplier;
  const hours = parseFloat(data.hours.toString()) || 0;
  const basic = parseFloat(emp.basicSalary.toString()) || 0;
  const hourlyRate = basic / (22 * (parseFloat(settings.standard_working_hours) || 8.0));
  const amount = Math.round(hours * hourlyRate * multiplier * 100) / 100;

  const [created] = await db
    .insert(overtime)
    .values({
      employeeId: data.employeeId,
      overtimeDate: data.overtimeDate,
      hours: hours.toFixed(2),
      rateMultiplier: multiplier.toFixed(2),
      amount: amount.toFixed(2),
      reason: data.reason || null,
      status: data.status || 'Pending',
      approvedBy: data.approvedBy || null,
      approvedAt: data.status === 'Approved' ? new Date() : null,
    })
    .returning();

  await recordAudit(
    data.approvedBy || null,
    data.username || 'USER',
    'OVERTIME_REQUEST_CREATED',
    'overtime',
    created.id.toString(),
    `Created overtime record of ${hours} hrs for Employee ${emp.employeeCode} on ${data.overtimeDate} (Status: ${created.status})`
  );

  return created;
}

export async function updateOvertimeRecord(
  id: number,
  data: {
    hours?: number | string;
    rateMultiplier?: number | string;
    reason?: string;
    status?: 'Pending' | 'Approved' | 'Rejected';
  },
  username = 'ADMIN'
) {
  const val = validateOvertimeInput(data);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const [existing] = await db.select().from(overtime).where(eq(overtime.id, id));
  if (!existing) throw new Error('Overtime record not found');

  const [emp] = await db.select().from(employees).where(eq(employees.id, existing.employeeId));
  const settings = await getSettingsMap();

  const hours = data.hours !== undefined ? parseFloat(data.hours.toString()) : parseFloat(existing.hours.toString());
  const multiplier = data.rateMultiplier !== undefined ? parseFloat(data.rateMultiplier.toString()) : parseFloat(existing.rateMultiplier.toString());
  const basic = emp ? parseFloat(emp.basicSalary.toString()) : 0;
  const hourlyRate = basic / (22 * (parseFloat(settings.standard_working_hours) || 8.0));
  const amount = Math.round(hours * hourlyRate * multiplier * 100) / 100;

  const updateValues: any = {
    hours: hours.toFixed(2),
    rateMultiplier: multiplier.toFixed(2),
    amount: amount.toFixed(2),
  };

  if (data.reason !== undefined) updateValues.reason = data.reason;
  if (data.status !== undefined) updateValues.status = data.status;

  const [updated] = await db.update(overtime).set(updateValues).where(eq(overtime.id, id)).returning();

  await recordAudit(
    null,
    username,
    'OVERTIME_RECORD_UPDATED',
    'overtime',
    id.toString(),
    `Updated overtime record ID ${id}`
  );

  return updated;
}

export async function approveOvertimeRecord(id: number, approverUserId: number, approverUsername: string) {
  const [existing] = await db.select().from(overtime).where(eq(overtime.id, id));
  if (!existing) throw new Error('Overtime record not found');

  const [updated] = await db
    .update(overtime)
    .set({
      status: 'Approved',
      approvedBy: approverUserId,
      approvedAt: new Date(),
    })
    .where(eq(overtime.id, id))
    .returning();

  await recordAudit(
    approverUserId,
    approverUsername,
    'OVERTIME_APPROVED',
    'overtime',
    id.toString(),
    `Approved overtime record ID ${id} (${existing.hours} hrs for employee ID ${existing.employeeId})`
  );

  // Non-blocking Overtime Approval Notification
  try {
    NotificationService.dispatch({
      employeeId: existing.employeeId,
      title: 'Overtime Approved',
      message: `Your overtime record of ${existing.hours} hours for ${existing.overtimeDate} has been approved.`,
      category: 'Overtime',
      type: 'OVERTIME',
      priority: 'normal',
      actionUrl: '/attendance',
      idempotencyKey: `ot-appr-${existing.id}`,
    }).catch((e) => console.warn('[Notification] Overtime approval alert error:', e));
  } catch (notifErr) {
    console.warn('[Notification] Overtime approval notification non-fatal error:', notifErr);
  }

  return updated;
}

export async function rejectOvertimeRecord(id: number, approverUserId: number, approverUsername: string, reason?: string) {
  const [existing] = await db.select().from(overtime).where(eq(overtime.id, id));
  if (!existing) throw new Error('Overtime record not found');

  const [updated] = await db
    .update(overtime)
    .set({
      status: 'Rejected',
      approvedBy: approverUserId,
      approvedAt: new Date(),
      reason: reason ? `${existing.reason ? existing.reason + ' | Rejection reason: ' : 'Rejection reason: '}${reason}` : existing.reason,
    })
    .where(eq(overtime.id, id))
    .returning();

  await recordAudit(
    approverUserId,
    approverUsername,
    'OVERTIME_REJECTED',
    'overtime',
    id.toString(),
    `Rejected overtime record ID ${id}`
  );

  return updated;
}

export async function deleteOvertimeRecord(id: number, username = 'ADMIN') {
  const [existing] = await db.select().from(overtime).where(eq(overtime.id, id));
  if (!existing) throw new Error('Overtime record not found');

  await db.delete(overtime).where(eq(overtime.id, id));

  await recordAudit(
    null,
    username,
    'OVERTIME_DELETED',
    'overtime',
    id.toString(),
    `Deleted overtime record ID ${id}`
  );

  return { success: true, message: 'Overtime record deleted successfully.' };
}

// ----------------------------------------------------
// Payroll Core Calculation & Management Services
// ----------------------------------------------------
export async function getPayrollList(filters?: {
  period?: string;
  departmentId?: number;
  status?: string;
  employeeId?: number;
  search?: string;
}) {
  const records = await db
    .select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      departmentId: employees.departmentId,
      departmentName: departments.departmentName,
      position: employees.position,
      payrollPeriod: payroll.payrollPeriod,
      basicSalary: payroll.basicSalary,
      overtimeAmount: payroll.overtimeAmount,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      grossSalary: payroll.grossSalary,
      netSalary: payroll.netSalary,
      status: payroll.status,
      processedAt: payroll.processedAt,
      createdAt: payroll.createdAt,
    })
    .from(payroll)
    .innerJoin(employees, eq(payroll.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(desc(payroll.payrollPeriod), desc(payroll.id));

  // Compute overtime hours for each payroll item by querying attendance for that employee & period
  const results = await Promise.all(
    records.map(async (p) => {
      // Search filter
      if (filters?.search) {
        const term = filters.search.toLowerCase();
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        const code = (p.employeeCode || '').toLowerCase();
        const dept = (p.departmentName || '').toLowerCase();
        if (!fullName.includes(term) && !code.includes(term) && !dept.includes(term)) {
          return null;
        }
      }

      if (filters?.period && p.payrollPeriod !== filters.period) return null;
      if (filters?.employeeId && p.employeeId !== filters.employeeId) return null;
      if (filters?.departmentId && p.departmentId !== filters.departmentId) return null;
      if (filters?.status && p.status !== filters.status) return null;

      // Query attendance summary for that employee and period
      const periodAttendance = await db
        .select({
          overtimeHours: attendance.overtimeHours,
          workingHours: attendance.workingHours,
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.employeeId, p.employeeId),
            like(attendance.attendanceDate, `${p.payrollPeriod}%`)
          )
        );

      const totalOtHours = periodAttendance.reduce(
        (sum, a) => sum + parseFloat(a.overtimeHours?.toString() || '0'),
        0
      );
      const totalWorkHours = periodAttendance.reduce(
        (sum, a) => sum + parseFloat(a.workingHours?.toString() || '0'),
        0
      );

      return {
        id: p.id,
        employeeId: p.employeeId,
        employeeCode: p.employeeCode,
        employeeName: `${p.firstName} ${p.lastName}`,
        departmentName: p.departmentName || 'Unassigned',
        position: p.position,
        payrollPeriod: p.payrollPeriod,
        basicSalary: p.basicSalary,
        overtimeHours: roundCurrency(totalOtHours),
        workingHours: roundCurrency(totalWorkHours),
        overtimeAmount: p.overtimeAmount,
        allowances: p.allowances,
        deductions: p.deductions,
        grossSalary: p.grossSalary,
        netSalary: p.netSalary,
        status: p.status as PayrollStatus,
        processedAt: p.processedAt ? p.processedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      };
    })
  );

  return results.filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Preview Payroll calculation for period without persisting to database
 */
export async function previewPayrollForPeriod(
  period: string,
  options?: {
    departmentId?: number;
    employeeId?: number;
    defaultAllowances?: number;
    defaultDeductions?: number;
  }
): Promise<BatchPayrollSummary> {
  if (!isValidPayrollPeriod(period)) {
    throw new Error(`Invalid payroll period format: ${period}. Expected YYYY-MM.`);
  }

  const settings = await getSettingsMap();
  const otMultiplier = parseFloat(settings.overtime_rate_multiplier) || 1.5;
  const standardHours = parseFloat(settings.standard_working_hours) || 8.0;

  // Active employees query
  let activeEmployees = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      departmentId: employees.departmentId,
      departmentName: departments.departmentName,
      position: employees.position,
      basicSalary: employees.basicSalary,
      status: employees.status,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.status, 'active'));

  if (options?.departmentId) {
    activeEmployees = activeEmployees.filter((e) => e.departmentId === options.departmentId);
  }
  if (options?.employeeId) {
    activeEmployees = activeEmployees.filter((e) => e.id === options.employeeId);
  }

  const employeeInputs: EmployeePayrollInput[] = [];

  for (const emp of activeEmployees) {
    // Sum attendance for the month
    const periodAttendance = await db
      .select({
        overtimeHours: attendance.overtimeHours,
        workingHours: attendance.workingHours,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, emp.id),
          like(attendance.attendanceDate, `${period}%`)
        )
      );

    const totalOtHours = periodAttendance.reduce(
      (sum, a) => sum + parseFloat(a.overtimeHours?.toString() || '0'),
      0
    );
    const totalWorkHours = periodAttendance.reduce(
      (sum, a) => sum + parseFloat(a.workingHours?.toString() || '0'),
      0
    );

    employeeInputs.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId || undefined,
      departmentName: emp.departmentName || 'Unassigned',
      position: emp.position,
      basicSalary: emp.basicSalary,
      overtimeHours: totalOtHours,
      workingHours: totalWorkHours,
      allowances: options?.defaultAllowances !== undefined ? options.defaultAllowances : 150.0,
      deductions: options?.defaultDeductions !== undefined ? options.defaultDeductions : 50.0,
    });
  }

  return calculateBatchPayroll(
    employeeInputs,
    period,
    {
      standardWorkingHours: standardHours,
      standardWorkingDaysPerMonth: 22,
      overtimeRateMultiplier: otMultiplier,
    },
    'Draft'
  );
}

/**
 * Generate and store Payroll for a period
 */
export async function generatePayrollForPeriod(
  period: string,
  options?: {
    status?: PayrollStatus;
    defaultAllowances?: number;
    defaultDeductions?: number;
    customItems?: Array<{
      employeeId: number;
      allowances?: number;
      deductions?: number;
    }>;
  },
  adminUsername = 'ADMIN'
) {
  if (!isValidPayrollPeriod(period)) {
    throw new Error(`Invalid payroll period format: ${period}. Expected YYYY-MM.`);
  }

  const preview = await previewPayrollForPeriod(period, {
    defaultAllowances: options?.defaultAllowances,
    defaultDeductions: options?.defaultDeductions,
  });

  const settings = await getSettingsMap();
  const otMultiplier = parseFloat(settings.overtime_rate_multiplier) || 1.5;
  const standardHours = parseFloat(settings.standard_working_hours) || 8.0;
  const targetStatus = options?.status || 'Draft';

  const generatedRecords: any[] = [];

  for (const item of preview.items) {
    // Check if custom overrides exist for this employee
    const custom = options?.customItems?.find((c) => c.employeeId === item.employeeId);
    let finalItem = item;

    if (custom) {
      finalItem = calculateEmployeePayroll(
        {
          employeeId: item.employeeId,
          employeeCode: item.employeeCode,
          employeeName: item.employeeName,
          departmentId: item.departmentId,
          departmentName: item.departmentName,
          position: item.position,
          basicSalary: item.basicSalary,
          overtimeHours: item.overtimeHours,
          workingHours: item.workingHours,
          allowances: custom.allowances !== undefined ? custom.allowances : item.allowances,
          deductions: custom.deductions !== undefined ? custom.deductions : item.deductions,
        },
        {
          standardWorkingHours: standardHours,
          standardWorkingDaysPerMonth: 22,
          overtimeRateMultiplier: otMultiplier,
        },
        targetStatus,
        period
      );
    }

    // Check if payroll already exists for this employee + period
    const [existing] = await db
      .select()
      .from(payroll)
      .where(and(eq(payroll.employeeId, item.employeeId), eq(payroll.payrollPeriod, period)));

    if (existing) {
      if (existing.status !== 'Approved' && existing.status !== 'Paid') {
        const [updated] = await db
          .update(payroll)
          .set({
            basicSalary: finalItem.basicSalary.toFixed(2),
            overtimeAmount: finalItem.overtimeAmount.toFixed(2),
            allowances: finalItem.allowances.toFixed(2),
            deductions: finalItem.deductions.toFixed(2),
            grossSalary: finalItem.grossSalary.toFixed(2),
            netSalary: finalItem.netSalary.toFixed(2),
            status: targetStatus,
            processedAt: targetStatus === 'Processed' || targetStatus === 'Approved' ? new Date() : null,
          })
          .where(eq(payroll.id, existing.id))
          .returning();
        generatedRecords.push(updated);
      } else {
        generatedRecords.push(existing);
      }
    } else {
      const [inserted] = await db
        .insert(payroll)
        .values({
          employeeId: item.employeeId,
          payrollPeriod: period,
          basicSalary: finalItem.basicSalary.toFixed(2),
          overtimeAmount: finalItem.overtimeAmount.toFixed(2),
          allowances: finalItem.allowances.toFixed(2),
          deductions: finalItem.deductions.toFixed(2),
          grossSalary: finalItem.grossSalary.toFixed(2),
          netSalary: finalItem.netSalary.toFixed(2),
          status: targetStatus,
          processedAt: targetStatus === 'Processed' || targetStatus === 'Approved' ? new Date() : null,
        })
        .returning();
      generatedRecords.push(inserted);
    }
  }

  await recordAudit(
    null,
    adminUsername,
    'PAYROLL_GENERATED',
    'payroll',
    period,
    `Calculated and saved payroll for period ${period} (${generatedRecords.length} employee records, status: ${targetStatus}).`
  );

  return generatedRecords;
}

export async function updatePayrollRecord(
  id: number,
  data: {
    basicSalary?: number | string;
    allowances?: number | string;
    deductions?: number | string;
    status?: PayrollStatus;
  },
  adminUsername = 'ADMIN'
) {
  const val = validatePayrollInput({
    basicSalary: data.basicSalary,
    allowances: data.allowances,
    deductions: data.deductions,
    status: data.status,
  });
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id));
  if (!existing) throw new Error('Payroll record not found');

  const basic = data.basicSalary !== undefined ? data.basicSalary : existing.basicSalary;
  const allowances = data.allowances !== undefined ? data.allowances : existing.allowances;
  const deductions = data.deductions !== undefined ? data.deductions : existing.deductions;
  const overtimeAmount = parseFloat(existing.overtimeAmount.toString());

  // Calculate gross and net using engine formulas
  const basicNum = parseFloat(String(basic));
  if (isNaN(basicNum) || basicNum <= 0) {
    throw new Error('Basic salary must be a positive number greater than 0.');
  }

  const allowNum = parseFloat(String(allowances));
  if (isNaN(allowNum) || allowNum < 0) {
    throw new Error('Allowances cannot be negative or non-numeric.');
  }

  const dedNum = parseFloat(String(deductions));
  if (isNaN(dedNum) || dedNum < 0) {
    throw new Error('Deductions cannot be negative or non-numeric.');
  }

  const grossSalary = roundCurrency(basicNum + overtimeAmount + allowNum);
  const netSalary = roundCurrency(grossSalary - dedNum);

  const updatePayload: any = {
    basicSalary: basicNum.toFixed(2),
    allowances: allowNum.toFixed(2),
    deductions: dedNum.toFixed(2),
    grossSalary: grossSalary.toFixed(2),
    netSalary: netSalary.toFixed(2),
  };

  if (data.status) {
    updatePayload.status = data.status;
    if (data.status === 'Processed' || data.status === 'Approved' || data.status === 'Paid') {
      updatePayload.processedAt = new Date();
    }
  }

  const [updated] = await db.update(payroll).set(updatePayload).where(eq(payroll.id, id)).returning();

  await recordAudit(
    null,
    adminUsername,
    'PAYROLL_RECORD_UPDATED',
    'payroll',
    id.toString(),
    `Updated payroll ID ${id} (Status: ${updated.status}, Net: ${updated.netSalary})`
  );

  return updated;
}

export async function approvePayrollRecord(id: number, adminUsername = 'ADMIN') {
  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id));
  if (!existing) throw new Error('Payroll record not found');

  const [updated] = await db
    .update(payroll)
    .set({
      status: 'Approved',
      processedAt: new Date(),
    })
    .where(eq(payroll.id, id))
    .returning();

  await recordAudit(
    null,
    adminUsername,
    'PAYROLL_APPROVED',
    'payroll',
    id.toString(),
    `Approved payroll record ID ${id} for employee ID ${existing.employeeId} (${existing.payrollPeriod})`
  );

  // Non-blocking Employee Payslip Availability Notification
  try {
    NotificationService.dispatch({
      employeeId: existing.employeeId,
      title: 'Payroll Available',
      message: `Your payroll for ${existing.payrollPeriod} is now available. Click below to view your payslip securely.`,
      category: 'Payroll',
      type: 'PAYROLL',
      priority: 'normal',
      actionUrl: '/payroll',
      idempotencyKey: `pay-avail-${existing.employeeId}-${existing.payrollPeriod}`,
    }).catch((e) => console.warn('[Notification] Payroll available notification dispatch error:', e));
  } catch (notifErr) {
    console.warn('[Notification] Payroll notification non-fatal error:', notifErr);
  }

  return updated;
}

export async function deletePayrollRecord(id: number, adminUsername = 'ADMIN') {
  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id));
  if (!existing) throw new Error('Payroll record not found');

  const [deleted] = await db.delete(payroll).where(eq(payroll.id, id)).returning();

  await recordAudit(
    null,
    adminUsername,
    'PAYROLL_DELETED',
    'payroll',
    id.toString(),
    `Deleted payroll record ID ${id} (${existing.payrollPeriod})`
  );

  return deleted;
}

export async function processAllPayrollForPeriod(
  period: string,
  targetStatus: PayrollStatus = 'Approved',
  adminUsername = 'ADMIN'
) {
  if (!isValidPayrollPeriod(period)) {
    throw new Error(`Invalid payroll period format: ${period}. Expected YYYY-MM.`);
  }

  const result = await db
    .update(payroll)
    .set({
      status: targetStatus,
      processedAt: new Date(),
    })
    .where(eq(payroll.payrollPeriod, period))
    .returning();

  await recordAudit(
    null,
    adminUsername,
    'PAYROLL_BATCH_PROCESS',
    'payroll',
    period,
    `Batch updated ${result.length} payroll records for ${period} to status ${targetStatus}`
  );

  // Non-blocking batch notification dispatch
  try {
    if (targetStatus === 'Approved') {
      // Notify each employee their payslip is available
      for (const rec of result) {
        NotificationService.dispatch({
          employeeId: rec.employeeId,
          title: 'Payroll Available',
          message: `Your payroll for ${period} is now available. Click below to view your payslip securely.`,
          category: 'Payroll',
          type: 'PAYROLL',
          priority: 'normal',
          actionUrl: '/payroll',
          idempotencyKey: `pay-avail-${rec.employeeId}-${period}`,
        }).catch(() => {});
      }
    } else {
      // Notify Approvers that payroll review is needed
      NotificationService.dispatch({
        title: 'Payroll Approval Required',
        message: `${period} payroll is ready for review and approval.`,
        category: 'Payroll',
        type: 'APPROVAL',
        priority: 'high',
        actionUrl: '/payroll',
        idempotencyKey: `pay-req-${period}`,
      }).catch(() => {});
    }
  } catch (notifErr) {
    console.warn('[Notification] Batch payroll notification non-fatal error:', notifErr);
  }

  return result;
}

// ----------------------------------------------------
// Dashboard & Analytics Services
// ----------------------------------------------------
export async function getDashboardStats() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Total active employees
  const [empCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employees)
    .where(eq(employees.status, 'active'));
  const totalEmployees = empCount?.count || 0;

  // 2. Active departments
  const [deptCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(departments);
  const totalDepartments = deptCount?.count || 0;

  // 3. Today's attendance breakdown
  const todayRecords = await db
    .select()
    .from(attendance)
    .where(eq(attendance.attendanceDate, todayStr));

  const presentToday = todayRecords.filter((r) => r.status === 'Present' || r.status === 'Overtime').length;
  const lateToday = todayRecords.filter((r) => r.status === 'Late').length;
  const absentToday = Math.max(0, totalEmployees - (presentToday + lateToday));
  const overtimeHoursToday = todayRecords.reduce((sum, r) => sum + parseFloat(r.overtimeHours.toString() || '0'), 0);

  const attendanceRate = totalEmployees > 0 ? Math.round(((presentToday + lateToday) / totalEmployees) * 100) : 0;

  // 4. Current period payroll total
  const currentPayroll = await db
    .select({
      totalNet: sql<number>`sum(${payroll.netSalary})::numeric`,
    })
    .from(payroll)
    .where(eq(payroll.payrollPeriod, currentPeriod));

  const totalPayrollCurrentPeriod = parseFloat(currentPayroll[0]?.totalNet?.toString() || '0');

  // 5. Department statistics
  const depts = await db.select().from(departments);
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));

  const departmentStats = depts.map((d) => {
    const deptEmps = allEmps.filter((e) => e.departmentId === d.id);
    const deptEmpIds = new Set(deptEmps.map((e) => e.id));
    const deptPresent = todayRecords.filter((r) => deptEmpIds.has(r.employeeId)).length;
    return {
      departmentName: d.departmentName,
      employeeCount: deptEmps.length,
      presentCount: deptPresent,
    };
  });

  // 6. 7-Day Weekly Attendance Trend
  const weeklyTrend: any[] = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];

    const dayRecords = await db
      .select({
        status: attendance.status,
        overtime: attendance.overtimeHours,
      })
      .from(attendance)
      .where(eq(attendance.attendanceDate, dStr));

    const p = dayRecords.filter((r) => r.status === 'Present').length;
    const l = dayRecords.filter((r) => r.status === 'Late').length;
    const ot = dayRecords.filter((r) => r.status === 'Overtime').length;

    weeklyTrend.push({
      day: dayName,
      date: dStr,
      present: p,
      late: l,
      overtime: ot,
    });
  }

  // 7. Recent attendance activity
  const recentActivity = await getAttendanceList({ limit: 8 });

  // 8. Total QR codes
  const [qrCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(qrCodes)
    .where(eq(qrCodes.status, 'active'));
  const totalQRCodes = qrCount?.count || totalEmployees;

  return {
    totalEmployees,
    activeEmployees: totalEmployees,
    presentToday,
    lateToday,
    absentToday,
    todayAttendance: {
      present: presentToday,
      late: lateToday,
      absent: absentToday,
    },
    overtimeHoursToday: Math.round(overtimeHoursToday * 100) / 100,
    totalDepartments,
    totalPayrollCurrentPeriod,
    totalPayrollAmount: totalPayrollCurrentPeriod,
    currentPeriod,
    totalQRCodes,
    pendingPayrollCount: 0,
    attendanceRate,
    recentActivity,
    departmentStats,
    departmentCounts: departmentStats.map((d) => ({
      name: d.departmentName,
      count: d.employeeCount,
    })),
    weeklyTrend,
  };
}

// ----------------------------------------------------
// Database Live Status & Diagnostics Service
// ----------------------------------------------------
export async function getDatabaseStatus() {
  const start = Date.now();
  // 1. Basic query and engine version
  const versionRes = await db.execute(sql`SELECT version();`);
  const latencyMs = Date.now() - start;
  const versionStr = (versionRes.rows[0] as any)?.version || 'PostgreSQL (unknown version)';

  // 2. Database & User metadata
  const metaRes = await db.execute(
    sql`SELECT current_database() as db_name, current_user as user_name, inet_server_port() as port, NOW() as server_time;`
  );
  const meta = metaRes.rows[0] as any;

  // 3. Table counts
  const [empCount] = await db.select({ count: sql<number>`count(*)::int` }).from(employees);
  const [attCount] = await db.select({ count: sql<number>`count(*)::int` }).from(attendance);
  const [payCount] = await db.select({ count: sql<number>`count(*)::int` }).from(payroll);
  const [usrCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [depCount] = await db.select({ count: sql<number>`count(*)::int` }).from(departments);
  const [qrCount] = await db.select({ count: sql<number>`count(*)::int` }).from(qrCodes);
  const [auditCount] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
  const [otCount] = await db.select({ count: sql<number>`count(*)::int` }).from(overtime);

  return {
    status: 'connected',
    engine: 'PostgreSQL 18',
    version: versionStr,
    database: meta?.db_name || 'apex_hrms_db',
    user: meta?.user_name || 'postgres',
    port: meta?.port || 5432,
    serverTime: meta?.server_time || new Date().toISOString(),
    latencyMs,
    tableCounts: {
      employees: empCount?.count || 0,
      attendance: attCount?.count || 0,
      payroll: payCount?.count || 0,
      users: usrCount?.count || 0,
      departments: depCount?.count || 0,
      qrCodes: qrCount?.count || 0,
      auditLogs: auditCount?.count || 0,
      overtime: otCount?.count || 0,
    },
  };
}

// ----------------------------------------------------
// Bulk Import Employees (Auto-Insert & Update)
// ----------------------------------------------------
export interface BulkEmployeeItem {
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string | number;
  departmentId?: number;
  position?: string;
  basicSalary?: string | number;
  photoUrl?: string;
  status?: 'active' | 'inactive';
}

export async function bulkImportEmployees(
  items: BulkEmployeeItem[],
  adminUsername?: string
) {
  let inserted = 0;
  let updated = 0;
  const errors: Array<{ row: number; identifier: string; error: string }> = [];
  const details: Array<{ employeeCode: string; name: string; action: 'inserted' | 'updated' }> = [];

  const allDepts = await db.select().from(departments);
  const deptMapByName = new Map<string, number>();
  const deptMapById = new Map<number, number>();
  for (const d of allDepts) {
    deptMapByName.set(d.departmentName.toLowerCase().trim(), d.id);
    deptMapById.set(d.id, d.id);
  }

  let maxCodeNum = 1000;
  const existingCodes = await db.select({ employeeCode: employees.employeeCode }).from(employees);
  for (const row of existingCodes) {
    const match = row.employeeCode.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      if (val > maxCodeNum) maxCodeNum = val;
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 1;
    const identifier = item.employeeCode || item.email || `Row ${rowNum}`;

    try {
      const firstName = (item.firstName || '').trim();
      const lastName = (item.lastName || '').trim();
      const email = (item.email || '').trim().toLowerCase();
      let code = (item.employeeCode || '').trim().toUpperCase();

      if (!firstName || !lastName) {
        errors.push({ row: rowNum, identifier, error: 'First name and last name are required.' });
        continue;
      }

      if (!email || !EMAIL_REGEX.test(email)) {
        errors.push({ row: rowNum, identifier, error: `Valid email address is required (got: "${email}").` });
        continue;
      }

      if (item.basicSalary !== undefined && item.basicSalary !== null && item.basicSalary !== '') {
        const sNum = parseFloat(item.basicSalary.toString());
        if (isNaN(sNum) || sNum < 0) {
          errors.push({ row: rowNum, identifier, error: `Basic salary must be a valid positive number (got: "${item.basicSalary}").` });
          continue;
        }
      }

      // Department resolution
      let resolvedDeptId: number | null = null;
      if (item.departmentId && deptMapById.has(Number(item.departmentId))) {
        resolvedDeptId = Number(item.departmentId);
      } else if (item.department) {
        const deptStr = item.department.toString().trim();
        const asNum = parseInt(deptStr, 10);
        if (!isNaN(asNum) && deptMapById.has(asNum)) {
          resolvedDeptId = asNum;
        } else {
          const lowerName = deptStr.toLowerCase();
          if (deptMapByName.has(lowerName)) {
            resolvedDeptId = deptMapByName.get(lowerName)!;
          } else {
            const [newDept] = await db
              .insert(departments)
              .values({ departmentName: deptStr, description: 'Auto-created via data upload' })
              .returning();
            resolvedDeptId = newDept.id;
            deptMapByName.set(lowerName, newDept.id);
            deptMapById.set(newDept.id, newDept.id);
          }
        }
      }

      if (!resolvedDeptId) {
        if (allDepts.length > 0) {
          resolvedDeptId = allDepts[0].id;
        } else {
          const [firstDept] = await db
            .insert(departments)
            .values({ departmentName: 'General', description: 'Default department' })
            .returning();
          resolvedDeptId = firstDept.id;
          deptMapByName.set('general', firstDept.id);
          deptMapById.set(firstDept.id, firstDept.id);
        }
      }

      const position = (item.position || 'Staff Member').trim();
      const phone = (item.phone || '').trim();
      const salaryNum = item.basicSalary ? parseFloat(item.basicSalary.toString()) : 5000;
      const validSalary = (!isNaN(salaryNum) && salaryNum >= 0 ? salaryNum : 5000).toFixed(2);
      const photoUrl = item.photoUrl ? item.photoUrl.trim() : null;
      const status = item.status === 'inactive' ? 'inactive' : 'active';

      // Check if employee exists by code or email
      let existingEmp = null;
      if (code) {
        const [byCode] = await db.select().from(employees).where(eq(employees.employeeCode, code));
        if (byCode) existingEmp = byCode;
      }
      if (!existingEmp && email) {
        const [byEmail] = await db.select().from(employees).where(eq(employees.email, email));
        if (byEmail) existingEmp = byEmail;
      }

      if (existingEmp) {
        // UPDATE existing record
        const updatePayload: any = {
          firstName,
          lastName,
          departmentId: resolvedDeptId,
          position,
          basicSalary: validSalary,
          status,
        };
        if (phone) updatePayload.phone = phone;
        if (email) updatePayload.email = email;
        if (photoUrl) updatePayload.photoUrl = photoUrl;

        await db.update(employees).set(updatePayload).where(eq(employees.id, existingEmp.id));

        // Ensure active QR Code
        const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.employeeId, existingEmp.id));
        if (!qr) {
          const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();
          const qrVal = `APEX-QR-${existingEmp.employeeCode}-${randomSuffix}`;
          await db.insert(qrCodes).values({
            employeeId: existingEmp.id,
            qrValue: qrVal,
            status: 'active',
          });
        }

        updated++;
        details.push({
          employeeCode: existingEmp.employeeCode,
          name: `${firstName} ${lastName}`,
          action: 'updated',
        });
      } else {
        // INSERT new employee
        if (!code) {
          maxCodeNum++;
          code = `EMP-${maxCodeNum}`;
        }

        const [createdEmp] = await db
          .insert(employees)
          .values({
            employeeCode: code,
            firstName,
            lastName,
            email,
            phone,
            departmentId: resolvedDeptId,
            position,
            basicSalary: validSalary,
            photoUrl,
            status,
          })
          .returning();

        // Create QR code
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();
        const qrVal = `APEX-QR-${createdEmp.employeeCode}-${randomSuffix}`;
        await db.insert(qrCodes).values({
          employeeId: createdEmp.id,
          qrValue: qrVal,
          status: 'active',
        });

        inserted++;
        details.push({
          employeeCode: code,
          name: `${firstName} ${lastName}`,
          action: 'inserted',
        });
      }
    } catch (err: any) {
      errors.push({ row: rowNum, identifier, error: err.message || 'Processing error' });
    }
  }

  await recordAudit(
    null,
    adminUsername || 'SYSTEM',
    'EMPLOYEES_BULK_IMPORT',
    'employees',
    null,
    `Bulk import processed ${items.length} records: ${inserted} inserted, ${updated} updated, ${errors.length} errors.`
  );

  return {
    success: errors.length === 0,
    total: items.length,
    inserted,
    updated,
    errors,
    details,
  };
}

// ----------------------------------------------------
// Bulk Import Attendance (Auto-Insert & Update)
// ----------------------------------------------------
export interface BulkAttendanceItem {
  employeeCode?: string;
  employeeId?: number;
  email?: string;
  attendanceDate: string;
  checkIn?: string;
  checkOut?: string;
  workingHours?: string | number;
  overtimeHours?: string | number;
  status?: AttendanceStatus;
  notes?: string;
}

export async function bulkImportAttendance(
  items: BulkAttendanceItem[],
  adminUsername?: string
) {
  let inserted = 0;
  let updated = 0;
  const errors: Array<{ row: number; identifier: string; error: string }> = [];
  const details: Array<{ employeeCode: string; date: string; action: 'inserted' | 'updated'; status: string }> = [];

  const settings = await getSettingsMap();

  const allEmployees = await db.select().from(employees);
  const empById = new Map<number, typeof allEmployees[0]>();
  const empByCode = new Map<string, typeof allEmployees[0]>();
  const empByEmail = new Map<string, typeof allEmployees[0]>();

  for (const emp of allEmployees) {
    empById.set(emp.id, emp);
    empByCode.set(emp.employeeCode.toUpperCase().trim(), emp);
    empByEmail.set(emp.email.toLowerCase().trim(), emp);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 1;
    const identifier = item.employeeCode || (item.employeeId ? `ID ${item.employeeId}` : (item.email || `Row ${rowNum}`));

    try {
      // 1. Resolve employee
      let targetEmp = null;
      if (item.employeeId && empById.has(Number(item.employeeId))) {
        targetEmp = empById.get(Number(item.employeeId))!;
      } else if (item.employeeCode && empByCode.has(item.employeeCode.toUpperCase().trim())) {
        targetEmp = empByCode.get(item.employeeCode.toUpperCase().trim())!;
      } else if (item.email && empByEmail.has(item.email.toLowerCase().trim())) {
        targetEmp = empByEmail.get(item.email.toLowerCase().trim())!;
      }

      if (!targetEmp) {
        errors.push({ row: rowNum, identifier, error: `Employee not found for "${identifier}".` });
        continue;
      }

      // 2. Validate date
      const dateStr = (item.attendanceDate || '').trim();
      if (!isValidDateFormat(dateStr)) {
        errors.push({ row: rowNum, identifier, error: `Invalid date format "${dateStr}". Expected YYYY-MM-DD.` });
        continue;
      }

      // 3. Compute timings
      let checkIn = item.checkIn ? item.checkIn.trim() : null;
      let checkOut = item.checkOut ? item.checkOut.trim() : null;

      if (checkIn && /^\d{1,2}:\d{2}$/.test(checkIn)) {
        const parts = checkIn.split(':');
        checkIn = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
      }
      if (checkOut && /^\d{1,2}:\d{2}$/.test(checkOut)) {
        const parts = checkOut.split(':');
        checkOut = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
      }

      let computedWorkingHours = 0;
      let computedOvertimeHours = 0;
      let finalStatus: AttendanceStatus = item.status || 'Present';

      if (checkIn && isValidTimeFormat(checkIn)) {
        const metrics = calculateAttendanceMetrics({
          checkIn,
          checkOut: checkOut && isValidTimeFormat(checkOut) ? checkOut : null,
          standardCheckIn: settings.standard_check_in,
          standardCheckOut: settings.standard_check_out,
          standardWorkingHours: parseFloat(settings.standard_working_hours) || 8.0,
          unpaidBreakHours: parseFloat(settings.unpaid_break_hours) || 1.0,
          lateThresholdMinutes: parseInt(settings.late_grace_minutes, 10) || 15,
          earlyDepartureThresholdMinutes: parseInt(settings.early_departure_threshold_minutes, 10) || 30,
        });
        computedWorkingHours = metrics.workingHours;
        computedOvertimeHours = metrics.overtimeHours;
        if (!item.status) {
          finalStatus = metrics.status;
        }
      }

      const finalWorkingHours = item.workingHours !== undefined && item.workingHours !== ''
        ? parseFloat(item.workingHours.toString()).toFixed(2)
        : computedWorkingHours.toFixed(2);

      const finalOvertimeHours = item.overtimeHours !== undefined && item.overtimeHours !== ''
        ? parseFloat(item.overtimeHours.toString()).toFixed(2)
        : computedOvertimeHours.toFixed(2);

      const whNum = parseFloat(finalWorkingHours);
      if (isNaN(whNum) || whNum < 0 || whNum > 24) {
        errors.push({ row: rowNum, identifier, error: `Working hours must be between 0 and 24 (got: "${finalWorkingHours}").` });
        continue;
      }

      const otNum = parseFloat(finalOvertimeHours);
      if (isNaN(otNum) || otNum < 0 || otNum > 24) {
        errors.push({ row: rowNum, identifier, error: `Overtime hours must be between 0 and 24 (got: "${finalOvertimeHours}").` });
        continue;
      }

      // 4. Check if record exists for this employee on this date
      const [existingRecord] = await db
        .select()
        .from(attendance)
        .where(and(eq(attendance.employeeId, targetEmp.id), eq(attendance.attendanceDate, dateStr)));

      if (existingRecord) {
        await db
          .update(attendance)
          .set({
            checkIn: checkIn || existingRecord.checkIn,
            checkOut: checkOut !== undefined ? checkOut : existingRecord.checkOut,
            workingHours: finalWorkingHours,
            overtimeHours: finalOvertimeHours,
            status: finalStatus,
          })
          .where(eq(attendance.id, existingRecord.id));

        updated++;
        details.push({
          employeeCode: targetEmp.employeeCode,
          date: dateStr,
          action: 'updated',
          status: finalStatus,
        });
      } else {
        await db.insert(attendance).values({
          employeeId: targetEmp.id,
          attendanceDate: dateStr,
          checkIn: checkIn || '08:00:00',
          checkOut,
          workingHours: finalWorkingHours,
          overtimeHours: finalOvertimeHours,
          status: finalStatus,
        });

        inserted++;
        details.push({
          employeeCode: targetEmp.employeeCode,
          date: dateStr,
          action: 'inserted',
          status: finalStatus,
        });
      }
    } catch (err: any) {
      errors.push({ row: rowNum, identifier, error: err.message || 'Processing error' });
    }
  }

  await recordAudit(
    null,
    adminUsername || 'SYSTEM',
    'ATTENDANCE_BULK_IMPORT',
    'attendance',
    null,
    `Bulk attendance import processed ${items.length} records: ${inserted} inserted, ${updated} updated, ${errors.length} errors.`
  );

  return {
    success: errors.length === 0,
    total: items.length,
    inserted,
    updated,
    errors,
    details,
  };
}
