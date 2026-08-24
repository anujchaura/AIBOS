"use client";
import { useState, useEffect } from "react";
import { Zap, Play, Trash2, Plus, ArrowRight, Upload, CheckCircle2, Database, FileText, Bell, Bot, LayoutDashboard, ClipboardList, Rocket, RefreshCw, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STEP_TYPES = [
  { value: "extract_data",     Icon: Upload,         label: "Extract Data",       desc: "AI extracts data from document" },
  { value: "verify",           Icon: CheckCircle2,   label: "Verify",             desc: "Validate field values" },
  { value: "store",            Icon: Database,       label: "Store to DB",        desc: "Save to database" },
  { value: "summarize",        Icon: FileText,       label: "AI Summarize",       desc: "Generate AI summary" },
  { value: "notify",           Icon: Bell,           label: "Send Notification",  desc: "Send email/alert" },
  { value: "ai_action",        Icon: Bot,            label: "AI Action",          desc: "Custom AI task" },
  { value: "dashboard_entry",  Icon: LayoutDashboard,label: "Dashboard Entry",    desc: "Add to dashboard" },
];

const SAMPLE_WORKFLOWS = [
  {
    name: "Invoice Processing",
    description: "Auto-process uploaded invoices: extract → verify GST → store → notify finance",
    trigger: { type: "document_upload", config: { fileType: "pdf", keyword: "invoice" } },
    steps: [
      { id: "s1", name: "Extract Invoice Data", type: "extract_data", order: 1, config: { question: "Extract invoice number, date, total amount, vendor name, and GST number" }, nextStep: "s2" },
      { id: "s2", name: "Verify GST", type: "verify", order: 2, config: { field: "s1.gst_number", rule: "not_empty" }, nextStep: "s3" },
      { id: "s3", name: "Store Invoice", type: "store", order: 3, config: { collection: "invoices" }, nextStep: "s4" },
      { id: "s4", name: "Notify Finance Team", type: "notify", order: 4, config: { recipient: "finance@company.com", subject: "New Invoice Processed" } },
    ],
  },
  {
    name: "Contract Review",
    description: "Upload contract → AI review → risk detection → legal notification",
    trigger: { type: "document_upload", config: { fileType: "pdf", keyword: "contract" } },
    steps: [
      { id: "s1", name: "Extract Contract Terms", type: "extract_data", order: 1, config: { question: "Extract key contract terms, parties, dates, and obligations" }, nextStep: "s2" },
      { id: "s2", name: "AI Risk Analysis", type: "ai_action", order: 2, config: { prompt: "Identify high-risk clauses and compliance issues in this contract" }, nextStep: "s3" },
      { id: "s3", name: "Summarize Contract", type: "summarize", order: 3, config: {}, nextStep: "s4" },
      { id: "s4", name: "Notify Legal Team", type: "notify", order: 4, config: { recipient: "legal@company.com", subject: "Contract Review Required" } },
    ],
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchWorkflows = async () => {
    try {
      const res = await fetchWithAuth(`${API}/api/workflows`);
      const data = await res.json();
      if (data.success && data.data) {
        setWorkflows(data.data.workflows || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const createFromTemplate = async (template: any) => {
    setCreating(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetchWithAuth(`${API}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          steps: template.steps,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.workflow) {
        setWorkflows((prev) => [data.data.workflow, ...prev]);
        setSuccessMsg(`Workflow "${template.name}" created successfully!`);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.message || "Failed to create workflow");
      }
    } catch {
      setErrorMsg("Error creating workflow from template");
    }
    setCreating(false);
  };

  const runWorkflow = async (id: string, name: string) => {
    setRunningId(id);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetchWithAuth(`${API}/api/workflows/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Workflow "${name}" executed successfully! (Run ID: ${data.data?.runId || "active"})`);
        setTimeout(() => setSuccessMsg(""), 5000);
        await fetchWorkflows();
      } else {
        setErrorMsg(data.message || "Workflow execution failed");
      }
    } catch {
      setErrorMsg("Network error starting workflow execution");
    }
    setRunningId(null);
  };

  const deleteWorkflow = async (id: string) => {
    setErrorMsg("");
    try {
      await fetchWithAuth(`${API}/api/workflows/${id}`, { method: "DELETE" });
      setWorkflows((w) => w.filter((wf) => wf._id !== id));
      setSuccessMsg("Workflow deleted");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setErrorMsg("Failed to delete workflow");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Alert Messages */}
      {successMsg && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--color-success)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
          <button onClick={() => setSuccessMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}><X size={16} /></button>
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--color-danger)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={18} /> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}><X size={16} /></button>
        </div>
      )}

      {/* Workflow Templates */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Rocket size={16} /> Quick Start Templates
        </h2>
        <div className="grid-2">
          {SAMPLE_WORKFLOWS.map((template) => (
            <div key={template.name} className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{template.name}</div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 14 }}>{template.description}</div>
              {/* Step visualization */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {template.steps.map((step, i) => {
                  const st = STEP_TYPES.find((s) => s.value === step.type);
                  return (
                    <span key={step.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        {st && <st.Icon size={11} strokeWidth={1.8} />} {step.name}
                      </span>
                      {i < template.steps.length - 1 && <span style={{ color: "var(--color-text-muted)" }}>→</span>}
                    </span>
                  );
                })}
              </div>
              <button onClick={() => createFromTemplate(template)} className="btn btn-primary btn-sm" disabled={creating} id={`create-wf-${template.name.replace(/\s/g, "-")}`} style={{ gap: 6 }}>
                <Plus size={13} /> Use Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Workflows */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <ClipboardList size={16} /> Your Workflows
      </h2>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Zap size={44} color="var(--color-text-muted)" strokeWidth={1.3} />
          </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No workflows yet</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Use a template above to create your first workflow</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {workflows.map((wf: any) => (
            <div key={wf._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: wf.isActive ? "rgba(16,185,129,0.1)" : "var(--color-surface-2)",
                  border: `1px solid ${wf.isActive ? "rgba(16,185,129,0.3)" : "var(--color-border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Zap size={22} color={wf.isActive ? "var(--color-success)" : "var(--color-text-muted)"} strokeWidth={1.7} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{wf.name}</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>{wf.description}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge badge-${wf.isActive ? 'success' : 'muted'}`}>{wf.isActive ? "Active" : "Inactive"}</span>
                    <span className="badge badge-muted">{wf.steps?.length || 0} steps</span>
                    <span className="badge badge-muted">Trigger: {wf.trigger?.type}</span>
                    {wf.runCount > 0 && <span className="badge badge-info">{wf.runCount} runs</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => runWorkflow(wf._id, wf.name)} disabled={runningId === wf._id} className="btn btn-secondary btn-sm" id={`run-wf-${wf._id}`} style={{ gap: 5 }}>
                    {runningId === wf._id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                    {runningId === wf._id ? "Running..." : "Run Now"}
                  </button>
                  <button onClick={() => deleteWorkflow(wf._id)} className="btn btn-danger btn-sm" id={`del-wf-${wf._id}`} style={{ gap: 5 }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
