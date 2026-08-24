"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, Briefcase, TrendingUp, Users, BarChart2, Scale, FlaskConical, Settings2, ChevronDown, ChevronUp, Send, Sparkles, Target } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const AGENTS = [
  { id: "auto",       name: "AI Orchestrator", Icon: Bot,          color: "#6366f1", description: "Auto-routes to best agent" },
  { id: "ceo",        name: "CEO Agent",        Icon: Briefcase,    color: "#f59e0b", description: "Business strategy" },
  { id: "finance",    name: "Finance Agent",    Icon: TrendingUp,   color: "#10b981", description: "Revenue & finance" },
  { id: "hr",         name: "HR Agent",         Icon: Users,        color: "#ec4899", description: "People & HR" },
  { id: "sales",      name: "Sales Agent",      Icon: BarChart2,    color: "#6366f1", description: "Sales & CRM" },
  { id: "legal",      name: "Legal Agent",      Icon: Scale,        color: "#8b5cf6", description: "Contracts & compliance" },
  { id: "research",   name: "Research Agent",   Icon: FlaskConical, color: "#06b6d4", description: "Market research" },
  { id: "operations", name: "Ops Agent",        Icon: Settings2,    color: "#f97316", description: "Operations & supply chain" },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  xai?: {
    agentUsed?: string; confidence?: number; reasoning?: string;
    sources?: any[]; processingTimeMs?: number; llmUsed?: string;
  };
};

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct > 80 ? "var(--color-success)" : pct > 60 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, color, fontWeight: 600, padding: "2px 8px",
      background: `${color}15`, borderRadius: 20, border: `1px solid ${color}30`,
    }}>
      <Target size={11} /> {pct}%
    </span>
  );
}

