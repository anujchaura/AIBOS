/**
 * User utilities for name formatting, initials, and dynamic SVG image generation
 * Guarantees 100% consistent name, initial letter, and avatar generation across all components.
 */

export function getUserName(user: any): string {
  if (!user) return "User";

  // 1. Check firstName & lastName
  const fn = user.firstName && String(user.firstName).trim() !== "" ? String(user.firstName).trim() : "";
  const ln = user.lastName && String(user.lastName).trim() !== "" ? String(user.lastName).trim() : "";

  if (fn && ln) return `${fn} ${ln}`;
  if (fn) return fn;

  // 2. Check full name property (ignore generic placeholders like "New User")
  const n = user.name && String(user.name).trim() !== "" ? String(user.name).trim() : "";
  if (n && n.toLowerCase() !== "new user" && n.toLowerCase() !== "user") return n;

  // 3. Fallback to Email username
  if (user.email && typeof user.email === "string") {
    const emailPrefix = user.email.split("@")[0].trim();
    if (emailPrefix) {
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
  }

  return "User";
}

export function getUserInitial(user: any): string {
  const name = getUserName(user);
  return name.charAt(0).toUpperCase() || "U";
}

export function getUserAvatarUrl(user: any): string {
  const initial = getUserInitial(user);
  const name = getUserName(user);

  // Vibrant gradient pairs based on char code
  const gradients = [
    ["#6366f1", "#8b5cf6"], // Indigo -> Purple
    ["#3b82f6", "#1d4ed8"], // Blue -> Dark Blue
    ["#10b981", "#059669"], // Emerald -> Green
    ["#f59e0b", "#d97706"], // Amber -> Orange
    ["#ec4899", "#be185d"], // Pink -> Rose
    ["#06b6d4", "#0891b2"], // Cyan -> Teal
    ["#8b5cf6", "#6d28d9"], // Purple -> Deep Purple
  ];

  const charCode = initial.charCodeAt(0) || 85; // 85 is 'U'
  const [color1, color2] = gradients[charCode % gradients.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
      </filter>
    </defs>
    <circle cx="64" cy="64" r="64" fill="url(#avatarGrad)" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter, -apple-system, sans-serif" font-weight="800" font-size="58" filter="url(#shadow)">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
