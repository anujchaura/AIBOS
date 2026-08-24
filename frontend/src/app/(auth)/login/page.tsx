"use client";
import { useState } from "react";
import Link from "next/link";
import { Bot, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mfaCode: mfaCode || undefined }),
      });

      const data = await response.json();

      if (data.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Store tokens
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      window.location.href = "/dashboard";
    } catch {
      setError("Connection error. Make sure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-bg)", position: "relative", overflow: "hidden",
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: "absolute", top: "10%", left: "15%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        filter: "blur(40px)", animation: "float 6s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "15%", right: "10%",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
        filter: "blur(40px)", animation: "float 8s ease-in-out infinite reverse",
      }} />

      <div className="glass-strong animate-fade-in" style={{
        width: "100%", maxWidth: 440, padding: 40, borderRadius: "var(--radius-xl)",
        boxShadow: "0 0 80px rgba(99,102,241,0.15), var(--shadow-lg)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, margin: "0 auto 16px" }}>
            <Bot size={32} color="#fff" strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            <span className="gradient-text">AIBOS</span>
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            Enterprise AI Business Operating System
          </p>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, textAlign: "center" }}>
          {mfaRequired ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 22 }}>
              <ShieldCheck size={22} color="var(--color-primary)" /> Two-Factor Authentication
            </div>
          ) : "Sign in to your workspace"}
        </h2>

        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", color: "var(--color-danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!mfaRequired ? (
            <>
              <div>
                <label className="label">Email Address</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@company.com" required id="login-email" />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required id="login-password" />
              </div>
            </>
          ) : (
            <div>
              <label className="label">Authenticator Code</label>
              <input className="input" type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                placeholder="000000" maxLength={6} required id="mfa-code"
                style={{ textAlign: "center", letterSpacing: 8, fontSize: 22 }} />
              <p style={{ color: "var(--color-text-secondary)", fontSize: 12, marginTop: 8, textAlign: "center" }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} id="login-submit"
            style={{ width: "100%", marginTop: 8, justifyContent: "center" }}>
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Signing in...</>
            ) : mfaRequired ? "Verify & Sign In" : "Sign In"}
          </button>
        </form>

        <div className="divider" />

        <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "var(--color-primary-light)", textDecoration: "none", fontWeight: 500 }}>
            Create workspace
          </Link>
        </p>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: 16, padding: "10px 14px", background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)", borderRadius: "var(--radius)",
          fontSize: 12, color: "var(--color-text-secondary)",
        }}>
          <strong style={{ color: "var(--color-primary-light)" }}>Demo:</strong> Register a new account to get started
        </div>
      </div>
    </div>
  );
}
