

import fs from "fs";
import path from "path";
import { SITE_ROOT } from "./theme.js";

const FETCH_TIMEOUT_MS = 10000;

const SUBJECT_DAYS = 120;

const BRIEF_ISSUES = 12;

const GENERIC = new Set(
  (
    "Anthropic Claude OpenAI ChatGPT Google Gemini Microsoft Copilot Meta Nvidia Amazon Apple " +
    "Model Models Opus Sonnet Haiku Fable Mythos Sol Codex Agent Agents Platform Cloud Enterprise " +
    "January February March April May June July August September October November December " +
    "Monday Tuesday Wednesday Thursday Friday Saturday Sunday " +
    "The This That These Those There Here What When Where Which While Why How Who Its Their " +
    "Inside Report Reported Judge Company Companies Business Businesses Team Teams Week Today " +
    "New News Story Stories Case Study Off Hours Rush Hour Openhour Evan Camire " +
    "American Americans European Europe China Chinese India Japan Korea Britain British " +
    "Internet Web Android Windows Mac Linux Chrome Slack Excel PowerPoint Word Outlook Gmail " +

    "Big Small Air Tour Work Works Tier Fast Slow Plus Pro Max Mini Ultra Lite Lower Higher Free Paid " +
    "Preview Beta Alpha Labs Lab Research Science Safety Security Data Search Chat Code Vision Voice " +
    "Video Image Studio Office Home Mobile Desktop Browser Online Live Store Shop Sales Marketing " +
    "Finance Legal Health Medical Bank Banking Insurance Retail Energy Auto Software Hardware Chips " +
    "Chip Silicon Compute Server Servers Network Robot Robots Robotics Phone Phones Email Mail Docs " +
    "Drive Sheets Maps Meet Reader Readers Founder Founders Operator Operators Staff Government " +
    "Federal State States United Kingdom Union Congress Senate House Court President Administration " +
    "Department White Supreme Act Bill Law Rule Rules Order Standard Standards Protocol Open Source " +
    "Series Round Fund Funding Group Global International National Public Private Real Estate " +
    "First Second Third Next Last One Two Three Four Five Ten Hundred Thousand Million Billion " +

    "Gpt Advancing Introducing Announcing Developing Building Making Mapping Bringing Scaling " +
    "Project Program Economic Economy Benefit Benefits Future Futures Index Update Updates Guide"
  ).split(/\s+/),
);

