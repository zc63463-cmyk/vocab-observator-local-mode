/**
 * Defensively format a timestamp value (string, Date, or unknown) to YYYY-MM-DD.
 * Returns "—" for null/undefined/unparseable values.
 */
export function formatDateShort(val: unknown): string {
  if (!val) return "—";
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return "—";
}
