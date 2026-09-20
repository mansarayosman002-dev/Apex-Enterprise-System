import {
  AIProvider,
  AIChatMessage,
  AIToolDefinition,
  UserContext,
  ToolCall,
} from './ai.types.ts';

/**
 * Local Deterministic Rule-Based AI Engine
 * Grounded in Sierra Leone labor regulations, PostgreSQL schemas, and real-time tool execution.
 */
export class LocalRuleBasedProvider implements AIProvider {
  name = 'Apex Local Intelligence Engine';

  isAvailable(): boolean {
    return true;
  }

  async chat(
    messages: AIChatMessage[],
    tools: AIToolDefinition[],
    systemInstruction: string,
    context: UserContext
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMessage?.content?.toLowerCase().trim() || '';

    // Intent mapping to tools
    // 1. LATE EMPLOYEES
    if (query.includes('who is late') || query.includes('late employees') || query.includes('tardy') || query.includes('late today') || query.includes('late arrivals')) {
      if (context.roleName !== 'Employee') {
        return {
          content: '',
          toolCalls: [{ id: `call_${Date.now()}`, name: 'get_late_employees', arguments: {} }],
        };
      }
    }

    // 2. ABSENT EMPLOYEES
    if (query.includes('who is absent') || query.includes('absent employees') || query.includes('missing employees') || query.includes('absent today') || query.includes('unexcused absence')) {
      if (context.roleName !== 'Employee') {
        return {
          content: '',
          toolCalls: [{ id: `call_${Date.now()}`, name: 'get_absent_employees', arguments: {} }],
        };
      }
    }

    // 3. ATTENDANCE & PRESENCE SUMMARIES (Admin, HR, Management)
    if (
      query.includes('attendance summary') ||
      query.includes('attendance overview') ||
      query.includes('today attendance') ||
      query.includes('attendance today') ||
      query.includes('present today') ||
      query.includes('how many present') ||
      query.includes('present in the building') ||
      query.includes('currently present') ||
      query.includes('who is present') ||
      query.includes('attendance rate') ||
      query.includes('attendance percentage') ||
      query.includes('punctuality rate') ||
      query.includes('workforce punctuality') ||
      query.includes('executive workforce summary') ||
      query.includes('executive summary')
    ) {
      if (context.roleName !== 'Employee') {
        return {
          content: '',
          toolCalls: [{ id: `call_${Date.now()}`, name: 'get_attendance_summary', arguments: {} }],
        };
      }
    }

    // 4. ANOMALIES & UNCLOSED SHIFTS (Admin, HR, Management)
    if (
      query.includes('unclosed') ||
      query.includes('missing checkout') ||
      query.includes('anomal') ||
      query.includes('discrepanc') ||
      query.includes('irregular')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_attendance_anomalies', arguments: {} }],
      };
    }

