

import fs from "fs";
import { coveredBy } from "./coverage.js";

const UA = "Mozilla/5.0 (newsletter-agent)";
const FETCH_TIMEOUT_MS = 15000;
const RECENCY_DAYS = 5; // only genuinely new news (Evan: "last four to five days")
const PER_SOURCE = 5;

const OUTCOME_DAYS = 30;

const FUTURE_SLACK_DAYS = 2;

const PER_OUTCOME_SOURCE = 4;
const PER_GCLOUD = 3; // noisier than the rest for this audience — see below
const EVERGREEN_PER_WEEK = 3;

const VENDOR = "vendor";
const INDEPENDENT = "independent";

const OPENAI_FEED = "https://openai.com/news/rss.xml";

const RSS_SOURCES = [
  { name: "OpenAI", url: OPENAI_FEED, kind: VENDOR },
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", kind: INDEPENDENT },
  { name: "AI News", url: "https://www.artificialintelligence-news.com/feed/", kind: INDEPENDENT },
  { name: "The Register AI", url: "https://www.theregister.com/software/ai_ml/headlines.atom", kind: INDEPENDENT },
  { name: "Ars Technica AI", url: "https://arstechnica.com/ai/feed/", kind: INDEPENDENT },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", kind: INDEPENDENT },
];

const ANTHROPIC_NEWS = "https://www.anthropic.com/news";

const OUTCOME_CATEGORIES = new Set([
  "Story",
  "AI Adoption",
  "Startup",
  "Applied AI",
  "OpenAI on OpenAI",
]);

const GCLOUD_CUSTOMERS = "https://cloudblog.withgoogle.com/topics/customers/rss/";

const CIO_DIVE = "https://www.ciodive.com/feeds/news/";

const AI_MATCH = /\b(ai|a\.i\.|artificial intelligence|machine learning|llm|genai|gen ai|generative|copilot|chatbot|agent|agentic|automation|claude|anthropic|openai|chatgpt|gpt|gemini|copilots)\b/i;

const CLAUDE_CUSTOMERS = "https://claude.com/customers";

