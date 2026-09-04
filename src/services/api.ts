import {
  Department,
  Employee,
  QRCodeData,
  AttendanceRecord,
  PayrollRecord,
  PayrollPreviewResponse,
  SystemSettings,
  ScanResult,
  DashboardStats,
  UserSession,
} from '../types/index.ts';

const TOKEN_STORAGE_KEY = 'apex_auth_token';

let memoryToken: string | null = null;

export const getStoredToken = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return memoryToken;
};

export const setStoredToken = (token: string): void => {
  memoryToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
};

export const clearStoredToken = (): void => {
  memoryToken = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (err: any) {
    // If it's a network error (e.g. server starting/restarting) and we have retries left
    if (retries > 0 && (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError'))) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return apiRequest<T>(endpoint, options, retries - 1);
    }
    throw err;
  }
}

export const api = {
  // Auth
  getDemoAccounts: () => apiRequest<any[]>('/api/auth/demo-accounts'),
  login: (credentials: { username: string; password: string }) =>
    apiRequest<{ user: UserSession; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  firebaseLogin: (idToken: string) =>
    apiRequest<{ user: UserSession; token: string }>('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  getCurrentUser: () => apiRequest<UserSession>('/api/auth/me'),
  changePassword: (passwords: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    }),

  // Roles & Users
  getRoles: () => apiRequest<any[]>('/api/roles'),
  getUsers: () => apiRequest<any[]>('/api/users'),
  createUser: (userData: any) =>
    apiRequest<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  updateUser: (id: number, userData: any) =>
    apiRequest<any>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  deleteUser: (id: number) =>
    apiRequest<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  // Departments
  getDepartments: () => apiRequest<Department[]>('/api/departments'),
  createDepartment: (deptData: { departmentName: string; description?: string }) =>
    apiRequest<Department>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(deptData),
    }),
  updateDepartment: (id: number, deptData: { departmentName: string; description?: string }) =>
    apiRequest<Department>(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deptData),
    }),
  deleteDepartment: (id: number) =>
    apiRequest<{ success: boolean; message: string }>(`/api/departments/${id}`, {
      method: 'DELETE',
    }),

  // Employees
  getEmployees: (filters?: { search?: string; departmentId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId.toString());
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiRequest<Employee[]>(`/api/employees${qs ? `?${qs}` : ''}`);
  },
  getEmployeeById: (id: number) => apiRequest<Employee>(`/api/employees/${id}`),
  createEmployee: (empData: any) =>
    apiRequest<{ employee: Employee; qrCode: any }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empData),
    }),
  updateEmployee: (id: number, empData: any) =>
    apiRequest<Employee>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(empData),
    }),
  deleteEmployee: (id: number) =>
    apiRequest<{ success: boolean; message: string; employee?: any }>(`/api/employees/${id}`, {
      method: 'DELETE',
    }),
  regenerateQRCode: (employeeId: number) =>
    apiRequest<any>(`/api/employees/${employeeId}/regenerate-qr`, {
      method: 'POST',
    }),

  // QR Codes
  getAllQRCodes: () => apiRequest<QRCodeData[]>('/api/qrcodes'),

  // Attendance & Scanner
  scanQRCode: (payload: { qrValue: string; mode?: 'auto' | 'check_in' | 'check_out' }) =>
    apiRequest<ScanResult>('/api/attendance/scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAttendance: (filters?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: number;
    departmentId?: number;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId.toString());
    if (filters?.departmentId) params.append('departmentId', filters.departmentId.toString());
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiRequest<AttendanceRecord[]>(`/api/attendance${qs ? `?${qs}` : ''}`);
  },
  createManualAttendance: (data: any) =>
    apiRequest<AttendanceRecord>('/api/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Payroll
  getPayroll: (filters?: {
    period?: string;
    departmentId?: number;
    status?: string;
    employeeId?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.period) params.append('period', filters.period);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId.toString());
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString();
    return apiRequest<PayrollRecord[]>(`/api/payroll${qs ? `?${qs}` : ''}`);
  },
  previewPayroll: (payload: {
    period: string;
    departmentId?: number;
    employeeId?: number;
    defaultAllowances?: number;
    defaultDeductions?: number;
  }) =>
    apiRequest<PayrollPreviewResponse>('/api/payroll/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generatePayroll: (payload: string | {
    period: string;
    status?: string;
    defaultAllowances?: number;
    defaultDeductions?: number;
    customItems?: any[];
  }) => {
    const bodyObj = typeof payload === 'string' ? { period: payload } : payload;
    return apiRequest<{ success: boolean; message: string; count: number; records: PayrollRecord[] }>('/api/payroll/generate', {
      method: 'POST',
      body: JSON.stringify(bodyObj),
    });
  },
  processPayroll: (payload: {
    period: string;
    action?: string;
    status?: string;
    defaultAllowances?: number;
    defaultDeductions?: number;
    customItems?: any[];
  }) =>
    apiRequest<{ success: boolean; message: string; count?: number; records: PayrollRecord[] }>('/api/payroll/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePayroll: (id: number, data: any) =>
    apiRequest<PayrollRecord>(`/api/payroll/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  approvePayroll: (id: number) =>
    apiRequest<{ success: boolean; message: string; record: PayrollRecord }>(`/api/payroll/${id}/approve`, {
      method: 'POST',
    }),
  deletePayroll: (id: number) =>
    apiRequest<{ success: boolean; message: string; record: PayrollRecord }>(`/api/payroll/${id}`, {
      method: 'DELETE',
    }),
  processAllPayroll: (period: string, status = 'Approved') =>
    apiRequest<{ success: boolean; message: string; records: PayrollRecord[] }>('/api/payroll/process-all', {
      method: 'POST',
      body: JSON.stringify({ period, status }),
    }),

  // Overtime Management
  getOvertime: (filters?: { status?: string; startDate?: string; endDate?: string; employeeId?: number; departmentId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId.toString());
    if (filters?.departmentId) params.append('departmentId', filters.departmentId.toString());
    const qs = params.toString();
    return apiRequest<any[]>(`/api/overtime${qs ? `?${qs}` : ''}`);
  },
  createOvertime: (data: any) =>
    apiRequest<any>('/api/overtime', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOvertime: (id: number, data: any) =>
    apiRequest<any>(`/api/overtime/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  approveOvertime: (id: number) =>
    apiRequest<{ success: boolean; message: string; record: any }>(`/api/overtime/${id}/approve`, {
      method: 'POST',
    }),
  rejectOvertime: (id: number, reason?: string) =>
    apiRequest<{ success: boolean; message: string; record: any }>(`/api/overtime/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  deleteOvertime: (id: number) =>
    apiRequest<any>(`/api/overtime/${id}`, {
      method: 'DELETE',
    }),

  // Reports & Analytics
  getDashboardStats: () => apiRequest<DashboardStats>('/api/reports/dashboard-stats'),
  getAttendanceReport: (filters: {
    startDate?: string;
    endDate?: string;
    departmentId?: number;
    employeeId?: number;
    status?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.departmentId) params.append('departmentId', filters.departmentId.toString());
    if (filters.employeeId) params.append('employeeId', filters.employeeId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return apiRequest<{
      summary: {
        totalRecords: number;
        uniqueEmployees: number;
        presentCount: number;
        lateCount: number;
        overtimeCount: number;
        earlyDepartureCount: number;
        absentCount: number;
        totalWorkingHours: number;
        totalOvertimeHours: number;
        averageDailyHours: number;
        attendanceRate: number;
      };
      records: AttendanceRecord[];
    }>(`/api/reports/attendance${qs ? `?${qs}` : ''}`);
  },
  getPayrollReport: (filters: {
    period?: string;
    departmentId?: number;
    employeeId?: number;
    status?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.departmentId) params.append('departmentId', filters.departmentId.toString());
    if (filters.employeeId) params.append('employeeId', filters.employeeId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return apiRequest<{
      summary: {
        totalEmployees: number;
        totalRecords: number;
        totalBasicSalary: number;
        totalOvertime: number;
        totalAllowances: number;
        totalDeductions: number;
        totalGrossSalary: number;
        totalNetSalary: number;
      };
      records: PayrollRecord[];
    }>(`/api/reports/payroll${qs ? `?${qs}` : ''}`);
  },

  // Settings
  getSettings: () => apiRequest<SystemSettings>('/api/settings'),
  updateSettings: (settings: SystemSettings) =>
    apiRequest<SystemSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Re-seed demo data
  reseedDatabase: () =>
    apiRequest<{ success: boolean; message: string }>('/api/seed', {
      method: 'POST',
    }),
};
