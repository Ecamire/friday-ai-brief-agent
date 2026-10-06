

import Anthropic from "@anthropic-ai/sdk";
import { coverageBrief, coveredBy } from "./coverage.js";

const MODEL = process.env.NEWSLETTER_MODEL;

const MAX_ATTEMPTS = 2;

const FRESH_DAYS = 5;

const OUTCOME_DAYS = 30;

const SLOTS = ["case-study", "case-study", "news", "news"];

const PHOTO_SUBJECT = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      enum: ["person", "company", "product", "place", "generic", "none"],
      description:
        "What a real photo of this slot would show. 'person' ONLY when the story is about that specific named person (a CEO making the announcement, a founder in a case study). " +
        "'company' for a company's headquarters or storefront, 'product' for a named physical product or device, 'place' for a named location. " +
        "'generic' for a photographable scene with no specific subject (an empty office, a warehouse floor). " +
        "'none' when the story is abstract (policy, markets, software) or you are not sure — AI art is used instead, which is always fine.",
    },
    name: {
      type: "string",
      description:
        "For person/company/product/place: the exact full name as it would appear on Wikipedia, e.g. 'Brian Chesky', 'Airbnb'. Empty string otherwise.",
    },
    query: {
      type: "string",
      description: "For 'generic' only: a 2-4 word concrete stock-photo search, e.g. 'empty office'. Empty string otherwise.",
    },
  },
  required: ["kind", "name", "query"],
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    issueTitle: { type: "string", description: "Punchy issue title, max ~8 words. It names the single most interesting thing in the issue. Direct and specific beats clever." },
    subtitle: {
      type: "string",
      description:
        "The 'Inside:' line. It must tease a DIFFERENT story than issueTitle — a second hook, not a restatement of the first. One line, no trailing period. Do not include the word 'Inside:' itself; the template adds it.",
    },
    introHook: {
      type: "string",
      description:
        "2–3 sentences that make a busy person want to read on. Open on the most interesting thing in the issue, not on a greeting or a summary of the newsletter. Report and frame — do not claim personal experience of it.",
    },
    sections: {
      type: "array",

      description:
        "EXACTLY 4 stories — no more, no fewer — in this slot order: case-study, case-study, news, news.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slotType: {
            type: "string",
            enum: ["case-study", "news"],
            description:
              "Which fixed slot this fills. Sections 1 and 2 are 'case-study'. Sections 3 and 4 are 'news'. This must match the position exactly.",
          },
          kicker: {
            type: "string",
            description:
              "Short uppercase label. For case studies name the doer, e.g. 'RETAIL', 'A SOLO FOUNDER', 'LOGISTICS'. For news name the beat, e.g. 'ANTHROPIC', 'CAPABILITY', 'REGULATION', 'TOOLS'.",
          },
          heading: { type: "string", description: "The story's headline. Specific and direct. State the thing, do not tease it." },
          body: {
            type: "string",
            description:
              "2–3 tight paragraphs. Markdown allowed, including '### ' subheads when a story genuinely has two movements (use them sparingly, and phrase them conversationally, e.g. '### So what actually broke?'). " +
              "For a CASE STUDY: lead with the MECHANISM — what they actually built, what it replaced, what it took to get working. The number is supporting evidence, not the hook. Never open with a headline figure. " +
              "For NEWS: what changed, how it works, and what it now makes possible. Assume the reader knows what an API, a model and an agent are; do not define them. Explain the mechanism, not the category.",
          },
          pullQuote: {
            type: "string",
            description:
              "A short verbatim quote from the source worth setting apart on the page, under ~20 words. Use ONLY a real quote that appears in the corpus. If the source has no quote worth pulling, return an empty string. Never paraphrase into a fake quote.",
          },
          sourceUrl: {
            type: "string",
            description:
              "The exact source URL from the corpus that THIS story is based on. Copy it verbatim — never invent, guess, or alter a link. This powers the Sources list at the bottom.",
          },
          sourceTitle: {
            type: "string",
            description: "The headline/title of that source item, exactly as it appears in the corpus.",
          },
          imageStyle: {
            type: "string",
            enum: ["cartoon", "diagram", "abstract"],
            description:
              "Which illustration style suits THIS story. Vary it across the four — an issue where every image is the same style reads flat. " +
              "'cartoon' for a human situation: someone doing, suffering, or benefiting from the thing. " +
              "'diagram' for infrastructure and plumbing: systems, flows, hardware, how a thing is wired together. " +
              "'abstract' for policy, regulation, markets, and industry shifts — anything with no single scene or actor.",
          },
          imageOrientation: {
            type: "string",
            enum: ["landscape", "portrait", "square"],
            description:
              "The shape this story's illustration should take. Vary it across the four stories so the page has rhythm — do not return the same value for all four. Prefer 'landscape' for scene-based ideas, 'portrait' for a single figure or object, 'square' for a diagram-like or symmetrical idea.",
          },
          imagePrompt: {
            type: "string",
            description:
              "What this story's illustration should DEPICT. Describe only the subject and composition — images.js appends the rendering style, so do not name a medium, technique, or art style here. " +
              "Match the content to the imageStyle you chose: for 'cartoon' describe a specific scene with a character in it, doing something a little funny; for 'diagram' describe the system or hardware and how its parts relate; for 'abstract' describe the shapes, forms and spatial idea, with no people. " +
              "Name the brand color of the company this story is about as the single accent. Palette guide: Anthropic/Claude = warm clay-rust (#CC7A5C); OpenAI/ChatGPT = teal-green (#10A37F); Google/Gemini = blue/red/yellow/green; Meta = electric blue (#0866FF); Microsoft = blue/green/yellow/red; Nvidia = bright green; xAI/Grok = stark black. If the story is not about one company, use the issue's accentColor.",
          },
          photoSubject: PHOTO_SUBJECT,
        },
        required: [
          "slotType",
          "kicker",
          "heading",
          "body",
          "pullQuote",
          "sourceUrl",
          "sourceTitle",
          "imageStyle",
          "imageOrientation",
          "imagePrompt",
          "photoSubject",
        ],
      },
    },
    agentBasicsTitle: {
      type: "string",
      description:
        "Heading for the recurring 'Agent basics' beginner segment, naming this week's ONE lesson concretely, e.g. 'What makes an agent different from a chatbot' or 'Why an agent needs access to your files'. Under 10 words. Sentence case. No trailing period.",
    },
    agentBasics: {
      type: "string",
      description:
        "The recurring beginner segment: teach a COMPLETE NEWCOMER one foundational idea about using AI agentically — AI that takes actions and completes tasks, not just answers questions. " +
        "Pick the single concept a newcomer would most need in order to follow THIS issue's stories, so the lesson changes naturally week to week (what an agent actually is, giving AI access to tools and files, letting it check its own work, when to let it act versus draft, how to describe a task so it succeeds, connecting it to the systems a business already runs, and so on). " +
        "120–200 words of markdown, 2–3 short paragraphs. Define every term from zero — the no-definitions rule does NOT apply inside this field. " +
        "Include one concrete everyday example a non-technical business owner can picture. End with the smallest possible first step they could take this week. No product pitching — that belongs only in cta.",
    },
    tryThisLabel: {
      type: "string",
      description:
        "The heading for the closing action block, written fresh for THIS issue rather than reused. It should name the specific thing, e.g. 'Steal this prompt', 'Try the 20-minute version', 'Ask your vendor this one question', 'Copy this workflow'. Under 6 words. Sentence case.",
    },
    tryThisWeek: {
      type: "string",
      description:
        "One concrete thing the reader can do, matched to whatever this issue was actually about. Markdown allowed, INCLUDING fenced code blocks — if the useful artifact is a prompt, a config file or a command, put the real copy-pasteable text here rather than describing it. It should take well under 30 minutes and produce something they can look at.",
    },
    cta: {
      type: "string",
      description:
        "The closing line, and the ONLY place in the issue where a next step belongs. ONE sentence, under 25 words. It invites a reply about what the reader is trying to automate and notes plainly that Openhour builds these agents. No urgency, no scarcity, no 'book now', no exclamation mark, no second sentence.",
    },
    coverImagePrompt: {
      type: "string",
      description:
        "What the cover illustration should DEPICT. It is always rendered as a hand-drawn cartoon, so describe a scene with a person or figure in it, mildly funny, with one brand-color accent — but do not name a medium or art style. " +
        "It should evoke the ISSUE AS A WHOLE, and it must depict a DIFFERENT SCENE from every section's imagePrompt — different setting, different action, different characters. " +
        "The cover and the first story appear within one screen of each other, so two drawings of the same idea read as a mistake. If the lead story is the only thing you can think to draw, draw a different moment of it.",
    },
    coverPhotoSubject: {
      ...PHOTO_SUBJECT,
      description:
        "A real photo for the COVER, tried before the cartoon. Prefer the person or company at the center of the LEAD story, e.g. the CEO whose decision it is. Use 'none' if the issue has no single obvious face or place. Do not pick the same subject as a section's photoSubject.",
    },
    accentColor: {
      type: "string",
      description: "A single hex color (e.g. #bd4a2c) that captures the mood of this week's lead story, used as the issue's accent throughout. Pick a rich, saturated MID-tone that reads clearly as a button background with white text and as a label on a cream page. Avoid pale/pastel and avoid near-black. Vary it week to week.",
    },
    accentName: {
      type: "string",
      description: "One or two words naming the accent color, e.g. 'terracotta' or 'deep teal'.",
    },
  },
  required: [
    "issueTitle",
    "subtitle",
    "introHook",
    "sections",
    "agentBasicsTitle",
    "agentBasics",
    "tryThisLabel",
    "tryThisWeek",
    "cta",
    "coverImagePrompt",
    "coverPhotoSubject",
    "accentColor",
    "accentName",
  ],
};

