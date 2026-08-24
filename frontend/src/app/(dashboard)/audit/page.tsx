"use client";
import { useEffect, useState } from "react";
import { ClipboardList, ScrollText } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SEVERITY_COLORS: any = { low: "var(--color-success)", medium: "var(--color-warning)", high: "var(--color-danger)", critical: "var(--color-danger)" };

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState("");

  const fetchLogs = async () => {
    const params = new URLSearchParams({ limit: "50" });
    if (action) params.append("action", action);
    if (severity) params.append("severity", severity);
    try {
      const r = await fetchWithAuth(`${API}/api/audit?${params}`);
      const d = await r.json();
      if (d.success && d.data) {
        setLogs(d.data.logs || []);
        setTotal(d.data.total || 0);
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [action, severity]);


  return (
    <div className="animate-fade-in">


      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input className="input" value={action} onChange={e => setAction(e.target.value)}
          placeholder="Filter by action (e.g., user.login)" style={{ maxWidth: 280 }} id="audit-action-filter" />
        <select className="input" value={severity} onChange={e => setSeverity(e.target.value)} style={{ maxWidth: 180 }} id="audit-severity-filter">
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <span className="badge badge-muted" style={{ alignSelf: "center" }}>{total} total logs</span>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <ScrollText size={44} color="var(--color-text-muted)" strokeWidth={1.3} />
            </div>
            <div>No audit logs found</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Action</th><th>User</th><th>Status</th><th>Severity</th><th>IP</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log._id}>
                  <td>
                    <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--color-primary-light)" }}>{log.action}</div>
                    {log.resource && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{log.resource} {log.resourceId}</div>}
                  </td>
                  <td>
                    {log.user ? (
                      <div style={{ fontSize: 13 }}>
                        <div>{log.user.firstName} {log.user.lastName}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{log.user.email}</div>
                      </div>
                    ) : <span style={{ color: "var(--color-text-muted)" }}>System</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${log.status === 'success' ? 'success' : log.status === 'failure' ? 'danger' : 'warning'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: SEVERITY_COLORS[log.severity] || "var(--color-text-muted)", fontWeight: 600, fontSize: 12 }}>
                      {log.severity?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-text-muted)" }}>{log.ipAddress}</td>
                  <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
