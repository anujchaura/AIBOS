"use client";
import { useState, useEffect } from "react";
import { Wrench, Play, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MCPPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("accessToken")}`, "Content-Type": "application/json" });

  useEffect(() => {
    fetch(`${API}/api/mcp/tools`, { headers: getHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setTools(d.data.tools); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const executeTool = async () => {
    if (!selectedTool) return;
    setExecuting(true);
    const res = await fetch(`${API}/api/mcp/execute`, {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({ tool: selectedTool, params }),
    }).catch(() => null);
    if (res) {
      const data = await res.json();
      setResult(data.success ? data.data : { error: data.message });
    }
    setExecuting(false);
  };

  const tool = tools.find(t => t.name === selectedTool);

  return (
    <div className="animate-fade-in">


      <div className="grid-2">
        {/* Tools List */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Available Tools ({tools.length})</h3>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: "var(--color-text-muted)" }}>Loading...</div>
          ) : (
            tools.map(t => (
              <button key={t.name} onClick={() => { setSelectedTool(t.name); setParams({}); setResult(null); }}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 14px",
                  borderRadius: "var(--radius)", border: selectedTool === t.name ? "1px solid var(--color-primary)" : "1px solid transparent",
                  background: selectedTool === t.name ? "var(--color-primary-glow)" : "transparent",
                  cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
                }} id={`mcp-tool-${t.name}`}>
                <Wrench size={18} color={selectedTool === t.name ? "var(--color-primary)" : "var(--color-text-muted)"} strokeWidth={1.7} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t.description}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Tool Execution */}
        <div className="card" style={{ padding: 20 }}>
          {!selectedTool ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-muted)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Wrench size={44} color="var(--color-text-muted)" strokeWidth={1.3} />
              </div>
              <div>Select a tool to configure and execute</div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Wrench size={16} /> {selectedTool}
              </h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 20 }}>{tool?.description}</p>

              {/* Dynamic param inputs */}
              {tool?.parameters && Object.entries(tool.parameters).map(([paramName, paramDesc]) => (
                <div key={paramName} style={{ marginBottom: 14 }}>
                  <label className="label">{paramName} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({paramDesc as string})</span></label>
                  <input className="input" value={params[paramName] || ""}
                    onChange={e => setParams({ ...params, [paramName]: e.target.value })}
                    placeholder={`Enter ${paramName}...`} id={`mcp-param-${paramName}`} />
                </div>
              ))}

              <button className="btn btn-primary" onClick={executeTool} disabled={executing} id="mcp-execute-btn"
                style={{ marginBottom: 20 }}>
                {executing
                  ? <><Loader2 size={14} className="animate-spin" /> Executing...</>
                  : <><Play size={14} /> Execute Tool</>}
              </button>

              {result && (
                <div className="animate-fade-in" style={{
                  padding: 16, background: "var(--color-surface-2)",
                  borderRadius: "var(--radius)", border: "1px solid var(--color-border)",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--color-primary-light)" }}>Result</div>
                  <pre style={{
                    fontSize: 12, fontFamily: "var(--font-mono)", color: "#a5f3fc",
                    overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap",
                  }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
