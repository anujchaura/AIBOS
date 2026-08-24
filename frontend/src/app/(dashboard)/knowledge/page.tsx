"use client";
import { useState, useEffect, useRef } from "react";
import { FileText, FileSpreadsheet, Image, Link, Mail, File, BookOpen, Upload, FolderOpen, Search, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";



const ACCEPT_TYPES = ".pdf,.docx,.pptx,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.eml";

function DocumentRow({ doc, onDelete }: { doc: any; onDelete: (id: string) => void }) {
  const statusColors: any = { pending: "var(--color-warning)", processing: "var(--color-info)", completed: "var(--color-success)", failed: "var(--color-danger)" };
  const TypeIcon = ({ type }: { type: string }) => {
    const props = { size: 18, strokeWidth: 1.7, color: "var(--color-text-secondary)" };
    if (type === "pdf") return <FileText {...props} color="#ef4444" />;
    if (type === "docx") return <FileText {...props} color="#3b82f6" />;
    if (type === "pptx" || type === "xlsx" || type === "csv") return <FileSpreadsheet {...props} color="#10b981" />;
    if (type === "image") return <Image {...props} color="#8b5cf6" />;
    if (type === "url") return <Link {...props} color="#06b6d4" />;
    if (type === "email") return <Mail {...props} color="#f59e0b" />;
    return <File {...props} />;
  };
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "processing") return <RefreshCw size={11} className="animate-spin" />;
    if (status === "completed") return <CheckCircle2 size={11} />;
    if (status === "failed") return <XCircle size={11} />;
    if (status === "pending") return <Clock size={11} />;
    return null;
  };
  const formatSize = (bytes: number) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TypeIcon type={doc.type} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {doc.chunkCount || 0} chunks • {doc.wordCount ? `${doc.wordCount.toLocaleString()} words` : ""}
            </div>
          </div>
        </div>
      </td>
      <td><span className={`badge badge-${doc.type === 'pdf' ? 'primary' : 'muted'}`}>{doc.type?.toUpperCase()}</span></td>
      <td>{doc.size ? formatSize(doc.size) : "—"}</td>
      <td>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
          background: `${statusColors[doc.status]}20`,
          color: statusColors[doc.status],
          border: `1px solid ${statusColors[doc.status]}30`,
        }}>
          <StatusIcon status={doc.status} />
          {doc.status}
        </span>
      </td>
      <td style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
        {new Date(doc.createdAt).toLocaleDateString()}
      </td>
      <td>
        <button onClick={() => onDelete(doc._id)} className="btn btn-danger btn-sm" id={`delete-doc-${doc._id}`}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [addUrlMode, setAddUrlMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchDocuments = async () => {

    try {
      const res = await fetchWithAuth(`${API}/api/knowledge?limit=50${searchTerm ? `&search=${searchTerm}` : ""}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDocuments(data.data.documents || []);
        setTotal(data.data.total || 0);
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [searchTerm]);

  const handleUpload = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    setErrorMsg("");
    setSuccessMsg("");
    let successCount = 0;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetchWithAuth(`${API}/api/knowledge/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          setErrorMsg(data.message || "Failed to upload file");
        }
      } catch {
        setErrorMsg("Network error connecting to backend server");
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);

    if (successCount > 0) {
      setSuccessMsg(`Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
    await fetchDocuments();
  };

  const handleUrlAdd = async () => {
    if (!urlInput) return;
    setUploading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetchWithAuth(`${API}/api/knowledge/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("URL added to Knowledge Base");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.message || "Failed to add URL");
      }
    } catch {
      setErrorMsg("Error adding URL");
    }
    setUrlInput("");
    setAddUrlMode(false);
    setUploading(false);
    await fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    await fetchWithAuth(`${API}/api/knowledge/${id}`, { method: "DELETE" });
    setDocuments(d => d.filter(doc => doc._id !== id));
  };


  const stats = {
    total: documents.length,
    processed: documents.filter(d => d.status === "completed").length,
    processing: documents.filter(d => d.status === "processing" || d.status === "pending").length,
    failed: documents.filter(d => d.status === "failed").length,
  };

  return (
    <div className="animate-fade-in">
      {/* Header Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setAddUrlMode(!addUrlMode)} className="btn btn-secondary" id="add-url-btn" style={{ gap: 6 }}>
          <Link size={14} /> Add URL
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary" id="upload-doc-btn" disabled={uploading} style={{ gap: 6 }}>
          {uploading ? <><RefreshCw size={14} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Upload Documents</>}
        </button>
      </div>


      {/* Banners */}

      {successMsg && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 20, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--color-success)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--color-danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {addUrlMode && (
        <div className="card animate-fade-in" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <input className="input" style={{ flex: 1 }} value={urlInput} onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/article" id="url-input" />
          <button className="btn btn-primary" onClick={handleUrlAdd} id="add-url-submit">Add URL</button>
          <button className="btn btn-ghost" onClick={() => setAddUrlMode(false)}><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Documents", value: total, color: "#6366f1" },
          { label: "Processed", value: stats.processed, color: "#10b981" },
          { label: "Processing", value: stats.processing, color: "#f59e0b" },
          { label: "Failed", value: stats.failed, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragOver ? "var(--color-primary)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-lg)", padding: "24px", textAlign: "center",
          marginBottom: 24, background: dragOver ? "var(--color-primary-glow)" : "transparent",
          transition: "all 0.2s", cursor: "pointer",
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <FolderOpen size={36} color="var(--color-text-muted)" strokeWidth={1.4} />
        </div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop files here or click to browse</div>
        <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          Supports PDF, DOCX, PPTX, Excel, CSV, Images, Emails
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept={ACCEPT_TYPES} multiple hidden
        onChange={e => e.target.files && handleUpload(e.target.files)} id="file-input" />

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input className="input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search documents..." id="doc-search" style={{ maxWidth: 400 }} />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <FolderOpen size={44} color="var(--color-text-muted)" strokeWidth={1.3} />
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No documents yet</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Upload your first document to get started</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Document</th><th>Type</th><th>Size</th><th>Status</th><th>Uploaded</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <DocumentRow key={doc._id} doc={doc} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
