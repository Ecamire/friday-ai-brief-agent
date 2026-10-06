

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";
import { OH, SANS, DISPLAY, AXES, RADIUS, MAXW, FONT_LINK, ARCHIVE_URL, SITE } from "./theme.js";
import { isSpecial, SPECIAL_EDITION, editionFor } from "./edition.js";
import { videoFor } from "./video.js";
import { normalizeImage, photoCreditHtml, photoAlt } from "./image-util.js";

import { bylineImg, lockupImg } from "./logo.js";
import { toolsHtmlWeb } from "./tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataUri = (v) => {
  const { b64, mime } = normalizeImage(v);
  return b64 ? `data:${mime};base64,${b64}` : null;
};

export function renderHtml(n, images = {}, opts = {}) {
  const { imageUrls, date } = opts;

  const src = (key) => (imageUrls?.[key] ? esc(imageUrls[key]) : dataUri(images[key]));

  const monthYear = (date ? new Date(`${date}T12:00:00Z`) : new Date()).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const special = isSpecial(n);

  const issueLine = `${editionFor(n).mastheadLine}&nbsp;&nbsp;·&nbsp;&nbsp;${esc(monthYear)}`;

  const cover = src("cover");
  const sections = n.sections || [];

  const tocHtml = sections
    .map(
      (s, i) =>
        `<li><a href="#story-${i}"><span class="toc-n">${i + 1}</span>
          <span class="toc-kicker">${esc(s.kicker)}</span>
          <span class="toc-head">${esc(s.heading)}</span></a></li>`,
    )
    .join("\n");

  const sectionsHtml = sections
    .map((s, i) => {
      const img = src(`section-${i}`);
      const isCase = s.slotType === "case-study";

      const take = s.whyItMatters || "";
      const showTake = Boolean(take) && !s.slotType;

      const shape = ["landscape", "portrait", "square"].includes(s.imageOrientation)
        ? s.imageOrientation
        : "landscape";
      const side = i % 2 === 0 ? "right" : "left";

      const credit = photoCreditHtml(s.imageCredit);
      const imgClass = `story-img story-img--${shape}${shape === "portrait" ? ` story-img--${side}` : ""}${s.imageCredit ? " photo" : ""}`;

      const creditBelowImg = shape !== "portrait";

      return `
      <article class="story reveal" id="story-${i}">
        <span class="kicker">${esc(s.kicker)}</span>
        <h2>${esc(s.heading)}</h2>
        ${
          img
            ? // lazy/async matter only for the hosted variant, and are inert for a

              `<img class="${imgClass}" src="${img}" alt="${esc(photoAlt(s.photoSubject, s.imageCredit))}" loading="lazy" decoding="async">${creditBelowImg ? credit : ""}`
            : ""
        }
        <div class="body">${marked.parse(s.body || "")}</div>
        ${img && !creditBelowImg ? credit : ""}
        ${s.pullQuote ? `<blockquote class="pull">${esc(s.pullQuote)}</blockquote>` : ""}
        ${showTake ? `<p class="why"><span>Why it matters</span> ${esc(take)}</p>` : ""}
      </article>`;
    })
    .join("\n");

  const video = videoFor(n);
  const poster = video ? src("video-poster") : "";
  const videoHtml = video
    ? `<figure class="video reveal">
    <a class="video-link" href="${esc(video.url)}" target="_blank" rel="noopener noreferrer" aria-label="Watch the video">
      ${poster ? `<img class="video-poster" src="${poster}" alt="" loading="lazy" decoding="async">` : ""}
      <span class="video-play"><span class="video-play-tri"></span>Watch${
        video.durationLabel ? `<span class="video-play-dur">${esc(video.durationLabel)}</span>` : ""
      }</span>
    </a>
    ${
      video.caption || video.credit
        ? `<figcaption>${esc(video.caption)}${video.credit ? ` <span class="video-credit">${esc(video.credit)}</span>` : ""}</figcaption>`
        : ""
    }
  </figure>`
    : "";

  const sourcesHtml = sections
    .map((s) => {
      const url = (s.sourceUrl || "").trim();
      if (!/^https?:\/\//i.test(url)) return "";
      return `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(
        s.sourceTitle || s.heading,
      )}</a> <span class="src-host">${esc(hostname(url))}</span></li>`;
    })
    .filter(Boolean)
    .join("\n");

  const words = [
    n.introHook,
    ...sections.flatMap((s) => [s.heading, s.body, s.whyItMatters, s.pullQuote]),
    n.agentBasics,
    n.tryThisWeek,
    n.cta,
  ]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/).length;
  const readMin = Math.max(1, Math.round(words / 220));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(n.issueTitle)} — ${esc(editionFor(n).name)}</title>
