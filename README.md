# TaskBoard – My Task Manager

Simple dashboard to manage tasks  
Made with Next.js + Tailwind + NextAuth

## What it can do

- Login / Logout (email + password)
- See all your tasks on dashboard
- Add new task
- Edit task
- Delete task
- Mark task as done with one click
- See stats: total, done, pending, overdue
- Small pie chart + bar chart
- Search and filter tasks
- Responsive for web and mobile

## How to start

**1. Install dependencies**
```bash
npm install
```

**2. Create a new file called `.env.local` in the root of the project and put this inside it:**
```dotenv
NEXTAUTH_SECRET=your-secret-key-change-this-in-production-min32chars
NEXTAUTH_URL=http://localhost:3000
```

**3. Run the app**
```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

