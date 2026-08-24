"use client";
import { useState } from "react";
import Link from "next/link";
import { Bot, AlertTriangle, Rocket } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", orgName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!data.success) { setError(data.message || "Registration failed"); setLoading(false); return; }
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      window.location.href = "/dashboard";
    } catch { setError("Connection error."); setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-bg)", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "5%", right: "20%", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(60px)",
      }} />

      <div className="glass-strong animate-fade-in" style={{
        width: "100%", maxWidth: 480, padding: 40, borderRadius: "var(--radius-xl)",
        boxShadow: "0 0 80px rgba(99,102,241,0.15), var(--shadow-lg)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(99,102,241,0.4)",
          }}><Bot size={26} color="#fff" strokeWidth={1.8} /></div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}><span className="gradient-text">Create Workspace</span></h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 4 }}>
            Set up your enterprise AI platform
          </p>
        </div>

        {error && (
          <div style={{
            width: "100%", padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 16,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--color-danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8,
          }}><AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                placeholder="John" required id="reg-firstname" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}
                placeholder="Doe" required id="reg-lastname" />
            </div>
          </div>
          <div>
            <label className="label">Work Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              placeholder="john@company.com" required id="reg-email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              placeholder="Min. 8 characters" required minLength={8} id="reg-password" />
          </div>
          <div>
            <label className="label">Organization Name <span style={{ color: "var(--color-text-muted)" }}>(optional)</span></label>
            <input className="input" value={form.orgName} onChange={e => setForm({...form, orgName: e.target.value})}
              placeholder="Acme Corp" id="reg-orgname" />
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} id="reg-submit"
            style={{ width: "100%", marginTop: 4, justifyContent: "center" }}>
            {loading ? "Creating workspace..." : <><Rocket size={16} strokeWidth={2} /> Create Workspace</>}
          </button>
        </form>

        <div className="divider" />
        <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-primary-light)", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
