# CampusPulse — College Event Management System

A full-stack, college-level academic project for managing university events, student registrations, organizer coordination, and administrative oversight. Built with a clean, responsive React frontend, an Express/Node.js REST API backend, and a normalized relational SQL database with foreign key constraints.

---

## 1. Project Overview

**CampusPulse** provides an end-to-end platform for college campus life:
- **Students** can discover upcoming technical symposiums, hackathons, sports tournaments, and cultural nights; filter events by category or date; inspect live seat capacities; register with a single click; view their digital passes under "My Registrations"; and cancel seats when unable to attend.
- **Event Organizers** (faculty advisors and student club leads) can publish events with seat capacities and registration deadlines, monitor real-time attendee rosters, and mark on-ground student attendance.
- **Administrators** (Dean of Student Affairs / HODs) have complete governance over users, roles, event approvals/moderation, category management, and aggregate participation reports.

---

## 2. Technology Stack

### Frontend
- **React.js 19**: Component-based user interface
- **React Router 7**: Client-side routing with role-based protected routes
- **Axios**: HTTP client with request interceptors for automatic JWT Bearer token injection
- **Tailwind CSS**: Utility-first styling with zero-pill metadata discipline and mobile responsiveness
- **Lucide React**: Clean iconography

### Backend
- **Node.js & Express.js**: RESTful API architecture
- **JWT (JSON Web Tokens)**: Stateless authentication via `Authorization: Bearer <token>`
- **bcryptjs**: 10-round salted password hashing
- **Middleware**: Authentication verification and role-based access control (`authorizeRoles`)

### Database
- **Relational SQL / MySQL**:
  - Normalized 3NF design with primary keys, foreign keys (`ON DELETE CASCADE`, `ON DELETE RESTRICT`), and unique constraints (`UNIQUE(student_id, event_id)`).
  - Production-ready `database/schema.sql` for MySQL 8.0 / MariaDB.
  - Seamless zero-config relational SQL engine (WebAssembly SQLite via `sql.js`) with disk persistence (`database/college_events.sqlite`) for instantaneous evaluation in containerized or demo environments without needing an external MySQL server pre-installed.

---

## 3. Seed Accounts & Credentials

The database comes pre-seeded with sample accounts across all three user roles:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `admin123` | Dean of Student Affairs / Full campus control |
| **Organizer** | `organizer@college.edu` | `organizer123` | Prof. Alan Turing / CSI Club Faculty Lead |
| **Student** | `student@college.edu` | `student123` | Sarah Connor / Student Council |
| **Student** | `rahul@college.edu` | `student123` | Rahul Sharma / Engineering Student |

> **Evaluator Tip**: The top navigation bar and login page include a **"Quick Demo Switcher"** button that logs into any role with a single click without manually typing credentials!

---

## 4. Project Directory Structure

```text
college-event-management/
│
├── backend/                        # Backend REST API Server
│   ├── config/
│   │   └── db.ts                   # Relational SQL adapter (MySQL + embedded fallback)
│   ├── controllers/
│   │   ├── adminController.ts      # Dashboard stats, user & event administration
│   │   ├── authController.ts       # Register, login, profile update, getMe
│   │   ├── categoryController.ts   # Category CRUD operations
│   │   ├── eventController.ts      # Event CRUD, participant roster, attendance
│   │   └── registrationController.ts # Event registration, cancellation, student passes
│   ├── middleware/
│   │   └── authMiddleware.ts       # JWT verify, optionalAuth, authorizeRoles
│   ├── routes/
│   │   ├── adminRoutes.ts          # /api/admin/*
│   │   ├── authRoutes.ts           # /api/auth/*
│   │   ├── categoryRoutes.ts       # /api/categories/*
│   │   ├── eventRoutes.ts          # /api/events/*
│   │   └── registrationRoutes.ts   # /api/registrations/*
│   └── utils/
│       └── jwt.ts                  # JWT token generator & validator
│
├── database/
│   └── schema.sql                  # Complete MySQL schema & seed data
│
├── src/                            # Frontend React Application
│   ├── components/
│   │   ├── common/
│   │   │   ├── Alert.tsx           # Success, error, warning alert banner
│   │   │   ├── EventCard.tsx       # Reusable zero-pill event card
│   │   │   └── Modal.tsx           # Accessible dialog modals
│   │   ├── layout/
│   │   │   ├── Footer.tsx          # Campus project footer & viva notes
│   │   │   └── Navbar.tsx          # 3-Zone top bar with quick demo switcher
│   │   └── routes/
│   │       └── ProtectedRoute.tsx  # Role-based route guard
│   ├── context/
│   │   └── AuthContext.tsx         # Global session, user profile, login/logout
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx       # Overview metrics & activity
│   │   │   ├── AdminReportsPage.tsx     # Printable attendance reports
│   │   │   ├── ManageCategoriesPage.tsx # Category CRUD
│   │   │   ├── ManageEventsPage.tsx     # Event moderation & approvals
│   │   │   ├── ManageRegistrationsPage.tsx # Global master registration roster
│   │   │   └── ManageUsersPage.tsx      # User role governance & deletion
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx            # Login with 1-click demo accounts
│   │   │   └── RegisterPage.tsx         # Student / Organizer registration
│   │   ├── organizer/
│   │   │   ├── CreateEventPage.tsx      # Publish new event with validation
│   │   │   ├── EditEventPage.tsx        # Update event schedule/venue
│   │   │   ├── EventParticipantsPage.tsx # Attendee roster & attendance marking
│   │   │   ├── ManageMyEventsPage.tsx   # Organizer's events table
│   │   │   └── OrganizerDashboard.tsx   # Organizer KPI summary
│   │   ├── public/
│   │   │   ├── EventDetailPage.tsx      # Event breakdown & registration action
│   │   │   ├── EventsPage.tsx           # Search, category filter, date filter, sort
│   │   │   └── HomePage.tsx             # Campus landing page & spotlight
│   │   └── student/
│   │       ├── MyRegistrationsPage.tsx  # Student passes & cancellation
│   │       ├── StudentDashboard.tsx     # Student schedule & tickets
│   │       └── StudentProfilePage.tsx   # Edit name, phone, change password
│   ├── services/
│   │   └── api.ts                  # Axios client & typed service endpoints
│   ├── types/
│   │   └── index.ts                # TypeScript data interfaces
│   ├── App.tsx                     # React Router 7 route definitions
│   └── main.tsx                    # React DOM entry point
│
├── .env.example                    # Environment variable template
├── package.json                    # Dependencies and run scripts
├── server.ts                       # Full-stack server entry point (Express + Vite)
└── tsconfig.json                   # TypeScript configuration
```

