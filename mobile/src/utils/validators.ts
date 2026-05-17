// ──────────────────────────────────────────
// Validation utilities
// Rule: js-hoist-regexp — Hoist RegExp to module level
// ──────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_VN_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const PASSWORD_MIN_LENGTH = 6;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_VN_RE.test(phone.replace(/\s/g, ""));
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
}

/** Check if input is email or phone */
export function getAccountType(account: string): "email" | "phone" | "unknown" {
  if (isValidEmail(account)) return "email";
  if (isValidPhone(account)) return "phone";
  return "unknown";
}
