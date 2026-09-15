const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return DATE_FORMATTER.format(value);
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME_FORMATTER.format(value);
}

/** Formats a date for the `value` attribute of an `<input type="date">`. */
export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function daysUntil(value: Date | null | undefined): number | null {
  if (!value) return null;
  const diff = value.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDeadline(closingDate: Date | null | undefined): string {
  if (!closingDate) return "No deadline";
  const days = daysUntil(closingDate);
  if (days === null) return "No deadline";
  if (days < 0) return `Closed on ${formatDate(closingDate)}`;
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 14) return `Closes in ${days} days`;
  return `Closes ${formatDate(closingDate)}`;
}
