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
  toolName?: string;
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
  isWriteAction: boolean;
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

export interface AutomationTask {
  id: number;
  name: string;
  description?: string | null;
  triggerType: string;
  triggerConfig?: string | null;
  conditionConfig?: string | null;
  actionConfig?: string | null;
  channel: string;
  isActive: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
}

export interface AutomationExecution {
  id: number;
  automationId: number;
  triggeredBy: string;
  status: string;
  summary?: string | null;
  affectedCount?: number | null;
  errorDetails?: string | null;
  executedAt: Date;
}

export interface AnomalyItem {
  id: number;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityType: string;
  entityId?: string | null;
  description: string;
  details?: string | null;
  status: string;
  detectedAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: number | null;
}
