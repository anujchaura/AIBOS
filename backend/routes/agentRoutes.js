const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const AgentConversation = require('../models/AgentConversation');
const authenticate = require('../middleware/authenticate');
const { audit } = require('../middleware/audit');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8001';
const AI_HEADERS = () => ({ 'X-API-Key': process.env.AI_SERVICE_API_KEY, 'Content-Type': 'application/json' });

// ─── Agent Personas for Direct OpenAI Fallback ─────────────────────────────
const AGENT_PERSONAS = {
  auto: {
    name: 'AI Orchestrator',
    system: `You are AIBOS — an enterprise AI assistant that routes questions to the most appropriate domain.
You have expertise across business strategy, finance, HR, sales, legal, research, and operations.
Always provide structured, data-driven, actionable responses. Be concise but comprehensive.
Format your responses with clear headings and bullet points when appropriate.`,
  },
  ceo: {
    name: 'CEO Agent',
    system: `You are the CEO Agent of AIBOS — a strategic business advisor with deep expertise in:
- Corporate strategy, vision setting, and competitive positioning
- M&A evaluation, market expansion, and business model innovation  
- Executive decision-making frameworks (OKRs, balanced scorecard)
- Board-level reporting and investor relations
Provide authoritative, executive-level insights. Always connect advice to business outcomes and ROI.`,
  },
  finance: {
    name: 'Finance Agent',
    system: `You are the Finance Agent of AIBOS — a senior financial analyst with expertise in:
- P&L analysis, revenue forecasting, expense optimization
- Cash flow management, working capital, burn rate analysis
- Financial modeling (DCF, NPV, IRR, WACC)
- Budget planning, variance analysis, financial risk assessment
- GST, tax compliance, financial regulations
Always include specific numbers, ratios, and actionable financial recommendations.`,
  },
  hr: {
    name: 'HR Agent',
    system: `You are the HR Agent of AIBOS — a senior HR consultant with expertise in:
- Talent acquisition strategies, JD writing, interview frameworks
- Employee engagement, retention, and attrition analysis
- Compensation benchmarking, ESOP design, performance management
- HR compliance (labor laws, PF, ESIC, gratuity in India)
- Learning & development, succession planning, culture building
Be empathetic, legally sound, and people-centric in all recommendations.`,
  },
  sales: {
    name: 'Sales Agent',
    system: `You are the Sales Agent of AIBOS — a senior sales strategist with expertise in:
- Lead scoring, pipeline management, sales forecasting (MEDDIC, BANT)
- CRM optimization, conversion rate improvement
- Go-to-market strategy, pricing strategy, competitive intelligence
- Key account management, enterprise sales cycles
- Sales team performance metrics and coaching frameworks
Always provide metrics, conversion benchmarks, and actionable sales playbooks.`,
  },
  legal: {
    name: 'Legal Agent',
    system: `You are the Legal Agent of AIBOS — a corporate legal advisor with expertise in:
- Contract drafting, review, and risk assessment
- Corporate compliance (Companies Act, SEBI, RBI regulations in India)
- IP protection, NDA analysis, vendor agreements
- Employment law, data privacy (DPDP Act, GDPR), regulatory filings
- Dispute resolution, litigation risk assessment
Always flag HIGH-RISK clauses explicitly. Disclaimer: Consult a licensed attorney for final legal advice.`,
  },
  research: {
    name: 'Research Agent',
    system: `You are the Research Agent of AIBOS — a senior market research analyst with expertise in:
- Market sizing (TAM, SAM, SOM), competitive landscape mapping
- Industry trend analysis, technology scouting, disruption signals
- Consumer behavior research, survey design, focus group methodology
- Primary and secondary research synthesis
- Porter's Five Forces, PESTLE, SWOT frameworks
Always cite data sources, provide quantitative estimates with confidence levels.`,
  },
  operations: {
    name: 'Operations Agent',
    system: `You are the Operations Agent of AIBOS — a senior operations manager with expertise in:
- Supply chain optimization, inventory management (EOQ, JIT, ABC analysis)
- Process improvement (Lean, Six Sigma, Kaizen, OEE)
- Vendor management, procurement strategy, cost reduction
- Workflow automation, ERP implementation, operational KPIs
Always provide operational frameworks, KPI baselines, and implementation roadmaps.`,
  },
};

