"use client";
import { useState, useEffect } from "react";
import { getUserName, getUserAvatarUrl } from "@/lib/userUtils";

import {
  User, Lock, Building2, Key, Save, CheckCircle2, AlertTriangle,
  Eye, EyeOff, ChevronRight, Shield, Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TABS = [
  { id: "profile",      Icon: User,      label: "Profile" },
  { id: "password",     Icon: Lock,      label: "Password" },
  { id: "organization", Icon: Building2, label: "Organization" },
  { id: "api",          Icon: Key,       label: "API Keys" },
];

function StatusBanner({ status }: { status: { type: "success" | "error"; msg: string } | null }) {
  if (!status) return null;
  return (
    <div style={{
      padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 20, fontSize: 14,
      display: "flex", alignItems: "center", gap: 8,
      background: status.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${status.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: status.type === "success" ? "var(--color-success)" : "var(--color-danger)",
    }}>
      {status.type === "success"
        ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
        : <AlertTriangle size={15} style={{ flexShrink: 0 }} />}
      {status.msg}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Helper to load user profile from localStorage immediately
  const getInitialProfile = () => {
    if (typeof window === "undefined") return { firstName: "", lastName: "", email: "", phone: "", title: "", bio: "", role: "" };
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const fallbackName = getUserName(u);
        return {
          firstName: u.firstName || (fallbackName !== "User" ? fallbackName : ""),
          lastName: u.lastName || "",
          email: u.email || "",
          phone: u.phone || "",
          title: u.title || "",
          bio: u.bio || "",
          role: u.role || "",
        };
      }
    } catch {}
    return { firstName: "", lastName: "", email: "", phone: "", title: "", bio: "", role: "" };
  };

  // Profile state initialized directly from localStorage
  const [profile, setProfile] = useState(getInitialProfile);
  // Password state
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false });
  // Org state
  const [org, setOrg] = useState({ name: "", industry: "", website: "", description: "", size: "" });
  // API state
  const [apiKeys, setApiKeys] = useState<any>({});

  const getHeaders = (json = true) => {
    const h: any = { Authorization: `Bearer ${localStorage.getItem("accessToken")}` };
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const notify = (type: "success" | "error", msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  // Load data on mount / tab switch
  useEffect(() => {
    setStatus(null);

    // Sync profile state from localStorage first
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const fallbackName = getUserName(u);
        setProfile(prev => ({
          ...prev,
          firstName: u.firstName || prev.firstName || (fallbackName !== "User" ? fallbackName : ""),
          lastName: u.lastName || prev.lastName,
          email: u.email || prev.email,
          phone: u.phone || prev.phone,
          title: u.title || prev.title,
          bio: u.bio || prev.bio,
          role: u.role || prev.role,
        }));
      } catch {}
    }

    if (tab === "profile" || tab === "password") {
      fetch(`${API}/api/settings/profile`, { headers: getHeaders() })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.user) {
            const u = d.data.user;
            const fallbackName = getUserName(u);
            const updated = {
              firstName: u.firstName || (fallbackName !== "User" ? fallbackName : ""),
              lastName: u.lastName || "",
              email: u.email || "",
              phone: u.phone || "",
              title: u.title || "",
              bio: u.bio || "",
              role: u.role || "",
            };
            setProfile(updated);
            // Save updated user to localStorage so layout & sidebar update
            const cur = localStorage.getItem("user");
            const merged = cur ? { ...JSON.parse(cur), ...u } : u;
            localStorage.setItem("user", JSON.stringify(merged));
            window.dispatchEvent(new Event("user-updated"));
          }
        }).catch(() => {});
    }


    if (tab === "organization") {
      fetch(`${API}/api/settings/organization`, { headers: getHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) { const o = d.data.organization; setOrg({ name: o.name || "", industry: o.industry || "", website: o.website || "", description: o.description || "", size: o.size || "" }); } })
        .catch(() => {});
    }
    if (tab === "api") {
      fetch(`${API}/api/settings/api-keys`, { headers: getHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) setApiKeys(d.data.keys); })
        .catch(() => {});
    }
  }, [tab]);

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch(`${API}/api/settings/profile`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(profile) });
    const data = await res.json();
    notify(data.success ? "success" : "error", data.message);
    // Update localStorage user and dispatch update event
    if (data.success && data.data?.user) {
      const stored = localStorage.getItem("user");
      const merged = stored ? { ...JSON.parse(stored), ...data.data.user } : data.data.user;
      localStorage.setItem("user", JSON.stringify(merged));
      window.dispatchEvent(new Event("user-updated"));
    }
    setSaving(false);
  };


  const savePassword = async () => {
    if (pwd.newPwd !== pwd.confirm) { notify("error", "Passwords do not match"); return; }
    if (pwd.newPwd.length < 8) { notify("error", "Password must be at least 8 characters"); return; }
    setSaving(true);
    const res = await fetch(`${API}/api/settings/password`, { method: "PUT", headers: getHeaders(), body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.newPwd }) });
    const data = await res.json();
    notify(data.success ? "success" : "error", data.message);
    if (data.success) setPwd({ current: "", newPwd: "", confirm: "" });
    setSaving(false);
  };

  const saveOrg = async () => {
    setSaving(true);
    const res = await fetch(`${API}/api/settings/organization`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(org) });
    const data = await res.json();
    notify(data.success ? "success" : "error", data.message);
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>


        {/* Sidebar Tabs */}
        <div className="card" style={{ padding: 8 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              id={`settings-tab-${t.id}`}
              style={{
                width: "100%", textAlign: "left", padding: "10px 14px",
                borderRadius: "var(--radius)", border: "none",
                background: tab === t.id ? "var(--color-primary-glow)" : "transparent",
                color: tab === t.id ? "var(--color-primary-light)" : "var(--color-text-secondary)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                fontWeight: tab === t.id ? 600 : 400, fontSize: 14,
                transition: "all 0.15s", marginBottom: 2,
              }}>
              <t.Icon size={16} strokeWidth={tab === t.id ? 2.2 : 1.8} />
              {t.label}
              {tab === t.id && <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div>
          <StatusBanner status={status} />

          {/* ─── PROFILE ─── */}
          {tab === "profile" && (
            <div className="card" style={{ padding: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Profile Information</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 24 }}>
                Update your personal details. Your email is managed by your organization admin.
              </p>

              {/* Avatar circle with initial SVG image */}
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
                <img
                  src={getUserAvatarUrl(profile)}
                  alt={getUserName(profile)}
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{getUserName(profile)}</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>{profile.email}</div>
                  <span className={`badge badge-primary`} style={{ marginTop: 4 }}>
                    {(profile.role || "user").replace("_", " ")}
                  </span>
                </div>
              </div>


              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div>
                  <label className="label">First Name</label>
                  <input className="input" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} id="settings-firstname" />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} id="settings-lastname" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={profile.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} id="settings-email" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98765 43210" id="settings-phone" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Job Title</label>
                  <input className="input" value={profile.title} onChange={e => setProfile({ ...profile, title: e.target.value })} placeholder="e.g. Chief Executive Officer" id="settings-title" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Bio</label>
                  <textarea className="input" rows={3} value={profile.bio}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Brief description about yourself..." id="settings-bio"
                    style={{ resize: "vertical" }} />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving} id="save-profile-btn" style={{ gap: 7 }}>
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Profile</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── PASSWORD ─── */}
          {tab === "password" && (
            <div className="card" style={{ padding: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Change Password</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 24 }}>
                Use a strong password with at least 8 characters.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 420 }}>
                <div>
                  <label className="label">Current Password</label>
                  <div style={{ position: "relative" }}>
                    <input className="input" type={showPwd.current ? "text" : "password"} value={pwd.current}
                      onChange={e => setPwd({ ...pwd, current: e.target.value })} id="pwd-current"
                      style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPwd(p => ({ ...p, current: !p.current }))}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                      {showPwd.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">New Password</label>
                  <div style={{ position: "relative" }}>
                    <input className="input" type={showPwd.newPwd ? "text" : "password"} value={pwd.newPwd}
                      onChange={e => setPwd({ ...pwd, newPwd: e.target.value })} id="pwd-new"
                      style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPwd(p => ({ ...p, newPwd: !p.newPwd }))}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                      {showPwd.newPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input className="input" type="password" value={pwd.confirm}
                    onChange={e => setPwd({ ...pwd, confirm: e.target.value })} id="pwd-confirm" />
                  {pwd.confirm && pwd.newPwd && pwd.confirm !== pwd.newPwd && (
                    <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4 }}>Passwords do not match</div>
                  )}
                </div>
              </div>

              {/* Strength Indicator */}
              {pwd.newPwd && (
                <div style={{ marginTop: 16, maxWidth: 420 }}>
                  {(() => {
                    const s = [pwd.newPwd.length >= 8, /[A-Z]/.test(pwd.newPwd), /[0-9]/.test(pwd.newPwd), /[^a-zA-Z0-9]/.test(pwd.newPwd)].filter(Boolean).length;
                    const labels = ["", "Weak", "Fair", "Good", "Strong"];
                    const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
                    return (
                      <div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                          {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s ? colors[s] : "var(--color-border)", transition: "background 0.3s" }} />)}
                        </div>
                        <div style={{ fontSize: 12, color: colors[s], fontWeight: 600 }}>{labels[s]}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={savePassword} disabled={saving || !pwd.current || !pwd.newPwd || pwd.newPwd !== pwd.confirm}
                  id="save-password-btn" style={{ gap: 7 }}>
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Changing...</> : <><Lock size={15} /> Change Password</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── ORGANIZATION ─── */}
          {tab === "organization" && (
            <div className="card" style={{ padding: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Organization Settings</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 24 }}>
                Manage your organization details. Only admins can edit these settings.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Organization Name</label>
                  <input className="input" value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} placeholder="Acme Corp" id="org-name" />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select className="input" value={org.industry} onChange={e => setOrg({ ...org, industry: e.target.value })} id="org-industry">
                    <option value="">Select Industry</option>
                    {["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Education", "Legal", "Consulting", "Real Estate", "Other"].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Company Size</label>
                  <select className="input" value={org.size} onChange={e => setOrg({ ...org, size: e.target.value })} id="org-size">
                    <option value="">Select Size</option>
                    {[
                      { value: "startup", label: "Startup (1–10)" },
                      { value: "small", label: "Small (11–50)" },
                      { value: "medium", label: "Medium (51–500)" },
                      { value: "enterprise", label: "Enterprise (500+)" },
                    ].map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Website</label>
                  <input className="input" type="url" value={org.website} onChange={e => setOrg({ ...org, website: e.target.value })} placeholder="https://yourcompany.com" id="org-website" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Description</label>
                  <textarea className="input" rows={3} value={org.description}
                    onChange={e => setOrg({ ...org, description: e.target.value })}
                    placeholder="Brief description of your organization..." id="org-description"
                    style={{ resize: "vertical" }} />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={saveOrg} disabled={saving} id="save-org-btn" style={{ gap: 7 }}>
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Organization</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── API KEYS ─── */}
          {tab === "api" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>API Configuration</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 0 }}>
                  API keys are configured in your <code style={{ background: "var(--color-surface-2)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>.env</code> file on the server.
                  Values are masked for security.
                </p>
              </div>

              {/* OpenAI */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Key size={20} color="var(--color-primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>OpenAI API Key</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Used for all AI agent interactions</div>
                  </div>
                  <span style={{ marginLeft: "auto" }} className={`badge badge-${apiKeys.openai ? "success" : "danger"}`}>
                    {apiKeys.openai ? "Configured" : "Not Set"}
                  </span>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {apiKeys.openai || "sk-••••••••••••• (not configured)"}
                </div>
                {!apiKeys.openai && (
                  <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius)", fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: "var(--color-danger)", marginBottom: 4 }}>Action Required</div>
                    <div style={{ color: "var(--color-text-secondary)" }}>
                      Add your OpenAI key to <code style={{ background: "var(--color-surface-3)", padding: "1px 5px", borderRadius: 3 }}>backend/.env</code>:
                    </div>
                    <pre style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-accent)", background: "var(--color-surface-3)", padding: "8px 12px", borderRadius: 6, overflowX: "auto" }}>
{`OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o`}
                    </pre>
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                      Then restart the backend server. Get your key at{" "}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary-light)" }}>platform.openai.com</a>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Service Key */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Key size={20} color="var(--color-accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>AI Service API Key</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Internal key for FastAPI AI service</div>
                  </div>
                  <span style={{ marginLeft: "auto" }} className={`badge badge-${apiKeys.aiService ? "success" : "warning"}`}>
                    {apiKeys.aiService ? "Configured" : "Default"}
                  </span>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {apiKeys.aiService || "Using default key (change for production)"}
                </div>
              </div>

              {/* System Status */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 16 }}>Service Status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Backend (Express)", port: 5000 },
                    { label: "AI Service (FastAPI)", port: 8001 },
                    { label: "Frontend (Next.js)", port: 3000 },
                  ].map(s => (
                    <ServiceStatus key={s.port} label={s.label} port={s.port} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceStatus({ label, port }: { label: string; port: number }) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const url = port === 3000 ? `http://localhost:${port}` : `http://localhost:${port}/health`;
    fetch(url, { signal: AbortSignal.timeout(3000) })
      .then(r => setOnline(r.ok))
      .catch(() => setOnline(false));
  }, [port]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: "var(--radius)" }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>localhost:{port}</div>
      </div>
      <span className={`badge badge-${online === null ? "muted" : online ? "success" : "danger"}`}>
        {online === null ? "Checking..." : online ? "Online" : "Offline"}
      </span>
    </div>
  );
}
