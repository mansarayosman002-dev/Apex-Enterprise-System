# Smart Employee Attendance & Payroll Management System

An enterprise-grade, full-stack Academic Information & Human Resource Management System (HRMS) built with **TypeScript**, **React 19**, **Tailwind CSS**, **Node.js/Express**, **Drizzle ORM**, and **PostgreSQL**.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT 19 CLIENT (SPA)                    │
│   • Motion Animations   • Recharts Analytics                │
│   • HTML5-QRCode Scanner • Role-Restricted View Routing     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST API (/api/*)
                               │ Bearer JWT Authentication
┌──────────────────────────────▼──────────────────────────────┐
│                    NODE.JS / EXPRESS BACKEND                │
│   • JWT Auth & RBAC Middleware  • Drizzle ORM Queries       │
│   • Attendance Engine (Grace/Late) • Payroll Compute Engine │
│   • QR Code Generation (PNG Data URLs) • Audit Logging      │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Connection Pool (pg)
┌──────────────────────────────▼──────────────────────────────┐
│                     POSTGRESQL DATABASE                     │
│   • 8 Relational Tables with Foreign Key Constraints        │
│   • Cascade Delete Rules & Unique Indeces                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Modules & Functional Workflows

1. **Role-Based Access Control (RBAC)**:
   - **Administrator**: Full administrative control across all 10 modules (Users, Settings, Audit, Payroll, Employees, Attendance, Overtime, Departments, QR Codes, Reports).
   - **HR Officer**: Employee lifecycle management, department structuring, attendance overview, and overtime approvals.
   - **Payroll Officer**: Comprehensive payroll calculations, payslip generation, salary adjustments, and financial disbursements.
   - **Management**: Departmental performance tracking, overtime approvals, and workforce attendance analytics.
   - **Employee**: Self-service portal for QR badge retrieval, attendance records, digital payslip inspection, and overtime tracking.

2. **Smart QR Attendance Engine**:
   - Dynamic Base64 PNG QR code issuance per employee.
   - Live hardware camera scanning (`html5-qrcode`) and manual test scanner.
   - Configurable shift timing (e.g. 08:30:00 - 17:30:00) with a **15-minute grace threshold**.
   - Automated status tagging: `On-Time`, `Late`, `Half-Day`, `Overtime`, `Early Departure`.
   - Idempotent scan protection preventing duplicate check-ins on identical calendar shifts.

3. **Mathematical Payroll Engine**:
   - **Hourly Rate**:
     $$\text{Hourly Rate} = \frac{\text{Basic Salary}}{\text{Standard Working Days} \times \text{Hours/Day}}$$
   - **Overtime Pay**:
     $$\text{OT Pay} = \text{Overtime Hours} \times \text{Hourly Rate} \times 1.5$$
   - **Gross Salary**:
     $$\text{Gross Salary} = \text{Basic Salary} + \text{OT Pay} + \text{Allowances}$$
   - **Net Salary**:
     $$\text{Net Salary} = \text{Gross Salary} - \text{Deductions}$$

---

## Demo User Accounts

The database comes pre-seeded with five ready-to-test accounts representing each organizational role:

| Username | Password | Role | Access Scope |
|---|---|---|---|
| `admin` | `password123` | **Administrator** | Full system access & configuration |
| `hrofficer` | `password123` | **HR Officer** | Employees, Departments, Attendance, Overtime |
| `payrollofficer` | `password123` | **Payroll Officer** | Payroll Generation, Payslips, Overtime Review |
| `manager` | `password123` | **Management** | Team Overtime Approvals, Attendance Reports |
| `employee` | `password123` | **Employee** | Self-Service Dashboard, QR Badge, Personal Payslips |

---

## API Endpoint Specifications

### Authentication
- `POST /api/auth/login` - Authenticate username & password; returns JWT token and user profile.
- `GET /api/auth/me` - Retrieve current authenticated session info.

### Employees & QR Codes
- `GET /api/employees` - Search and list employees with department joins.
- `POST /api/employees` - Register a new employee and auto-generate QR code.
- `GET /api/employees/:id` - Retrieve employee profile and attendance history.
- `PUT /api/employees/:id` - Update employee details.
- `DELETE /api/employees/:id` - Soft-deactivate employee and revoke QR code.
- `GET /api/employees/:id/qr` - Retrieve printable Base64 PNG QR code data URL.
- `POST /api/employees/:id/qr/regenerate` - Invalidate current code and issue a fresh QR credential.

### Attendance & QR Scanning
- `POST /api/attendance/scan` - Process incoming QR code scan for `check_in`, `check_out`, or `auto`.
- `GET /api/attendance` - Query attendance records filtered by date, department, or employee.
- `POST /api/attendance/manual` - Record manual administrative attendance entry.

### Overtime Management
- `GET /api/overtime` - List overtime entries with calculated rates.
- `POST /api/overtime/:id/approve` - Approve pending overtime hours.
- `POST /api/overtime/:id/reject` - Reject overtime submission.

### Payroll & Payslips
- `GET /api/payroll/preview` - Calculate and preview payroll batch for target month (`YYYY-MM`).
- `POST /api/payroll/generate` - Generate, persist, and batch-create monthly payroll records.
- `GET /api/payroll` - List payroll records with employee details and payment status.
- `PUT /api/payroll/:id` - Adjust allowances, deductions, and payment status.
- `POST /api/payroll/:id/approve` - Authorize and approve single payslip.
- `GET /api/payroll/payslip/:id` - Generate formal digital payslip document.

### System & Departments
- `GET /api/departments` - List departments with employee count aggregations.
- `POST /api/departments` - Create new organizational department.
- `PUT /api/departments/:id` - Update department metadata.
- `DELETE /api/departments/:id` - Delete empty department (guarded against active employee assignments).
- `GET /api/settings` - Retrieve global HRMS configuration (work hours, grace periods, OT multiplier).
- `PUT /api/settings` - Update global HRMS operational parameters.

---

## Local Development & Setup

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database instance or Cloud SQL instance

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment configuration file:
   ```bash
   cp .env.example .env
   ```

3. Configure your database connection in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/apex_hrms_db"
   JWT_SECRET="your-secure-production-jwt-secret"
   ```

4. Seed the database with initial schema and demo accounts:
   ```bash
   npx tsx src/server/seed.ts
   ```

5. Launch development server (Runs Vite + Express on Port 3000):
   ```bash
   npm run dev
   ```

6. Run the comprehensive QA test suite:
   ```bash
   npm test
   ```

---

## Production Deployment

1. **Build the Application**:
   ```bash
   npm run build
   ```
   This generates the optimized React SPA bundle in `dist/` and compiles the Node/Express backend into `dist/server.cjs` via `esbuild`.

2. **Start the Production Server**:
   ```bash
   npm start
   ```
   Binds Express to host `0.0.0.0` and port `3000` with static asset serving and SPA client fallback.
