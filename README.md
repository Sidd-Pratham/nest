# Employee Management System (EMS) API

A production-grade RESTful API built with **NestJS**, **MongoDB**, and **Redis** for managing Admins, Employees, and Attendance records with role-based access control.

---

## 🏗️ Architecture Overview

```
src/
├── auth/               # JWT authentication for admins & employees
├── admin/              # Admin CRUD with RBAC (SUPER_ADMIN / ADMIN)
├── employee/           # Employee CRUD with department enum & soft-delete
├── attendance/         # Punch-in/out logic & CSV report generation
├── cache/              # Custom Redis cache service with DB fallback
├── common/
│   ├── decorators/     # @Roles(), @CurrentUser()
│   ├── dto/            # PaginationDto, PaginatedResult
│   ├── enums/          # AdminRole, UserRole, Department (strict enums)
│   ├── filters/        # Global HTTP exception filter
│   ├── guards/         # JwtAuthGuard, RolesGuard
│   ├── interceptors/   # TransformInterceptor (uniform response shape)
│   └── interfaces/     # JwtPayload
└── seeder/             # Super Admin seeder script
```

---

## ⚙️ Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or managed)

---

## 🚀 Setup & Running Locally

### 1. Clone and install dependencies
```bash
git clone <your-repo-url>
cd nest
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/ems_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=key
JWT_EXPIRES_IN=7d
SEED_ADMIN_NAME=Super Admin
SEED_ADMIN_EMAIL=superadmin@ems.com
SEED_ADMIN_PASSWORD=SuperAdmin@123
```

### 3. Seed the initial Super Admin
```bash
npm run seed
```
This creates a `SUPER_ADMIN` account (if one doesn't already exist) using the credentials from `.env`.

### 4. Start the development server
```bash
npm run start:dev
```

- **API Base URL**: `http://localhost:3000/api/v1`
- **Swagger Docs**: `http://localhost:3000/api/docs`

---

## 🔐 Authentication

Two separate login endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/admin/login` | Login as SUPER_ADMIN or ADMIN |
| `POST /api/v1/auth/employee/login` | Login as EMPLOYEE |

Both return a `accessToken` (JWT). Pass it in all subsequent requests:
```
Authorization: Bearer <accessToken>
```

---

## 👥 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | Full access. Create/delete admins, manage all employees & attendance. |
| `ADMIN` | Manage employees and attendance. View own profile only. |
| `EMPLOYEE` | View/update own profile. Punch in/out. |

---

## 📌 API Endpoints

### Auth
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/admin/login` | Public | Admin login |
| POST | `/auth/employee/login` | Public | Employee login |

### Admins
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/admins` | SUPER_ADMIN | Create admin |
| GET | `/admins` | SUPER_ADMIN | List all admins (paginated) |
| GET | `/admins/:id` | SUPER_ADMIN / self | Get admin by ID |
| PATCH | `/admins/:id` | SUPER_ADMIN / self | Update admin |
| DELETE | `/admins/:id` | SUPER_ADMIN | Soft-delete admin |

### Employees
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/employees` | SUPER_ADMIN / ADMIN | Create employee |
| GET | `/employees` | SUPER_ADMIN / ADMIN | List all (paginated, filterable) |
| GET | `/employees/:id` | ADMIN / self | Get employee by ID |
| PATCH | `/employees/:id` | ADMIN / self | Update employee |
| DELETE | `/employees/:id` | SUPER_ADMIN / ADMIN | Soft-delete employee |

### Attendance
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/attendance/punch-in` | EMPLOYEE | Record punch-in |
| POST | `/attendance/punch-out` | EMPLOYEE | Record punch-out |
| GET | `/attendance` | SUPER_ADMIN / ADMIN | List records (filterable) |
| GET | `/attendance/report` | SUPER_ADMIN / ADMIN | Download CSV report |

---

## 📊 CSV Report

Download attendance report with optional filters:

```
GET /api/v1/attendance/report?employeeId=xxx&startDate=2025-01-01&endDate=2025-12-31&fields=employeeName,punchIn,punchOut,duration
```

**Available fields**: `employeeId`, `employeeName`, `employeeEmail`, `department`, `date`, `punchIn`, `punchOut`, `duration`

---

## 🗄️ Redis Caching Strategy

- Admin and Employee data is cached on retrieval with a **5-minute TTL**.
- Cache is **invalidated** on create, update, or delete operations.
- If Redis is **unavailable**, the app **automatically falls back** to MongoDB queries without crashing.

---

## 🔒 Security Features

- Passwords are hashed with **bcrypt** 
- Passwords must include uppercase, lowercase, digit, and special character.
- JWT tokens expire in 7 days (configurable).
- Soft-deletion preserves data integrity (records never physically deleted).

---

## 🧪 Running Tests
```bash
npm run test          # Unit tests
npm run test:cov      # Coverage report
npm run test:e2e      # End-to-end tests
```
