"use client";
export default function DashboardRedirect() {
  if (typeof window !== "undefined") window.location.href = "/dashboard";
  return null;
}
