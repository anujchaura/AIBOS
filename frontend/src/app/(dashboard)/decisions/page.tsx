"use client";
import { useState, useEffect } from "react";
import { Target, TrendingUp, Settings, Users, DollarSign, Scale, Microscope, Brain, Zap, Bell, CheckCircle2, Loader2, BarChart2, Plus } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const RECOMMENDATION_COLORS: any = { high: "var(--color-danger)", critical: "var(--color-danger)", medium: "var(--color-warning)", low: "var(--color-success)" };

const CATEGORY_ICON_MAP: any = {
  sales: TrendingUp, operations: Settings, hr: Users,
  finance: DollarSign, legal: Scale, research: Microscope,
};

export default function DecisionsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeForm, setAnalyzeForm] = useState({ metric: "", value: "", context: "", period: "current month" });
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch(`${API}/api/decision/recommendations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setRecommendations(d.data.recommendations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    if (!analyzeForm.metric) return;
    setAnalyzing(true);
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API}/api/decision/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(analyzeForm),
    }).catch(() => null);
    if (res) {
      const data = await res.json();
      if (data.success) setAnalyzeResult(data.data);
    }
    setAnalyzing(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Header Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} id="analyze-metric-btn" style={{ gap: 6 }}>
          <Plus size={14} /> Analyze Metric
        </button>
      </div>


      {/* Analyze Form */}
      {showForm && (
        <div className="card animate-fade-in" style={{ padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={16} /> Analyze a Business Metric
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="label">Metric Name</label>
              <input className="input" value={analyzeForm.metric} onChange={e => setAnalyzeForm({...analyzeForm, metric: e.target.value})}
                placeholder="e.g., Sales Conversion Rate" id="metric-name" />
            </div>
            <div>
              <label className="label">Current Value</label>
              <input className="input" value={analyzeForm.value} onChange={e => setAnalyzeForm({...analyzeForm, value: e.target.value})}
                placeholder="e.g., 12% (down 18%)" id="metric-value" />
            </div>
            <div>
              <label className="label">Time Period</label>
              <input className="input" value={analyzeForm.period} onChange={e => setAnalyzeForm({...analyzeForm, period: e.target.value})}
                placeholder="current month" id="metric-period" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Additional Context</label>
            <textarea className="input" rows={2} value={analyzeForm.context}
              onChange={e => setAnalyzeForm({...analyzeForm, context: e.target.value})}
              placeholder="Any relevant context, trends, or external factors..." id="metric-context" />
          </div>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing} id="analyze-submit" style={{ gap: 7 }}>
            {analyzing
              ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              : <><Target size={14} /> Generate Analysis</>}
          </button>

          {analyzeResult && (
            <div className="animate-fade-in" style={{ marginTop: 20, padding: 20, background: "var(--color-surface-2)", borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <span className="badge badge-success">Confidence: {Math.round(analyzeResult.confidence * 100)}%</span>
                <span className="badge badge-muted" style={{ gap: 4, display: "inline-flex", alignItems: "center" }}>
                  <Brain size={11} /> {analyzeResult.llm_used}
                </span>
                <span className="badge badge-muted" style={{ gap: 4, display: "inline-flex", alignItems: "center" }}>
                  <Zap size={11} /> {analyzeResult.processing_time_ms}ms
                </span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14 }}>{analyzeResult.analysis}</div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Loading recommendations...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {recommendations.map((rec: any) => (
            <div key={rec.id} className="card card-glow" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: `${RECOMMENDATION_COLORS[rec.priority] || "#6366f1"}20`,
                  border: `1px solid ${RECOMMENDATION_COLORS[rec.priority] || "#6366f1"}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {(() => { const C = CATEGORY_ICON_MAP[rec.category] || Target; return <C size={22} color={RECOMMENDATION_COLORS[rec.priority] || "#6366f1"} strokeWidth={1.7} />; })()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className={`badge badge-${rec.priority === 'critical' || rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'success'}`}>
                      {rec.priority?.toUpperCase()}
                    </span>
                    <span className="badge badge-muted">{rec.category?.toUpperCase()}</span>
                    {rec.confidence && (
                      <span className="badge badge-primary" style={{ gap: 4, display: "inline-flex", alignItems: "center" }}>
                        <Target size={10} /> {Math.round(rec.confidence * 100)}% confidence
                      </span>
                    )}
                    {rec.potential_impact && (
                      <span className="badge badge-success">{rec.potential_impact}</span>
                    )}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Bell size={12} /> Trigger: {rec.trigger}
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>{rec.recommendation}</p>
                </div>
              </div>

              {rec.actions && rec.actions.length > 0 && (
                <div style={{
                  background: "var(--color-surface-2)", padding: "14px 16px",
                  borderRadius: "var(--radius)", border: "1px solid var(--color-border-subtle)",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={13} color="var(--color-success)" /> Recommended Actions
                  </div>
                  {rec.actions.map((action: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 14 }}>
                      <span style={{ color: "var(--color-primary)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