function XAIPanel({ xai, agentId }: { xai: any; agentId?: string }) {
  const [open, setOpen] = useState(false);
  if (!xai) return null;
  const agent = AGENTS.find(a => a.id === (xai.agentUsed || agentId));

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm" style={{ gap: 6, fontSize: 11 }}>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Explainable AI
        {xai.confidence && <ConfidenceBadge value={xai.confidence} />}
        {agent && <span style={{ color: agent.color, display: "inline-flex", alignItems: "center", gap: 4 }}><agent.Icon size={12} /> {agent.name}</span>}
      </button>

      {open && (
        <div className="animate-fade-in" style={{
          marginTop: 8, padding: "14px 16px", background: "var(--color-surface-2)",
          borderRadius: "var(--radius)", border: "1px solid var(--color-border-subtle)",
          fontSize: 13,
        }}>
          {xai.reasoning && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--color-text-secondary)" }}>Reasoning</div>
              <div style={{ color: "var(--color-text-secondary)" }}>{xai.reasoning}</div>
            </div>
          )}
          {xai.sources && xai.sources.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--color-text-secondary)" }}>Sources ({xai.sources.length})</div>
              {xai.sources.slice(0, 3).map((s: any, i: number) => (
                <div key={i} style={{
                  padding: "6px 10px", background: "var(--color-surface-3)",
                  borderRadius: 6, marginBottom: 4, fontSize: 12,
                  border: "1px solid var(--color-border-subtle)",
                }}>
                  <span style={{ fontWeight: 500 }}>{s.docName || "Document"}</span>
                  <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10 }}>
                    {Math.round((s.score || 0) * 100)}% match
                  </span>
                  <div style={{ color: "var(--color-text-muted)", marginTop: 2 }}>{s.chunk?.slice(0, 100)}...</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {xai.llmUsed && <span style={{ fontSize: 11, color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}><Sparkles size={10} /> {xai.llmUsed}</span>}
            {xai.processingTimeMs && <span style={{ fontSize: 11, color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}><Zap size={10} /> {xai.processingTimeMs}ms</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const INITIAL_GREETINGS: Record<string, string> = {
  auto: "Hello! I am the **AI Orchestrator**. I dynamically analyze your query and route it to the optimal enterprise agent (Finance, HR, Sales, Legal, Operations, Strategy). How can I assist you today?",
  ceo: "Hello! I am your **CEO Strategy Agent**. I specialize in business growth strategy, executive decision-making, and competitive market positioning. What strategic goal can we explore?",
  finance: "Hello! I am your **Finance Agent**. I specialize in revenue analysis, financial modeling, budgeting, expense optimization, and profit margins. How can I help with your financial data?",
  hr: "Hello! I am your **HR Agent**. I specialize in talent management, recruitment strategies, employee performance, and workplace policies. What HR task can I assist with?",
  sales: "Hello! I am your **Sales Agent**. I specialize in pipeline optimization, lead conversion, revenue forecasting, and customer relationship strategies. What sales performance metric shall we analyze?",
  legal: "Hello! I am your **Legal Agent**. I assist with contract analysis, regulatory compliance, risk mitigation, and corporate governance. How can I assist with your legal review?",
  research: "Hello! I am your **Research Agent**. I analyze market trends, competitor intelligence, industry metrics, and consumer insights. What market research can I conduct for you?",
  operations: "Hello! I am your **Ops Agent**. I specialize in supply chain optimization, process efficiency, inventory management, and operational workflows. How can we streamline your operations?",
};

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const [agentMessages, setAgentMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionIds] = useState<Record<string, string>>(() => ({}));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active agent's message list
  const messages = agentMessages[selectedAgent] || [
    {
      id: `init_${selectedAgent}`,
      role: "assistant",
      content: INITIAL_GREETINGS[selectedAgent] || INITIAL_GREETINGS.auto,
    },
  ];

  const updateCurrentMessages = (updater: (prev: Message[]) => Message[]) => {
    setAgentMessages(prevMap => {
      const currentList = prevMap[selectedAgent] || [
        {
          id: `init_${selectedAgent}`,
          role: "assistant",
          content: INITIAL_GREETINGS[selectedAgent] || INITIAL_GREETINGS.auto,
        },
      ];
      return { ...prevMap, [selectedAgent]: updater(currentList) };
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const currentAgentKey = selectedAgent;
    const sid = sessionIds[currentAgentKey] || `session_${currentAgentKey}_${Date.now()}`;
    sessionIds[currentAgentKey] = sid;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    updateCurrentMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/api/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: input,
          sessionId: sid,
          agentType: currentAgentKey,
          conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errContent = data.error === "NO_AI_SERVICE"
          ? "**OpenAI API key not configured.**\n\nPlease add your OpenAI API key to the `.env` file:\n```\nOPENAI_API_KEY=sk-your-real-key-here\n```\nThen restart the backend server."
          : `Error: ${data.message || "Unknown error from AI service"}`;

        updateCurrentMessages(prev => [...prev, {
          id: Date.now().toString() + "_err", role: "assistant", content: errContent,
        }]);
      } else {
        const assistantMsg: Message = {
          id: Date.now().toString() + "_ai",
          role: "assistant",
          content: data.data?.answer || "No response generated",
          xai: data.data,
        };
        updateCurrentMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      updateCurrentMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: "Cannot reach the backend server. Make sure it is running on port 5000.\n\nRun: `cd backend && npm run dev`",
      }]);
    }
    setLoading(false);
  };



  const currentAgent = AGENTS.find(a => a.id === selectedAgent)!;

  const suggestedQuestions = [
    "Analyze our sales performance this quarter",
    "What are the key financial risks we should address?",
    "How can we improve employee retention?",
    "Review the legal compliance requirements for our industry",
  ];

  return (
    <div className="animate-fade-in" style={{ display: "flex", gap: 24, height: "calc(100vh - 80px)" }}>
      {/* Agent Selector Sidebar */}
      <div className="card" style={{ width: 240, padding: 16, flexShrink: 0, overflowY: "auto" }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Select Agent
        </div>
        {AGENTS.map(agent => (
          <button key={agent.id} onClick={() => setSelectedAgent(agent.id)}
            style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius)",
              border: selectedAgent === agent.id ? `1px solid ${agent.color}50` : "1px solid transparent",
              background: selectedAgent === agent.id ? `${agent.color}15` : "transparent",
              cursor: "pointer", marginBottom: 4, transition: "all 0.2s",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${agent.color}20`, border: `1px solid ${agent.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <agent.Icon size={16} color={agent.color} strokeWidth={1.7} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, color: selectedAgent === agent.id ? agent.color : "var(--color-text)" }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{agent.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${currentAgent.color}20`, border: `1px solid ${currentAgent.color}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <currentAgent.Icon size={20} color={currentAgent.color} strokeWidth={1.7} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{currentAgent.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{currentAgent.description}</div>
          </div>
          <span className="badge badge-success" style={{ marginLeft: "auto" }}>● Online</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${currentAgent.color}20`, border: `1px solid ${currentAgent.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <currentAgent.Icon size={28} color={currentAgent.color} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                <span className="gradient-text">{currentAgent.name}</span>
              </div>
              <div style={{ color: "var(--color-text-secondary)", marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
                Ask me anything about {currentAgent.description.toLowerCase()}. I have access to your company's knowledge base.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 600, margin: "0 auto" }}>
                {suggestedQuestions.map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    style={{
                      padding: "12px 16px", background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
                      color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer",
                      textAlign: "left", transition: "all 0.2s",
                    }}
                    onMouseOver={e => { (e.target as any).style.borderColor = currentAgent.color; }}
                    onMouseOut={e => { (e.target as any).style.borderColor = "var(--color-border)"; }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className="animate-fade-in" style={{
              display: "flex", marginBottom: 20,
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : `${currentAgent.color}30`,
                border: `1px solid ${msg.role === "user" ? "#6366f1" : currentAgent.color}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {msg.role === "user"
                  ? <span style={{ fontWeight: 700, fontSize: 13 }}>U</span>
                  : <currentAgent.Icon size={18} color={currentAgent.color} strokeWidth={1.7} />}
              </div>
              <div style={{ maxWidth: "72%", flex: 1 }}>
                <div style={{
                  padding: "12px 16px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "var(--color-surface-2)",
                  borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  border: msg.role === "assistant" ? "1px solid var(--color-border-subtle)" : "none",
                  color: "var(--color-text)", fontSize: 14, lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
                {msg.role === "assistant" && msg.xai && <XAIPanel xai={msg.xai} />}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `${currentAgent.color}30`, border: `1px solid ${currentAgent.color}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <currentAgent.Icon size={16} color={currentAgent.color} strokeWidth={1.7} />
              </div>
              <div style={{
                padding: "4px 8px",
                background: "var(--color-surface-2)", borderRadius: "4px 16px 16px 16px",
                border: "1px solid var(--color-border-subtle)",
              }}>
                <div className="typing-indicator">
                  <span/><span/><span/>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border-subtle)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Ask ${currentAgent.name} anything... (Enter to send, Shift+Enter for newline)`}
              className="input" id="agent-chat-input"
              style={{ resize: "none", minHeight: 48, maxHeight: 120, flex: 1, paddingTop: 12, paddingBottom: 12 }}
              rows={1}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} id="agent-chat-send"
              style={{ padding: "12px 20px", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              {loading ? <div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} /> : <Send size={16} />}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-muted)", textAlign: "center" }}>
            Powered by AIBOS Multi-Agent AI + RAG • Responses include sources and confidence scores
          </div>
        </div>
      </div>
    </div>
  );
}