    // 5. EMPLOYEE ATTENDANCE (Personal & Admin lookup)
    if (
      query.includes('my attendance') ||
      query.includes('my records') ||
      query.includes('when did i check in') ||
      query.includes('my check in') ||
      query.includes('did i arrive on time') ||
      query.includes('employee attendance') ||
      (context.roleName === 'Employee' && (query.includes('attendance') || query.includes('punches') || query.includes('logs')))
    ) {
      const targetEmpId = context.employeeId || 1;
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_employee_attendance', arguments: { employeeId: targetEmpId } }],
      };
    }

    // 6. EMPLOYEE PAYSLIP (Personal & Admin preview)
    if (
      query.includes('my payroll') ||
      query.includes('my payslip') ||
      query.includes('my salary') ||
      query.includes('latest payslip breakdown') ||
      (context.roleName === 'Employee' && (query.includes('payroll') || query.includes('net pay') || query.includes('deductions') || query.includes('payslip')))
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_my_payroll', arguments: {} }],
      };
    }

    // 7. OVERTIME FORMULA / CALCULATION
    if (
      query.includes('how is overtime pay calculated') ||
      query.includes('how is overtime calculated') ||
      query.includes('how is my overtime calculated') ||
      query.includes('overtime formula') ||
      query.includes('overtime multiplier')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_business_rules', arguments: { category: 'OVERTIME' } }],
      };
    }

    // 8. OVERTIME CLAIMS & PENDING REQUESTS (Admin, HR, Payroll, Management, Employee)
    if (
      query.includes('overtime') &&
      (query.includes('summary') ||
        query.includes('pending') ||
        query.includes('claims') ||
        query.includes('requests') ||
        query.includes('expenditure') ||
        query.includes('highest overtime') ||
        query.includes('status of my overtime') ||
        query.includes('my overtime'))
    ) {
      const statusFilter = query.includes('pending') ? 'Pending' : undefined;
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_overtime_summary', arguments: statusFilter ? { status: statusFilter } : {} }],
      };
    }

    // 9. NASSIT CONTRIBUTION RULES & RATES
    if (
      query.includes('nassit') &&
      (query.includes('rate') ||
        query.includes('contribution') ||
        query.includes('pension') ||
        query.includes('deduction') ||
        query.includes('rule') ||
        query.includes('percentage') ||
        query.includes('what are') ||
        query.includes('what is'))
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_business_rules', arguments: { category: 'PAYROLL' } }],
      };
    }

    // 10. PAYE TAX BRACKETS & PROGRESSIVE TIERS
    if (
      query.includes('paye') ||
      query.includes('tax bracket') ||
      query.includes('income tax') ||
      query.includes('tax tier') ||
      query.includes('taxable income')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_business_rules', arguments: { category: 'PAYROLL' } }],
      };
    }

    // 11. ENTERPRISE PAYROLL SUMMARIES (Admin, Payroll, Management)
    if (
      query.includes('payroll summary') ||
      query.includes('total payroll') ||
      query.includes('payroll cost') ||
      query.includes('overall payroll') ||
      query.includes('enterprise payroll') ||
      query.includes('current month payroll') ||
      query.includes('nassit statutory liability') ||
      query.includes('department wage') ||
      query.includes('monthly payroll')
    ) {
      if (['Administrator', 'Payroll Officer', 'Management'].includes(context.roleName)) {
        return {
          content: '',
          toolCalls: [{ id: `call_${Date.now()}`, name: 'get_payroll_summary', arguments: {} }],
        };
      }
    }

    // 12. DEPARTMENTS & HEADCOUNTS (Admin, HR, Management, Payroll)
    if (
      query.includes('department') ||
      query.includes('headcount') ||
      query.includes('divisions') ||
      query.includes('cost center')
    ) {
      if (query.includes('delete')) {
        return {
          content: '',
          toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'departments' } }],
        };
      }
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_department_summary', arguments: {} }],
      };
    }

    // 13. BUSINESS RULES & GRACE PERIOD
    if (
      query.includes('business rule') ||
      query.includes('working hour') ||
      query.includes('grace period') ||
      query.includes('late rule') ||
      query.includes('shift hour')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_business_rules', arguments: {} }],
      };
    }

    // 14. DATABASE & DATA DICTIONARY
    if (query.includes('database') || query.includes('table') || query.includes('data dictionary') || query.includes('schema')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_data_dictionary', arguments: {} }],
      };
    }

    // 15. SECURITY POLICIES & RBAC
    if (
      query.includes('security policy') ||
      query.includes('rbac') ||
      query.includes('permissions') ||
      query.includes('roles') ||
      query.includes('see another employee') ||
      query.includes('other employee salary') ||
      query.includes('password hash')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_security_policies', arguments: {} }],
      };
    }

    // 16. COMPANY INFO
    if (query.includes('company') || query.includes('about apex') || query.includes('contact') || query.includes('headquarters')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_company_info', arguments: {} }],
      };
    }

    // 17. CURRENT USER / PROFILE
    if (query.includes('who am i') || query.includes('my profile') || query.includes('my role')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_current_user', arguments: {} }],
      };
    }

    // 18. QR CODE BADGES & TERMINAL SCANNER
    if (
      query.includes('qr') ||
      query.includes('badge') ||
      query.includes('barcode') ||
      query.includes('clock in') ||
      query.includes('terminal scanner')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'qr_code_rules' } }],
      };
    }

    // 19. WORKFLOWS & APPROVAL PROCESSES
    if (
      query.includes('workflow') ||
      query.includes('approval process') ||
      query.includes('lifecycle') ||
      query.includes('approve overtime') ||
      query.includes('reject overtime')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'workflows' } }],
      };
    }

    // 20. PAYROLL APPROVAL & PERIOD LOCKING
    if (
      query.includes('period lock') ||
      query.includes('modify approved') ||
      query.includes('payroll approval') ||
      query.includes('locked period')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'payroll_approval_rules' } }],
      };
    }

    // 21. PAYSLIP GENERATION & PDF EXPORT
    if (query.includes('generate payslip') || query.includes('export payslip') || query.includes('pdf payslip')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'payroll' } }],
      };
    }

    // 22. SYSTEM SETTINGS & CONFIGURATION
    if (query.includes('system setting') || query.includes('global setting') || query.includes('configuration')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'system_configuration' } }],
      };
    }

    // 23. SYSTEM LIMITATIONS
    if (query.includes('limitation') || query.includes('constraint') || query.includes('boundary')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'system_limitations' } }],
      };
    }

    // 24. AUDIT REQUIREMENTS
    if (query.includes('audit') || query.includes('audit log') || query.includes('tamper') || query.includes('compliance')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'audit_requirements' } }],
      };
    }

    // 25. DATA PRIVACY & IDOR
    if (query.includes('privacy') || query.includes('data protection') || query.includes('confidential') || query.includes('idor')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'data_privacy_requirements' } }],
      };
    }

    // 26. OPERATIONAL PROCEDURES & SOPS
    if (query.includes('procedure') || query.includes('operational') || query.includes('sop') || query.includes('runbook')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'operational_procedures' } }],
      };
    }

    // 27. ERROR CONDITIONS & TROUBLESHOOTING
    if (
      query.includes('error condition') ||
      query.includes('troubleshoot') ||
      query.includes('failure mode') ||
      query.includes('cooldown') ||
      query.includes('duplicate punch') ||
      query.includes('rejected scan') ||
      query.includes('second scan') ||
      query.includes('negative salary')
    ) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'error_conditions' } }],
      };
    }

    // 28. TERMINOLOGY & GLOSSARY
    if (query.includes('terminology') || query.includes('glossary') || query.includes('definitions') || query.includes('acronym')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'terminology' } }],
      };
    }

    // SYSTEM OVERVIEW & ARCHITECTURE
    if (query.includes('system architecture') || query.includes('application context') || query.includes('system overview') || query.includes('all rules')) {
      return {
        content: '',
        toolCalls: [{ id: `call_${Date.now()}`, name: 'get_system_knowledge', arguments: { topic: 'all' } }],
      };
    }

    // Default conversational responses tailored by user role
    if (context.roleName === 'Administrator') {
      return {
        content: `Hello **${context.username}**! I am the **Apex Enterprise AI Assistant**.

As an **Administrator**, you have **Universal Operational Access** across the entire enterprise. You can ask any question across **all operational domains** (HR, Payroll, Management, and Employee Self-Service):

👑 **Administrator & System Governance**:
- *"Show today's attendance summary"*
- *"Check for attendance anomalies"*
- *"Show the database data dictionary"*
- *"What are the system business rules?"*
- *"Show security policies for Employee role"*
- *"Show global system settings"*

👥 **HR Officer & Workforce Operations**:
- *"Who is late today?"* / *"Who is absent today?"*
- *"Who is currently present in the building?"*
- *"List all pending overtime requests"*
- *"Show department headcount distribution"*
- *"Who has unclosed attendance shifts today?"*
- *"What is the late arrival grace period rule?"*

💰 **Payroll Officer & Statutory Compliance**:
- *"Show enterprise payroll summary"*
- *"What are the official NASSIT contribution rates?"*
- *"Explain the Sierra Leone PAYE tax brackets"*
- *"How is overtime pay calculated in Apex HRMS?"*
- *"What is the payroll approval lifecycle?"*
- *"Can an approved payroll period be modified?"*

📊 **Management & Executive Insights**:
- *"Give me an executive workforce summary"*
- *"Which department has the highest overtime expenditure?"*
- *"What is our monthly NASSIT statutory liability?"*
- *"What is our overall workforce punctuality rate?"*
- *"Show department-by-department wage totals"*

👤 **Employee Self-Service Inquiries**:
- *"Show my attendance record for this month"*
- *"Did I arrive on time today?"*
- *"Show my latest payslip breakdown"*
- *"How do employees clock in using their QR badge?"*
- *"Why did my second badge scan get rejected?"*

Feel free to ask any question from any role or module above! How can I assist you today?`,
      };
    }

    const roleSuggestions: Record<string, string[]> = {
      'HR Officer': [
        '- "Who is late today?"',
        '- "Who is absent today?"',
        '- "Who is currently present in the building?"',
        '- "Show attendance summary"',
        '- "List department headcounts"',
        '- "Show pending overtime requests"',
        '- "Who has unclosed attendance shifts today?"',
      ],
      'Payroll Officer': [
        '- "Show current month payroll summary"',
        '- "What are the official NASSIT contribution rates?"',
        '- "Explain the Sierra Leone PAYE tax brackets"',
        '- "How is overtime pay calculated in Apex HRMS?"',
        '- "Show pending overtime claims for payroll batching"',
      ],
      Management: [
        '- "Give me an executive workforce summary"',
        '- "Show today\'s attendance overview"',
        '- "Show department headcount distribution"',
        '- "Which department has the highest overtime expenditure?"',
        '- "What is our monthly NASSIT statutory liability?"',
      ],
      Employee: [
        '- "Show my attendance record for this month"',
        '- "Did I arrive on time today?"',
        '- "Show my latest payslip breakdown"',
        '- "What is the status of my overtime request?"',
        '- "How do I clock in using my QR badge?"',
      ],
    };

    const suggestions = (roleSuggestions[context.roleName] || roleSuggestions['Employee']).join('\n');

    return {
      content: `Hello **${context.username}**! I am the **Apex Enterprise AI Assistant**.

I am trained on our official business rules, PostgreSQL database structures, statutory payroll laws (NASSIT & PAYE), and RBAC security policies.

Here are some suggested actions you can ask me based on your role as **${context.roleName}**:

${suggestions}

How can I assist you today?`,
    };
  }
}

export class OrchestratedAIProvider implements AIProvider {
  name = 'Apex Orchestrated AI Provider';
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
    return await this.local.chat(messages, tools, systemInstruction, context);
  }
}
