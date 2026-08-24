"""
Decision Engine – AI-powered business recommendations
"""
import os
import time
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI

client = None

def get_client():
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL")
        if api_key.startswith("sk-or-v1-") and not base_url:
            base_url = "https://openrouter.ai/api/v1"
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        client = AsyncOpenAI(**kwargs)
    return client



RECOMMENDATION_CATEGORIES = {
    "sales_decline": {
        "trigger": "sales dropped",
        "template": "Sales have declined by {value}. Analyze root causes and recommend marketing and sales interventions.",
        "agent": "sales",
    },
    "inventory_low": {
        "trigger": "inventory",
        "template": "Inventory for {metric} is critically low at {value}. Recommend immediate procurement and supply chain actions.",
        "agent": "operations",
    },
    "expenses_high": {
        "trigger": "expenses",
        "template": "Expenses increased by {value}. Analyze cost drivers and suggest optimization strategies.",
        "agent": "finance",
    },
    "employee_attrition": {
        "trigger": "attrition",
        "template": "Employee attrition has increased to {value}. Diagnose causes and suggest HR interventions.",
        "agent": "hr",
    },
    "revenue_growth": {
        "trigger": "revenue",
        "template": "Revenue grew by {value}. Identify growth drivers and recommend strategies to sustain and accelerate growth.",
        "agent": "sales",
    },
}


class DecisionEngine:
    async def get_recommendations(self, org_id: str) -> Dict[str, Any]:
        """Generate proactive business recommendations"""
        # In production: read from MongoDB business metrics
        # Demo: generate sample recommendations
        recommendations = [
            {
                "id": "rec_001",
                "category": "sales",
                "priority": "high",
                "trigger": "Sales conversion rate dropped 18% this month",
                "recommendation": "Launch targeted re-engagement campaign for 'Consideration' stage leads. Offer limited-time demo discounts.",
                "confidence": 0.82,
                "potential_impact": "+₹12L revenue in Q3",
                "actions": [
                    "Segment leads by last interaction date",
                    "Create personalized email sequence",
                    "Schedule sales team blitz for top 50 accounts",
                ],
            },
            {
                "id": "rec_002",
                "category": "operations",
                "priority": "critical",
                "trigger": "Raw material inventory below safety stock for 3 SKUs",
                "recommendation": "Issue emergency purchase orders for SKUs A012, B034, C089. Negotiate expedited delivery with Vendor #3.",
                "confidence": 0.91,
                "potential_impact": "Prevent ₹8L in lost production",
                "actions": [
                    "Place PO for SKU A012: 500 units",
                    "Contact Vendor #3 for expedited shipping",
                    "Adjust production schedule",
                ],
            },
            {
                "id": "rec_003",
                "category": "hr",
                "priority": "medium",
                "trigger": "Engineering team attrition at 24% (industry avg: 12%)",
                "recommendation": "Implement retention package: market-rate salary adjustment + flexible work policy + technical growth path.",
                "confidence": 0.75,
                "potential_impact": "Save ₹25L in replacement costs",
                "actions": [
                    "Conduct stay interviews with all engineers",
                    "Benchmark salaries vs. Glassdoor/LinkedIn data",
                    "Create individual career development plans",
                ],
            },
            {
                "id": "rec_004",
                "category": "finance",
                "priority": "medium",
                "trigger": "Operating expenses up 15% with only 8% revenue growth",
                "recommendation": "Conduct cost audit: review SaaS subscriptions, vendor contracts, and overhead. Target 8% expense reduction.",
                "confidence": 0.79,
                "potential_impact": "+3% EBITDA margin",
                "actions": [
                    "Audit all recurring software subscriptions",
                    "Renegotiate top 5 vendor contracts",
                    "Identify automation opportunities for manual tasks",
                ],
            },
        ]

        return {
            "recommendations": recommendations,
            "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
            "org_id": org_id,
            "count": len(recommendations),
        }

    async def analyze_metric(self, metric: str, value: str, context: str, period: str, org_id: str) -> Dict[str, Any]:
        """Analyze a specific business metric and generate recommendations"""
        start_time = time.time()

        prompt = f"""You are an AI Business Decision Engine. Analyze this business metric and provide actionable recommendations.

Metric: {metric}
Current Value: {value}
Time Period: {period}
Context: {context}

Provide:
1. Root cause analysis (2-3 points)
2. Immediate actions (next 2 weeks)
3. Strategic recommendations (next quarter)
4. Expected impact with quantification
5. Risk if no action taken

Be specific, quantitative, and business-focused."""

        response = await get_client().chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.1,
        )

        return {
            "metric": metric,
            "value": value,
            "period": period,
            "analysis": response.choices[0].message.content,
            "confidence": 0.78,
            "llm_used": os.getenv("OPENAI_MODEL", "gpt-4o"),
            "processing_time_ms": round((time.time() - start_time) * 1000),
        }


decision_engine = DecisionEngine()
