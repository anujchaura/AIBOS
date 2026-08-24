"use client";
import { useState, useRef } from "react";
import {
  Eye, ScanText, FileText, Table, Tag, BarChart2,
  ImagePlus, Upload, Loader2, ClipboardList, Search, AlertTriangle, ScanEye
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ANALYSIS_TYPES = [
  { value: "auto",           Icon: Eye,         label: "Auto Detect",            desc: "Automatically detect best analysis" },
  { value: "ocr",            Icon: ScanText,    label: "Text Extraction (OCR)",  desc: "Extract all text from image" },
  { value: "invoice",        Icon: FileText,    label: "Invoice Analysis",        desc: "Extract invoice fields & GST" },
  { value: "table",          Icon: Table,       label: "Table Extraction",        desc: "Detect and extract tables" },
  { value: "classification", Icon: Tag,         label: "Document Classification", desc: "Identify document type" },
  { value: "chart",          Icon: BarChart2,   label: "Chart Understanding",     desc: "Analyze charts & graphs" },
];

export default function VisionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState("auto");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("analysisType", analysisType);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API}/api/vision/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setResult(data.success ? data.data : { error: data.message });
    } catch {
      setResult({ error: "Vision service not available. Make sure AI services are running." });
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">


      <div className="grid-2" style={{ gap: 24 }}>
        {/* Upload & Config */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Upload area */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={16} /> Upload Image or Document
            </h3>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              style={{
                border: "2px dashed var(--color-border)", borderRadius: "var(--radius)",
                padding: 24, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseOver={e => { (e.currentTarget as any).style.borderColor = "var(--color-primary)"; }}
              onMouseOut={e => { (e.currentTarget as any).style.borderColor = "var(--color-border)"; }}
            >
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 8 }} />
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                    <ImagePlus size={36} color="var(--color-text-muted)" strokeWidth={1.4} />
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop image or click to browse</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>JPG, PNG, WebP, PDF supported</div>
                </>
              )}
              {file && !preview && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--color-surface-2)", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <FileText size={14} /> {file.name}
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" hidden accept="image/*,.pdf" id="vision-file-input"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {/* Analysis Type */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <ScanEye size={16} /> Analysis Type
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ANALYSIS_TYPES.map(t => (
                <button key={t.value} onClick={() => setAnalysisType(t.value)}
                  style={{
                    padding: "10px 12px", borderRadius: "var(--radius)", textAlign: "left",
                    border: analysisType === t.value ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: analysisType === t.value ? "var(--color-primary-glow)" : "var(--color-surface-2)",
                    cursor: "pointer", transition: "all 0.2s",
                  }} id={`analysis-type-${t.value}`}>
                  <div style={{ marginBottom: 4 }}><t.Icon size={16} color={analysisType === t.value ? "var(--color-primary)" : "var(--color-text-secondary)"} strokeWidth={1.7} /></div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={analyze} disabled={!file || loading} id="vision-analyze-btn"
            style={{ justifyContent: "center", gap: 8 }}>
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
              : <><Search size={16} /> Analyze Document</>}
          </button>
        </div>

        {/* Results */}
        <div className="card" style={{ padding: 20, overflow: "auto" }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList size={16} /> Analysis Results
          </h3>

          {!result && !loading && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-muted)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Search size={48} strokeWidth={1.2} />
              </div>
              <div>Upload an image or document and click Analyze to see results</div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Loader2 size={40} strokeWidth={1.5} className="animate-spin" color="var(--color-primary)" />
              </div>
              <div style={{ color: "var(--color-text-secondary)" }}>Analyzing with AI Vision...</div>
            </div>
          )}

          {result && (
            <div className="animate-fade-in">
              {result.error ? (
                <div style={{ padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", display: "flex", alignItems: "flex-start", gap: 10, color: "var(--color-danger)" }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13 }}>{result.error}</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {result.classification && (
                    <div style={{ padding: 16, background: "var(--color-surface-2)", borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--color-primary-light)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Tag size={14} /> Document Classification
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Detected Type</div>
                          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
                            {(result.classification.type || "Document").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </div>
                        </div>
                        <span className="badge badge-success" style={{ fontSize: 12, padding: "4px 10px" }}>
                          {Math.round((result.classification.confidence || 0) * 100)}% Confidence
                        </span>
                      </div>
                    </div>
                  )}

                  {result.ocr && (
                    <div style={{ padding: 16, background: "var(--color-surface-2)", borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--color-primary-light)", display: "flex", alignItems: "center", gap: 6 }}>
                        <ScanText size={14} /> Extracted Text <span className="badge badge-muted">{result.ocr.word_count} words</span>
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {result.ocr.text || "No text extracted"}
                      </div>
                    </div>
                  )}
                  {result.invoice && (
                    <div style={{ padding: 16, background: "var(--color-surface-2)", borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: "var(--color-primary-light)", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={14} /> Invoice Fields
                      </div>
                      <table style={{ width: "100%", fontSize: 13 }}>
                        <tbody>
                          {Object.entries(result.invoice).filter(([k, v]) => v && k !== "line_items").map(([k, v]) => (
                            <tr key={k}>
                              <td style={{ padding: "4px 0", fontWeight: 500, color: "var(--color-text-secondary)", width: 140 }}>
                                {k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </td>
                              <td style={{ padding: "4px 0" }}>{String(v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {result.tables && result.tables.length > 0 && (
                    <div style={{ padding: 16, background: "var(--color-surface-2)", borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--color-primary-light)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Table size={14} /> Tables Detected ({result.tables.length})
                      </div>
                      {result.tables.map((t: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                          Table {i + 1}: {t.width}×{t.height}px at ({t.x},{t.y})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
