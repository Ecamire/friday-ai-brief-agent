

export function videoFor(n) {
  const v = n?.video;
  if (!v || typeof v !== "object") return null;
  const url = String(v.url || "").trim();
  if (!/^https:\/\//i.test(url)) return null;
  const secs = Number(v.durationSeconds);
  return {
    url,
    caption: String(v.caption || "").trim(),
    credit: String(v.credit || "").trim(),
    durationLabel: Number.isFinite(secs) && secs > 0 ? durationLabel(secs) : "",
  };
}

export function durationLabel(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
