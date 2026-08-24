"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, BookOpen, Zap, Eye, BarChart2,
  Target, Wrench, ClipboardList, Settings, LogOut, ChevronRight,
  Sun, Moon, Bell, Search,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getUserName, getUserAvatarUrl } from "@/lib/userUtils";

const navItems = [
  { href: "/dashboard",  Icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agents",     Icon: Bot,             label: "AI Agents" },
  { href: "/knowledge",  Icon: BookOpen,         label: "Knowledge Base" },
  { href: "/workflows",  Icon: Zap,              label: "Workflows" },
  { href: "/vision",     Icon: Eye,              label: "Vision AI" },
  { href: "/analytics",  Icon: BarChart2,        label: "Analytics" },
  { href: "/decisions",  Icon: Target,           label: "Decision Engine" },
  { href: "/mcp",        Icon: Wrench,           label: "MCP Tools" },
  { href: "/audit",      Icon: ClipboardList,    label: "Audit Logs" },
  { href: "/settings",   Icon: Settings,         label: "Settings" },
];

function AIBOSLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#logoGrad)" />
      <circle cx="18" cy="9"  r="2.2" fill="white" fillOpacity="0.9" />
      <circle cx="9"  cy="24" r="2.2" fill="white" fillOpacity="0.9" />
      <circle cx="27" cy="24" r="2.2" fill="white" fillOpacity="0.9" />
      <circle cx="13" cy="18" r="1.5" fill="white" fillOpacity="0.6" />
      <circle cx="23" cy="18" r="1.5" fill="white" fillOpacity="0.6" />
      <line x1="18" y1="9"  x2="9"  y2="24" stroke="white" strokeWidth="1.6" strokeOpacity="0.7" />
      <line x1="18" y1="9"  x2="27" y2="24" stroke="white" strokeWidth="1.6" strokeOpacity="0.7" />
      <line x1="9"  y1="24" x2="27" y2="24" stroke="white" strokeWidth="1.6" strokeOpacity="0.7" />
      <line x1="18" y1="9"  x2="13" y2="18" stroke="white" strokeWidth="1"   strokeOpacity="0.5" />
      <line x1="18" y1="9"  x2="23" y2="18" stroke="white" strokeWidth="1"   strokeOpacity="0.5" />
      <line x1="13" y1="18" x2="9"  y2="24" stroke="white" strokeWidth="1"   strokeOpacity="0.5" />
      <line x1="23" y1="18" x2="27" y2="24" stroke="white" strokeWidth="1"   strokeOpacity="0.5" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const { toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {}
      } else {
        window.location.href = "/login";
      }
    };
    loadUser();

    window.addEventListener("user-updated", loadUser);
    window.addEventListener("storage", loadUser);
    return () => {
      window.removeEventListener("user-updated", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, []);


  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Find current page label for the topbar
  const currentPage = navItems.find(n =>
    n.href === pathname ||
    (n.href !== "/dashboard" && n.href.length > 1 && pathname?.startsWith(n.href))
  );

  return (
    <div className="layout-root">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <AIBOSLogo />
          <div>
            <div className="sidebar-logo-title">
              <span className="gradient-text">AIBOS</span>
            </div>
            <div className="sidebar-logo-sub">AI OPERATING SYSTEM</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>
          {navItems.map(({ href, Icon, label }) => {
            const isActive = pathname === href || (href !== "/dashboard" && href.length > 1 && pathname?.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}>
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
                {isActive && <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.7 }} />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User Card & Sign Out */}
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user-card">
              <img
                src={getUserAvatarUrl(user)}
                alt={getUserName(user)}
                className="sidebar-user-avatar"
              />
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{getUserName(user)}</div>
                <div className="sidebar-user-role">
                  <span className={`badge badge-${user.role === "super_admin" || user.role === "org_admin" ? "primary" : "muted"}`}
                    style={{ padding: "1px 6px", fontSize: 9.5 }}>
                    {(user.role || "user").replace("_", " ")}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-logout-btn"
                title="Sign Out"
                id="logout-btn"
              >
                <LogOut size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </aside>


      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="main-area">

        {/* ── Top Header Bar ──────────────────────────────── */}
        <header className="topbar">
          <div className="topbar-left">
            {currentPage && (
              <>
                <currentPage.Icon size={18} color="var(--color-primary)" strokeWidth={2} />
                <h1 className="topbar-title">{currentPage.label}</h1>
              </>
            )}
          </div>
          <div className="topbar-right">
            <button onClick={toggleTheme} className="topbar-icon-btn" title="Toggle Theme" id="topbar-theme-toggle">
              {isDark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            </button>

            {user && (
              <img
                src={getUserAvatarUrl(user)}
                alt={getUserName(user)}
                title={getUserName(user)}
                className="topbar-avatar"
              />
            )}

          </div>
        </header>

        {/* ── Page Content ────────────────────────────────── */}
        <main className="page-content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
