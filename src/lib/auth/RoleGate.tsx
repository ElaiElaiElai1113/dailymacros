// src/lib/auth/RoleGate.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
type Role = "staff" | "admin";

export default function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setOk(false);
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      setOk(!!data && allow.includes(data.role as Role));
    })();
  }, []);

  if (ok === null) return <div className="p-6">Checking access…</div>;
  return ok ? <>{children}</> : <div className="p-6">Not authorized.</div>;
}
