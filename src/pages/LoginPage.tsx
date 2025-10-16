import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !user) {
      setErr("Invalid email or password.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    nav(profile?.role === "admin" ? "/admin" : "/staff");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-xl shadow p-6 w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">
          DailyMacros Login
        </h1>
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Email"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded p-2 mb-4"
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-green-600 text-white rounded p-2"
          disabled={loading}
        >
          {loading ? "Logging in…" : "Login"}
        </button>
        {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      </form>
    </div>
  );
}
