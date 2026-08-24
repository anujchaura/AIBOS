"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { BookOpen, MessageSquare, Zap, Target, Bot, TrendingUp, Users, Cpu, Database, Layers } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const AGENT_COLORS = {
  ceo: "#f59e0b", finance: "#10b981", hr: "#ec4899",
  sales: "#6366f1", legal: "#8b5cf6", research: "#06b6d4", operations: "#f97316",
};

const mockActivity = [
  { _id: "2026-07-25", conversations: 12 }, { _id: "2026-07-26", conversations: 18 },
  { _id: "2026-07-27", conversations: 8 },  { _id: "2026-07-28", conversations: 24 },
  { _id: "2026-07-29", conversations: 31 }, { _id: "2026-07-30", conversations: 19 },
  { _id: "2026-07-31", conversations: 27 },
];

const mockAgentBreakdown = [
  { _id: "finance",    count: 45, avgConfidence: 0.84 },
  { _id: "sales",      count: 38, avgConfidence: 0.79 },
  { _id: "hr",         count: 29, avgConfidence: 0.81 },
  { _id: "operations", count: 22, avgConfidence: 0.88 },
  { _id: "legal",      count: 15, avgConfidence: 0.76 },
];

function StatCard({ Icon, label, value, sub, color = "var(--color-primary)" }: any) {
  return (
    <div className="card stat-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
          {sub && <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: `${color}18`, border: `1px solid ${color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={22} color={color} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  { Icon: Bot,       label: "Ask AI Agent",     desc: "Chat with specialized business agents", href: "/agents",    color: "#6366f1" },
  { Icon: BookOpen,  label: "Upload Document",  desc: "Add to knowledge base",                href: "/knowledge", color: "#10b981" },
  { Icon: Zap,       label: "Create Workflow",  desc: "Automate business processes",          href: "/workflows", color: "#f59e0b" },
  { Icon: Target,    label: "AI Decisions",     desc: "Get business recommendations",         href: "/decisions", color: "#06b6d4" },
];

const systemServices = [
  { name: "AI Orchestrator",  Icon: Bot,      status: "online" },
  { name: "RAG Pipeline",     Icon: Layers,   status: "online" },
  { name: "Vector DB",        Icon: Database, status: "online" },
  { name: "Workflow Engine",  Icon: Zap,      status: "online" },
  { name: "Vision Module",    Icon: Cpu,      status: "online" },
];



import { getUserName } from "@/lib/userUtils";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setAnalytics(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activityData  = analytics?.dailyActivity  || mockActivity;
  const agentData     = analytics?.agentBreakdown || mockAgentBreakdown;
  const hour          = new Date().getHours();
  const greeting      = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          {greeting}, <span className="gradient-text">{getUserName(user)}</span>
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 15 }}>
          Your AI-powered enterprise command center. Here&apos;s what&apos;s happening.
        </p>
      </div>


      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard Icon={BookOpen}      label="Knowledge Documents" color="#6366f1"
          value={analytics?.documents?.total ?? "—"}
          sub={`${analytics?.documents?.processed ?? 0} processed`} />
        <StatCard Icon={MessageSquare} label="AI Conversations"    color="#10b981"
          value={analytics?.conversations?.total ?? "—"}
          sub={`${analytics?.conversations?.recent ?? 0} this month`} />
        <StatCard Icon={Zap}           label="Active Workflows"    color="#f59e0b"
          value={analytics?.workflows?.total ?? "—"}
          sub={`${analytics?.workflows?.successRate ?? 0}% success rate`} />
        <StatCard Icon={Target}        label="AI Recommendations"  color="#06b6d4"
          value="4" sub="Pending review" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 32 }}>
        {/* Activity Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-header" style={{ marginBottom: 20 }}>
            <h3 className="section-title" style={{ fontSize: 16 }}>Agent Activity (7 days)</h3>
            <span className="badge badge-success">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#8b949e" }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#8b949e" }} />
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 13 }} />
              <Area type="monotone" dataKey="conversations" stroke="#6366f1" fill="url(#colorConv)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Breakdown */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-header" style={{ marginBottom: 20 }}>
            <h3 className="section-title" style={{ fontSize: 16 }}>Agent Usage Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#8b949e" }} />
              <YAxis dataKey="_id" type="category" tick={{ fontSize: 11, fill: "#8b949e" }} width={80} />
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {agentData.map((entry: any) => (
                  <Cell key={entry._id} fill={(AGENT_COLORS as any)[entry._id] || "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="section-title" style={{ marginBottom: 20 }}>Quick Actions</h2>
        <div className="grid-4">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href} style={{ textDecoration: "none" }}>
              <div className="card card-glow" style={{ padding: 20, cursor: "pointer" }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 11,
                  background: `${action.color}18`, border: `1px solid ${action.color}35`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <action.Icon size={20} color={action.color} strokeWidth={1.7} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{action.label}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="card" style={{ padding: 24 }}>
        <h3 className="section-title" style={{ fontSize: 16, marginBottom: 20 }}>System Health</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {systemServices.map(s => (
            <div key={s.name} style={{ textAlign: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, margin: "0 auto 10px",
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <s.Icon size={18} color="var(--color-success)" strokeWidth={1.7} />
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 2 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-success)", fontWeight: 600 }}>
                Online
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
