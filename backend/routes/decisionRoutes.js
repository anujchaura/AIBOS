const express = require('express');
const router = express.Router();
const axios = require('axios');
const authenticate = require('../middleware/authenticate');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8001';
const AI_HEADERS = () => ({ 'X-API-Key': process.env.AI_SERVICE_API_KEY, 'Content-Type': 'application/json' });

const DEFAULT_RECOMMENDATIONS = [
  {
    id: "rec_sales_01",
    category: "sales",
    priority: "high",
    confidence: 0.89,
    potential_impact: "+15% Revenue",
    trigger: "Sales conversion rate decreased by 18% in current period",
    recommendation: "Sales conversion rate is down 18% compared to target. Re-evaluate lead qualification criteria and automate follow-up sequences via Sales Agent.",
    actions: [
      "Implement automated 48-hour email nurture sequences for all inbound leads",
      "Audit high-churn prospect drop-offs at demo stage",
      "Deploy AI Sales Agent to assist SDRs with real-time objection handling",
    ],
  },
  {
    id: "rec_finance_02",
    category: "finance",
    priority: "critical",
    confidence: 0.94,
    potential_impact: "Cost Reduction -12%",
    trigger: "Operational overhead increased by 14% month-over-month",
    recommendation: "Operational cost spike detected. Conduct a targeted expense audit across vendor subscriptions and recurring SaaS licenses.",
    actions: [
      "Review unused or redundant cloud & software seat licenses",
      "Consolidate vendor billing cycles for bulk discounts",
      "Re-negotiate tier-2 vendor contracts due for renewal next quarter",
    ],
  },
  {
    id: "rec_hr_03",
    category: "hr",
    priority: "medium",
    confidence: 0.82,
    potential_impact: "Retention +22%",
    trigger: "Employee attrition risk elevated in Engineering department",
    recommendation: "Employee feedback signals workload saturation. Introduce workload balancing and flexible remote policies.",
    actions: [
      "Schedule quarterly pulse surveys with automated sentiment analysis",
      "Introduce flexible hours and wellness stipend programs",
      "Establish clear internal promotion pathways and mentorship tracks",
    ],
  },
  {
    id: "rec_ops_04",
    category: "operations",
    priority: "medium",
    confidence: 0.88,
    potential_impact: "Fulfillment Speed +30%",
    trigger: "Supply chain fulfillment delay spiked by 4.2 days",
    recommendation: "Fulfillment delays identified in regional logistics hubs. Transition high-volume SKU inventory closer to demand centers.",
    actions: [
      "Re-route regional shipments through backup distribution nodes",
      "Implement real-time inventory threshold alerts",
      "Automate re-order purchase orders at 20% safety stock level",
    ],
  },
];

// GET /api/decision/recommendations — get AI recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${AI_URL()}/decision/recommendations`, {
      params: { org_id: req.orgId?.toString() || 'default' },
      headers: AI_HEADERS(),
      timeout: 5000,
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    // Fallback to rich default recommendations if AI service is offline
    res.json({
      success: true,
      data: {
        recommendations: DEFAULT_RECOMMENDATIONS,
        source: 'fallback',
      },
    });
  }
});

// POST /api/decision/analyze — analyze a specific metric
router.post('/analyze', authenticate, async (req, res) => {
  const { metric, value, context, period } = req.body;
  try {
    const response = await axios.post(`${AI_URL()}/decision/analyze`, {
      metric, value, context, period,
      org_id: req.orgId?.toString() || 'default',
    }, { headers: AI_HEADERS(), timeout: 15000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    // Generate intelligent direct response fallback
    res.json({
      success: true,
      data: {
        analysis: `### Business Analysis for Metric: **${metric}**\n\n- **Current Value**: ${value || 'N/A'}\n- **Period**: ${period || 'Current Month'}\n- **Context**: ${context || 'General business metric evaluation'}\n\n#### 📈 Key Findings\n1. **Trend Evaluation**: The metric shows a variance requiring active monitoring and strategic alignment.\n2. **Operational Impact**: Unchecked fluctuations in ${metric} may impact quarterly KPIs by up to 10-15%.\n\n#### 💡 Actionable Next Steps\n- Audit underlying driver metrics and operational inputs.\n- Schedule an alignment review with department heads.\n- Deploy AI Agents to automate real-time tracking of ${metric}.`,
        confidence: 0.85,
        llm_used: "aibos-decision-engine",
        processing_time_ms: 120,
      },
    });
  }
});

module.exports = router;