export async function researchWeek({ coverage = null } = {}) {
  const now = Date.now();
  const freshCutoff = now - RECENCY_DAYS * 86400000;
  const outcomeCutoff = now - OUTCOME_DAYS * 86400000;
  const ceiling = now + FUTURE_SLACK_DAYS * 86400000;

  const [news, outcomes, evergreen] = await Promise.all([
    Promise.all([
      ...RSS_SOURCES.map((s) => fetchRss(s, freshCutoff, ceiling).catch((e) => warn(s.name, e))),
      fetchAnthropic(freshCutoff, ceiling).catch((e) => warn("Anthropic", e)),
    ]),
    Promise.all([

      fetchRss(
        { name: "CIO Dive (independent reporting)", url: CIO_DIVE, kind: INDEPENDENT, match: AI_MATCH },
        outcomeCutoff,
        ceiling,
        PER_OUTCOME_SOURCE,
      ).catch((e) => warn("CIO Dive", e)),
      fetchOpenAiOutcomes(outcomeCutoff, ceiling).catch((e) => warn("OpenAI Outcomes", e)),
      fetchRss({ name: "Google Cloud customers", url: GCLOUD_CUSTOMERS, kind: VENDOR }, outcomeCutoff, ceiling, PER_GCLOUD)
        .catch((e) => warn("Google Cloud customers", e)),
    ]),
    fetchClaudeCustomers(coverage).catch((e) => warn("Claude customer stories", e)).then((g) => [g]),
  ]);

  const newsLinks = new Set(news.flatMap((g) => (g?.items || []).map((it) => it.link)));
  for (const g of outcomes) {
    if (g) g.items = g.items.filter((it) => !newsLinks.has(it.link));
  }

  if (coverage?.ok) {
    const focus = Boolean((process.env.FOCUS_TOPIC || "").trim());
    const dropped = [];
    const apply = (groups, removeOnSubject) => {
      for (const g of groups) {
        if (!g) continue;
        g.items = g.items.filter((it) => {
          const hit = coveredBy(coverage, it);
          if (!hit) return true;
          const remove = !focus && (hit.how === "url" || (hit.how === "subject" && removeOnSubject));
          if (remove) {
            dropped.push(`${g.name}: "${it.title}" (${hit.how}, told ${hit.date} as "${hit.heading}")`);
            return false;
          }
          it.covered = hit;
          return true;
        });
      }
    };
    apply(news, false);
    apply(outcomes, true);
    apply(evergreen, true);
    if (dropped.length) {
      console.log(`   · already covered, removed from the corpus (${dropped.length}):`);
      for (const d of dropped) console.log(`       - ${d}`);
    }
  }

  const sources = [];
  const counts = {};
  const render = (groups, heading) => {
    const blocks = [];
    for (const g of groups) {
      if (!g || !g.items.length) continue;
      counts[g.name] = g.items.length;

      const kind = g.kind || VENDOR;
      blocks.push(
        `### ${g.name} [${kind}]\n` +
          g.items
            .map((it) => {
              sources.push({ url: it.link, title: it.title, kind });
              const date = it.date ? ` (${it.date.toISOString().slice(0, 10)})` : "";

              const covered = it.covered
                ? `\n  ⚠ ALREADY COVERED on ${it.covered.date} as "${it.covered.heading}"` +
                  (it.covered.how === "mention"
                    ? " (weak match — probably the same subject; check)"
                    : " — only usable as a follow-up that leads with what is NEW since then")
                : "";
              return `- [${kind}] ${it.title}${date}\n  ${it.link}${it.snippet ? `\n  ${it.snippet}` : ""}${covered}`;
            })
            .join("\n"),
      );
      console.log(`   · ${g.name}: ${g.items.length} items [${kind}]`);
    }
    return blocks.length ? `${heading}\n\n${blocks.join("\n\n")}` : "";
  };

  const focusBlock = await fetchFocusText(news, outcomes);

  const corpus = [
    "Every item is marked [independent] or [vendor]. [vendor] means the subject published it about itself.",
    focusBlock,
    render(news, `## TIER 1 — THIS WEEK'S NEWS (last ${RECENCY_DAYS} days, dated)`),
    render(
      outcomes,
      `## TIER 2 — OUTCOMES & CASE STUDIES (last ${OUTCOME_DAYS} days, dated — real deployments, real numbers)`,
    ),
    render(evergreen, "## TIER 3 — EVERGREEN PROOF (published case studies, NO date — not news)"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const countIn = (groups, kind) =>
    groups.reduce((n, g) => n + (g && (g.kind || VENDOR) === kind ? g.items.length : 0), 0);
  const independentOutcomes = countIn(outcomes, INDEPENDENT);
  const outcomeTotal =
    outcomes.reduce((n, g) => n + (g?.items.length || 0), 0) + (evergreen[0]?.items.length || 0);

  if (!outcomeTotal) {
    console.warn(
      "   ⚠ 0 outcome/evergreen items — this issue has no case study to lead with. Check the tier-2 and tier-3 sources.",
    );
  } else if (!independentOutcomes) {
    console.warn(
      `   ⚠ 0 INDEPENDENT outcome items (${outcomeTotal} vendor-published available) — expect a thinner, more sceptical case-study section this week.`,
    );
  } else {
    console.log(`   · case-study supply: ${independentOutcomes} independent, ${outcomeTotal - independentOutcomes} vendor`);
  }

  return { corpus, sources, counts };
}

function parseRssItems(xml) {
  const items = [];
  for (const block of splitTag(xml, "item")) {
    const title = clean(pick(block, "title"));
    const link = clean(pick(block, "link"));
    const pub = pick(block, "pubDate") || pick(block, "dc:date") || pick(block, "published");
    const date = pub ? new Date(pub) : null;
    const snippet = stripHtml(clean(pick(block, "description") || pick(block, "summary"))).slice(0, 280);
    if (!title || !link) continue;
    const categories = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => clean(m[1]));
    items.push({ title, link, date: date && !isNaN(date) ? date : null, snippet, categories });
  }
  return items;
}

const inWindow = (it, cutoff, ceiling) =>
  it.date && it.date.getTime() >= cutoff && it.date.getTime() <= ceiling;

async function fetchRss(src, cutoff, ceiling, cap = PER_SOURCE) {
  const items = parseRssItems(await getText(src.url)).filter(
    (it) => inWindow(it, cutoff, ceiling) && (!src.match || src.match.test(`${it.title} ${it.snippet || ""}`)),
  );
  return { name: src.name, kind: src.kind, items: items.slice(0, cap) };
}

async function fetchOpenAiOutcomes(cutoff, ceiling) {
  const items = parseRssItems(await getText(OPENAI_FEED)).filter(
    (it) =>
      inWindow(it, cutoff, ceiling) &&
      (!it.categories.length || it.categories.some((c) => OUTCOME_CATEGORIES.has(c))),
  );
  return { name: "OpenAI Outcomes", kind: VENDOR, items: items.slice(0, PER_OUTCOME_SOURCE) };
}

const FOCUS_TEXT_MAX = 45000;
const TIER0_HEADING =
  "## TIER 0 — THE FOCUS STORY, IN FULL\n\n" +
  "This special edition is about THIS story. Everything below is the source text of it. " +
  "Build the issue from here; the other tiers are context, not the subject.\n\n";
const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or that the to with today new".split(" "),
);

