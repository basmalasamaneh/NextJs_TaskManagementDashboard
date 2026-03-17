import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

// ── Role Types ────────────────────────────────────────────────
export type UserRole = "admin" | "user";

// ── Permission Types ──────────────────────────────────────────
export type Permission = 
  | "view_all_tasks"
  | "view_own_tasks"
  | "create_task"
  | "edit_own_task"
  | "edit_any_task"
  | "delete_own_task"
  | "delete_any_task"
  | "assign_task"
  | "update_task_status";

// ── Role-Permission Mapping ────────────────────────────────────
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view_all_tasks",
    "create_task",
    "edit_any_task",
    "delete_any_task",
    "assign_task",
  ],
  user: [
    "view_own_tasks",
    "create_task",
    "edit_own_task",
    "update_task_status",
  ],
};

// ── Session and Authentication ──────────────────────────────────
export async function getSessionOrThrow() {
  const s = await getServerSession(authOptions);
  if (!s) throw new Error("Unauthorized");
  return s;
}

export async function getSessionUser(session: any) {
  return {
    id: session?.user?.id as string,
    role: (session?.user?.role as UserRole) ?? "user",
    name: session?.user?.name as string,
    email: session?.user?.email as string,
  };
}

// ── Role Checkers ──────────────────────────────────────────────
export function isAdmin(session: any): boolean {
  return session?.user?.role === "admin";
}

export function isUser(session: any): boolean {
  return session?.user?.role === "user";
}

// ── Permission Checkers ────────────────────────────────────────
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canViewTask(
  sessionRole: UserRole,
  taskUserId: string,
  sessionUserId: string
): boolean {
  if (isAdminRole(sessionRole)) return true;
  return taskUserId === sessionUserId;
}

export function canEditTask(
  sessionRole: UserRole,
  taskUserId: string,
  sessionUserId: string
): boolean {
  if (isAdminRole(sessionRole)) return true;
  return taskUserId === sessionUserId;
}

export function canDeleteTask(
  sessionRole: UserRole,
  taskUserId: string,
  sessionUserId: string
): boolean {
  if (isAdminRole(sessionRole)) return true;
  return false;
}

export function canCreateTask(sessionRole: UserRole): boolean {
  return hasPermission(sessionRole, "create_task");
}

export function canAssignTask(sessionRole: UserRole): boolean {
  return hasPermission(sessionRole, "assign_task");
}

export function canUpdateTaskStatus(sessionRole: UserRole): boolean {
  return hasPermission(sessionRole, "update_task_status");
}

// ── Helper ────────────────────────────────────────────────────
function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}