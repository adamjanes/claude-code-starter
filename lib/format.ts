const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-10-22` → `22 Oct`; formatted by hand so server and client render the same string. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  return name === undefined || day === undefined ? iso : `${Number(day)} ${name}`;
}
