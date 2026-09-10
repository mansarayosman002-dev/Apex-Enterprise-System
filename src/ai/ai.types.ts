export type UserRole = 'Administrator' | 'HR Officer' | 'Payroll Officer' | 'Employee' | 'Management';

export interface UserContext {
  userId: number;
  username: string;
  roleName: UserRole;
  employeeId?: number | null;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AIChatMessage {
  id?: number;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  timestamp?: string;
}

export interface AIToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  required?: boolean;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, AIToolParameterSchema>;
  requiredParams: string[];
  allowedRoles: UserRole[];
  isWriteAction: boolean; // True for mutations that require explicit confirmation
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AIToolContext {
  user: UserContext;
}

export interface AIToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  actionDetails?: Record<string, any>;
}

export interface AIChatResponse {
  message: string;
  conversationId: number;
  toolInvocations?: Array<{
    toolName: string;
    arguments: Record<string, any>;
    result: any;
  }>;
  requiresConfirmation?: boolean;
  pendingAction?: {
    toolName: string;
    arguments: Record<string, any>;
    prompt: string;
  };
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  chat(
    messages: AIChatMessage[],
    tools: AIToolDefinition[],
    systemInstruction: string,
    context: UserContext
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
  }>;
}

export type NotificationCategory =
  | 'Attendance'
  | 'Payroll'
  | 'HR'
  | 'System'
  | 'Reminder'
  | 'Alert'
  | 'Announcement';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
