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

const aiProvider = new OrchestratedAIProvider();

export class AIService {
  /**
   * Generates the system prompt tailored to user context and enterprise compliance
   */
  private static getSystemInstruction(context: UserContext): string {
    return `You are the Apex Enterprise AI HR & Payroll Assistant for the Smart Employee Attendance and Payroll Management System.

ABOUT APEX ENTERPRISE SL LTD:
- Entity: Apex Enterprise SL Ltd (Registered as Apex Enterprise Solutions (SL) Ltd.).
- Headquarters: 15 Siaka Stevens Street, Freetown, Sierra Leone.
- Contact: info@apexenterprise.sl | +232 76 892 411 | https://apexenterprise.sl
- Profile & Mission: A premier Sierra Leonean technology and enterprise software engineering consultancy. Dedicated to modernizing enterprise workforce infrastructure, eliminating payroll fraud, preventing ghost workers, and ensuring full statutory compliance with Sierra Leone labor laws.
- Core Services:
  1. Enterprise HRMS & Workforce Management (onboarding, departments, role hierarchy, leave management).
  2. Smart QR Attendance & Terminal Infrastructure (cryptographic QR badges, mobile camera & kiosk scanning, anti-buddy punching with live photo matching, 60s debounce guard, offline sync).
  3. Automated Sierra Leone Statutory Payroll & Taxation (NASSIT 5% employee / 10% employer pension, NRA progressive PAYE tax brackets, overtime calculation, payslips, bank transfer schedules).
  4. Custom Enterprise Software Engineering & Cloud Modernization (React, TypeScript, Node.js, Express, high-availability PostgreSQL 18).
  5. AI-Powered Enterprise Copilot & Workforce Analytics (conversational analytics, 10 scheduled automation templates, live anomaly detection).

HOW THE SMART SYSTEM WORKS:
1. QR Code Attendance Engine:
   - Encrypted QR badge generated for each employee embedding cryptographic tokens.
   - Scan at terminals with 60-second cooldown debounce to eliminate accidental double punches.
   - Live photo display on scanner screen instantly verifies the puncher's identity to prevent buddy-punching.
   - Daily schedule: 08:00 to 17:00 with 15-minute grace threshold before marked late.
   - Automatic 1-hour unpaid break deducted; hours worked beyond 17:00 automatically credit as overtime.
2. Automated Statutory Payroll Engine:
   - Gross Salary = Basic Salary + Approved Overtime Payout (1.5x hourly rate) + Allowances.
   - Statutory NASSIT: 5% employee basic deduction + 10% employer contribution (15% total remitted to NASSIT within 15 days).
   - Sierra Leone PAYE Tax: NRA progressive income tax brackets (0% up to 600,000 SLE, 15% next 600,000 SLE, 20% next 600,000 SLE, 30% next 600,000 SLE, and 35% above 2,400,000 SLE).
   - Net Salary = Gross Salary - Total Deductions.
   - Workflow: Draft -> Preview -> Review & Approve -> Paid, with individual payslip generation.
3. AI Copilot & Automation Layer:
   - Role-Based Access Control: Real-time queries strictly isolate employee data from others (IDOR protection).
   - Response Features: Download, Copy, Full View, Inline Edit, and Share to Fellow Employee.

AUTHENTICATED USER CONTEXT:
- Username: ${context.username}
- Role: ${context.roleName}
- Employee ID: ${context.employeeId ?? 'None (System User)'}

ENTERPRISE RULES & MANDATES:
1. SECURITY & STRICT ISOLATION:
   - Never generate or execute raw SQL.
   - All data operations MUST go through approved backend tools.
   - An Employee role MUST ONLY see their own records (punches, overtime, payslip). They cannot access other employees' data under any circumstance.
   - Administrators, HR Officers, and Payroll Officers have specific department or system-wide visibility aligned with their role.
2. AUTHORITATIVE ARITHMETIC:
   - Do NOT guess or perform arbitrary payroll math in your head. Always call backend calculation engines (e.g. get_my_payroll, get_payroll_summary, get_employee_attendance) and report the exact figures.
   - Net Salary Formula: Gross Salary - Total Deductions.
   - Gross Salary Formula: Basic Salary + Overtime Pay + Allowances.
   - Sierra Leone NASSIT: 5% Employee deduction, 10% Employer contribution (15% total).
3. WRITE ACTIONS REQUIRE CONFIRMATION:
   - Actions like employee deactivation or batch payroll processing are high-impact and require explicit user confirmation before execution.
4. TONE & FORMAT:
   - Professional, courteous, precise, and concise.
   - Do NOT use emojis. Use clean GitHub-flavored Markdown tables and bullet points.`;
  }

