# TaskBoard – My Task Manager

Simple dashboard to manage tasks  
Made with Next.js + Tailwind + NextAuth + SQLite (Drizzle ORM)

## What it can do

- Login / Logout with session management (10-minute sessions)
- Protected dashboard routes
- User info in the navigation bar
- Dashboard with stats: Total, Completed, Pending, Overdue
- Progress bar + Pie/Bar chart (Recharts)
- Full Task CRUD: Create, Edit, Delete, Mark as Complete
- Search tasks by title
- Filter by Status, Priority, Due Date
- Pagination (10 tasks per page)
- **Role-Based Access Control (RBAC)**:
  - Admin: view & manage ALL tasks
  - User: only see & change the status of their own tasks (no delete)
- **Activity Logs**:
  - Records task creation, updates, deletions, status changes
  - Shows who did what and when
  - Viewable in a separate logs page
- **Real database** with SQLite + Drizzle ORM:
  - Stores users, tasks, and activity logs
  - Tasks linked to users, logs linked to tasks & users
- Fully responsive (desktop + mobile)
- Deployable to Vercel with persistent storage (Turso/libsql)

## How to start

**1. Install dependencies**
```bash
npm install
```

**2. Create a new file called `.env.local` in the root of the project and put this inside it:**
```dotenv
NEXTAUTH_SECRET=your-secret-key-change-this-in-production-min32chars
NEXTAUTH_URL=http://localhost:3000

TURSO_DATABASE_URL=file:./sqlite.db
```

**3. Run the app**
```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

**4. Live Application URL**
Open [https://next-js-task-management-dashboard.vercel.app/](https://next-js-task-management-dashboard.vercel.app/) in your browser.

