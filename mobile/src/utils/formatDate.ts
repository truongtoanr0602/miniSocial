// ──────────────────────────────────────────
// Date formatting utilities
// Rule: js-hoist-intl — Hoist Intl formatters to module level
// ──────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

/** "17 tháng 5, 2026" */
export function formatDate(dateStr: string | Date): string {
  return dateFormatter.format(new Date(dateStr));
}

/** "17 thg 5" */
export function formatShortDate(dateStr: string | Date): string {
  return shortDateFormatter.format(new Date(dateStr));
}

/** "14:30" */
export function formatTime(dateStr: string | Date): string {
  return timeFormatter.format(new Date(dateStr));
}

/** "2 phút trước", "1 giờ trước", "3 ngày trước" */
export function formatRelative(dateStr: string | Date): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return formatShortDate(dateStr);
}
