import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  AIChatMessage,
  AIToolDefinition,
  UserContext,
  ToolCall,
} from './ai.types.ts';

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private client: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('[GeminiProvider] Failed to initialize GoogleGenAI client:', err);
        this.client = null;
      }
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(
    messages: AIChatMessage[],
    tools: AIToolDefinition[],
    systemInstruction: string,
    context: UserContext
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    if (!this.client) {
      throw new Error('Gemini API is not configured. Missing GEMINI_API_KEY.');
    }

    // Convert AIToolDefinition[] to Gemini FunctionDeclarations
    const functionDeclarations = tools.map((tool) => {
      const properties: Record<string, any> = {};
      for (const [key, param] of Object.entries(tool.parameters)) {
        properties[key] = {
          type: param.type.toUpperCase(),
          description: param.description,
          ...(param.enum ? { enum: param.enum } : {}),
        };
      }
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'OBJECT',
          properties,
          required: tool.requiredParams,
        },
      };
    });

    // Format message history
    const contents: any[] = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.arguments,
              },
            });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.toolCallId || 'tool_response',
                response: { result: msg.content },
              },
            },
          ],
        });
      }
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations } as any] : undefined,
          temperature: 0.2,
        },
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const toolCalls: ToolCall[] = [];
      let textContent = '';

      for (const part of parts) {
        if ((part as any).functionCall) {
          const fc = (part as any).functionCall;
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: fc.name,
            arguments: fc.args || {},
          });
        }
        if (part.text) {
          textContent += part.text;
        }
      }

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: any) {
      console.error('[GeminiProvider] Chat generation error:', err);
      throw err;
    }
  }
}

export class LocalRuleBasedProvider implements AIProvider {
  name = 'Apex Local Intelligence Engine';

  isAvailable(): boolean {
    return true; // Always operational locally
  }

