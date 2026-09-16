// Hreinsun innsláttar fyrir vaktategundir.

// Klukkan kemur ýmist sem "12:00" úr viðmótinu eða "12:00:00" úr gagnagrunninum.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const asHm = (v: string) => v.slice(0, 5);

export function cleanShiftType(body: Record<string, unknown>, partial: boolean): Record<string, unknown> | string {
  const p: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) p.name = body.name.trim().slice(0, 60);
  else if (!partial) return "Heiti vantar.";
  if (typeof body.short === "string") p.short = body.short.trim().slice(0, 8);
  if (typeof body.starts === "string") { if (!TIME_RE.test(body.starts)) return "Ógildur upphafstími"; p.starts = asHm(body.starts); }
  if (typeof body.ends === "string") { if (!TIME_RE.test(body.ends)) return "Ógildur lokatími"; p.ends = asHm(body.ends); }
  if (Array.isArray(body.weekdays)) {
    p.weekdays = [...new Set(body.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  }
  if (typeof body.on_holidays === "boolean") p.on_holidays = body.on_holidays;
  if (typeof body.skip_holidays === "boolean") p.skip_holidays = body.skip_holidays;
  if (p.on_holidays && p.skip_holidays) return "Vakt getur ekki bæði gilt alltaf á frídögum og aldrei.";
  if (body.kind === "forvakt" || body.kind === "bakvakt" || body.kind === "other") p.kind = body.kind;
  if (body.period === "day" || body.period === "evening") p.period = body.period;
  if (body.slots_per_day !== undefined) p.slots_per_day = Math.min(6, Math.max(1, Math.floor(Number(body.slots_per_day)) || 1));
  if ("split_at" in body) {
    const v = body.split_at;
    if (v === null || v === "") p.split_at = null;
    else if (typeof v === "string" && TIME_RE.test(v)) p.split_at = asHm(v);
    else return "Ógildur tími fyrir skiptingu.";
  }
  if (body.rest_days_after !== undefined) p.rest_days_after = Math.min(7, Math.max(0, Math.floor(Number(body.rest_days_after)) || 0));
  if (typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color)) p.color = body.color;
  if (body.sort !== undefined) p.sort = Math.floor(Number(body.sort)) || 0;
  if (typeof body.active === "boolean") p.active = body.active;
  return p;
}
