/**
 * Admin Audit Emitter
 *
 * Fire-and-forget helper that inserts a row into `admin_audit_log`.
 * Failures are logged to the console but never block the calling UI flow.
 */

import { supabase } from '@/integrations/supabase/client';
import type { AuditEntry } from './admin-events';

/**
 * Log a single admin action.
 * Safe to call without `await` — it never throws.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Insert uses the raw table name; the type definition for
    // admin_audit_log has been added to types.ts.
    await (supabase as any).from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      previous_state: entry.previousState ?? null,
      new_state: entry.newState ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    // Audit logging must never block the admin UI flow
    console.error('[admin-audit] Failed to log action', err);
  }
}

/**
 * Log multiple admin actions in a single insert (batch).
 */
export async function logAdminActions(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const rows = entries.map((e) => ({
      admin_user_id: user.id,
      action: e.action,
      target_type: e.targetType,
      target_id: e.targetId,
      previous_state: e.previousState ?? null,
      new_state: e.newState ?? null,
      metadata: e.metadata ?? null,
    }));

    await (supabase as any).from('admin_audit_log').insert(rows);
  } catch (err) {
    console.error('[admin-audit] Failed to batch-log actions', err);
  }
}