const FOCUS = process.env.FOCUS_TOPIC;

const OFF_HOURS_REGISTER = `

THIS IS AN OFF-HOURS SPECIAL EDITION. One story broke, it is big enough to send out of cycle, and the whole issue is about that one thing. It is not the Friday roundup.

WRITE IT WITH MORE ENERGY THAN THE WEEKLY. Off-Hours is the after-hours edition and it should feel like it: shorter sentences, a faster open, more willingness to be blunt about what is actually interesting and what is just launch copy. Lead with the sharpest true thing you have, not with a throat-clear. Where the weekly would hedge into a paragraph, land it in a line.

WHAT PUNCHY IS NOT. It is not hype, not exclamation marks, not "game-changer", not breathless. The energy comes from PICKING THE RIGHT DETAIL AND STATING IT PLAINLY, not from adjectives. A concrete number, a specific mechanism, or a thing the reader can now do that they could not last week will always hit harder than an intensifier. If the story has a genuinely unglamorous part, say so; scepticism reads as confidence and puffery reads as filler.

BE SPECIFIC ABOUT THE BORING PART. A launch post is written to sell. Your job is the opposite: find the line in it that a builder would actually act on — the price change, the default that flipped, the thing that is now allowed, the thing that is still restricted — and make that the story. Name what has NOT changed too, where the source says so.

MAKE IT LOOK LIKE AN EVENT. accentColor should be bolder and more saturated than a usual week, and it should suit THIS story rather than defaulting to a house colour. coverImagePrompt should describe one striking, graphic, poster-like scene with a person in it, not a tasteful abstraction.`;

