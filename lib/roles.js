// Role hierarchy and permission definitions

export const ROLES = {
  CEO: "ceo",
  ADMIN: "admin",
  TEAM_LEAD: "team_lead",
  RECRUITER: "recruiter",
  EMPLOYEE: "employee",
};

export const ROLE_LABELS = {
  ceo: "CEO",
  admin: "Admin",
  team_lead: "Team Leader",
  recruiter: "Recruiter",
  employee: "Employee",
};

// Canonical role order (lowest → highest)
export const ROLE_HIERARCHY = [
  "employee",
  "recruiter",
  "team_lead",
  "admin",
  "ceo",
];

export function getRoleLevel(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx < 0 ? 0 : idx;
}

export function hasRole(user, ...allowedRoles) {
  if (!user?.role) return false;
  return allowedRoles.includes(user.role);
}

export function isAtLeast(user, role) {
  if (!user?.role) return false;
  return getRoleLevel(user.role) >= getRoleLevel(role);
}

// Returns roles a user can assign (only roles strictly below their own level)
export function assignableRoles(userRole) {
  const level = getRoleLevel(userRole);
  return ROLE_HIERARCHY.filter(r => getRoleLevel(r) < level);
}

// The new canonical roles for display in admin UI
export const ASSIGNABLE_ROLE_LIST = [
  "employee",
  "recruiter",
  "team_lead",
  "admin",
  "ceo",
];

// ─── Permission matrix ────────────────────────────────────────────────────────
// All permissions are derived from role level — add new ones here without DB changes.

export const can = {
  viewDashboard: () => true,
  viewDataCenter: () => true,
  viewRecruitment: () => true,
  viewRecruiterIQ: () => true,
  viewAnalytics: () => true,
  viewCRM: () => true,
  viewCompanies: () => true,
  viewTeams: () => true,
  viewTargets: () => true,
  viewAttendance: () => true,
  manageAttendance: (u) =>
  ["ceo", "admin", "team_lead"].includes(u?.role),
   manageLeaveRequests: (u) =>
    ["ceo", "admin", "team_lead"].includes(u?.role),

  // CEO only
  viewRevenue: (u) => u?.role === "ceo",

  // CEO + Admin only
  manageUsers: (u) =>
    ["ceo", "admin"].includes(u?.role),

  manageSettings: (u) =>
    ["ceo", "admin"].includes(u?.role),

  viewOrgSettings: (u) =>
    ["ceo", "admin"].includes(u?.role),

  approveUsers: (u) =>
    ["ceo", "admin"].includes(u?.role),

  suspendUsers: (u) =>
    ["ceo", "admin"].includes(u?.role),

  uploadFiles: () => true,
  editFiles: () => true,
  deleteFiles: () => true,

  isCEO: (u) => u?.role === "ceo",
};

export function canViewAttendanceOf(viewer, target) {
  if (!viewer || !target) return false;

  if (viewer.id === target.id) return true;

  const level = {
    employee: 0,
    recruiter: 1,
    team_lead: 2,
    admin: 3,
    ceo: 4,
  };

  if (
    viewer.role === "employee" ||
    viewer.role === "recruiter"
  ) {
    return false;
  }

  return level[target.role] <= level[viewer.role];
}

// User account statuses
export const USER_STATUS = {
  PENDING: "pending_approval",
  ACTIVE: "active",
  SUSPENDED: "suspended",
};

export const USER_STATUS_LABELS = {
  pending_approval: "Pending Approval",
  active: "Active",
  suspended: "Suspended",
};