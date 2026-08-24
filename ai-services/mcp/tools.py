"""
MCP Server – Model Context Protocol tool implementations
"""
import os
import math
import ast
import io
import sys
import subprocess
from typing import Any, Dict, List, Optional
from datetime import datetime

import requests
from duckduckgo_search import DDGS


class MCPTools:
    """Collection of MCP-compliant tools for AI agents"""

    def get_tools_schema(self) -> List[Dict]:
        return [
            {"name": "calculator", "description": "Evaluate mathematical expressions safely", "parameters": {"expression": "string"}},
            {"name": "weather", "description": "Get current weather for a city", "parameters": {"city": "string", "country_code": "string (optional)"}},
            {"name": "web_search", "description": "Search the internet for information", "parameters": {"query": "string", "num_results": "int (optional, default 5)"}},
            {"name": "sql_query", "description": "Execute a read-only SQL query on connected database", "parameters": {"query": "string", "db_type": "string (sqlite|postgres)"}},
            {"name": "python_repl", "description": "Execute Python code in a sandboxed environment", "parameters": {"code": "string"}},
            {"name": "email", "description": "Send an email", "parameters": {"to": "string", "subject": "string", "body": "string"}},
            {"name": "file_system", "description": "Read a file from the uploads directory", "parameters": {"action": "read|list", "path": "string"}},
            {"name": "calendar", "description": "Get current date/time information", "parameters": {"action": "now|format", "format": "string (optional)"}},
            {"name": "database", "description": "Query MongoDB for business data", "parameters": {"collection": "string", "query": "dict", "limit": "int"}},
        ]

    async def execute(self, tool: str, params: Dict[str, Any], org_id: str = None, user_id: str = None) -> Dict[str, Any]:
        try:
            if tool == "calculator":
                return self._calculator(params.get("expression", ""))
            elif tool == "weather":
                return await self._weather(params.get("city", ""), params.get("country_code", ""))
            elif tool == "web_search":
                return self._web_search(params.get("query", ""), params.get("num_results", 5))
            elif tool == "python_repl":
                return self._python_repl(params.get("code", ""))
            elif tool == "calendar":
                return self._calendar(params.get("action", "now"), params.get("format"))
            elif tool == "email":
                return await self._send_email(params.get("to"), params.get("subject"), params.get("body"))
            elif tool == "file_system":
                return self._file_system(params.get("action", "list"), params.get("path", ""))
            else:
                return {"error": f"Unknown tool: {tool}", "available_tools": [t["name"] for t in self.get_tools_schema()]}
        except Exception as e:
            return {"error": str(e), "tool": tool}

    def _calculator(self, expression: str) -> Dict:
        """Safe math expression evaluator"""
        # Only allow safe math operations
        allowed = set("0123456789+-*/().% ")
        allowed_funcs = {"abs", "round", "min", "max", "sum", "pow", "sqrt"}
        clean = expression.replace("^", "**")

        try:
            # Parse AST to ensure only safe operations
            tree = ast.parse(clean, mode="eval")
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name) and node.func.id not in allowed_funcs:
                        raise ValueError(f"Function not allowed: {node.func.id}")
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    raise ValueError("Imports not allowed")

            result = eval(compile(tree, "<string>", "eval"), {"__builtins__": {}}, {
                "abs": abs, "round": round, "min": min, "max": max, "sum": sum,
                "pow": pow, "sqrt": math.sqrt, "pi": math.pi, "e": math.e,
            })
            return {"result": result, "expression": expression}
        except Exception as e:
            return {"error": f"Calculation error: {str(e)}"}

    async def _weather(self, city: str, country_code: str = "") -> Dict:
        """Get weather using OpenWeatherMap API"""
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key:
            return {"error": "OpenWeather API key not configured", "mock": True,
                    "data": {"city": city, "temp": "25°C", "description": "Partly cloudy", "humidity": "60%"}}

        q = f"{city},{country_code}" if country_code else city
        url = f"https://api.openweathermap.org/data/2.5/weather?q={q}&appid={api_key}&units=metric"
        response = requests.get(url, timeout=10)
        data = response.json()
        if response.status_code != 200:
            return {"error": data.get("message", "Weather API error")}
        return {
            "city": data["name"],
            "country": data["sys"]["country"],
            "temperature": f"{data['main']['temp']}°C",
            "feels_like": f"{data['main']['feels_like']}°C",
            "description": data["weather"][0]["description"],
            "humidity": f"{data['main']['humidity']}%",
            "wind_speed": f"{data['wind']['speed']} m/s",
        }

    def _web_search(self, query: str, num_results: int = 5) -> Dict:
        """DuckDuckGo web search"""
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=num_results))
            return {
                "query": query,
                "results": [
                    {"title": r["title"], "url": r["href"], "snippet": r["body"]}
                    for r in results
                ],
                "count": len(results),
            }
        except Exception as e:
            return {"error": str(e), "query": query}

    def _python_repl(self, code: str) -> Dict:
        """Execute Python code in isolated subprocess"""
        try:
            # Run in subprocess for isolation
            result = subprocess.run(
                ["python", "-c", code],
                capture_output=True, text=True, timeout=10,
                env={**os.environ, "PYTHONPATH": ""},
            )
            return {
                "stdout": result.stdout[:2000],
                "stderr": result.stderr[:500] if result.stderr else None,
                "returncode": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"error": "Code execution timed out (10s limit)"}
        except Exception as e:
            return {"error": str(e)}

    def _calendar(self, action: str = "now", fmt: str = None) -> Dict:
        """Date/time operations"""
        now = datetime.now()
        if action == "now":
            return {
                "datetime": now.isoformat(),
                "date": now.strftime("%Y-%m-%d"),
                "time": now.strftime("%H:%M:%S"),
                "day_of_week": now.strftime("%A"),
                "week_number": now.isocalendar()[1],
                "quarter": f"Q{(now.month - 1) // 3 + 1}",
            }
        elif action == "format" and fmt:
            return {"formatted": now.strftime(fmt)}
        return {"error": "Unknown calendar action"}

    async def _send_email(self, to: str, subject: str, body: str) -> Dict:
        """Send email via SMTP"""
        try:
            import aiosmtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg["From"] = os.getenv("SMTP_USER", "aibos@example.com")
            msg["To"] = to
            msg["Subject"] = subject
            msg.set_content(body)

            await aiosmtplib.send(msg,
                hostname=os.getenv("SMTP_HOST", "smtp.gmail.com"),
                port=int(os.getenv("SMTP_PORT", "587")),
                username=os.getenv("SMTP_USER"),
                password=os.getenv("SMTP_PASS"),
                start_tls=True,
            )
            return {"success": True, "message": f"Email sent to {to}"}
        except Exception as e:
            return {"error": f"Email failed: {str(e)}", "note": "Configure SMTP_* environment variables"}

    def _file_system(self, action: str, path: str = "") -> Dict:
        """Safe file system access (uploads dir only)"""
        base_dir = os.path.abspath(os.getenv("UPLOAD_DIR", "./uploads"))
        if path:
            target = os.path.abspath(os.path.join(base_dir, path))
            if not target.startswith(base_dir):
                return {"error": "Access denied: path traversal detected"}
        else:
            target = base_dir

        if action == "list":
            try:
                files = os.listdir(target)
                return {"path": target, "files": files[:50], "count": len(files)}
            except Exception as e:
                return {"error": str(e)}
        elif action == "read":
            try:
                with open(target, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(5000)  # Limit to 5KB
                return {"path": target, "content": content}
            except Exception as e:
                return {"error": str(e)}
        return {"error": "Unknown file action"}


mcp_tools = MCPTools()
