import {
  AIToolDefinition,
  AIToolContext,
  AIToolExecutionResult,
} from './ai.types.ts';
import { AIPermissionValidator, registerToolForPermissions } from './ai.permissions.ts';
import { NotificationDispatcher } from './ai.notifications.ts';
import {
  getEmployees,
  getEmployeeById,
  getAttendanceList,
  getPayrollList,
  getDashboardStats,
  getOvertimeList,
  getDepartments,
  getSettingsMap,
  deleteEmployee,
  processAllPayrollForPeriod,
  approveOvertimeRecord,
  rejectOvertimeRecord,
} from '../server/dbServices.ts';
import { db } from '../db/index.ts';
import { notifications, users, employees, attendance, aiAnomalies } from '../db/schema.ts';
import { eq, and, sql, desc } from 'drizzle-orm';
import { APEX_BUSINESS_RULES } from './knowledge/businessRulesRegistry.ts';
import { APEX_DATA_DICTIONARY } from './knowledge/dataDictionary.ts';
import { APEX_SECURITY_POLICIES } from './knowledge/securityPolicies.ts';
import { APEX_APPLICATION_CONTEXT } from './knowledge/applicationContext.ts';

// ----------------------------------------------------
// Tool Registry Definitions
// ----------------------------------------------------
export const AI_TOOLS: AIToolDefinition[] = [
  {
    name: 'get_current_user',
    description: 'Retrieves profile and authentication metadata for the currently active user.',
    parameters: {},
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_attendance_summary',
    description: 'Retrieves aggregated real-time workforce attendance statistics for today (total employees, present, late, absent, overtime hours).',
    parameters: {
      date: {
        type: 'string',
        description: 'Optional date filter in YYYY-MM-DD format. Defaults to current day.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_late_employees',
    description: 'Lists all employees who checked in after the 08:30:00 AM grace period cutoff today.',
    parameters: {
      date: {
        type: 'string',
        description: 'Optional date filter in YYYY-MM-DD format. Defaults to current date.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_absent_employees',
    description: 'Lists all active workforce members who have not recorded an attendance punch for the specified date.',
    parameters: {
      date: {
        type: 'string',
        description: 'Optional date filter in YYYY-MM-DD format. Defaults to current date.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_employee_attendance',
    description: 'Retrieves comprehensive punch records for a specific employee. (Employees may only access their own).',
    parameters: {
      employeeId: {
        type: 'number',
        description: 'Database ID of the employee.',
      },
      limit: {
        type: 'number',
        description: 'Number of recent attendance records to return (default 10).',
      },
    },
    requiredParams: ['employeeId'],
    allowedRoles: ['Administrator', 'HR Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_payroll_summary',
    description: 'Aggregates enterprise-wide statutory payroll metrics (gross, total net, NASSIT 5%, PAYE tax, overtime) for a period.',
    parameters: {
      period: {
        type: 'string',
        description: 'Payroll period in YYYY-MM format (e.g. 2026-09). Defaults to current month.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_my_payroll',
    description: 'Retrieves the authenticated employee\'s personal payslip breakdown (basic, overtime, allowances, deductions, net take-home).',
    parameters: {
      period: {
        type: 'string',
        description: 'Payroll period in YYYY-MM format.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Employee', 'Administrator', 'HR Officer', 'Payroll Officer'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_overtime_summary',
    description: 'Retrieves pending and approved overtime claims, hours, and payout costs for the enterprise.',
    parameters: {
      status: {
        type: 'string',
        description: 'Filter by claim status: Pending, Approved, or Rejected.',
        enum: ['Pending', 'Approved', 'Rejected'],
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_department_summary',
    description: 'Lists all organizational departments with headcount distribution, code, and active staff counts.',
    parameters: {},
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_attendance_anomalies',
    description: 'Audits live attendance punches for policy anomalies (excessive overtime > 4h, missing checkout after 19:00, repeated tardiness).',
    parameters: {},
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'send_notification',
    description: 'Dispatches targeted or bulk enterprise notifications to employees across in-app, email, or multi-channel delivery.',
    parameters: {
      recipientType: {
        type: 'string',
        description: 'Recipient filter: individual, all, absent_today, late_today.',
        enum: ['individual', 'all', 'absent_today', 'late_today'],
      },
      employeeId: {
        type: 'number',
        description: 'Required if recipientType is individual.',
      },
      title: {
        type: 'string',
        description: 'Headline title of the notification.',
      },
      message: {
        type: 'string',
        description: 'Notification body text.',
      },
      category: {
        type: 'string',
        description: 'Category: Attendance, Payroll, HR, Announcement, Alert.',
      },
    },
    requiredParams: ['recipientType', 'title', 'message'],
    allowedRoles: ['Administrator', 'HR Officer'],
    isWriteAction: true,
    riskLevel: 'MEDIUM',
  },
  {
    name: 'approve_overtime',
    description: 'Approves an employee\'s pending overtime claim, authorizing statutory payout in next payroll run.',
    parameters: {
      overtimeId: {
        type: 'number',
        description: 'ID of the overtime record to approve.',
      },
    },
    requiredParams: ['overtimeId'],
    allowedRoles: ['Administrator', 'HR Officer'],
    isWriteAction: true,
    riskLevel: 'MEDIUM',
  },
  {
    name: 'reject_overtime',
    description: 'Rejects an employee\'s overtime claim with optional review feedback.',
    parameters: {
      overtimeId: {
        type: 'number',
        description: 'ID of the overtime record to reject.',
      },
      reason: {
        type: 'string',
        description: 'Justification for rejecting the claim.',
      },
    },
    requiredParams: ['overtimeId'],
    allowedRoles: ['Administrator', 'HR Officer'],
    isWriteAction: true,
    riskLevel: 'LOW',
  },
  {
    name: 'process_batch_payroll',
    description: 'Calculates and persists statutory payroll for all active employees for a given period.',
    parameters: {
      period: {
        type: 'string',
        description: 'Payroll period in YYYY-MM format (e.g. 2026-09).',
      },
    },
    requiredParams: ['period'],
    allowedRoles: ['Administrator', 'Payroll Officer'],
    isWriteAction: true,
    riskLevel: 'HIGH',
  },
  {
    name: 'get_company_info',
    description: 'Retrieves Apex Enterprise corporate profile, official headquarters, mission, and system architecture summary.',
    parameters: {},
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_business_rules',
    description: 'Explains specific enterprise business rules (shift hours, 30m grace period, NASSIT 5%, PAYE brackets, QR token HMAC).',
    parameters: {
      category: {
        type: 'string',
        description: 'Optional filter: ATTENDANCE, OVERTIME, PAYROLL, QR_CODE.',
        enum: ['ATTENDANCE', 'OVERTIME', 'PAYROLL', 'QR_CODE'],
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_data_dictionary',
    description: 'Returns the exact PostgreSQL 18 schema definition, column types, and constraints for system tables.',
    parameters: {
      tableName: {
        type: 'string',
        description: 'Optional specific table name (e.g. employees, attendance, payroll).',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_security_policies',
    description: 'Returns the RBAC permissions matrix, allowed operational domains, and IDOR protection rules for user roles.',
    parameters: {
      role: {
        type: 'string',
        description: 'Optional role filter: Administrator, HR Officer, Payroll Officer, Management, Employee.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_system_knowledge',
    description: 'Retrieves authoritative architecture, business rules, workflows, security, payroll/attendance calculations, QR rules, operational procedures, and limitations across all 28 enterprise domains.',
    parameters: {
      topic: {
        type: 'string',
        description: 'Specific knowledge domain to retrieve. Options: business_rules, database_structure, entity_relationships, user_roles, permissions, workflows, attendance_rules, working_hour_rules, overtime_rules, payroll_rules, payroll_approval_rules, qr_code_rules, notification_rules, ai_capabilities, security_policies, terminology, system_configuration, reports, dashboards, employees, attendance, departments, payroll, audit_requirements, data_privacy_requirements, operational_procedures, error_conditions, system_limitations, or "all".',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
];

// ----------------------------------------------------
// Tool Executor Engine
// ----------------------------------------------------
export class AIToolExecutor {
  static async execute(
    name: string,
    args: Record<string, any>,
    context: AIToolContext
  ): Promise<AIToolExecutionResult> {
    const toolDef = AI_TOOLS.find((t) => t.name === name);
    if (!toolDef) {
      return { success: false, error: `Unknown tool "${name}".` };
    }

    // RBAC validation
    const access = AIPermissionValidator.validateToolAccess(toolDef, context.user);
    if (!access.allowed) {
      return { success: false, error: access.reason };
    }

    // IDOR / Parameter isolation
    const paramValidation = AIPermissionValidator.sanitizeAndValidateToolParams(
      name,
      args,
      context.user
    );
    if (!paramValidation.valid) {
      return { success: false, error: paramValidation.error };
    }
    const sanitizedArgs = paramValidation.sanitizedArgs;

    try {
      switch (name) {
        case 'get_current_user': {
          let employeeDetails: any = null;
          if (context.user.employeeId) {
            employeeDetails = await getEmployeeById(context.user.employeeId);
          }
          return {
            success: true,
            data: {
              userId: context.user.userId,
              username: context.user.username,
              roleName: context.user.roleName,
              employeeId: context.user.employeeId,
              employeeDetails: employeeDetails
                ? {
                    employeeCode: employeeDetails.employeeCode,
                    firstName: employeeDetails.firstName,
                    lastName: employeeDetails.lastName,
                    position: employeeDetails.position,
                    departmentId: employeeDetails.departmentId,
                  }
                : null,
            },
          };
        }

        case 'get_attendance_summary': {
          const stats = await getDashboardStats();
          const targetDate = sanitizedArgs.date || new Date().toISOString().split('T')[0];
          return {
            success: true,
            data: {
              date: targetDate,
              totalEmployees: stats.totalEmployees,
              presentToday: stats.presentToday,
              lateToday: stats.lateToday,
              absentToday: stats.absentToday,
              attendanceRate: stats.attendanceRate,
              overtimeHours: stats.overtimeHoursToday,
            },
          };
        }

        case 'get_late_employees': {
          const targetDate = sanitizedArgs.date || new Date().toISOString().split('T')[0];
          const lateRecords = await getAttendanceList({ date: targetDate, status: 'Late' });
          const allStaff = await getEmployees();
          const staffMap = new Map(allStaff.map((s) => [s.id, s]));

          return {
            success: true,
            data: {
              date: targetDate,
              totalLate: lateRecords.length,
              lateEmployees: lateRecords.map((r) => {
                const emp = staffMap.get(r.employeeId);
                return {
                  employeeCode: r.employeeCode || emp?.employeeCode,
                  employeeName: r.employeeName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'),
                  checkIn: r.checkIn,
                  standardCheckIn: '08:00:00',
                  graceCutoff: '08:30:00',
                  department: emp?.departmentName || 'General',
                };
              }),
            },
          };
        }

        case 'get_absent_employees': {
          const targetDate = sanitizedArgs.date || new Date().toISOString().split('T')[0];
          const allStaff = await getEmployees({ status: 'active' });
          const dayRecords = await getAttendanceList({ date: targetDate });
          const presentIds = new Set(dayRecords.map((a) => a.employeeId));
          const absentStaff = allStaff.filter((s) => !presentIds.has(s.id));

          return {
            success: true,
            data: {
              date: targetDate,
              totalAbsent: absentStaff.length,
              absentEmployees: absentStaff.map((s) => ({
                employeeCode: s.employeeCode,
                employeeName: `${s.firstName} ${s.lastName}`,
                department: s.departmentName,
                position: s.position,
              })),
            },
          };
        }

        case 'get_employee_attendance': {
          const targetEmpId = Number(sanitizedArgs.employeeId);
          const emp = await getEmployeeById(targetEmpId);
          if (!emp) {
            return { success: false, error: `Employee ID ${targetEmpId} not found.` };
          }
          const records = await getAttendanceList({ employeeId: targetEmpId });
          const limit = sanitizedArgs.limit ? Number(sanitizedArgs.limit) : 10;
          return {
            success: true,
            data: {
              employeeName: `${emp.firstName} ${emp.lastName}`,
              employeeCode: emp.employeeCode,
              totalRecords: records.length,
              records: records.slice(0, limit).map((r) => ({
                date: r.attendanceDate,
                checkInTime: r.checkIn,
                checkOutTime: r.checkOut,
                status: r.status,
                workingHours: r.workingHours,
                overtimeHours: r.overtimeHours,
              })),
            },
          };
        }

        case 'get_payroll_summary': {
          const period = sanitizedArgs.period || new Date().toISOString().slice(0, 7);
          const payrolls = await getPayrollList({ period });
          const totalGross = payrolls.reduce((sum, p) => sum + parseFloat(p.grossSalary?.toString() || p.basicSalary?.toString() || '0'), 0);
          const totalNet = payrolls.reduce((sum, p) => sum + parseFloat(p.netSalary?.toString() || '0'), 0);
          const totalDeductions = payrolls.reduce((sum, p) => sum + parseFloat(p.deductions?.toString() || '0'), 0);
          const totalOT = payrolls.reduce((sum, p) => sum + parseFloat(p.overtimeAmount?.toString() || '0'), 0);

          return {
            success: true,
            data: {
              payrollPeriod: period,
              totalEmployeesProcessed: payrolls.length,
              currency: 'SLE (NLe)',
              totalGrossSalary: totalGross.toFixed(2),
              totalNetSalary: totalNet.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              totalOvertimeAmount: totalOT.toFixed(2),
            },
          };
        }

        case 'get_my_payroll': {
          if (!context.user.employeeId) {
            return {
              success: true,
              data: {
                found: false,
                message: 'No linked employee profile associated with this account.',
              },
            };
          }
          const period = sanitizedArgs.period || new Date().toISOString().slice(0, 7);
          const records = await getPayrollList({
            employeeId: context.user.employeeId,
            period,
          });

          if (records.length === 0) {
            return {
              success: true,
              data: {
                found: false,
                period,
                message: `No payslip found for period ${period}.`,
              },
            };
          }

          const latest = records[0];
          return {
            success: true,
            data: {
              found: true,
              period: latest.payrollPeriod,
              employeeName: latest.employeeName,
              employeeCode: latest.employeeCode,
              department: latest.departmentName,
              position: latest.position,
              basicSalary: latest.basicSalary,
              overtimeAmount: latest.overtimeAmount,
              allowances: latest.allowances,
              deductions: latest.deductions,
              netSalary: latest.netSalary,
              status: latest.status || 'Processed',
            },
          };
        }

        case 'get_overtime_summary': {
          const list = await getOvertimeList();
          const filtered = sanitizedArgs.status
            ? list.filter((o) => o.status === sanitizedArgs.status)
            : list;

          const totalHours = filtered.reduce((sum, o) => sum + parseFloat(o.hours?.toString() || '0'), 0);
          const pendingCount = list.filter((o) => o.status === 'Pending').length;

          return {
            success: true,
            data: {
              totalRecords: filtered.length,
              totalHours: totalHours.toFixed(1),
              pendingCount,
              records: filtered.slice(0, 15).map((o) => ({
                id: o.id,
                employeeName: o.employeeName,
                date: o.overtimeDate,
                hours: o.hours,
                reason: o.reason,
                status: o.status,
              })),
            },
          };
        }

        case 'get_department_summary': {
          const depts = await getDepartments();
          const allStaff = await getEmployees();
          const deptMap = new Map<number, number>();
          allStaff.forEach((s) => {
            const count = deptMap.get(s.departmentId) || 0;
            deptMap.set(s.departmentId, count + 1);
          });

          return {
            success: true,
            data: {
              totalDepartments: depts.length,
              totalEmployees: allStaff.length,
              departments: depts.map((d) => ({
                id: d.id,
                name: d.departmentName,
                code: d.departmentName.slice(0, 3).toUpperCase(),
                headcount: deptMap.get(d.id) || 0,
              })),
            },
          };
        }

        case 'get_attendance_anomalies': {
          const today = new Date().toISOString().split('T')[0];
          const todayAtt = await getAttendanceList({ date: today });
          const anomalies: Array<{ type: string; severity: string; description: string; employee: string }> = [];

          // Anomaly 1: Excessive Overtime (> 4 hours in a single shift)
          todayAtt.forEach((a) => {
            const ot = parseFloat(a.overtimeHours?.toString() || '0');
            if (ot > 4.0) {
              anomalies.push({
                type: 'Excessive Overtime',
                severity: 'HIGH',
                description: `Employee logged ${ot} hours of overtime today (policy threshold is 4.0h).`,
                employee: `${a.employeeName} (${a.employeeCode})`,
              });
            }
          });

          // Anomaly 2: Open punches past 18:00 with no check-out
          const currentHour = new Date().getHours();
          if (currentHour >= 18) {
            todayAtt.forEach((a) => {
              if (a.checkIn && !a.checkOut) {
                anomalies.push({
                  type: 'Missing Check-Out',
                  severity: 'MEDIUM',
                  description: `Checked in at ${a.checkIn} but has not recorded a check-out punch past 18:00.`,
                  employee: `${a.employeeName} (${a.employeeCode})`,
                });
              }
            });
          }

          return {
            success: true,
            data: {
              date: today,
              totalAnomalies: anomalies.length,
              anomalies,
            },
          };
        }

        case 'send_notification': {
          const { recipientType, employeeId, title, message, category } = sanitizedArgs;
          let targets: number[] = [];

          if (recipientType === 'individual' && employeeId) {
            targets = [Number(employeeId)];
          } else if (recipientType === 'all') {
            const staff = await getEmployees({ status: 'active' });
            targets = staff.map((s) => s.id);
          } else if (recipientType === 'absent_today') {
            const today = new Date().toISOString().split('T')[0];
            const allStaff = await getEmployees({ status: 'active' });
            const dayAtt = await getAttendanceList({ date: today });
            const presentIds = new Set(dayAtt.map((a) => a.employeeId));
            targets = allStaff.filter((s) => !presentIds.has(s.id)).map((s) => s.id);
          } else if (recipientType === 'late_today') {
            const today = new Date().toISOString().split('T')[0];
            const lateAtt = await getAttendanceList({ date: today, status: 'Late' });
            targets = lateAtt.map((l) => l.employeeId);
          }

          for (const empId of targets) {
            await NotificationDispatcher.dispatch({
              employeeId: empId,
              title,
              message,
              category: category || 'Announcement',
              priority: 'normal',
              channel: 'in_app',
            });
          }

          return {
            success: true,
            data: {
              message: `Successfully dispatched notification "${title}" to ${targets.length} employee(s).`,
              recipientCount: targets.length,
              recipientType,
            },
          };
        }

        case 'approve_overtime': {
          const id = Number(sanitizedArgs.overtimeId);
          const result = await approveOvertimeRecord(id, context.user.userId, context.user.username);
          return {
            success: true,
            data: {
              message: `Overtime claim #${id} approved successfully.`,
              overtimeRecord: result,
            },
          };
        }

        case 'reject_overtime': {
          const id = Number(sanitizedArgs.overtimeId);
          const reason = sanitizedArgs.reason || 'Not approved by management';
          const result = await rejectOvertimeRecord(id, context.user.userId, context.user.username, reason);
          return {
            success: true,
            data: {
              message: `Overtime claim #${id} rejected.`,
              overtimeRecord: result,
            },
          };
        }

        case 'process_batch_payroll': {
          const period = sanitizedArgs.period;
          const result = await processAllPayrollForPeriod(period);
          return {
            success: true,
            data: {
              message: `Payroll processed for period ${period}. Total employee records evaluated: ${result.length}.`,
              period,
              count: result.length,
            },
          };
        }

        case 'get_company_info': {
          const settings = await getSettingsMap();
          return {
            success: true,
            data: {
              companyName: settings.company_name || 'Apex Enterprise SL Ltd',
              legalName: (settings as any).company_legal_name || 'Apex Enterprise Solutions (SL) Ltd.',
              tagline: (settings as any).company_tagline || "Sierra Leone's Leading Enterprise Workforce Management & Automated Payroll Solutions Provider",
              headquarters: (settings as any).company_headquarters || '15 Siaka Stevens Street, Freetown, Sierra Leone',
              contact: (settings as any).company_contact || 'info@apexenterprise.sl | +232 76 892 411',
              systemOverview: 'Smart Employee Attendance and Payroll Management System built for Sierra Leone statutory compliance.',
            },
          };
        }

        case 'get_business_rules': {
          const filtered = sanitizedArgs.category
            ? APEX_BUSINESS_RULES.filter((r) => r.category === sanitizedArgs.category)
            : APEX_BUSINESS_RULES;
          return {
            success: true,
            data: {
              totalRules: filtered.length,
              rules: filtered,
            },
          };
        }

        case 'get_data_dictionary': {
          if (sanitizedArgs.tableName && APEX_DATA_DICTIONARY[sanitizedArgs.tableName]) {
            return {
              success: true,
              data: {
                table: APEX_DATA_DICTIONARY[sanitizedArgs.tableName],
              },
            };
          }
          return {
            success: true,
            data: {
              availableTables: Object.keys(APEX_DATA_DICTIONARY),
              dictionary: APEX_DATA_DICTIONARY,
            },
          };
        }

        case 'get_security_policies': {
          if (sanitizedArgs.role && APEX_SECURITY_POLICIES[sanitizedArgs.role]) {
            return {
              success: true,
              data: {
                policy: APEX_SECURITY_POLICIES[sanitizedArgs.role],
              },
            };
          }
          return {
            success: true,
            data: {
              policies: APEX_SECURITY_POLICIES,
            },
          };
        }

        case 'get_system_knowledge': {
          const topic = sanitizedArgs.topic?.toLowerCase()?.trim() || 'all';
          if (topic === 'all') {
            const allDomains = Object.values(APEX_APPLICATION_CONTEXT);
            return {
              success: true,
              data: {
                totalDomains: allDomains.length,
                availableTopics: allDomains.map(d => ({
                  id: d.id,
                  name: d.name,
                  category: d.category,
                  summary: d.summary,
                })),
                context: APEX_APPLICATION_CONTEXT,
              },
            };
          }
          const matchedKey = Object.keys(APEX_APPLICATION_CONTEXT).find(k =>
            k.toLowerCase() === topic.replace(/[- ]/g, '_') ||
            k.toLowerCase().includes(topic.replace(/[- ]/g, '_')) ||
            topic.replace(/[- ]/g, '_').includes(k.toLowerCase())
          );
          if (matchedKey) {
            const domain = APEX_APPLICATION_CONTEXT[matchedKey];
            return {
              success: true,
              data: {
                topic: domain,
                domainKey: matchedKey,
                details: domain.details,
                summary: domain.summary,
                guidelines: domain.guidelines,
              },
            };
          }
          return {
            success: true,
            data: {
              error: `Domain "${topic}" not found. Available topics: ${Object.keys(APEX_APPLICATION_CONTEXT).join(', ')}`,
              availableTopics: Object.keys(APEX_APPLICATION_CONTEXT),
            },
          };
        }

        default:
          return { success: false, error: `Tool "${name}" is not implemented.` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Execution error' };
    }
  }
}

// Register all tools for permission evaluation
for (const tool of AI_TOOLS) {
  registerToolForPermissions(tool);
}

export const aiTools = AI_TOOLS;

export async function executeAITool(
  name: string,
  args: Record<string, any>,
  context: AIToolContext
): Promise<AIToolExecutionResult> {
  return AIToolExecutor.execute(name, args, context);
}
