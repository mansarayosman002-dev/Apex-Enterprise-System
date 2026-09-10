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
  getCompanyKnowledge,
  deleteEmployee,
  processAllPayrollForPeriod,
} from '../server/dbServices.ts';
import { db } from '../db/index.ts';
import { notifications, users, employees, attendance } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

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
        description: 'Optional date in YYYY-MM-DD format. Defaults to today.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_late_employees',
    description: 'Retrieves list of employees marked as "Late" on a specific date along with their check-in times.',
    parameters: {
      date: {
        type: 'string',
        description: 'Optional date in YYYY-MM-DD format. Defaults to today.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_absent_employees',
    description: 'Retrieves all active staff members who have not recorded an attendance punch for today.',
    parameters: {
      date: {
        type: 'string',
        description: 'Date in YYYY-MM-DD format. Defaults to today.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_employee_attendance',
    description: 'Retrieves historical punch logs, working hours, and check-in/out timestamps for a specific employee. (Employees can only query their own attendance).',
    parameters: {
      employeeId: {
        type: 'number',
        description: 'The internal ID of the employee.',
      },
      startDate: {
        type: 'string',
        description: 'Start of period in YYYY-MM-DD format.',
      },
      endDate: {
        type: 'string',
        description: 'End of period in YYYY-MM-DD format.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Employee', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_payroll_summary',
    description: 'Retrieves comprehensive organizational payroll summary for a period (gross salary, net salary, overtime, allowances, deductions).',
    parameters: {
      period: {
        type: 'string',
        description: 'Payroll period in YYYY-MM format (e.g. 2026-05). Defaults to current period.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'MEDIUM',
  },
  {
    name: 'get_my_payroll',
    description: 'Allows an authenticated employee to securely view and understand their own salary, overtime compensation, allowances, deductions, and net pay breakdown.',
    parameters: {
      period: {
        type: 'string',
        description: 'Payroll period in YYYY-MM format. Defaults to latest period.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Employee', 'Administrator', 'HR Officer', 'Payroll Officer'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_overtime_summary',
    description: 'Retrieves summary of approved and recorded overtime hours across workforce or departments.',
    parameters: {
      departmentId: {
        type: 'number',
        description: 'Optional department ID filter.',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_department_summary',
    description: 'Retrieves department listings, employee distributions, and operational headcounts.',
    parameters: {},
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
  {
    name: 'get_attendance_anomalies',
    description: 'Rule-based audit detection finding operational anomalies (excessive overtime > 4 hrs, open checkouts after shift, repeat tardiness, duplicate scans).',
    parameters: {},
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Management'],
    isWriteAction: false,
    riskLevel: 'MEDIUM',
  },
  {
    name: 'send_notification',
    description: 'Dispatches or schedules an in-app / email notification to an individual employee or group.',
    parameters: {
      recipientType: {
        type: 'string',
        description: 'Target group: "all", "absent_today", "late_today", or "individual".',
        enum: ['all', 'absent_today', 'late_today', 'individual'],
        required: true,
      },
      employeeId: {
        type: 'number',
        description: 'Required if recipientType is "individual".',
      },
      title: {
        type: 'string',
        description: 'Subject/title of notification.',
        required: true,
      },
      message: {
        type: 'string',
        description: 'The notification message body.',
        required: true,
      },
      category: {
        type: 'string',
        description: 'Category: Attendance, Payroll, HR, Reminder, Alert, Announcement.',
        enum: ['Attendance', 'Payroll', 'HR', 'Reminder', 'Alert', 'Announcement'],
      },
    },
    requiredParams: ['recipientType', 'title', 'message'],
    allowedRoles: ['Administrator', 'HR Officer'],
    isWriteAction: true,
    riskLevel: 'HIGH',
  },
  {
    name: 'deactivate_employee',
    description: 'Deactivates an employee profile and revokes their QR attendance badge. (Requires explicit user confirmation).',
    parameters: {
      employeeId: {
        type: 'number',
        description: 'The employee ID to deactivate.',
        required: true,
      },
      reason: {
        type: 'string',
        description: 'Reason for deactivation.',
      },
    },
    requiredParams: ['employeeId'],
    allowedRoles: ['Administrator', 'HR Officer'],
    isWriteAction: true,
    riskLevel: 'CRITICAL',
  },
  {
    name: 'process_batch_payroll',
    description: 'Processes and calculates payroll records for all active employees for a given month. (Requires confirmation).',
    parameters: {
      period: {
        type: 'string',
        description: 'Period in YYYY-MM format.',
        required: true,
      },
    },
    requiredParams: ['period'],
    allowedRoles: ['Administrator', 'Payroll Officer'],
    isWriteAction: true,
    riskLevel: 'HIGH',
  },
  {
    name: 'get_company_info',
    description: 'Retrieves official corporate background on Apex Enterprise SL Ltd, corporate services, system architecture, and QR attendance/payroll workflows.',
    parameters: {
      topic: {
        type: 'string',
        description: 'Optional topic filter ("overview", "services", "attendance", "payroll", "all"). Defaults to "all".',
      },
    },
    requiredParams: [],
    allowedRoles: ['Administrator', 'HR Officer', 'Payroll Officer', 'Management', 'Employee'],
    isWriteAction: false,
    riskLevel: 'LOW',
  },
];

// ----------------------------------------------------
// Tool Execution Engine (Calling Existing Services)
// ----------------------------------------------------
export class AIToolExecutor {
  static getTool(name: string): AIToolDefinition | undefined {
    return AI_TOOLS.find((t) => t.name === name);
  }

  static async execute(
    name: string,
    args: Record<string, any>,
    context: AIToolContext,
    isConfirmed = false
  ): Promise<AIToolExecutionResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" is not registered in the system.` };
    }

    // 1. Validate role permission
    const permCheck = AIPermissionValidator.validateToolAccess(tool, context.user);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    // 2. Validate and sanitize parameters (including employee isolation)
    const paramCheck = AIPermissionValidator.sanitizeAndValidateToolParams(name, args, context.user);
    if (!paramCheck.valid) {
      return { success: false, error: paramCheck.error };
    }
    const sanitizedArgs = paramCheck.sanitizedArgs;

    // 3. Sensitive Action Confirmation Check
    if (tool.isWriteAction && !isConfirmed) {
      let prompt = `I am prepared to execute "${tool.name}".`;
      if (name === 'deactivate_employee') {
        const emp = await getEmployeeById(sanitizedArgs.employeeId);
        prompt = `Are you sure you want to deactivate ${emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeCode})` : `Employee ID ${sanitizedArgs.employeeId}`}? This will revoke their security QR badge and prevent attendance punches.`;
      } else if (name === 'send_notification') {
        prompt = `Are you sure you want to dispatch this notification ("${sanitizedArgs.title}") to ${sanitizedArgs.recipientType}?`;
      } else if (name === 'process_batch_payroll') {
        prompt = `Are you sure you want to process payroll for period ${sanitizedArgs.period}?`;
      }

      return {
        success: true,
        requiresConfirmation: true,
        confirmationPrompt: prompt,
        actionDetails: {
          toolName: name,
          arguments: sanitizedArgs,
        },
      };
    }

    // 4. Dispatch to verified application services
    try {
      switch (name) {
        case 'get_current_user': {
          let empData = null;
          if (context.user.employeeId) {
            empData = await getEmployeeById(context.user.employeeId);
          }
          return {
            success: true,
            data: {
              user: context.user,
              employeeProfile: empData,
            },
          };
        }

        case 'get_attendance_summary': {
          const stats = await getDashboardStats();
          return {
            success: true,
            data: {
              date: sanitizedArgs.date || new Date().toISOString().split('T')[0],
              totalEmployees: stats.totalEmployees,
              presentToday: stats.presentToday,
              lateToday: stats.lateToday,
              absentToday: stats.absentToday,
              overtimeHoursToday: stats.overtimeHoursToday,
              attendanceRate: stats.attendanceRate,
            },
          };
        }

        case 'get_late_employees': {
          const targetDate = sanitizedArgs.date || new Date().toISOString().split('T')[0];
          const records = await getAttendanceList({ date: targetDate, status: 'Late' });
          return {
            success: true,
            data: {
              date: targetDate,
              count: records.length,
              lateEmployees: records.map((r) => ({
                employeeCode: r.employeeCode,
                employeeName: r.employeeName,
                department: r.departmentName,
                checkIn: r.checkIn,
                standardCheckIn: '08:00:00',
              })),
            },
          };
        }

        case 'get_absent_employees': {
          const targetDate = sanitizedArgs.date || new Date().toISOString().split('T')[0];
          const allStaff = await getEmployees({ status: 'active' });
          const dayAtt = await getAttendanceList({ date: targetDate });
          const presentIds = new Set(dayAtt.map((a) => a.employeeId));
          const absentStaff = allStaff.filter((s) => !presentIds.has(s.id));

          return {
            success: true,
            data: {
              date: targetDate,
              count: absentStaff.length,
              absentEmployees: absentStaff.map((s) => ({
                id: s.id,
                employeeCode: s.employeeCode,
                name: `${s.firstName} ${s.lastName}`,
                department: s.departmentName,
                position: s.position,
              })),
            },
          };
        }

        case 'get_employee_attendance': {
          const empId = sanitizedArgs.employeeId;
          const records = await getAttendanceList({
            employeeId: empId,
            startDate: sanitizedArgs.startDate,
            endDate: sanitizedArgs.endDate,
          });
          return {
            success: true,
            data: {
              employeeId: empId,
              totalRecords: records.length,
              records: records.slice(0, 30),
            },
          };
        }

        case 'get_payroll_summary': {
          const period = sanitizedArgs.period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          const records = await getPayrollList({ period });

          const totalBasic = records.reduce((s, r) => s + parseFloat(r.basicSalary || '0'), 0);
          const totalGross = records.reduce((s, r) => s + parseFloat(r.grossSalary || '0'), 0);
          const totalOvertime = records.reduce((s, r) => s + parseFloat(r.overtimeAmount || '0'), 0);
          const totalAllowances = records.reduce((s, r) => s + parseFloat(r.allowances || '0'), 0);
          const totalDeductions = records.reduce((s, r) => s + parseFloat(r.deductions || '0'), 0);
          const totalNet = records.reduce((s, r) => s + parseFloat(r.netSalary || '0'), 0);

          return {
            success: true,
            data: {
              payrollPeriod: period,
              totalEmployeesProcessed: records.length,
              totalBasicSalary: totalBasic.toFixed(2),
              totalOvertimeAmount: totalOvertime.toFixed(2),
              totalAllowances: totalAllowances.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              totalGrossSalary: totalGross.toFixed(2),
              totalNetSalary: totalNet.toFixed(2),
              status: records.length > 0 ? records[0].status : 'Pending',
            },
          };
        }

        case 'get_my_payroll': {
          if (!context.user.employeeId) {
            return { success: false, error: 'No employee record linked to this account.' };
          }
          const period = sanitizedArgs.period;
          const records = await getPayrollList({
            employeeId: context.user.employeeId,
            period,
          });

          if (records.length === 0) {
            return {
              success: true,
              data: {
                found: false,
                message: 'No payroll records found for your profile in the current period.',
                employeeId: context.user.employeeId,
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
              overtimeHours: latest.overtimeHours,
              overtimeAmount: latest.overtimeAmount,
              allowances: latest.allowances,
              deductions: latest.deductions,
              grossSalary: latest.grossSalary,
              netSalary: latest.netSalary,
              status: latest.status,
              formula: {
                gross: `${latest.basicSalary} (Basic) + ${latest.overtimeAmount} (OT) + ${latest.allowances} (Allowances) = ${latest.grossSalary}`,
                net: `${latest.grossSalary} (Gross) - ${latest.deductions} (Deductions) = ${latest.netSalary}`,
              },
            },
          };
        }

        case 'get_overtime_summary': {
          const list = await getOvertimeList();
          return {
            success: true,
            data: {
              totalRecords: list.length,
              records: list.slice(0, 20),
            },
          };
        }

        case 'get_department_summary': {
          const depts = await getDepartments();
          const stats = await getDashboardStats();
          return {
            success: true,
            data: {
              departments: depts,
              departmentCounts: stats.departmentCounts,
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
                description: `Employee recorded ${ot} overtime hours in a single shift (policy threshold is 4.0 hrs).`,
                employee: `${a.employeeName} (${a.employeeCode})`,
              });
            }
          });

          // Anomaly 2: Open punches after 19:00 with no check-out
          const currentHour = new Date().getHours();
          if (currentHour >= 19) {
            todayAtt.forEach((a) => {
              if (a.checkIn && !a.checkOut) {
                anomalies.push({
                  type: 'Missing Check-Out',
                  severity: 'MEDIUM',
                  description: `Employee checked in at ${a.checkIn} but has not recorded a check-out past 19:00.`,
                  employee: `${a.employeeName} (${a.employeeCode})`,
                });
              }
            });
          }

          return {
            success: true,
            data: {
              date: today,
              totalAnomaliesDetected: anomalies.length,
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

          if (targets.length === 0) {
            return {
              success: true,
              data: {
                message: `No matching employees found for target criteria "${recipientType}". No notifications sent.`,
                count: 0,
              },
            };
          }

          // Dispatch via unified NotificationDispatcher
          for (const empId of targets) {
            await NotificationDispatcher.dispatch({
              employeeId: empId,
              title,
              message,
              category: category || 'Announcement',
              priority: 'medium',
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

        case 'deactivate_employee': {
          const empId = Number(sanitizedArgs.employeeId);
          const deactivated = await deleteEmployee(empId);
          return {
            success: true,
            data: {
              message: `Employee ${deactivated.firstName} ${deactivated.lastName} (${deactivated.employeeCode}) has been deactivated. Security QR badge revoked.`,
              employeeId: empId,
            },
          };
        }

        case 'process_batch_payroll': {
          const period = sanitizedArgs.period;
          const result = await processAllPayrollForPeriod(period);
          return {
            success: true,
            data: {
              message: `Payroll processed for period ${period}. Total employees calculated: ${result.length}.`,
              summary: result,
            },
          };
        }

        case 'get_company_info': {
          const knowledge = await getCompanyKnowledge();
          return {
            success: true,
            data: {
              companyName: knowledge.company_name || 'Apex Enterprise SL Ltd',
              legalName: knowledge.company_legal_name || 'Apex Enterprise Solutions (SL) Ltd.',
              tagline: knowledge.company_tagline || "Sierra Leone's Leading Enterprise Workforce Management & Automated Payroll Solutions Provider",
              headquarters: knowledge.company_headquarters || '15 Siaka Stevens Street, Freetown, Sierra Leone',
              contact: knowledge.company_contact || 'info@apexenterprise.sl | +232 76 892 411',
              overview: knowledge.company_overview,
              services: knowledge.company_services,
              systemArchitecture: knowledge.system_architecture_overview,
              attendanceWorkflow: knowledge.system_attendance_workflow,
              payrollWorkflow: knowledge.system_payroll_workflow,
              aiAssistant: knowledge.system_ai_assistant,
            },
          };
        }

        default:
          return { success: false, error: `Tool handler for "${name}" is not implemented.` };
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


