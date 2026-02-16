/**
 * Admin Event Taxonomy
 *
 * Structured constants for every admin-triggered action that gets logged
 * to the `admin_audit_log` table.  Using these constants instead of
 * free-form strings prevents typos and allows compile-time checks.
 */

// ── Action types ──────────────────────────────────────────────────────
export const AdminActions = {
  // Users
  USER_UPDATE: 'user.update',
  USER_BAN: 'user.ban',
  USER_UNBAN: 'user.unban',

  // Events
  EVENT_CREATE: 'event.create',
  EVENT_UPDATE: 'event.update',
  EVENT_CANCEL: 'event.cancel',

  // Communities
  COMMUNITY_CREATE: 'community.create',
  COMMUNITY_UPDATE: 'community.update',

  // Discussions
  DISCUSSION_CREATE: 'discussion.create',
  DISCUSSION_UPDATE: 'discussion.update',

  // Roles
  ROLE_ASSIGN: 'role.assign',
  ROLE_UPDATE: 'role.update',

  // Permissions
  PERMISSION_GRANT: 'permission.grant',
  PERMISSION_UPDATE: 'permission.update',

  // Moderation / Flags
  FLAG_RESOLVE: 'flag.resolve',
  FLAG_DISMISS: 'flag.dismiss',
  FLAG_URGENT: 'flag.urgent',

  // Email Templates
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_TOGGLE: 'template.toggle',
} as const;

export type AdminAction = (typeof AdminActions)[keyof typeof AdminActions];

// ── Target types ──────────────────────────────────────────────────────
export const AdminTargets = {
  USER: 'user',
  EVENT: 'event',
  COMMUNITY: 'community',
  DISCUSSION: 'discussion',
  ROLE: 'role',
  PERMISSION: 'permission',
  FLAG: 'flag',
  TEMPLATE: 'template',
} as const;

export type AdminTarget = (typeof AdminTargets)[keyof typeof AdminTargets];

// ── Payload helper ────────────────────────────────────────────────────
export interface AuditEntry {
  action: AdminAction;
  targetType: AdminTarget;
  targetId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