export async function writeNewsletter(brief, client = new Anthropic(), { coverage = null, rejected = [], attempt = 1 } = {}) {
  if (!MODEL) throw new Error("Set NEWSLETTER_MODEL to a model available in your own account.");
  const previouslyCovered = coverageBrief(coverage);
  const rejection = rejected.length
    ? `\n\nYOUR PREVIOUS DRAFT WAS REJECTED. It repeated stories this newsletter has already sent to these same readers:\n${rejected
        .map((r) => `- "${r.heading}" (${r.sourceUrl}) — already told on ${r.hit.date} as "${r.hit.heading}"`)
        .join("\n")}\nChoose DIFFERENT stories for those slots. Do not re-use those sources or those companies. If the corpus has nothing else usable for a case-study slot, say so plainly in that slot, as the rules allow.`
    : "";

  const response = await client.messages.create({
    model: MODEL,

    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: `You write Openhour's weekly AI brief for founders, operators and small-business people who are not engineers but are not stupid either.

WHO IS SPEAKING, and this constraint is not negotiable. This issue is written and sent automatically, without Evan Camire reading it first. His name is on the masthead as the publisher, so the writing must never assert anything he would have to personally stand behind. Concretely: no claims about his work, his clients, his week, or his experience ("I spend my days building agents", "I have shipped four of these"), and no personal opinions attributed to him ("this is the one I would copy", "I do not believe that number"). Every one of those is a claim the pipeline cannot back, because he did not make it.

WHAT YOU CAN DO INSTEAD, which is most of it. Judgment that comes from the reporting is fine and wanted — what a result depends on, what a write-up leaves out, what has to be true for it to hold, who it plainly does not apply to. State those as observations about the story, not as somebody's opinion. "Ninety percent fewer hours assumes the engineers stop re-auditing the diffs" is reporting. "I don't buy it" is a claim about a person.

VOICE. Third person by default. Direct. Short sentences. Confident without being loud. No hype, no em dashes, no "in today's fast-paced world" filler, no exclamation marks, no rhetorical questions used as transitions. The one place first person is allowed is the closing invitation, because a reply genuinely does reach a person.

TECHNICAL LEVEL. Assume the reader knows what an API, a model, an agent and a prompt are. Do not define them. Do explain mechanisms: what the system actually does, where the data goes, what had to be built around it. The interesting part of any AI story is almost always the plumbing, and nobody else is writing about the plumbing for this audience.

THE ONE EXCEPTION: AGENT BASICS. The agentBasics field is a recurring segment written for a complete newcomer — the reader who forwarded this issue to a colleague who has never used AI beyond a chat window. Inside that field only, the assumption above flips: define everything from zero, in plain language, warmly and without condescension. It teaches ONE idea per week about using AI agentically — getting AI to take actions and finish tasks, not just answer questions. Everywhere else in the issue, the normal technical level holds.

DEFINE BEFORE YOU DISCUSS, and this applies to every story. AI fluency is assumed; fluency in someone else's industry is NOT. Two things must be introduced before the sentence that relies on them:

  1. DOMAIN JARGON AND ACRONYMS from outside AI — SIEM, EHR, ERP, KYC, SKU, RCM, claims adjudication, and anything like them. Give the plain-English version in the same breath, in a clause, not a glossary aside: "its SIEM (the system that collects security logs and raises alerts)". A reader who runs a retail business has no reason to know what a security team buys, and the story is worthless to them if the first sentence assumes they do.

  2. COMPANY AND PRODUCT NAMES the reader has no reason to recognise. Anthropic, OpenAI, Google and Microsoft need no introduction. Vega, Model ML, Harvey, Cursor and every other name in the corpus DO. Say what the company is before saying what it did: "Model ML, which builds AI tooling for finance teams, pointed..." — not "Model ML pointed...". One clause is enough.

OPEN BY FRAMING, NOT BY PLUNGING. The first sentence of a story establishes who this is about and what kind of problem it is. Only then does the mechanism arrive. A story that opens mid-detail reads as though the reader missed the first paragraph, and most of them will simply stop. This is the single most common way a technically correct issue fails its audience.

WHAT THIS NEWSLETTER IS ABOUT. What AI is actually doing for people who run businesses, and what is actually happening in AI that changes what they can build. Two case studies, two news stories, and one Agent basics lesson, every week, in that order.

WHAT TO AVOID. Do not fearmonger and do not write doom. "AI is coming for your job" is not this newsletter's angle. Lawsuits, regulation, safety research and big funding rounds ARE fair game now, but only when the outcome genuinely changes what someone can build, buy or use — cover the consequence, not the drama. Never frame a story as a threat the reader has to defend against.

HONESTY, and this one is not negotiable. Use only what is in the corpus. Never invent a fact, number, quote or link. If a story is thin, keep it short rather than padding it. Attribute a figure to whoever measured it when that is the natural way to write the sentence, but do not append a disclaimer to every number.

WHAT THIS IS NOT. It is not an ad. Do not pitch, do not sell, and do not suggest hiring anyone inside a story. Every section stays genuinely editorial and would stand up in a newsletter with no business behind it. There is exactly ONE place a next step belongs, and it is the cta field at the end.${
      FOCUS ? OFF_HOURS_REGISTER : ""
    }`,
    messages: [
      {
        role: "user",
        content: `Today is ${new Date().toISOString().slice(0, 10)}. Below is the corpus: this week's AI news, recent customer outcomes, and published case studies, with links, dates and a source-kind marker. Turn it into the newsletter.

Rules:

THE FIXED FORMAT. Four stories, always, in this exact order:
  1. CASE STUDY — a company OR a single person who used AI to save real money or real time
  2. CASE STUDY — same
  3. NEWS — something that actually moves the needle
  4. NEWS — same
Set slotType on each section to match its position. Do not write five stories, do not write three.

CORPUS SHAPE. The corpus is in three tiers and they are not interchangeable.
- TIER 1 is this week's news, dated, from the last ${FRESH_DAYS} days.
- TIER 2 is outcomes and case studies from the last ${OUTCOME_DAYS} days — named companies, real deployments, actual numbers. Dated.
- TIER 3 is evergreen proof: published customer stories with NO publication date. They are NOT news. Use them freely, but never say or imply they happened this week, and never give one a date.
Each item is marked [independent] or [vendor]. That marking is for YOUR SELECTION ONLY — it is not rendered on the page and there is no field to copy it into.

PICKING THE TWO CASE STUDIES.
- Prefer INDEPENDENT sources. A journalist who went and looked is worth more than a vendor page about its own customer, every time.
- A vendor-published case study is still usable when it carries real detail. Judge it on mechanism, not on the percentage.
- If a vendor case study is thin — no mechanism, no detail, just a percentage and a logo — SKIP IT. This is the main defence against the issue reading like an advert, so apply it strictly. A shorter case study built on a real detail beats a padded one built on a stat.
- If the corpus genuinely has only one usable case study this week, say so plainly in that slot rather than inflating a weak item into a second one. Do not invent a case study to fill the slot.
- Lead the case-study body with the MECHANISM, not the number. What did they build, what did it replace, what did it take. The result is evidence, not the hook.

PICKING THE TWO NEWS STORIES.
- Pick for consequence, not volume. The test is: does this change what someone can build, buy, or rely on.
- Weight Anthropic/Claude news heavily when it is genuinely fresh.
- Lawsuits, regulation, safety research and funding are eligible when they pass the consequence test. Cover what it changes, not the drama around it.
- Never re-cover a model launch that is not genuinely new this week.
- Ignore filler. A vendor announcing a vendor thing is not a story unless it changes what a reader can do.

FRESHNESS.
- TIER 1 items must be from the last ${FRESH_DAYS} days. Each shows its date in parentheses.
- TIER 2 items may be up to ${OUTCOME_DAYS} days old. Do not call them "this week." "Recently," or naming the month, is honest.
- TIER 3 items carry no date. Write them in the present tense as things that ARE true, never as things that JUST happened.

DO NOT REPEAT YOURSELF, and this is as binding as the honesty rule. Every issue goes to the same readers, and a story they have already read is worth less than a blank slot. The PREVIOUSLY COVERED block below the rules lists what this newsletter has already published.
- A story in that list is NOT a story this week. Not with a new angle, not with a new number from the same page, not "in case you missed it."
- A corpus line marked ⚠ ALREADY COVERED may only run as a FOLLOW-UP: there must be a genuinely new development since the date shown (a deal closed, a price changed, a rollout expanded, a result published), the piece must open with what is new, and it must not re-explain what the earlier story explained. If there is nothing new, it does not run. A case study never qualifies as a follow-up; a case study told once is told.
- The same applies to the recurring segments. Do not teach an Agent basics lesson the block shows was taught in the last several issues, and do not reuse a recent closing-action format. A reader who has been here a month should see nothing they recognise.

THE AGENT BASICS SEGMENT. After the four stories, one short lesson for a total newcomer to agentic AI. Choose the concept a beginner would most need to understand THIS issue's stories — that anchor is what keeps the lesson different each week. It is teaching, not news: no dates, no corpus citations needed, no sourceUrl. Keep it self-contained; a reader who skips everything else should still learn one usable thing from it.

MECHANICS.
- subtitle must tease a DIFFERENT story than issueTitle. Two hooks, not one repeated.
- pullQuote must be a real quote from the corpus or an empty string. Never manufacture one.
- Vary imageStyle across the four stories, and vary imageOrientation too. Four identical styles or four identical shapes make the page read flat.
- coverImagePrompt must describe a different scene from every section's imagePrompt.
- For every story, set sourceUrl to the exact link from the corpus (copy it verbatim) and sourceTitle to that item's headline.${
          FOCUS
            ? `

URGENT SINGLE-STORY EDITION: this overrides the fixed four-slot format. Build the ENTIRE issue around this one story: "${FOCUS}". issueTitle and subtitle must announce it directly. introHook must convey why it's urgent right now. Write 4 sections that unpack different angles of this SAME story (what happened, the mechanism, the part that is more interesting than it looks, what it changes for builders) — do NOT include unrelated stories from the corpus even if they're fresh. Set slotType to 'news' on all four.

READ TIER 0 FIRST. When the corpus opens with a TIER 0 block, that is the full source text of this story and it is the material for the whole issue. Everything specific — prices, model names, benchmark numbers, what is restricted, who is quoted — comes from there. The other tiers are background you may use for context, and nothing else. Pull every fact strictly from the corpus; if TIER 0 does not say it, you do not know it.

SPEND THE SPECIFICS. A single-story issue lives or dies on detail, and you have the full source, so do not write four sections of summary. Each section should carry something concrete the others do not: an exact figure, a named default, a real constraint, a verbatim quote. Four sections that each restate the headline is the failure mode here.

PULL A REAL QUOTE. Long source posts usually carry named quotes; use them for pullQuote where one genuinely earns the space, verbatim, and leave it empty where none does.

THE LAUNCH VIDEO. If TIER 0 contains a block headed LAUNCH VIDEO, that video is embedded in the issue directly under the intro, so the reader can watch it before reading a word. Treat it as a source like any other: what it shows and what is said in it are fair to describe and to quote. You may point the reader at it once, as "the launch video above", where that genuinely helps. Do not narrate it shot by shot, and do not describe it as something the reader has to go elsewhere to find.`
            : ""
        }${rejection}${previouslyCovered ? `\n\n---\n${previouslyCovered}` : ""}

---
${brief}`,
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });

  if (response.stop_reason === "max_tokens") {
    const out = response.usage?.output_tokens;
    throw new Error(`writer hit max_tokens (${out} output tokens, thinking included) before finishing the issue JSON — raise max_tokens in write.js`);
  }
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const newsletter = JSON.parse(text);

  const sections = Array.isArray(newsletter.sections) ? newsletter.sections : [];

  if (!FOCUS && sections.length !== SLOTS.length) {
    console.warn(
      `   ⚠ expected ${SLOTS.length} sections, got ${sections.length} — the schema cannot enforce this, so check the prompt. Issue still renders.`,
    );
  }

  if (sections.length === SLOTS.length && !FOCUS) {
    newsletter.sections.forEach((s, i) => {
      if (s.slotType !== SLOTS[i]) {
        console.warn(`   ⚠ section ${i + 1} came back as '${s.slotType}', expected '${SLOTS[i]}' — correcting`);
        s.slotType = SLOTS[i];
      }
    });

    const dealIfFlat = (field, cycle) => {
      const distinct = new Set(newsletter.sections.map((s) => s[field]));
      if (distinct.size >= 2) return;
      console.warn(
        `   ⚠ all ${newsletter.sections.length} images came back '${[...distinct][0]}' for ${field} — dealing from the cycle`,
      );
      newsletter.sections.forEach((s, i) => {
        s[field] = cycle[i % cycle.length];
      });
    };

    dealIfFlat("imageOrientation", ["landscape", "portrait", "square", "landscape"]);
    dealIfFlat("imageStyle", ["cartoon", "diagram", "abstract", "cartoon"]);
  }

  if (coverage?.ok && !FOCUS) {
    const repeats = [];
    for (const s of sections) {
      const hit = coveredBy(coverage, { title: `${s.heading || ""} ${s.sourceTitle || ""}`, link: s.sourceUrl });
      if (!hit || hit.how === "mention") continue;
      const hard = hit.how === "url" || s.slotType === "case-study";
      if (hard) repeats.push({ heading: s.heading, sourceUrl: s.sourceUrl, hit });
      else console.warn(`   ⚠ news slot "${s.heading}" shares a subject with ${hit.date} "${hit.heading}" — allowed as a follow-up, check it reads as one`);
    }
    if (repeats.length) {
      const list = repeats.map((r) => `"${r.heading}" (told ${r.hit.date})`).join("; ");
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`   ⚠ draft repeats ${repeats.length} published stor${repeats.length === 1 ? "y" : "ies"} — ${list}. Rewriting once.`);
        const again = await writeNewsletter(brief, client, { coverage, rejected: repeats, attempt: attempt + 1 });
        return { newsletter: again.newsletter, usage: addUsage(response.usage, again.usage) };
      }
      console.warn(`   ⚠ draft STILL repeats a published story after ${attempt} attempts — ${list}. Shipping it; the prompt or the corpus needs attention.`);
    }
  }

  return { newsletter, usage: response.usage };
}

function addUsage(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === "number") out[k] = (typeof out[k] === "number" ? out[k] : 0) + v;
  }
  return out;
}