---

## 5. Database Design & Relational Tables

The schema enforces strict relational constraints:

1. **`users`**:
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `name`, `email` (UNIQUE), `password` (bcrypt hash), `role` (`student`, `organizer`, `admin`), `phone`, `created_at`
2. **`categories`**:
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `name` (UNIQUE), `description`
3. **`events`**:
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `title`, `description`, `category_id` (FK -> categories.id), `organizer_id` (FK -> users.id)
   - `date`, `start_time`, `end_time`, `venue`, `max_participants`, `registration_deadline`, `image`, `status`, `created_at`
4. **`registrations`**:
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `student_id` (FK -> users.id ON DELETE CASCADE)
   - `event_id` (FK -> events.id ON DELETE CASCADE)
   - `registration_date`, `status` (`confirmed`, `cancelled`), `attendance_status` (`unmarked`, `present`, `absent`)
   - `CONSTRAINT uk_student_event UNIQUE (student_id, event_id)` — **Prevents duplicate registrations at the database level!**

---

## 6. How to Run Locally

### Prerequisites
- Node.js (version 18 or higher)
- Optional: MySQL Server 8.0 or XAMPP (if using external MySQL)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` values:
```ini
PORT=3000
JWT_SECRET=college_event_mgmt_super_secret_jwt_key_2026
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=college_event_db
```

### Step 3: Run the Full-Stack Application
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser. The app runs both the backend Express API and the Vite React frontend on port 3000!

---

## 7. Connecting with Real MySQL Server (Optional)

If your college professor or examiner wants you to demonstrate with a local MySQL server (such as MySQL Workbench or XAMPP):
1. Start MySQL in XAMPP or terminal:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. Ensure your `.env` contains your MySQL credentials:
   ```ini
   DATABASE_HOST=localhost
   DATABASE_USER=root
   DATABASE_PASSWORD=your_mysql_password
   DATABASE_NAME=college_event_db
   ```
3. Restart the server: `npm run dev`. The backend will automatically connect to MySQL and use connection pooling!

---

## 8. REST API Documentation

### Authentication
- `POST /api/auth/register` — Register student or organizer account
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `PUT /api/auth/profile` — Update name, phone, or password

### Events
- `GET /api/events` — Query events with filters (`q`, `category`, `date`, `sort`, `upcoming_only`)
- `GET /api/events/:id` — Get full event details, organizer info, and seat count
- `POST /api/events` — Create event (Organizer/Admin)
- `PUT /api/events/:id` — Update event details (Organizer/Admin)
- `DELETE /api/events/:id` — Delete event (Organizer/Admin)
- `GET /api/events/:id/participants` — Get attendee roster (Organizer/Admin)
- `PATCH /api/events/:id/attendance/:registrationId` — Mark student attendance (`present`, `absent`, `unmarked`)

### Registrations
- `POST /api/registrations` — Register student for an event (checks deadline, capacity, duplicates)
- `GET /api/registrations/my` — Get current student's registered events
- `DELETE /api/registrations/:id` — Cancel student registration and release seat

### Administration
- `GET /api/admin/stats` — Overall campus metrics and attendance distribution
- `GET /api/admin/users` — List and filter all users
- `PATCH /api/admin/users/:id/role` — Promote/demote user role
- `DELETE /api/admin/users/:id` — Delete user account
- `PATCH /api/admin/events/:id/status` — Approve, reject, or cancel event
- `GET /api/admin/registrations` — Global registration records

---

## 9. Viva Questions & System Architecture Guide

When presenting this project during a viva or evaluation:

1. **How Frontend $\rightarrow$ Backend Communication Works**:
   - The frontend uses Axios. When a user logs in, the backend issues a JWT token which is stored in `localStorage`.
   - An Axios interceptor automatically attaches the header `Authorization: Bearer <token>` to all subsequent requests.
2. **How Role-Based Authorization (RBAC) is Enforced**:
   - The backend `authenticate` middleware decodes the JWT and attaches `req.user`.
   - The `authorizeRoles('organizer', 'admin')` middleware ensures that only users with appropriate credentials can create events, change statuses, or mark attendance.
3. **How Duplicate Registrations are Prevented**:
   - Both in the backend controller (`SELECT ... WHERE student_id = ? AND event_id = ?`) and at the relational database level via the `UNIQUE(student_id, event_id)` constraint.
4. **How Capacity Limits are Handled**:
   - Before accepting an event registration, the backend counts confirmed registrations (`COUNT(*) WHERE event_id = ? AND status = 'confirmed'`). If the count equals or exceeds `max_participants`, registration is blocked with HTTP status 400.