  async chat(
    messages: AIChatMessage[],
    tools: AIToolDefinition[],
    systemInstruction: string,
    context: UserContext
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = (lastUserMessage?.content || '').trim().toLowerCase();

    const allowedToolNames = new Set(tools.map((t) => t.name));

    // Helper to generate a unique tool call ID
    const genCallId = (name: string) => `call_local_${name}_${Date.now()}`;

    // 1. Current user / Identity
    if (
      query.includes('who am i') ||
      query.includes('my profile') ||
      query.includes('my account') ||
      query.includes('my role') ||
      query.includes('my permissions')
    ) {
      if (allowedToolNames.has('get_current_user')) {
        return {
          content: '',
          toolCalls: [{ id: genCallId('get_current_user'), name: 'get_current_user', arguments: {} }],
        };
      }
    }

    // 2. Late employees / Tardiness
    if (
      query.includes('late') ||
      query.includes('tardy') ||
      query.includes('tardiness') ||
      query.includes('delay')
    ) {
      if (allowedToolNames.has('get_late_employees')) {
        const dateMatch = query.match(/\d{4}-\d{2}-\d{2}/);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_late_employees'),
              name: 'get_late_employees',
              arguments: { date: dateMatch ? dateMatch[0] : undefined },
            },
          ],
        };
      }
    }

    // 3. Absent employees / Attendance gaps
    if (
      query.includes('absent') ||
      query.includes('missing') ||
      query.includes('not present') ||
      query.includes('who is not here') ||
      query.includes('did not show up')
    ) {
      if (allowedToolNames.has('get_absent_employees')) {
        const dateMatch = query.match(/\d{4}-\d{2}-\d{2}/);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_absent_employees'),
              name: 'get_absent_employees',
              arguments: { date: dateMatch ? dateMatch[0] : undefined },
            },
          ],
        };
      }
    }

    // 4. Personal Attendance (Employee role or specific self query)
    if (
      (context.roleName === 'Employee' && (query.includes('attendance') || query.includes('punch') || query.includes('check in') || query.includes('hours'))) ||
      query.includes('my attendance') ||
      query.includes('my punches') ||
      query.includes('my check-in')
    ) {
      if (allowedToolNames.has('get_employee_attendance')) {
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_employee_attendance'),
              name: 'get_employee_attendance',
              arguments: { employeeId: context.employeeId || undefined },
            },
          ],
        };
      }
    }

    // 5. General Attendance Summary
    if (
      query.includes('attendance summary') ||
      query.includes('attendance report') ||
      query.includes('today\'s attendance') ||
      query.includes('attendance today') ||
      query.includes('overall attendance')
    ) {
      if (allowedToolNames.has('get_attendance_summary')) {
        const dateMatch = query.match(/\d{4}-\d{2}-\d{2}/);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_attendance_summary'),
              name: 'get_attendance_summary',
              arguments: { date: dateMatch ? dateMatch[0] : undefined },
            },
          ],
        };
      }
    }

    // 6. Personal Payroll / Payslip
    if (
      query.includes('my payroll') ||
      query.includes('my payslip') ||
      query.includes('my salary') ||
      query.includes('my pay') ||
      query.includes('my deduction') ||
      (context.roleName === 'Employee' && query.includes('salary'))
    ) {
      if (allowedToolNames.has('get_my_payroll')) {
        const periodMatch = query.match(/\d{4}-\d{2}/);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_my_payroll'),
              name: 'get_my_payroll',
              arguments: { period: periodMatch ? periodMatch[0] : undefined },
            },
          ],
        };
      }
    }

    // 7. General Payroll Summary
    if (
      query.includes('payroll summary') ||
      query.includes('total payroll') ||
      query.includes('payroll cost') ||
      query.includes('salary expense') ||
      query.includes('payroll report')
    ) {
      if (allowedToolNames.has('get_payroll_summary')) {
        const periodMatch = query.match(/\d{4}-\d{2}/);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_payroll_summary'),
              name: 'get_payroll_summary',
              arguments: { period: periodMatch ? periodMatch[0] : undefined },
            },
          ],
        };
      }
    }

    // 8. Overtime Summary
    if (
      query.includes('overtime') ||
      query.includes(' ot ') ||
      query.includes('extra hours') ||
      query.includes('over-time')
    ) {
      if (allowedToolNames.has('get_overtime_summary')) {
        const periodMatch = query.match(/\d{4}-\d{2}/);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_overtime_summary'),
              name: 'get_overtime_summary',
              arguments: { period: periodMatch ? periodMatch[0] : undefined },
            },
          ],
        };
      }
    }

    // 9. Department Summary
    if (
      query.includes('department') ||
      query.includes('headcount') ||
      query.includes('staff count') ||
      query.includes('divisions')
    ) {
      if (allowedToolNames.has('get_department_summary')) {
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_department_summary'),
              name: 'get_department_summary',
              arguments: {},
            },
          ],
        };
      }
    }

    // 10. Attendance Anomalies
    if (
      query.includes('anomaly') ||
      query.includes('anomalies') ||
      query.includes('buddy punch') ||
      query.includes('suspicious') ||
      query.includes('flagged attendance') ||
      query.includes('ghost punch')
    ) {
      if (allowedToolNames.has('get_attendance_anomalies')) {
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('get_attendance_anomalies'),
              name: 'get_attendance_anomalies',
              arguments: {},
            },
          ],
        };
      }
    }

    // 11. Sensitive Write Actions: Deactivate Employee
    if (
      query.includes('deactivate employee') ||
      query.includes('terminate employee') ||
      query.includes('suspend employee') ||
      query.includes('disable employee')
    ) {
      if (allowedToolNames.has('deactivate_employee')) {
        const idMatch = query.match(/employee\s*(?:id|#)?\s*(\d+)/i) || query.match(/(\d+)/);
        const empId = idMatch ? parseInt(idMatch[1], 10) : 0;
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('deactivate_employee'),
              name: 'deactivate_employee',
              arguments: {
                employeeId: empId,
                reason: 'Requested via AI conversational interface',
              },
            },
          ],
        };
      }
    }

    // 12. Sensitive Write Actions: Process Batch Payroll
    if (
      query.includes('process payroll') ||
      query.includes('run payroll') ||
      query.includes('generate payroll') ||
      query.includes('execute payroll')
    ) {
      if (allowedToolNames.has('process_batch_payroll')) {
        const periodMatch = query.match(/\d{4}-\d{2}/);
        const today = new Date();
        const fallbackPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('process_batch_payroll'),
              name: 'process_batch_payroll',
              arguments: {
                period: periodMatch ? periodMatch[0] : fallbackPeriod,
              },
            },
          ],
        };
      }
    }

    // 13. Sensitive Write Actions: Send Notification
    if (
      query.includes('notify') ||
      query.includes('send alert') ||
      query.includes('send notification') ||
      query.includes('send reminder')
    ) {
      if (allowedToolNames.has('send_notification')) {
        const idMatch = query.match(/employee\s*(?:id|#)?\s*(\d+)/i);
        return {
          content: '',
          toolCalls: [
            {
              id: genCallId('send_notification'),
              name: 'send_notification',
              arguments: {
                employeeId: idMatch ? parseInt(idMatch[1], 10) : undefined,
                title: 'Notice from Management',
                message: query.replace(/(?:notify|send notification|send alert|send reminder)/i, '').trim() || 'Please check your pending tasks.',
                category: 'HR',
                priority: 'medium',
              },
            },
          ],
        };
      }
    }

    // 14. Fallback Knowledge Base / Conversational Guidance
    if (
      query.includes('apex enterprise') ||
      query.includes('about apex') ||
      query.includes('who is apex') ||
      query.includes('services') ||
      query.includes('what does apex') ||
      query.includes('tell me about apex')
    ) {
      return {
        content: `### Apex Enterprise SL Ltd — Corporate Overview & Services

**Apex Enterprise SL Ltd** (registered as *Apex Enterprise Solutions (SL) Ltd.*) is a premier technology enterprise and corporate software consultancy headquartered in Freetown, Sierra Leone.

- **Headquarters**: 15 Siaka Stevens Street, Freetown, Western Area, Sierra Leone
- **Official Contact**: info@apexenterprise.sl | +232 76 892 411 | https://apexenterprise.sl
- **Corporate Mission**: To provide robust, secure, and statutory-compliant digital workforce and financial management infrastructure for commercial corporations, financial institutions, and public sector organizations across Sierra Leone and West Africa.

#### Core Enterprise Services:

1. **Enterprise HRMS & Workforce Management**:
   - Digital employee onboarding and centralized profile records.
   - Dynamic department allocation and organizational hierarchy mapping.
   - Comprehensive role-based access control (RBAC) and leave administration.

2. **Smart QR Attendance & Terminal Infrastructure**:
   - Cryptographically signed personal QR badge generation.
   - Dedicated terminal scanning with Dual Mode (Mobile Camera & Kiosk).
   - Anti-buddy-punching verification via live photo pop-ups.
   - Debounce protection (60s cooldown) and encrypted offline punch synchronization.

3. **Automated Sierra Leone Statutory Payroll & Taxation**:
   - NASSIT Pension Engine: Automatic 5% employee basic deduction and 10% employer contribution.
   - Sierra Leone NRA PAYE Progressive Tax calculation.
   - Dynamic overtime calculation (1.5x hourly rate) and allowance management.
   - Direct-deposit bank dispatch schedules and individual payslip generation.

4. **Custom Enterprise Software Engineering & Cloud Infrastructure**:
   - High-performance, mission-critical web applications built on React 18, Node.js, and PostgreSQL 18.
   - Military-grade database security, audit trail logging, and automatic disaster recovery backups.

5. **AI-Powered Enterprise Copilot & Workforce Analytics**:
   - Integrated AI assistant with real-time database queries and strict IDOR data isolation.
   - Scheduled task automation engine with 10 preloaded workflows.
   - Proactive anomaly detection scanner for attendance fraud, overtime spikes, and payroll variance.`,
      };
    }

    if (
      query.includes('how the system works') ||
      query.includes('how does the system work') ||
      query.includes('how does it work') ||
      query.includes('system architecture') ||
      query.includes('system workflow') ||
      query.includes('explain the system')
    ) {
      return {
        content: `### Smart Employee Attendance and Payroll Management System — Workflow & Architecture

The system is an end-to-end enterprise solution designed to automate attendance tracking, streamline statutory payroll calculations, and enforce labor law compliance using QR code technology.

#### 1. System Architecture
- **Frontend**: React 18 with TypeScript, Vite, and TailwindCSS responsive UI.
- **Backend API**: Node.js and Express.js REST services with parameter sanitization and JWT bearer authentication.
- **Database**: Relational PostgreSQL 18 with Drizzle ORM, strict foreign key constraints, and indexed audit logs.
- **Security**: 5-tier Role-Based Access Control (Administrator, HR Officer, Payroll Officer, Management, Employee) with strict IDOR data isolation.

#### 2. QR Code Attendance Workflow
- **Badge Generation**: Every employee receives a unique, encrypted QR code badge.
- **Terminal Punching**: Employees present their QR code to the terminal scanner upon arrival and departure.
- **Anti-Buddy Punching**: The scanner immediately displays the employee's registered photo on screen for visual verification by HR or security personnel.
- **Debounce Guard**: A 60-second cooldown prevents accidental double-punches.
- **Working Hours & Overtime Engine**: Evaluates check-ins against standard shift (08:00:00) with a 15-minute grace period. Deducts 1 hour of unpaid break time. Work performed past 17:00:00 is automatically tracked as overtime.

#### 3. Automated Statutory Payroll Workflow
- **Earnings Computation**: Gross Salary = Basic Salary + Approved Overtime Payout (1.5x hourly multiplier) + Allowances.
- **Sierra Leone NASSIT Pension**: Automatically computes 5% employee deduction and 10% employer contribution (15% total remitted within 15 days of month end).
- **Sierra Leone NRA PAYE Progressive Tax**: Progressive bracket deductions applied to taxable income.
- **Net Pay Calculation**: Net Salary = Gross Salary - Total Deductions (NASSIT + PAYE).
- **Approval Lifecycle**: Draft -> Preview -> Review & Approve -> Paid, with individual payslip generation and banking export files.

#### 4. AI Copilot & Automation Layer
- **Live Database Grounding**: Answers inquiries using real-time PostgreSQL data without executing raw SQL.
- **Confirmation Safeguard**: Write operations (e.g., employee deactivation, batch payroll) require explicit user confirmation before mutation.
- **Response Features**: Every response supports Markdown Download, 1-click Copy, Expanded Full View, Inline Edit, and Share to Fellow Employee.`,
      };
    }

    if (query.includes('nassit') || query.includes('pension')) {
      return {
        content: `### Sierra Leone NASSIT Pension Compliance Guide
- **Employee Contribution**: **5%** deducted from Basic Salary.
- **Employer Contribution**: **10%** contributed by the enterprise.
- **Total Remittance**: **15%** remitted to the National Social Security and Insurance Trust (NASSIT) monthly.
- **Statutory Deadlines**: Must be remitted within 15 days following the payroll month end to avoid statutory penalties.`,
      };
    }

    if (query.includes('tax') || query.includes('paye')) {
      return {
        content: `### PAYE (Pay As You Earn) Progressive Tax Structure
The system applies statutory Sierra Leone NRA progressive tax brackets on Taxable Income (Gross Salary less allowable deductions like Employee NASSIT 5%):
- **Threshold 0 - 600,000 SLE**: 0% (Tax-free allowance)
- **Next 600,000 SLE**: 15%
- **Next 600,000 SLE**: 20%
- **Next 600,000 SLE**: 30%
- **Above 2,400,000 SLE**: 35%

*All calculations are strictly handled by the verified backend \`payrollEngine.ts\` to ensure 100% audit compliance.*`,
      };
    }

    if (query.includes('qr') || query.includes('terminal') || query.includes('scan') || query.includes('badge')) {
      return {
        content: `### QR Attendance Terminal & Badges
- **Terminal Access**: Navigate to the **Terminal** tab in the main navigation.
- **Dual Mode**: Supports dedicated mobile camera badge scanning and kiosk mode.
- **Anti-Buddy Punching**: The HR scanner immediately displays the employee's registered photo for instant visual verification.
- **Debounce Guard**: Enforces a cooldown threshold to prevent accidental double-punching.
- **Offline Sync**: Punches made during internet disruptions are encrypted locally and automatically synced once connectivity returns.`,
      };
    }

    // Polite default role-aware assistance
    const rolePills: Record<string, string[]> = {
      Administrator: [
        '- "Show today\'s attendance summary"',
        '- "Who is late or absent today?"',
        '- "Show overall payroll summary"',
        '- "Check for attendance anomalies"',
        '- "Deactivate employee #5"',
      ],
      'HR Officer': [
        '- "Who is late today?"',
        '- "Who is absent today?"',
        '- "Show attendance summary"',
        '- "Check department headcounts"',
        '- "Send notification to employee #3: Please submit your leave request"',
      ],
      'Payroll Officer': [
        '- "Show current month payroll summary"',
        '- "Show overtime records for approval"',
        '- "Process batch payroll for 2026-09"',
        '- "What are the NASSIT tax rates?"',
      ],
      Management: [
        '- "Show today\'s attendance overview"',
        '- "Show overall payroll cost this month"',
        '- "Show department summaries"',
        '- "Check overtime hours across departments"',
      ],
      Employee: [
        '- "Show my attendance records"',
        '- "Show my latest payslip and deductions"',
        '- "How is my net salary calculated?"',
        '- "What is NASSIT?"',
      ],
    };

    const suggestions = (rolePills[context.roleName] || rolePills['Employee']).join('\n');

    return {
      content: `Hello **${context.username}**! I am your **AI HR & Payroll Assistant**.

I operate securely within your permissions as **${context.roleName}**. Here are some things you can ask me:

${suggestions}

How may I assist you right now?`,
    };
  }
}

export class OrchestratedAIProvider implements AIProvider {
  name = 'Apex Hybrid AI Provider';
  private gemini = new GeminiProvider();
  private local = new LocalRuleBasedProvider();

  isAvailable(): boolean {
    return true;
  }

  async chat(
    messages: AIChatMessage[],
    tools: AIToolDefinition[],
    systemInstruction: string,
    context: UserContext
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    // If Gemini is configured and available, try it first
    if (this.gemini.isAvailable()) {
      try {
        return await this.gemini.chat(messages, tools, systemInstruction, context);
      } catch (geminiErr: any) {
        console.warn('[OrchestratedAIProvider] Gemini call failed, falling back to Local Engine:', geminiErr?.message || geminiErr);
        // Fallback to local
      }
    }

    // Default to high-performance local rule-based intent engine
    return await this.local.chat(messages, tools, systemInstruction, context);
  }
}
