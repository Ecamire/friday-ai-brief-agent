

export function normalizeImage(val) {
  if (!val) return { b64: "", mime: "image/png" };
  if (typeof val === "string") return { b64: val, mime: "image/png" };
  return { b64: val.b64 || "", mime: val.mime || "image/png" };
}

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export function extFor(mime = "image/png") {
  return EXT[mime] || "png";
}

export function toBuffer(val) {
  const { b64 } = normalizeImage(val);
  return b64 ? Buffer.from(b64, "base64") : null;
}

const escHtml = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function photoCreditHtml(credit, { className = "photo-credit", style = "" } = {}) {
  if (!credit?.text) return "";
  const text = escHtml(credit.text);
  const body = credit.url ? `<a href="${escHtml(credit.url)}" style="color:inherit;">${text}</a>` : text;
  return `<p class="${className}"${style ? ` style="${style}"` : ""}>${body}</p>`;
}

export function photoAlt(subject, credit) {
  if (!credit?.text) return "";
  return subject?.name || subject?.query || "";
}