export function normalizeUrl(u = "") {
  let s = String(u).trim().toLowerCase();
  if (!s || s.startsWith("#")) return "";
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split(/[?#]/)[0].replace(/\/+$/, "");

  s = s.replace(/-qa$/, "");
  return s;
}

export function entitiesOf(...texts) {
  const out = new Set();
  for (const text of texts) {
    if (!text) continue;
    const plain = String(text)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*_>`|]/g, " ");

    for (const sentence of plain.split(/(?:[.!?:;]\s+|\n+|\s[—–-]\s|\(|\)|"|“|”)/)) {
      const words = sentence.trim().split(/\s+/);
      for (let i = 1; i < words.length; i++) {
        const w = words[i].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "").replace(/'s$/, "");
        if (w.length < 3) continue;
        if (!/^[A-Z][a-z]/.test(w)) continue; // Capitalised word, not an ACRONYM
        if (GENERIC.has(w)) continue;
        out.add(w);
      }
    }
  }
  return out;
}

function companyFromUrl(u = "") {
  const m = /^(?:claude\.com\/customers|openai\.com\/index|anthropic\.com\/customers)\/([a-z0-9]+)/.exec(
    normalizeUrl(u),
  );
  if (!m) return null;
  const w = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return w.length >= 3 && !GENERIC.has(w) ? w : null;
}

export async function loadCoverage({ root = SITE_ROOT, cacheDir } = {}) {
  const empty = { ok: false, issues: [], urls: new Map(), subjects: [] };
  const archive = await getJson(`${root}/archive.json`);
  if (!Array.isArray(archive)) {
    console.warn(`   ⚠ coverage: could not read ${root}/archive.json — the writer has NO memory of past issues this run`);
    return empty;
  }

  const issues = (
    await Promise.all(
      archive.map(async (entry) => {
        const slug = entry?.slug;
        if (!slug) return null;
        let data = null;
        const local = cacheDir && path.join(cacheDir, slug, "data.json");
        if (local && fs.existsSync(local)) {
          try {
            data = JSON.parse(fs.readFileSync(local, "utf8"));
          } catch {
            data = null;
          }
        }
        if (!data) data = await getJson(`${root}/issues/${slug}/data.json`);
        const n = data?.newsletter;
        if (!n) return null;
        return {
          slug,
          date: entry.date || data.date || "",
          kind: entry.kind || data.kind || "weekly",
          title: entry.title || n.issueTitle || slug,
          agentBasicsTitle: n.agentBasicsTitle || "",
          tryThisLabel: n.tryThisLabel || "",
          sections: (n.sections || []).map((s) => ({
            heading: s.heading || "",
            sourceUrl: s.sourceUrl || "",
            sourceTitle: s.sourceTitle || "",
            body: s.body || "",
          })),
        };
      }),
    )
  )
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!issues.length) {
    console.warn(`   ⚠ coverage: archive listed ${archive.length} issues but none could be read`);
    return empty;
  }

  const urls = new Map();
  const subjects = [];
  const subjectCutoff = Date.now() - SUBJECT_DAYS * 86400000;
  for (const issue of issues) {
    const recent = new Date(issue.date).getTime() >= subjectCutoff;
    for (const s of issue.sections) {
      const ref = { slug: issue.slug, date: issue.date, heading: s.heading };
      const key = normalizeUrl(s.sourceUrl);
      if (key && !urls.has(key)) urls.set(key, ref);
      if (!recent) continue;

      const inBody = entitiesOf(s.body.slice(0, 1500));
      const strong = new Set([...entitiesOf(s.heading, s.sourceTitle)].filter((n) => inBody.has(n)));
      const company = companyFromUrl(s.sourceUrl);
      if (company) strong.add(company);
      const weak = [...inBody].filter((n) => !strong.has(n));
      if (strong.size || weak.length) subjects.push({ ...ref, strong: [...strong], weak });
    }
  }

  return { ok: true, issues, urls, subjects };
}

export function coveredBy(coverage, item = {}) {
  if (!coverage?.ok) return null;
  const key = normalizeUrl(item.link);
  if (key && coverage.urls.has(key)) return { ...coverage.urls.get(key), how: "url" };

  const text = `${item.title || ""} ${item.snippet || ""}`;
  if (!text.trim()) return null;
  const mentions = (name) => new RegExp(`(^|[^A-Za-z0-9])${escapeRe(name)}(?=$|[^a-z0-9])`).test(text);

  for (const s of coverage.subjects) {
    const name = s.strong.find(mentions);
    if (name) return { slug: s.slug, date: s.date, heading: s.heading, how: "subject", name };
  }
  for (const s of coverage.subjects) {
    const hits = s.weak.filter(mentions);
    if (hits.length >= 2) return { slug: s.slug, date: s.date, heading: s.heading, how: "mention", name: hits.join("+") };
  }
  return null;
}

export function coverageBrief(coverage) {
  if (!coverage?.ok || !coverage.issues.length) return "";
  const lines = ["## PREVIOUSLY COVERED — do not tell these stories again", ""];
  lines.push(
    "Every issue below has already gone to the same readers. A story in this list is not a story this week, even if it is still in the corpus below; a company or product named here is only a story again if something NEW has happened to it since the date shown, and then the piece must lead with what is new.",
    "",
  );
  coverage.issues.slice(0, BRIEF_ISSUES).forEach((issue) => {
    const tag = issue.kind === "special" ? " (Off-Hours special edition)" : "";
    lines.push(`### ${issue.date}${tag} — ${issue.title}`);
    for (const s of issue.sections) {
      const src = s.sourceUrl && !s.sourceUrl.startsWith("#") ? `  ← ${s.sourceUrl}` : "";
      lines.push(`- ${s.heading}${src}`);
    }
    if (issue.agentBasicsTitle) lines.push(`- Agent basics lesson: "${issue.agentBasicsTitle}"`);
    if (issue.tryThisLabel) lines.push(`- Closing action: "${issue.tryThisLabel}"`);
    lines.push("");
  });
  const older = coverage.issues.slice(BRIEF_ISSUES);
  if (older.length) {
    lines.push("### Earlier issues (titles only)");
    for (const issue of older) lines.push(`- ${issue.date} — ${issue.title}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function describeCoverage(coverage) {
  if (!coverage?.ok) return "no memory (archive unreadable)";
  const sections = coverage.issues.reduce((n, i) => n + i.sections.length, 0);
  const names = new Set(coverage.subjects.flatMap((s) => s.strong)).size;
  return `${coverage.issues.length} past issues, ${sections} stories, ${coverage.urls.size} source URLs, ${names} named subjects (last ${SUBJECT_DAYS} days)`;
}

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (newsletter-agent)" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