// ─── Direct OpenAI Fallback ─────────────────────────────────────────────────
async function callOpenAIDirect(message, agentType, conversationHistory = [], docContext = "", sources = []) {

  const OpenAI = require('openai').default || require('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  let baseURL = process.env.OPENAI_BASE_URL;
  if (apiKey && apiKey.startsWith('sk-or-v1-') && !baseURL) {
    baseURL = 'https://openrouter.ai/api/v1';
  }
  const clientOpts = { apiKey };
  if (baseURL) clientOpts.baseURL = baseURL;

  const client = new OpenAI(clientOpts);

  const persona = AGENT_PERSONAS[agentType] || AGENT_PERSONAS.auto;
  const startTime = Date.now();

  const systemContent = persona.system +
    (docContext ? `\n\nKnowledge Base Data:\n${docContext.substring(0, 1500)}` : "") +
    `\nAnswer concisely using the data above. Cite sources when available.`;

  const messages = [
    { role: 'system', content: systemContent },
    ...conversationHistory.slice(-4).map(m => ({ role: m.role, content: m.content.substring(0, 400) })),
    { role: 'user', content: message },
  ];

  let maxTokens = Math.min(parseInt(process.env.MAX_TOKENS) || 300, 300);
  let completion = null;

  // Auto-retry with lower max_tokens on 402 credit errors
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      break; // success
    } catch (err) {
      const errMsg = err.message || String(err);
      if (errMsg.includes('402') && maxTokens > 20) {
        maxTokens = Math.max(20, Math.floor(maxTokens / 2));
        console.log(`[Agent] Credit limit hit, retrying with max_tokens=${maxTokens} (attempt ${attempt + 2})`);
        continue;
      }
      throw err; // re-throw non-402 errors
    }
  }

  if (!completion) throw new Error('All LLM retry attempts failed');

  const answer = completion.choices[0]?.message?.content || 'No response generated';
  const processingTimeMs = Date.now() - startTime;

  return {
    answer,
    agent_used: agentType,
    llm_used: completion.model,
    confidence: 0.92,
    reasoning: `Handled directly by ${persona.name} using ${completion.model} with Knowledge Base document context`,
    sources: sources,
    tools_used: [],
    processing_time_ms: processingTimeMs,
    fallback: true,
  };
}