async function fetchFocusText(...groups) {
  const focus = (process.env.FOCUS_TOPIC || "").trim();
  if (!focus) return "";

  const file = (process.env.FOCUS_TEXT_FILE || "").trim();
  if (file) {
    try {
      const text = fs.readFileSync(file, "utf8").trim();
      if (text.length < 500) throw new Error(`only ${text.length} chars of text`);
      console.log(`   · focus story read from ${file} (${text.length} chars)`);
      return TIER0_HEADING + text;
    } catch (e) {
      console.warn(`   ⚠ FOCUS_TEXT_FILE could not be used (${e.message}) — fetching the story instead`);
    }
  }

  const terms = new Set(
    focus.toLowerCase().match(/[a-z0-9.]+/g)?.filter((w) => w.length > 2 && !STOPWORDS.has(w)) || [],
  );
  if (!terms.size) return "";

  const items = groups.flat().flatMap((g) => g?.items || []);
  let best = null;
  let bestScore = 0;
  for (const it of items) {
    const title = String(it.title || "").toLowerCase();
    let score = 0;
    for (const t of terms) if (title.includes(t)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }

  if (!best || bestScore < 2) {
    console.warn(`   ⚠ FOCUS_TOPIC set but no corpus item matched it — the issue will be built from summaries only`);
    return "";
  }

  try {
    const page = await getText(best.link);
    const text = clean(stripHtml(page)).slice(0, FOCUS_TEXT_MAX);
    if (text.length < 500) throw new Error(`only ${text.length} chars of readable text`);
    console.log(`   · focus story read in full: "${best.title}" (${text.length} chars)`);
    return (
      TIER0_HEADING +
      `- ${best.title}${best.date ? ` (${best.date.toISOString().slice(0, 10)})` : ""}\n  ${best.link}\n\n` +
      text
    );
  } catch (e) {
    console.warn(`   ⚠ focus story full-text read failed (${e.message}) — falling back to its summary`);
    return "";
  }
}

async function fetchAnthropic(cutoff, ceiling) {
  const html = await getText(ANTHROPIC_NEWS);
  const entries = anthropicListing(html);
  if (!entries.length) {
    console.warn("   ⚠ Anthropic: listing parsed to 0 entries (news page markup may have changed)");
  }
  const items = [];

  for (const { path, date: listed } of entries.slice(0, PER_SOURCE + 3)) {
    const link = absolute(ANTHROPIC_NEWS, path);
    try {
      const page = await getText(link);
      const title =
        clean(stripHtml(meta(page, "og:title"))) ||
        clean(stripHtml(pick(page, "title"))).replace(/\s*\\?\s*Anthropic\s*$/i, "") ||
        titleize(path.split("/").pop());
      const snippet = clean(stripHtml(meta(page, "og:description") || meta(page, "description"))).slice(0, 280);

      const date = articleDate(page) || listed;

      if (!date || date.getTime() < cutoff || date.getTime() > ceiling) continue;
      items.push({ title, link, date, snippet });
    } catch {
      continue; // a fetch failure must NOT inject a dateless item into the corpus
    }
    if (items.length >= PER_SOURCE) break;
  }

  if (!items.length) {
    console.warn(
      `   ⚠ Anthropic: 0 items dated within ${RECENCY_DAYS}d — likely a date-extraction break, not a quiet news week. Check article markup.`,
    );
  }
  return { name: "Anthropic", kind: VENDOR, items };
}

async function fetchClaudeCustomers(coverage = null) {
  const html = await getText(CLAUDE_CUSTOMERS);
  const all = [...new Set([...html.matchAll(/href="\/customers\/([a-z0-9-]+)"/g)].map((m) => m[1]))];

  const byCompany = new Map();
  for (const slug of all.sort()) {
    const company = slug.replace(/-qa$/, "");
    if (!byCompany.has(company)) byCompany.set(company, slug);
  }
  const slugs = [...byCompany.values()].sort();

  if (!slugs.length) {
    console.warn(
      "   ⚠ Claude customers: listing parsed to 0 slugs (markup may have changed, or the page went client-rendered)",
    );
    return { name: "Claude customer stories", kind: VENDOR, items: [] };
  }

  const week = Math.floor(Date.now() / (7 * 86400000));
  const items = [];
  const skipped = [];

  for (let step = 0; step < slugs.length && items.length < EVERGREEN_PER_WEEK; step++) {
    const slug = slugs[(week * EVERGREEN_PER_WEEK + step) % slugs.length];
    const link = `${CLAUDE_CUSTOMERS}/${slug}`;
    const hit = coverage?.ok ? coveredBy(coverage, { title: titleize(slug), link }) : null;
    if (hit && hit.how !== "mention") {
      skipped.push(`${slug} (told ${hit.date})`);
      continue;
    }
    try {
      const page = await getText(link);
      const title =
        clean(stripHtml(meta(page, "og:title"))).replace(/\s*\|\s*Claude by Anthropic\s*$/i, "") ||
        titleize(slug);

      const snippet = clean(stripHtml(meta(page, "og:description") || meta(page, "description"))).slice(0, 280);
      items.push({ title, link, date: null, snippet });
    } catch {
      continue; // one dead slug must not cost the whole tier
    }
  }
  if (skipped.length) {
    console.log(`   · Claude customer stories: rotation skipped ${skipped.length} already told — ${skipped.join(", ")}`);
  }
  return { name: "Claude customer stories", kind: VENDOR, items };
}

function absolute(base, path) {
  try {
    return new URL(path, base).href;
  } catch {
    return "";
  }
}

const FEATURED_RE = /\\?"_type\\?":\\?"featuredGridLink\\?"([\s\S]{0,800}?)\\?"url\\?":\\?"([^"\\]+)/g;
const FEATURED_DATE_RE = /\\?"date\\?":\\?"(\d{4}-\d\d-\d\d)/;
const POST_RE = /\\?"publishedOn\\?":\\?"(20\d\d-\d\d-\d\dT[^"\\]*)[\s\S]{0,900}?\\?"slug\\?":\{[\s\S]{0,120}?\\?"current\\?":\\?"([a-z0-9-]+)/g;

function anthropicListing(html) {
  const found = [];

  for (const m of html.matchAll(FEATURED_RE)) {
    const d = FEATURED_DATE_RE.exec(m[1]);
    if (d) found.push({ path: m[2], date: new Date(`${d[1]}T12:00:00Z`) });
  }
  for (const m of html.matchAll(POST_RE)) {
    found.push({ path: `/news/${m[2]}`, date: new Date(m[1]) });
  }

  if (!found.length) {
    for (const m of html.matchAll(/href="\/news\/([a-z0-9-]+)"/g)) {
      found.push({ path: `/news/${m[1]}`, date: null });
    }
  }

  const seen = new Set();
  return found
    .filter((e) => e.path && !isNaN(e.date ?? 0) && !seen.has(e.path) && seen.add(e.path))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

function articleDate(html) {
  const inline = html.match(
    /\\?"post\\?"\s*:\s*\{\s*\\?"_createdAt\\?"\s*:\s*\\?"(20\d\d-\d\d-\d\dT[\d:.]+Z)/,
  );
  const iso = inline ? inline[1] : meta(html, "article:published_time");
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}

const textCache = new Map();

function getText(url) {
  const hit = textCache.get(url);
  if (hit) return hit;
  const p = fetchText(url).catch((e) => {
    textCache.delete(url);
    throw e;
  });
  textCache.set(url, p);
  return p;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}
function splitTag(xml, tag) {
  return xml.split(new RegExp(`<${tag}[ >]`)).slice(1).map((s) => s.split(new RegExp(`</${tag}>`))[0]);
}
function pick(block, tag) {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return m ? m[1] : "";
}
function meta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  return (re.exec(html) || re2.exec(html) || [])[1] || "";
}
function clean(s = "") {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#8217;|&#39;|&rsquo;/g, "'").replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}
function stripHtml(s = "") {
  return s.replace(/<[^>]+>/g, " ");
}
function titleize(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function warn(name, e) {
  console.warn(`   ⚠ ${name} fetch failed: ${e.message}`);
  return { name, items: [] };
}
