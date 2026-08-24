"use client";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, DollarSign, Users, MessageSquare, Zap, Target } from "lucide-react";


const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#f97316", "#8b5cf6"];

// Mock business KPI data
// Business metrics matching Enterprise PDF Report
const revenueData = [
  { month: "Jan", revenue: 142000, expenses: 110000, profit: 32000 },
  { month: "Feb", revenue: 138000, expenses: 105000, profit: 33000 },
  { month: "Mar", revenue: 151000, expenses: 114000, profit: 37000 },
  { month: "Apr", revenue: 147000, expenses: 112000, profit: 35000 },
  { month: "May", revenue: 162000, expenses: 118000, profit: 44000 },
  { month: "Jun", revenue: 158000, expenses: 116000, profit: 42000 },
  { month: "Jul", revenue: 184000, expenses: 138000, profit: 46000 },
];

const forecastData = [
  { month: "Aug", actual: null, forecast: 195000 },
  { month: "Sep", actual: null, forecast: 210000 },
  { month: "Oct", actual: null, forecast: 225000 },
];

const allData = [...revenueData, ...forecastData];

const agentUsageData = [
  { name: "Finance Agent", value: 45, color: "#10b981" },
  { name: "Sales Agent", value: 38, color: "#6366f1" },
  { name: "HR Agent", value: 29, color: "#ec4899" },
  { name: "Ops Agent", value: 22, color: "#f97316" },
  { name: "Legal Agent", value: 15, color: "#8b5cf6" },
  { name: "Research Agent", value: 12, color: "#06b6d4" },
  { name: "CEO Agent", value: 8, color: "#f59e0b" },
];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("business");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/analytics/overview`, { headers }).then(r => r.json()),
      fetch(`${API}/api/analytics/agents`, { headers }).then(r => r.json()),
    ]).then(([ovData, agData]) => {
      if (ovData.success) setOverview(ovData.data);
      if (agData.success) setAgentStats(agData.data.agentStats || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "business", label: "Business KPIs" },
    { id: "ai", label: "AI & Platform Analytics" },
    { id: "documents", label: "Document Analytics" },
  ];

  return (
    <div className="animate-fade-in">

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--color-surface-2)", padding: 4, borderRadius: "var(--radius)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 500, fontSize: 14, transition: "all 0.2s",
              background: tab === t.id ? "var(--color-surface)" : "transparent",
              color: tab === t.id ? "var(--color-text)" : "var(--color-text-secondary)",
              boxShadow: tab === t.id ? "var(--shadow-sm)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "business" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* KPI Cards */}
          <div className="grid-4">
            {[
              { label: "Total Revenue (Q3)", value: "$18.4M", change: "+14.2%", color: "#10b981" },
              { label: "Operating Expenses", value: "$13.8M", change: "-12.0%", color: "#ef4444" },
              { label: "Net Profit", value: "$4.6M", change: "+35.4%", color: "#6366f1" },
              { label: "Gross Margin", value: "74.8%", change: "+3.6%", color: "#f59e0b" },
            ].map(kpi => (
              <div key={kpi.label} className="card" style={{ padding: 20 }}>
                <div style={{ color: "var(--color-text-secondary)", fontSize: 12, marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 12, color: "var(--color-success)", marginTop: 4 }}>↗ {kpi.change} vs last period</div>
              </div>
            ))}
          </div>

          {/* Revenue vs Expenses vs Forecast */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Revenue, Expenses & AI Forecast</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Actual performance + AI revenue forecast for next 3 months</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={allData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8b949e" }} />
                <YAxis tick={{ fontSize: 12, fill: "#8b949e" }} tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`, ""]} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Profit" />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="AI Forecast" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}


      {tab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="grid-2">
            {/* Agent Distribution Pie */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Agent Query Distribution</h3>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <PieChart width={200} height={200}>
                  <Pie data={agentUsageData} cx={100} cy={100} innerRadius={55} outerRadius={90}
                    dataKey="value" paddingAngle={2}>
                    {agentUsageData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
                <div style={{ flex: 1 }}>
                  {agentUsageData.map(a => (
                    <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1 }}>{a.name}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{a.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Avg Confidence */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>AI Response Confidence</h3>
              {[
                { agent: "Operations Agent", confidence: 0.88, color: "#f97316" },
                { agent: "Finance Agent", confidence: 0.84, color: "#10b981" },
                { agent: "HR Agent", confidence: 0.81, color: "#ec4899" },
                { agent: "Sales Agent", confidence: 0.79, color: "#6366f1" },
                { agent: "Legal Agent", confidence: 0.76, color: "#8b5cf6" },
                { agent: "Research Agent", confidence: 0.74, color: "#06b6d4" },
              ].map(item => (
                <div key={item.agent} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                    <span>{item.agent}</span>
                    <span style={{ color: item.color, fontWeight: 600 }}>{Math.round(item.confidence * 100)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.confidence * 100}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="grid-3">
            {[
              { label: "Total Documents", value: overview?.documents?.total ?? 5, color: "#6366f1" },
              { label: "Successfully Processed", value: overview?.documents?.processed ?? 5, color: "#10b981" },
              { label: "Processing Rate", value: `${overview?.documents?.processingRate ?? 100}%`, color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ color: "var(--color-text-secondary)", marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Document Types Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={
                overview?.docTypeBreakdown?.length > 0
                  ? overview.docTypeBreakdown.map((d: any) => ({ type: (d._id || "DOC").toUpperCase(), count: d.count }))
                  : [
                      { type: "PDF", count: overview?.documents?.total || 3 },
                      { type: "TEXT", count: 2 },
                    ]
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="type" tick={{ fontSize: 12, fill: "#8b949e" }} />
                <YAxis tick={{ fontSize: 12, fill: "#8b949e" }} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
