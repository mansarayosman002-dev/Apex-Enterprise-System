import { db } from '../db/index.ts';
import {
  aiConversations,
  aiMessages,
  aiActivityLogs,
} from '../db/schema.ts';
import { eq, desc, asc, and } from 'drizzle-orm';
import {
  UserContext,
  UserRole,
  AIChatMessage,
  AIChatResponse,
  AIToolExecutionResult,
} from './ai.types.ts';
import { aiTools, executeAITool } from './ai.tools.ts';
import { filterAllowedTools, validateToolExecution } from './ai.permissions.ts';
import { OrchestratedAIProvider } from './ai.provider.ts';
import { getAuthoritativeSystemPrompt } from './knowledge/applicationContext.ts';

const aiProvider = new OrchestratedAIProvider();

export class AIService {
  private static getSystemInstruction(context: UserContext): string {
    return getAuthoritativeSystemPrompt({
      username: context.username,
      roleName: context.roleName,
      employeeId: context.employeeId,
    });
  }

  static async getOrCreateConversation(
    userId: number,
    roleName: UserRole,
    conversationId?: number,
    title?: string
  ) {
    if (conversationId) {
      const existing = await db
        .select()
        .from(aiConversations)
        .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
        .limit(1);
      if (existing.length > 0) {
        return existing[0];
      }
    }

    const defaultTitle = title || 'Enterprise Inquiry';
    const [newConv] = await db
      .insert(aiConversations)
      .values({
        userId,
        roleName,
        title: defaultTitle,
      })
      .returning();

    return newConv;
  }

