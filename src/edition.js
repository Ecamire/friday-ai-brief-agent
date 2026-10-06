

const env = (key, fallback) => {
  const v = process.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
};

export const PUBLICATION = "Openhour";

const WEEKLY_LINE = env("NEWSLETTER_TITLE", "Rush Hour · Friday AI brief");
const SPECIAL_LINE = env("SPECIAL_EDITION_TITLE", "Off-Hours · Special edition");

export const WEEKLY_EDITION = {
  name: "Rush Hour",
  mastheadLine: WEEKLY_LINE,
  emailEyebrow: WEEKLY_LINE,
  subjectEmoji: "⏳", // "⏳ <title> · Rush Hour"
  subjectSuffix: "Rush Hour",
};

export const SPECIAL_EDITION = {
  name: "Off-Hours",
  mastheadLine: SPECIAL_LINE,
  badge: SPECIAL_LINE,
  emailEyebrow: SPECIAL_LINE,
  subjectEmoji: "🌙", // "🌙 <title> · Off-Hours"
  subjectSuffix: "Off-Hours",
  archiveTag: SPECIAL_LINE,
};

export const isSpecial = (n) => n?.kind === "special";

export const editionFor = (n) => (isSpecial(n) ? SPECIAL_EDITION : WEEKLY_EDITION);

export const slugPrefixFor = (n) =>
  editionFor(n)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
