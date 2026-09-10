import { UserContext, UserRole, AIToolDefinition } from './ai.types.ts';

export class AIPermissionValidator {
  /**
   * Validate if the user's role is permitted to invoke the requested tool
   */
  static validateToolAccess(tool: AIToolDefinition, user: UserContext): { allowed: boolean; reason?: string } {
    if (!tool.allowedRoles.includes(user.roleName)) {
      return {
        allowed: false,
        reason: `Access Denied: The role "${user.roleName}" is not permitted to execute tool "${tool.name}".`,
      };
    }

    // Role-specific safety rules:
    // Management role is strictly READ-ONLY across all tools
    if (user.roleName === 'Management' && tool.isWriteAction) {
      return {
        allowed: false,
        reason: `Access Denied: Management users have read-only analytics access and cannot perform mutations like "${tool.name}".`,
      };
    }

    return { allowed: true };
  }

  /**
   * Enforces data isolation rules on parameters (e.g. Employee IDOR protection)
   */
  static sanitizeAndValidateToolParams(
    toolName: string,
    args: Record<string, any>,
    user: UserContext
  ): { valid: boolean; error?: string; sanitizedArgs: Record<string, any> } {
    const sanitized = { ...args };

    // Strict Employee Isolation:
    // If the authenticated user is an 'Employee', enforce that employeeId matches their own profile
    if (user.roleName === 'Employee') {
      if (!user.employeeId) {
        return {
          valid: false,
          error: 'Access Denied: Your user account is not linked to an active employee profile.',
          sanitizedArgs: sanitized,
        };
      }

      // If tool accepts employeeId, force it to be the user's own employeeId
      if ('employeeId' in sanitized && sanitized.employeeId !== undefined) {
        if (Number(sanitized.employeeId) !== user.employeeId) {
          return {
            valid: false,
            error: `Access Denied: Employees can only access their own personal records (Employee ID ${user.employeeId}). Access to other employee data is strictly forbidden.`,
            sanitizedArgs: sanitized,
          };
        }
      } else {
        // Automatically pin to their own employeeId
        sanitized.employeeId = user.employeeId;
      }
    }

    return { valid: true, sanitizedArgs: sanitized };
  }
}

export function filterAllowedTools(tools: AIToolDefinition[], roleName: UserRole): AIToolDefinition[] {
  return tools.filter((tool) => tool.allowedRoles.includes(roleName));
}

export function validateToolExecution(
  toolName: string,
  user: UserContext,
  args: Record<string, any>
): { valid: boolean; error?: string; sanitizedArgs?: Record<string, any> } {
  const tool = (toolsByName.get(toolName) || undefined) as AIToolDefinition | undefined;
  if (tool) {
    const access = AIPermissionValidator.validateToolAccess(tool, user);
    if (!access.allowed) {
      return { valid: false, error: access.reason };
    }
  }

  const paramCheck = AIPermissionValidator.sanitizeAndValidateToolParams(toolName, args, user);
  if (!paramCheck.valid) {
    return { valid: false, error: paramCheck.error };
  }

  return { valid: true, sanitizedArgs: paramCheck.sanitizedArgs };
}

const toolsByName = new Map<string, AIToolDefinition>();
export function registerToolForPermissions(tool: AIToolDefinition) {
  toolsByName.set(tool.name, tool);
}