  /**
   * Retrieves or creates an active conversation for a user
   */
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

    const defaultTitle = title || 'General Assistance';
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

  /**
   * Main chat orchestration function
   */
  static async handleChat(params: {
    user: UserContext;
    message: string;
    conversationId?: number;
    confirmedAction?: {
      toolName: string;
      arguments: Record<string, any>;
    };
  }): Promise<AIChatResponse> {
    const { user, message, conversationId, confirmedAction } = params;

    // 1. Get or create conversation record
    const conv = await this.getOrCreateConversation(
      user.userId,
      user.roleName,
      conversationId,
      message.slice(0, 40)
    );

    // 2. Handle Confirmed Write Action execution directly
    if (confirmedAction) {
      const { toolName, arguments: args } = confirmedAction;
      const permCheck = validateToolExecution(toolName, user, args);
      if (!permCheck.valid) {
        return {
          conversationId: conv.id,
          message: `**Action Forbidden**: ${permCheck.error}`,
        };
      }

      // Execute approved action with confirmed: true flag
      const result: AIToolExecutionResult = await executeAITool(toolName, { ...args, confirmed: true }, { user });

      // Log in AI Activity table
      await db.insert(aiActivityLogs).values({
        userId: user.userId,
        username: user.username,
        role: user.roleName,
        operation: 'tool_execution_confirmed',
        toolInvoked: toolName,
        status: result.success ? 'success' : 'failed',
        details: JSON.stringify({ arguments: args, result }),
      });

      const confirmationSummary = result.success
        ? `**Action Confirmed & Executed Successfully**\n\n${typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data || 'Operation completed.'}`
        : `**Action Failed**: ${result.error}`;

      // Save to messages
      await db.insert(aiMessages).values({
        conversationId: conv.id,
        role: 'assistant',
        content: confirmationSummary,
      });

      return {
        conversationId: conv.id,
        message: confirmationSummary,
        toolInvocations: [
          {
            toolName,
            arguments: args,
            result: result.data || result.error,
          },
        ],
      };
    }

    // 3. Save incoming user message
    await db.insert(aiMessages).values({
      conversationId: conv.id,
      role: 'user',
      content: message,
    });

    // 4. Fetch recent conversation history
    const historyRows = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conv.id))
      .orderBy(asc(aiMessages.createdAt))
      .limit(20);

    const messages: AIChatMessage[] = historyRows.map((r) => ({
      id: r.id,
      role: r.role as any,
      content: r.content,
      toolCalls: r.toolCalls ? JSON.parse(r.toolCalls) : undefined,
      toolCallId: r.toolCallId || undefined,
    }));

    // 5. Filter tools accessible to the caller's role
    const allowedTools = filterAllowedTools(aiTools, user.roleName);
    const systemPrompt = this.getSystemInstruction(user);

    // 6. Invoke AI Provider
    const providerResult = await aiProvider.chat(messages, allowedTools, systemPrompt, user);

    // 7. If no tool calls were requested, return text response directly
    if (!providerResult.toolCalls || providerResult.toolCalls.length === 0) {
      const reply = providerResult.content || 'I have received your request. How else can I assist?';

      await db.insert(aiMessages).values({
        conversationId: conv.id,
        role: 'assistant',
        content: reply,
      });

      return {
        conversationId: conv.id,
        message: reply,
      };
    }

    // 8. Process tool calls
    const toolInvocations: Array<{ toolName: string; arguments: any; result: any }> = [];
    let pendingAction: { toolName: string; arguments: any; prompt: string } | undefined;
    let assistantSummary = providerResult.content ? `${providerResult.content}\n\n` : '';

    for (const toolCall of providerResult.toolCalls) {
      const toolDef = aiTools.find((t) => t.name === toolCall.name);
      if (!toolDef) continue;

      // Role check
      const permCheck = validateToolExecution(toolCall.name, user, toolCall.arguments);
      if (!permCheck.valid) {
        assistantSummary += `**Permission Notice**: ${permCheck.error}\n\n`;
        await db.insert(aiActivityLogs).values({
          userId: user.userId,
          username: user.username,
          role: user.roleName,
          operation: 'tool_execution',
          toolInvoked: toolCall.name,
          status: 'denied',
          details: JSON.stringify({ error: permCheck.error, arguments: toolCall.arguments }),
        });
        continue;
      }

      // Check if this is a WRITE action requiring confirmation
      if (toolDef.isWriteAction) {
        const promptText = `**Confirmation Required**\nYou are about to execute: **${toolDef.name}**\nParameters: \`${JSON.stringify(toolCall.arguments)}\`\nRisk Level: **${toolDef.riskLevel}**.\n\nPlease confirm to proceed.`;
        pendingAction = {
          toolName: toolCall.name,
          arguments: toolCall.arguments,
          prompt: promptText,
        };

        assistantSummary += promptText;

        await db.insert(aiActivityLogs).values({
          userId: user.userId,
          username: user.username,
          role: user.roleName,
          operation: 'action_pending_confirmation',
          toolInvoked: toolCall.name,
          status: 'pending_confirmation',
          details: JSON.stringify(toolCall.arguments),
        });

        break; // Stop and wait for user confirmation
      }

      // Read-only tool execution
      const executionResult = await executeAITool(toolCall.name, toolCall.arguments, { user });

      await db.insert(aiActivityLogs).values({
        userId: user.userId,
        username: user.username,
        role: user.roleName,
        operation: 'tool_execution',
        toolInvoked: toolCall.name,
        status: executionResult.success ? 'success' : 'failed',
        details: JSON.stringify({ arguments: toolCall.arguments, success: executionResult.success }),
      });

      toolInvocations.push({
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        result: executionResult.data || executionResult.error,
      });

      // Format formatted output from tool
      if (executionResult.success) {
        assistantSummary += this.formatToolResultMarkdown(toolCall.name, executionResult.data);
      } else {
        assistantSummary += `Could not complete \`${toolCall.name}\`: ${executionResult.error}\n\n`;
      }
    }

    // 9. Save assistant's formatted reply
    await db.insert(aiMessages).values({
      conversationId: conv.id,
      role: 'assistant',
      content: assistantSummary.trim(),
      toolCalls: JSON.stringify(providerResult.toolCalls),
    });

    return {
      conversationId: conv.id,
      message: assistantSummary.trim(),
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
      requiresConfirmation: !!pendingAction,
      pendingAction,
    };
  }

  /**
   * Transforms raw tool JSON outputs into beautiful markdown representations
   */
  private static formatToolResultMarkdown(toolName: string, data: any): string {
    if (!data) return 'No data returned.\n\n';

    if (toolName === 'get_current_user') {
      return `### User Profile & Session
- **Username**: ${data.username}
- **Role**: \`${data.roleName}\`
- **Employee ID**: ${data.employeeId ?? 'None'}
- **Department**: ${data.employeeDetails?.departmentName || 'N/A'}
- **Position**: ${data.employeeDetails?.position || 'N/A'}\n\n`;
    }

    if (toolName === 'get_late_employees') {
      const list = data.lateEmployees || [];
      const total = data.totalLate ?? data.count ?? list.length;
      if (list.length === 0) {
        return `**No late employees recorded for ${data.date}**. Everyone arrived on or before schedule!\n\n`;
      }
      let md = `### Late Employees Report (${data.date}) — Total: **${total}**\n\n`;
      md += `| Employee ID | Name | Department | Check-In | Scheduled |\n`;
      md += `|---|---|---|---|---|\n`;
      for (const emp of list) {
        const checkIn = emp.checkIn || emp.checkInTime || '-';
        const shiftStart = emp.standardCheckIn || emp.shiftStart || '08:00:00';
        md += `| ${emp.employeeCode} | **${emp.employeeName}** | ${emp.department} | ${checkIn} | ${shiftStart} |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_absent_employees') {
      const list = data.absentEmployees || [];
      const total = data.totalAbsent ?? data.count ?? list.length;
      if (list.length === 0) {
        return `**100% Attendance for ${data.date}**. No active employees are absent!\n\n`;
      }
      let md = `### Absent Employees Report (${data.date}) — Total: **${total}**\n\n`;
      md += `| Employee ID | Name | Department | Position |\n`;
      md += `|---|---|---|---|\n`;
      for (const emp of list) {
        md += `| ${emp.employeeCode} | **${emp.employeeName}** | ${emp.department} | ${emp.position} |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_attendance_summary') {
      const present = data.presentCount ?? data.presentToday ?? 0;
      const late = data.lateCount ?? data.lateToday ?? 0;
      const absent = data.absentCount ?? data.absentToday ?? 0;
      return `### Attendance Overview (${data.date})
- **Total Active Workforce**: ${data.totalEmployees}
- **Present Today**: **${present}** (${data.attendanceRate}%)
- **Late Arrivals**: **${late}**
- **Absent / Not Checked In**: **${absent}**\n\n`;
    }

    if (toolName === 'get_payroll_summary') {
      const period = data.payrollPeriod || data.period || 'Current Period';
      const count = data.totalEmployeesProcessed ?? data.totalEmployees ?? 0;
      const status = data.status || 'Processed';
      return `### Enterprise Payroll Summary (${period})
- **Total Employees Evaluated**: ${count}
- **Processing Status**: \`${status}\`
- **Gross Payroll Obligation**: **SLE ${data.totalGrossSalary}**
- **Total Net Disbursable**: **SLE ${data.totalNetSalary}**
- **Statutory Deductions (NASSIT + PAYE)**: **SLE ${data.totalDeductions}**
- **Total Overtime Payouts**: **SLE ${data.totalOvertimeAmount}**\n\n`;
    }

    if (toolName === 'get_my_payroll') {
      if (data.found === false || !data.employeeName) {
        return `${data.message || 'No payroll records found for your employee profile in this period.'}\n\n`;
      }
      return `### Your Payslip Summary (${data.period})
- **Employee**: ${data.employeeName} (${data.employeeCode})
- **Department**: ${data.department} | **Position**: ${data.position}
- **Status**: \`${data.status}\`

| Component | Amount (SLE) |
|---|---|
| **Basic Salary** | ${data.basicSalary} |
| **Overtime Pay** | +${data.overtimeAmount} |
| **Allowances** | +${data.allowances} |
| **Gross Earnings** | **${data.grossSalary}** |
| **Total Deductions (NASSIT & PAYE)** | -${data.deductions} |
| **Net Take-Home Pay** | **${data.netSalary}** |\n\n`;
    }

    if (toolName === 'get_overtime_summary') {
      return `### Overtime Summary (${data.period})
- **Total Overtime Records**: ${data.totalRecords}
- **Total Approved OT Hours**: **${data.totalHours} hrs**
- **Total Approved OT Payout**: **SLE ${data.totalCost}**
- **Pending Approvals**: **${data.pendingCount} records**\n\n`;
    }

    if (toolName === 'get_department_summary') {
      let md = `### Department Overview (${data.totalDepartments} Departments, ${data.totalEmployees} Employees)\n\n`;
      md += `| Department | Code | Headcount | Active Employees |\n`;
      md += `|---|---|---|---|\n`;
      for (const d of data.departments || []) {
        md += `| **${d.name}** | ${d.code} | ${d.headcount} | ${d.activeCount} |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_attendance_anomalies') {
      const anomalies = data.anomalies || [];
      if (anomalies.length === 0) {
        return `**No attendance anomalies detected**. All recorded punches meet compliance thresholds.\n\n`;
      }
      let md = `### Attendance Anomaly Detection Report — Found: **${data.totalAnomalies}**\n\n`;
      for (const an of anomalies) {
        md += `- **${an.type}** (${an.severity}): ${an.description}\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_employee_attendance') {
      let md = `### Attendance History (${data.employeeName} - ${data.employeeCode})\n`;
      md += `Total Records: **${data.totalRecords}**\n\n`;
      md += `| Date | Check-In | Check-Out | Status | Work Hours |\n`;
      md += `|---|---|---|---|---|\n`;
      for (const rec of (data.records || []).slice(0, 7)) {
        md += `| ${rec.date} | ${rec.checkInTime || '-'} | ${rec.checkOutTime || '-'} | ${rec.status} | ${rec.workHours} hrs |\n`;
      }
      return md + '\n';
    }

    if (toolName === 'get_company_info') {
      let md = `### Apex Enterprise SL Ltd — Corporate Profile & System Architecture\n\n`;
      md += `- **Company Entity**: **${data.companyName}** (${data.legalName})\n`;
      md += `- **Corporate Motto**: *${data.tagline}*\n`;
      md += `- **Headquarters**: ${data.headquarters}\n`;
      md += `- **Contact**: ${data.contact}\n\n`;
      if (data.overview) {
        md += `#### Corporate Mission & Overview\n${data.overview}\n\n`;
      }
      if (data.services) {
        md += `#### Core Enterprise Services\n${data.services}\n\n`;
      }
      if (data.systemArchitecture) {
        md += `#### System Architecture\n${data.systemArchitecture}\n\n`;
      }
      if (data.attendanceWorkflow) {
        md += `#### Smart QR Attendance Workflow\n${data.attendanceWorkflow}\n\n`;
      }
      if (data.payrollWorkflow) {
        md += `#### Automated Statutory Payroll Workflow\n${data.payrollWorkflow}\n\n`;
      }
      return md;
    }

    return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`;
  }

  /**
   * Returns list of conversations for a user
   */
  static async listConversations(userId: number) {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(50);
  }

  /**
   * Retrieves messages for a specific conversation
   */
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

  /**
   * Deletes a conversation
   */
  static async deleteConversation(userId: number, conversationId: number) {
    return await db
      .delete(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
  }

  /**
   * Retrieves recent AI audit activity logs
   */
  static async getActivityLogs(limit = 100) {
    return await db
      .select()
      .from(aiActivityLogs)
      .orderBy(desc(aiActivityLogs.createdAt))
      .limit(limit);
  }
}
