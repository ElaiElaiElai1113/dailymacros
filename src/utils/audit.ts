import { supabase } from "@/lib/supabaseClient";

type AuditEvent = {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
};

export async function logAudit(event: AuditEvent) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      actor_role: profile?.role ?? null,
      actor_name: profile?.full_name ?? null,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id ?? null,
      metadata: event.metadata ?? null,
    });
  } catch (err) {
    console.warn("audit_log insert failed", err);
  }
}