<meta name="description" content="${esc(n.subtitle)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(n.issueTitle)}">
<meta property="og:description" content="${esc(n.subtitle)}">
<meta property="og:site_name" content="Openhour">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${FONT_LINK}
<style>
  :root{
  
  --ink:${OH.ink};
  --body:${OH.body};
  --muted:${OH.muted};
  --paper:${OH.paper};
  --surface:${OH.card};
  --line:${OH.line};
  --brand:${OH.sunlight};
  --brand-deep:${OH.shelf};
  --brand-tint:${OH.surface};
  --depth:${OH.depth};
  --maxw:${MAXW};
  --radius:${RADIUS};
  
  --display:${DISPLAY};
  --sans:${SANS};
  
  --ax-body:${AXES.body};
  --ax-subhead:${AXES.subhead};
  --ax-label:${AXES.label};
  }
  *{box-sizing:border-box}
  
  html{-webkit-text-size-adjust:100%;overflow-x:hidden}
  body{overflow-x:hidden}
  
  body{margin:0;background:var(--paper);color:var(--body);
    font-family:var(--sans);font-variation-settings:var(--ax-body);
    font-size:17px;line-height:1.7;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
    min-height:100vh;display:flex;flex-direction:column;}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px;width:100%}
  a{color:var(--brand-deep)}

  
  
  
  .masthead{padding:18px 24px;margin:0 0 34px;
    background-color:${OH.depth};
    background-image:linear-gradient(152deg,#16585F 0%,${OH.current} 44%,${OH.depth} 100%)}
  
  .masthead-inner{max-width:var(--maxw);margin:0 auto;
    display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap}
  .masthead-inner > *{min-width:0}

  
  
  .masthead .issue-line{font-family:var(--sans);font-variation-settings:var(--ax-label);
    font-size:15px;letter-spacing:.09em;text-transform:uppercase;
    color:var(--brand);text-align:right}

  
  .edition-badge-row{text-align:center;margin:6px 0 2px}
  .edition-badge{display:inline-block;background:var(--brand-tint);color:var(--brand-deep);
    font-weight:600;font-size:11px;letter-spacing:.09em;text-transform:uppercase;
    padding:7px 14px;border-radius:var(--radius)}

  
  .cover-title{font-family:var(--display);font-weight:600;color:var(--ink);
    font-size:clamp(36px,7.4vw,52px);line-height:1.14;margin:14px 0 12px;letter-spacing:-.015em;}
  .cover-sub{font-family:var(--display);color:var(--muted);
    font-size:clamp(17px,3.6vw,21px);line-height:1.5;margin:0 0 22px;}
  .cover-sub .inside{color:var(--ink);font-weight:600;font-style:italic}

  
  .byline{display:flex;align-items:center;gap:12px;margin:0 0 24px}
  .byline-text{display:flex;flex-direction:column;line-height:1.3}
  .byline-name{font-family:var(--sans);font-variation-settings:var(--ax-label);
    color:var(--ink);font-size:14px;text-transform:uppercase;letter-spacing:.06em}
  .byline-meta{color:var(--muted);font-size:13px}

  .cover-img{width:100%;display:block;border-radius:var(--radius);border:1px solid var(--line);margin:6px 0 26px}

  .intro{font-size:18.5px;line-height:1.65;color:var(--body);margin:0}

  
  .video{margin:26px 0 0}
  .video-link{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;
    border-radius:var(--radius);border:1px solid var(--line);background:var(--ink)}
  .video-poster{width:100%;height:100%;display:block;object-fit:cover}
  .video-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    display:flex;align-items:center;gap:10px;padding:11px 18px 11px 16px;border-radius:999px;
    background:rgba(255,255,255,.94);color:var(--ink);font-family:var(--sans);
    font-variation-settings:var(--ax-label);font-size:12px;letter-spacing:.07em;
    text-transform:uppercase;box-shadow:0 8px 28px rgba(0,0,0,.4);transition:transform .15s}
  .video-link:hover .video-play{transform:translate(-50%,-50%) scale(1.05)}
  .video-play-tri{width:0;height:0;border-style:solid;border-width:7px 0 7px 12px;
    border-color:transparent transparent transparent var(--ink)}
  .video-play-dur{color:var(--muted);letter-spacing:0;font-variation-settings:normal}
  .video figcaption{margin:10px 0 0;color:var(--muted);font-size:13.5px;line-height:1.5}
  .video-credit{white-space:nowrap}
  
  .photo{object-fit:cover;object-position:50% 22%}
  .cover-img.photo,.story-img--landscape.photo{aspect-ratio:3/2}
  .story-img--portrait.photo{aspect-ratio:2/3}
  .story-img--square.photo{aspect-ratio:1/1}
  .photo-credit{margin:-14px 0 20px;color:var(--muted);font-size:12.5px;line-height:1.4}
  .photo-credit a{color:inherit;text-decoration:underline}
  .cover-img + .photo-credit{margin-top:-18px}

  
  .toc{margin:26px 0 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0}
  .toc .kicker{color:var(--ink)}
  .toc ol{list-style:none;margin:8px 0 0;padding:0}
  .toc li{margin:0 0 2px}
  .toc a{display:flex;align-items:baseline;gap:10px;text-decoration:none;color:var(--ink);
    padding:7px 8px;margin-left:-8px;border-radius:var(--radius);
    transition:background .15s,transform .15s}
  .toc a:hover{background:var(--brand-tint);transform:translateX(3px)}
  .toc-n{color:var(--brand-deep);font-weight:700;font-size:13px;min-width:14px}
  .toc-kicker{font-family:var(--sans);font-variation-settings:var(--ax-label);
    text-transform:uppercase;letter-spacing:.07em;font-size:10.5px;
    color:var(--muted);white-space:nowrap}
  .toc-head{font-family:var(--display);font-size:16px;line-height:1.35}

  .rule{height:1px;background:var(--line);border:0;margin:40px 0}

  .story{padding:2px 0}
  .story::after{content:"";display:block;clear:both} 
  
  .kicker{display:inline-block;font-family:var(--sans);font-variation-settings:var(--ax-label);
    text-transform:uppercase;letter-spacing:.08em;
    font-size:11px;color:var(--brand-deep);margin:0 0 8px}
  .story h2{font-family:var(--display);font-weight:600;color:var(--ink);
    font-size:29px;line-height:1.25;margin:2px 0 12px;letter-spacing:-.012em}

  
  .story-img{border-radius:var(--radius);border:1px solid var(--line);display:block}

  
  .story-img--landscape{width:calc(100% + 96px);max-width:100vw;margin:6px 0 18px -48px}

  
  .story-img--portrait{width:42%;margin:6px 0 14px}
  .story-img--portrait.story-img--right{float:right;margin-left:26px}
  .story-img--portrait.story-img--left{float:left;margin-right:26px}

  
  .story-img--square{width:72%;margin:8px auto 18px}

  .body p{margin:0 0 14px}
  .body a{border-bottom:1px solid var(--brand-tint)}
  
  .body h3{font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);
    margin:24px 0 8px;letter-spacing:-.01em}
  
  .body pre{background:var(--depth);color:var(--brand-tint);border-radius:var(--radius);
    padding:16px 18px;font-size:13.5px;line-height:1.55;
    white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}
  .body code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
  .body pre code{color:inherit}

  
  .pull{margin:24px 0;padding:2px 0 2px 20px;border-left:3px solid var(--brand);
    font-family:var(--display);font-size:22px;line-height:1.45;font-weight:400;
    color:var(--ink);font-style:italic}
  .pull::before{content:"\\201C"}
  .pull::after{content:"\\201D"}
  .why{font-size:15.5px;background:var(--surface);border:1px solid var(--line);
    border-left:3px solid var(--brand);
    padding:14px 18px;border-radius:0 var(--radius) var(--radius) 0;color:var(--body);margin:16px 0 0}
  .why span{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:11px;
    font-weight:600;color:var(--brand-deep);margin-bottom:3px}

  .trythis{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
    padding:24px 26px;margin:6px 0}
  .trythis .kicker{color:var(--ink)}
  .trythis .body{font-size:17px}
  .trythis .body p{margin:0}

  
  .basics{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
    padding:24px 26px;margin:6px 0}
  .basics .kicker{color:var(--ink)}
  .basics h3{font-family:var(--display);font-size:21px;font-weight:600;color:var(--ink);margin:2px 0 10px}
  .basics .body{font-size:17px}
  .basics .body p{margin:0 0 12px}
  .basics .body p:last-child{margin:0}

  .cta{font-size:19px;line-height:1.55;font-weight:500;
    text-align:center;color:var(--ink);padding:30px 6px 4px;margin:0}

  .sources{margin:30px 0 0}
  .sources .kicker{color:var(--ink)}
  .sources ol{margin:10px 0 0;padding:0 0 0 1.35em;color:var(--muted);font-size:14.5px;line-height:1.5}
  .sources li{margin:0 0 8px}
  .sources a{color:var(--brand-deep);text-decoration:none;border-bottom:1px solid var(--brand-tint)}
  .sources .src-host{color:var(--muted);font-size:12.5px;margin-left:7px;white-space:nowrap}

  
  
  .tools{margin:30px 0 34px}
  .tools .kicker{color:var(--muted)}
  
  .tools ul{list-style:none;margin:12px 0 0;padding:0;
    display:flex;flex-wrap:wrap;gap:14px 26px;align-items:flex-start}
  .tools li{margin:0;max-width:100%}
  .tools .tool{display:inline-flex;align-items:center;gap:8px;text-decoration:none}
  .tools .tool img{opacity:.85;transition:opacity .15s}
  .tools .tool:hover img{opacity:1}
  .tools .tool-name{font-size:14.5px;font-weight:600;color:var(--ink)}
  .tools .tool:hover .tool-name{color:var(--brand-deep)}
  
  .tools .tool-blurb{display:block;font-size:13.5px;color:var(--muted);
    line-height:1.5;margin:3px 0 0 30px}
  .tools-disclosure{font-size:12.5px;color:var(--muted);margin:14px 0 0}

  
  .gate{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
    padding:32px 30px 28px;margin:34px auto 0;max-width:580px}
  .gate .eyebrow{text-transform:uppercase;letter-spacing:.08em;font-weight:600;
    font-size:11px;color:var(--brand-deep);margin:0 0 8px;text-align:center}
  .gate h3{font-family:var(--sans);font-weight:600;color:var(--ink);
    font-size:22px;line-height:1.25;margin:0 0 8px;text-align:center}
  .gate .gate-dek{text-align:center;color:var(--muted);font-size:15.5px;margin:0 auto 20px;max-width:430px}
  .gate-btn{display:inline-block;background:var(--brand);color:var(--depth);text-decoration:none;font-weight:600;padding:14px 22px;border-radius:var(--radius)}
  form{display:flex;flex-direction:column;gap:11px}
  .field-row{display:flex;gap:11px}
  .field-row+.field-row{margin-top:11px}
  .field-row .fld{flex:1}
  label{display:block;font-size:13px;font-weight:600;color:var(--ink);margin:0 0 5px}
  
  input[type=text],input[type=email],input[type=tel]{width:100%;font-family:inherit;font-size:16px;color:var(--ink);
    background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:13px 14px;
    transition:border-color .15s,box-shadow .15s}
  input::placeholder{color:var(--muted)}
  input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-tint)}
  button{margin-top:5px;font-family:inherit;font-size:16px;font-weight:600;color:var(--ink);
    background:var(--brand);border:0;border-radius:var(--radius);padding:15px 18px;cursor:pointer;
    transition:background .15s,transform .05s}
  button:hover{background:var(--brand-deep)}
  button:active{transform:translateY(1px)}
  .microcopy{text-align:center;color:var(--muted);font-size:13px;margin:13px 0 0}
  
  .gate-status{text-align:center;font-size:14.5px;margin:12px 0 0;display:none}
  .gate-status.show{display:block}
  .gate-status.err{color:#8A3A2A}
  .gate-status.done{color:var(--brand-deep);font-weight:600}
  
  .gate-alt{text-align:center;font-size:13.5px;color:var(--muted);margin:16px 0 0}
  .gate-alt a{color:var(--brand-deep)}

  footer{margin-top:auto;border-top:1px solid var(--line);text-align:center;
    padding:30px 24px 46px;color:var(--muted);font-size:14px}
  footer .name{font-family:var(--display);font-weight:600;color:var(--ink);
    font-size:17px;margin:0 0 4px}
  footer a{color:var(--brand-deep)}

  
  @media (prefers-reduced-motion: no-preference){
    .js .reveal{opacity:0;transform:translateY(14px);
      transition:opacity .55s cubic-bezier(.22,.61,.36,1),transform .55s cubic-bezier(.22,.61,.36,1)}
    .js .reveal-on{opacity:1;transform:none}
    
    .js .cover-img{will-change:transform}
  }

  
  @media (max-width:780px){
    .story-img--landscape,.story-img--portrait,.story-img--square{
      width:100%;max-width:none;float:none;margin:6px 0 16px}
    .toc a{flex-wrap:wrap;gap:4px 10px}
  }
  @media (max-width:480px){
    body{font-size:16.5px}
    .field-row{flex-direction:column;gap:11px}
    .gate{padding:26px 20px 24px}
    .cover-title{font-size:34px}
    .pull{font-size:18.5px}
  }
</style>
<script>

document.documentElement.className += " js";
</script>
</head>
<body>

<!-- LETTERHEAD. The real brand lockup (see logo.js for why this is the actual
     kit asset rather than the 3D emblem or a typeset approximation). -->
<header class="masthead">
  <div class="masthead-inner">
    ${lockupImg(30)}
    <div class="issue-line">${issueLine}</div>
  </div>
</header>

<main class="wrap">
  ${special ? `<div class="edition-badge-row"><span class="edition-badge">${esc(SPECIAL_EDITION.badge)}</span></div>` : ""}

  <!-- COVER BLOCK, left-aligned.
       It was centred until 2026-08-07. Centred display type reads as a brochure
       cover; flush-left reads as something a person wrote, which is the whole
       point now that the voice is first-person. Both reference newsletters Evan
       picked are flush-left. -->
  <h1 class="cover-title">${esc(n.issueTitle)}</h1>
  <p class="cover-sub"><span class="inside">Inside:</span> ${esc(n.subtitle)}</p>

  <!-- The byline. The face is what makes "I" mean someone. -->
  <div class="byline">
    ${bylineImg(44)}
    <div class="byline-text">
      <span class="byline-name">Evan Camire</span>
      <span class="byline-meta">${esc(monthYear)} · ${readMin} min read</span>
    </div>
  </div>

  ${cover ? `<img class="cover-img${n.coverImageCredit ? " photo" : ""}" src="${cover}" alt="${esc(photoAlt(n.coverPhotoSubject, n.coverImageCredit))}">${photoCreditHtml(n.coverImageCredit)}` : ""}

  <p class="intro">${esc(n.introHook)}</p>

  ${videoHtml}

  ${tocHtml ? `<nav class="toc" aria-label="In this issue"><span class="kicker">In this issue</span><ol>${tocHtml}</ol></nav>` : ""}

  <hr class="rule">
  ${sectionsHtml}

  ${
    n.agentBasics
      ? `<hr class="rule">
  <section class="basics reveal">
    <span class="kicker">Agent basics</span>
    ${n.agentBasicsTitle ? `<h3>${esc(n.agentBasicsTitle)}</h3>` : ""}
    <div class="body">${marked.parse(n.agentBasics)}</div>
  </section>`
      : ""
  }

  <hr class="rule">
  <section class="trythis reveal">
    <span class="kicker">${esc(n.tryThisLabel || "Try this week")}</span>
    <div class="body">${marked.parse(n.tryThisWeek || "")}</div>
  </section>

  <p class="cta">${esc(n.cta)}</p>

  <!-- EMAIL CAPTURE.
       Posts cross-origin to openhour.io, which writes to the SAME Supabase
       table the site's own /newsletter form writes to — one list, not two. It
       was briefly a plain link to openhour.io for exactly that reason (a
       Netlify Forms POST would have re-forked the list); the API now allows
       this origin, so the form is back and the link stays underneath it.

       DEGRADES WITHOUT JS. The link below is real markup, not injected by the
       script, so a reader with JS disabled — or reading a saved copy of this
       file offline — still has a way to subscribe. -->
  <div class="gate"><p class="eyebrow">Local showcase</p><h3>Preview only</h3><p>No subscriber connection, publishing, or email delivery.</p></div>

  ${sourcesHtml ? `<hr class="rule">
  <section class="sources">
    <span class="kicker">Sources</span>
    <ol>${sourcesHtml}</ol>
  </section>` : ""}

  <!-- EVAN'S ESSENTIALS — the standing affiliate block (tools.js).
       Last thing in <main>, deliberately: it sits below the Sources list so it
       cannot compete with the issue's one real ask, the LLM-written .cta above
       the signup gate. write.js's prompt is explicit that there is exactly ONE
       place a next step belongs; this is a credit line, not a second CTA, and it
       should keep reading that way.
       Emits nothing at all when the roster in tools.js is empty. -->
  ${toolsHtmlWeb()}
</main>

<script>

(function () {
  var still = !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) {
    document.documentElement.className = document.documentElement.className.replace(" js", "");
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("reveal-on");
      io.unobserve(e.target); // one-way: re-hiding on scroll-up is nauseating
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  
  var hero = document.querySelector(".cover-img");
  if (hero) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 600);
        hero.style.transform = "translateY(" + (y * 0.06).toFixed(1) + "px)";
        ticking = false;
      });
    }, { passive: true });
  }
})();
</script>

<footer>
  <p class="name">Openhour</p>
  <p>Plain-English breakdowns of what actually matters in AI. Written by Evan Camire.</p>
  <p><a href="/archive.html">Browse all past issues →</a></p>
</footer>

</body>
</html>`;
}

function esc(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function hostname(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