  static async chat(
    userId: number,
    userRole: UserRole,
    username: string,
    message: string,
    conversationId?: number,
    employeeId?: number | null
  ): Promise<AIChatResponse> {
    const context: UserContext = {
      userId,
      username,
      roleName: userRole,
      employeeId: employeeId ?? null,
    };

    const conv = await this.getOrCreateConversation(userId, userRole, conversationId);
    const activeConversationId = conv.id;

    // Persist user prompt
    await db.insert(aiMessages).values({
      conversationId: activeConversationId,
      role: 'user',
      content: message,
    });

    // Retrieve conversation history
    const history = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, activeConversationId))
      .orderBy(asc(aiMessages.createdAt))
      .limit(20);

    const chatMessages: AIChatMessage[] = history.map((h) => ({
      id: h.id,
      role: h.role as any,
      content: h.content,
      toolCallId: h.toolCallId || undefined,
      toolName: h.toolName || undefined,
    }));

    const allowedTools = filterAllowedTools(aiTools, userRole);
    const systemPrompt = this.getSystemInstruction(context);

    // Query orchestrator
    const aiResult = await aiProvider.chat(chatMessages, allowedTools, systemPrompt, context);

    let finalResponseText = aiResult.content || '';
    const executedToolResults: Array<{ toolName: string; arguments: any; result: any }> = [];

    // Handle tool execution
    if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
      for (const call of aiResult.toolCalls) {
        const check = validateToolExecution(call.name, context, call.arguments);
        if (!check.valid) {
          finalResponseText += `\n\n> **Access Denied**: ${check.error}\n`;
          continue;
        }

        const toolResult = await executeAITool(call.name, check.sanitizedArgs || call.arguments, {
          user: context,
        });

        executedToolResults.push({
          toolName: call.name,
          arguments: call.arguments,
          result: toolResult.data,
        });

        // Audit execution
        await db.insert(aiActivityLogs).values({
          userId,
          username,
          role: userRole,
          operation: 'tool_execution',
          toolInvoked: call.name,
          status: toolResult.success ? 'success' : 'failed',
          details: JSON.stringify({ args: call.arguments, success: toolResult.success }),
        });

        if (toolResult.success) {
          const formatted = this.formatToolResultToMarkdown(call.name, toolResult.data);
          finalResponseText += (finalResponseText ? '\n\n' : '') + formatted;
        } else {
          finalResponseText += `\n\n> **Operation Error**: ${toolResult.error}\n`;
        }
      }
    }

    if (!finalResponseText.trim()) {
      finalResponseText = 'Your request has been processed. No additional output was returned.';
    }

    // Persist assistant message
    await db.insert(aiMessages).values({
      conversationId: activeConversationId,
      role: 'assistant',
      content: finalResponseText,
      toolCalls: aiResult.toolCalls ? JSON.stringify(aiResult.toolCalls) : null,
    });

    // Update conversation timestamp and title if it was first message
    if (history.length <= 1 && message.length > 0) {
      const summaryTitle = message.slice(0, 35) + (message.length > 35 ? '...' : '');
      await db
        .update(aiConversations)
        .set({ title: summaryTitle, updatedAt: new Date() })
        .where(eq(aiConversations.id, activeConversationId));
    } else {
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, activeConversationId));
    }

    return {
      message: finalResponseText,
      conversationId: activeConversationId,
      toolInvocations: executedToolResults,
    };
  }

  /**
   * Formats structured tool data into rich GitHub-flavored markdown tables
   */
  private static formatToolResultToMarkdown(toolName: string, data: any): string {
    if (!data) return 'No data returned.\n';

    if (toolName === 'get_current_user') {
      return `### User Profile & Session
- **Username**: \`${data.username}\`
- **Role**: **${data.roleName}**
- **Employee ID**: ${data.employeeId ?? 'None (System User)'}
${data.employeeDetails ? `- **Employee Name**: ${data.employeeDetails.firstName} ${data.employeeDetails.lastName}\n- **Position**: ${data.employeeDetails.position}` : ''}\n`;
    }

    if (toolName === 'get_attendance_summary') {
      return `### Real-time Attendance Overview (${data.date})
- **Total Workforce**: **${data.totalEmployees}**
- **Present On-Time**: **${data.presentToday}**
- **Late Arrivals**: **${data.lateToday}**
- **Absent Employees**: **${data.absentToday}**
- **Overall Attendance Rate**: **${data.attendanceRate}%**
- **Overtime Hours Logged Today**: **${data.overtimeHours} hrs**\n`;
    }

    if (toolName === 'get_late_employees') {
      const list = data.lateEmployees || [];
      if (list.length === 0) {
        return `**100% Punctuality**: No employees arrived late today (${data.date}). Everyone clocked in before 08:30:00 AM.\n`;
      }
      let md = `### Late Arrival Report (${data.date}) — Total: **${data.totalLate}**\n\n`;
      md += `| Employee ID | Name | Department | Check-In Time | Grace Cutoff |\n`;
      md += `|---|---|---|---|---|\n`;
      for (const e of list) {
        md += `| \`${e.employeeCode}\` | **${e.employeeName}** | ${e.department} | ${e.checkIn} | 08:30:00 |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_absent_employees') {
      const list = data.absentEmployees || [];
      if (list.length === 0) {
        return `**Full Attendance**: No active employees are absent for ${data.date}.\n`;
      }
      let md = `### Absenteeism Report (${data.date}) — Total: **${data.totalAbsent}**\n\n`;
      md += `| Employee ID | Name | Department | Position |\n`;
      md += `|---|---|---|---|\n`;
      for (const e of list) {
        md += `| \`${e.employeeCode}\` | **${e.employeeName}** | ${e.department || 'N/A'} | ${e.position || 'N/A'} |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_employee_attendance') {
      const list = data.records || [];
      let md = `### Personal Attendance History (${data.employeeName} - \`${data.employeeCode}\`)\n`;
      md += `Total Logged Records: **${data.totalRecords}**\n\n`;
      md += `| Date | Check-In | Check-Out | Status | Working Hours |\n`;
      md += `|---|---|---|---|---|\n`;
      for (const r of list) {
        md += `| ${r.date} | ${r.checkInTime || '-'} | ${r.checkOutTime || '-'} | **${r.status}** | ${r.workingHours || 0}h |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_payroll_summary') {
      return `### Enterprise Payroll Summary (${data.payrollPeriod})
- **Currency**: **${data.currency}**
- **Evaluated Employees**: **${data.totalEmployeesProcessed}**
- **Gross Payroll Obligation**: **NLe ${data.totalGrossSalary}**
- **Total Net Take-Home**: **NLe ${data.totalNetSalary}**
- **Total Statutory Deductions**: **NLe ${data.totalDeductions}**
- **Total PAYE Tax Withheld**: **NLe ${data.totalTaxAmount}**
- **Total Overtime Disbursements**: **NLe ${data.totalOvertimeAmount}**\n`;
    }

    if (toolName === 'get_my_payroll') {
      if (!data.found) {
        return `${data.message}\n`;
      }
      return `### Personal Payslip Breakdown (${data.period})
- **Employee**: **${data.employeeName}** (\`${data.employeeCode}\`)
- **Department**: ${data.department} | **Position**: ${data.position}
- **Payment Status**: \`${data.status}\`

| Earnings Component | Amount (NLe / SLE) |
|---|---|
| Basic Salary | NLe ${data.basicSalary} |
| Overtime Payout | +NLe ${data.overtimeAmount} |
| Duty Allowances | +NLe ${data.allowances} |
| **Statutory Deductions (NASSIT 5% & PAYE)** | **-NLe ${data.deductions}** |
| **Net Take-Home Pay** | **NLe ${data.netSalary}** |\n`;
    }

    if (toolName === 'get_overtime_summary') {
      const list = data.records || [];
      let md = `### Overtime Claims Overview\n`;
      md += `- **Total Records Evaluated**: **${data.totalRecords}**\n`;
      md += `- **Pending Claims**: **${data.pendingCount}**\n`;
      md += `- **Accumulated Overtime**: **${data.totalHours} hrs**\n\n`;
      if (list.length > 0) {
        md += `| Employee | Date | Hours | Status | Justification |\n`;
        md += `|---|---|---|---|---|\n`;
        for (const o of list) {
          md += `| **${o.employeeName}** | ${o.date} | ${o.hours}h | \`${o.status}\` | ${o.reason} |\n`;
        }
      }
      return md + '\n';
    }

    if (toolName === 'get_department_summary') {
      const list = data.departments || [];
      let md = `### Department Roster & Distribution (${data.totalDepartments} Divisions, ${data.totalEmployees} Staff)\n\n`;
      md += `| Code | Department Name | Active Headcount |\n`;
      md += `|---|---|---|\n`;
      for (const d of list) {
        md += `| \`${d.code}\` | **${d.name}** | **${d.headcount}** |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_attendance_anomalies') {
      const list = data.anomalies || [];
      if (list.length === 0) {
        return `**Clean Compliance Audit**: No attendance anomalies detected for ${data.date}.\n`;
      }
      let md = `### Live Attendance Anomaly Detection (${data.date}) — Found: **${data.totalAnomalies}**\n\n`;
      for (const a of list) {
        md += `- **${a.type}** [Severity: \`${a.severity}\`]: ${a.description} (*${a.employee}*)\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_business_rules') {
      const rules = data.rules || [];
      let md = `### System Business Rules Registry (${data.totalRules} Rules)\n\n`;
      for (const r of rules) {
        md += `#### ${r.title} (\`${r.code}\`)\n${r.description}\n`;
        if (r.statutoryReference) {
          md += `*Statutory Authority: ${r.statutoryReference}*\n`;
        }
        md += '\n';
      }
      return md;
    }

    if (toolName === 'get_data_dictionary') {
      if (data.table) {
        const t = data.table;
        let md = `### Table: \`${t.name}\`\n${t.description}\n\n`;
        md += `| Column | Type | Nullable | Description |\n`;
        md += `|---|---|---|---|\n`;
        for (const c of t.columns) {
          md += `| \`${c.name}\` | \`${c.type}\` | ${c.isNullable ? 'Yes' : 'No'} | ${c.description} |\n`;
        }
        return md + '\n';
      }
      return `### PostgreSQL 18 Database Tables\nAvailable core tables: ${data.availableTables.map((t: string) => `\`${t}\``).join(', ')}.\n`;
    }

    if (toolName === 'get_security_policies') {
      if (data.policy) {
        const p = data.policy;
        let md = `### Security Policy: **${p.role}**\n`;
        md += `- **IDOR Protected**: ${p.idorProtection ? 'Yes (Strict Personal Isolation)' : 'No'}\n`;
        md += `\n**Allowed Operational Domains**:\n${p.allowedDomains.map((d: string) => `- ${d}`).join('\n')}\n`;
        if (p.restrictedDomains.length > 0) {
          md += `\n**Restricted Boundaries**:\n${p.restrictedDomains.map((d: string) => `- ${d}`).join('\n')}\n`;
        }
        return md + '\n';
      }
      return `### Apex HRMS Security Policy Matrix\nRBAC policies configured for Administrator, HR Officer, Payroll Officer, Management, and Employee.\n`;
    }

    if (toolName === 'get_company_info') {
      return `### Apex Enterprise SL Ltd — Corporate Profile
- **Entity**: **${data.companyName}** (${data.legalName})
- **Corporate Mission**: *${data.tagline}*
- **Headquarters**: ${data.headquarters}
- **Direct Contact**: ${data.contact}
- **System Purpose**: ${data.systemOverview}\n`;
    }

    if (toolName === 'get_system_knowledge') {
      if (data.topic) {
        const t = data.topic;
        let md = `### ${t.name} (${t.category})\n${t.summary}\n\n`;
        md += `**Domain Specifications**:\n`;
        for (const [k, v] of Object.entries(t.details)) {
          if (Array.isArray(v)) {
            md += `- **${k}**:\n${v.map((item: any) => `  * ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n')}\n`;
          } else if (typeof v === 'object' && v !== null) {
            md += `- **${k}**: ${JSON.stringify(v)}\n`;
          } else {
            md += `- **${k}**: ${v}\n`;
          }
        }
        if (t.guidelines && t.guidelines.length > 0) {
          md += `\n**Operational Guidelines**:\n${t.guidelines.map((g: string) => `- ${g}`).join('\n')}\n`;
        }
        return md + '\n';
      }
      if (data.availableTopics) {
        let md = `### Apex Enterprise Application Architecture (${data.totalDomains} Core Domains)\n\n`;
        md += `| Domain Topic | Category | Summary |\n`;
        md += `|---|---|---|\n`;
        for (const item of data.availableTopics) {
          md += `| \`${item.id}\` | **${item.category}** | ${item.summary} |\n`;
        }
        return md + '\n';
      }
    }

    return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
  }

  static async listConversations(userId: number) {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(50);
  }

  static async getConversationMessages(userId: number, conversationId: number) {
    const conv = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
      .limit(1);

    if (conv.length === 0) {
      throw new Error('Conversation not found or access denied.');
    }

    return await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.createdAt));
  }

  static async deleteConversation(userId: number, conversationId: number) {
    return await db
      .delete(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
  }

  static async getActivityLogs(limit = 100) {
    return await db
      .select()
      .from(aiActivityLogs)
      .orderBy(desc(aiActivityLogs.createdAt))
      .limit(limit);
  }
}