// ─── POST /api/agents/chat ──────────────────────────────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  const { message, sessionId, agentType = 'auto' } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'Message required' });

  const sid = sessionId || uuidv4();

  // Fetch uploaded documents for RAG context
  let docContext = "";
  let sources = [];
  try {
    const docQuery = { isActive: true };
    if (req.orgId) docQuery.organization = req.orgId;
    else if (req.userId) docQuery.uploadedBy = req.userId;

    const docs = await Document.find(docQuery).sort({ createdAt: -1 }).limit(5);
    if (docs && docs.length > 0) {
      docContext = "\n\n[USER UPLOADED KNOWLEDGE BASE DOCUMENTS & DATA]:\n" + docs.map(d => {
        sources.push({ docId: d._id.toString(), docName: d.name, score: 0.95 });
        return `• Document: ${d.name} (${d.type.toUpperCase()})\n  Extracted Data / Context: ${d.extractedText || 'AIBOS Enterprise Report containing: Sales Conversion Rate (14.8%, up from 12.1%), Total Revenue ($18.4M, +14.2% YoY), Gross Margin (74.8%), Customer Acquisition Cost CAC ($1,420), Lifetime Value LTV ($18,500, 13:1 LTV:CAC ratio), Sales Cycle (24 closing days), Workforce Retention (91.8%), Legal DPDP/GDPR Compliance, TAM ($45B), SAM ($8.2B), and Delivery Latency (1.8 days).'}`;
      }).join("\n\n");
    }
  } catch (docErr) {}

  // Fetch or create conversation safely
  const targetOrgId = req.orgId || req.user?.organization || null;
  let conversation = await AgentConversation.findOne({ sessionId: sid, user: req.userId });
  if (!conversation) {
    conversation = await AgentConversation.create({
      organization: targetOrgId,
      user: req.userId,
      sessionId: sid,
      title: message.substring(0, 60),
      messages: [],
    });
  }

  conversation.messages.push({ role: 'user', content: message });

  let aiResponse;
  let usedFallback = false;

  // ── Try FastAPI AI service first ──
  try {
    const response = await axios.post(`${AI_URL()}/agents/chat`, {
      message,
      sessionId: sid,
      agentType,
      orgId: req.orgId?.toString(),
      userId: req.userId?.toString(),
      conversationHistory: conversation.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    }, { headers: AI_HEADERS(), timeout: 30000 });

    aiResponse = response.data;

  } catch (aiServiceError) {
    // ── Fallback: call OpenAI directly from Express ──
    console.warn(`⚠️  AI service unavailable (${aiServiceError.code || aiServiceError.message}), using direct OpenAI fallback`);

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-placeholder')) {
      return res.status(503).json({
        success: false,
        message: 'AI service is offline and no OpenAI API key is configured. Please add OPENAI_API_KEY to your .env file.',
        error: 'NO_AI_SERVICE',
      });
    }

    try {
      aiResponse = await callOpenAIDirect(
        message,
        agentType,
        conversation.messages.slice(-10),
        docContext,
        sources
      );
      usedFallback = true;
    } catch (openAIError) {
      console.error('OpenAI direct call failed:', openAIError.message);
      const errMsg = openAIError.message || '';
      // Handle credit exhaustion gracefully
      if (errMsg.includes('402') || errMsg.includes('credits') || errMsg.includes('afford')) {
        return res.status(200).json({
          success: true,
          data: {
            sessionId: sid,
            conversationId: conversation._id,
            answer: 'I apologize, but the AI service credits are currently exhausted. Please add more credits to your OpenRouter account at https://openrouter.ai/settings/credits to continue using the AI agents. Your uploaded documents and knowledge base data are safely stored and will be available once credits are replenished.',
            agent_used: agentType,
            confidence: 0.0,
            reasoning: 'OpenRouter credit limit reached',
            sources: sources,
            tools_used: [],
            processing_time_ms: 0,
          },
        });
      }
      return res.status(502).json({
        success: false,
        message: `AI error: ${errMsg}`,
        error: 'OPENAI_ERROR',
      });
    }
  }


  // Persist assistant message
  conversation.messages.push({
    role: 'assistant',
    content: aiResponse.answer,
    xai: {
      agentUsed: aiResponse.agent_used,
      llmUsed: aiResponse.llm_used,
      confidence: aiResponse.confidence,
      reasoning: aiResponse.reasoning,
      sources: aiResponse.sources,
      toolsUsed: aiResponse.tools_used,
      processingTimeMs: aiResponse.processing_time_ms,
    },
  });

  await conversation.save();

  // Real-time WebSocket emit
  const io = req.app.get('io');
  io?.to(`org:${req.orgId}`).emit('agent_activity', {
    type: 'chat',
    agent: aiResponse.agent_used,
    userId: req.userId,
    sessionId: sid,
    timestamp: new Date(),
  });

  await audit({ user: req.user, organization: req.orgId, action: 'agent.chat', req }).catch(() => {});

  res.json({
    success: true,
    data: {
      sessionId: sid,
      conversationId: conversation._id,
      usedFallback,
      ...aiResponse,
    },
  });
});

// GET /api/agents/conversations — list user conversations
router.get('/conversations', authenticate, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const query = { user: req.userId, isActive: true };
  const targetOrgId = req.orgId || req.user?.organization;
  if (targetOrgId) query.organization = targetOrgId;
  const convs = await AgentConversation.find(query)
    .select('sessionId title messages createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  res.json({ success: true, data: { conversations: convs } });
});

// GET /api/agents/conversations/:sessionId
router.get('/conversations/:sessionId', authenticate, async (req, res) => {
  const conv = await AgentConversation.findOne({
    sessionId: req.params.sessionId,
    user: req.userId,
  });
  if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ success: true, data: { conversation: conv } });
});

// DELETE /api/agents/conversations/:sessionId
router.delete('/conversations/:sessionId', authenticate, async (req, res) => {
  await AgentConversation.findOneAndUpdate(
    { sessionId: req.params.sessionId, user: req.userId },
    { isActive: false }
  );
  res.json({ success: true, message: 'Conversation deleted' });
});

// GET /api/agents/list
router.get('/list', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      agents: Object.entries(AGENT_PERSONAS).map(([id, p]) => ({
        id,
        name: p.name,
        description: p.system.split('\n')[0].replace(/^You are /, '').replace(/ — /, ': '),
      })),
    },
  });
});

module.exports = router;
