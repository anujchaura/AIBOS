const express = require('express');
const router = express.Router();
const axios = require('axios');
const authenticate = require('../middleware/authenticate');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8001';
const AI_HEADERS = () => ({ 'X-API-Key': process.env.AI_SERVICE_API_KEY, 'Content-Type': 'application/json' });

// GET /api/mcp/tools — list available MCP tools
router.get('/tools', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${AI_URL()}/mcp/tools`, { headers: AI_HEADERS(), timeout: 10000 });
    res.json({ success: true, data: response.data });
  } catch {
    res.json({
      success: true, data: {
        tools: [
          { name: 'calculator', description: 'Perform mathematical calculations', icon: '🔢' },
          { name: 'weather', description: 'Get current weather data', icon: '🌤️' },
          { name: 'web_search', description: 'Search the internet', icon: '🔍' },
          { name: 'sql_query', description: 'Execute SQL queries on connected databases', icon: '🗄️' },
          { name: 'python_repl', description: 'Execute Python code', icon: '🐍' },
          { name: 'email', description: 'Send emails via SMTP', icon: '📧' },
          { name: 'file_system', description: 'Read/write files in the workspace', icon: '📁' },
          { name: 'calendar', description: 'Read and create calendar events', icon: '📅' },
          { name: 'database', description: 'Query MongoDB collections', icon: '🏛️' },
        ],
      },
    });
  }
});

// POST /api/mcp/execute — execute an MCP tool
router.post('/execute', authenticate, async (req, res) => {
  const { tool, params } = req.body;
  if (!tool) return res.status(400).json({ success: false, message: 'Tool name required' });

  try {
    const response = await axios.post(`${AI_URL()}/mcp/execute`, {
      tool, params, org_id: req.orgId?.toString(), user_id: req.userId?.toString(),
    }, { headers: AI_HEADERS(), timeout: 30000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(502).json({ success: false, message: error.response?.data?.detail || 'MCP tool execution failed' });
  }
});

module.exports = router;
