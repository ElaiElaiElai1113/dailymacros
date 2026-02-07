import { supabase } from "@/lib/supabaseClient";

function getSessionId() {
  try {
    const key = "telemetry:session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

export async function trackEvent(
  eventName: string,
  metadata?: Record<string, unknown>
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("client_events").insert({
      event_name: eventName,
      session_id: getSessionId(),
      user_id: user?.id ?? null,
      page_path: window.location.pathname,
      metadata: metadata ?? null,
    });
  } catch {
    // best-effort telemetry only
  }
}

export async function trackError(
  message: string,
  metadata?: Record<string, unknown>
) {
  return trackEvent("error", { message, ...metadata });
}
