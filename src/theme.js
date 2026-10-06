

export const OH = {

  depth: "#04181C",
  current: "#0B2E33",
  shelf: "#1A5A5F",
  kelp: "#7A9A6B",
  surface: "#E8DFD0",
  sunlight: "#F2B33D",

  paper: "#FBF8F2",
  card: "#FFFFFF",
  line: "#DFD7C8",

  ink: "#04181C",
  body: "#233B3E",
  muted: "#6E7F80",
};

export const SANS =
  '"Archivo","Archivo Variable",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';

export const SANS_ATTR = SANS.replace(/"/g, "'");

export const DISPLAY = '"Lora",Georgia,"Times New Roman",serif';

export const DISPLAY_ATTR = DISPLAY.replace(/"/g, "'");

export const FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Lora:wght@400..700&display=swap">';

export const AXES = {
  body: "'wdth' 100, 'wght' 400",
  subhead: "'wdth' 112, 'wght' 650", // the Openhour wordmark
  label: "'wdth' 88, 'wght' 600", // kickers, eyebrows, TOC labels
};

export const RADIUS = "2px";

export const MAXW = "680px";

export const cssVars = () => `
  --depth:${OH.depth}; --current:${OH.current}; --shelf:${OH.shelf};
  --surface:${OH.surface}; --sunlight:${OH.sunlight};
  --paper:${OH.paper}; --card:${OH.card}; --line:${OH.line};
  --ink:${OH.ink}; --body:${OH.body}; --muted:${OH.muted};
  --radius:${RADIUS}; --maxw:${MAXW};
  --sans:${SANS};
  --display:${DISPLAY};
`;

export const markSvg = (fill = OH.surface, size = 64) => `
<svg viewBox="0 0 64 84" width="${size}" height="${(size * 84) / 64}" fill="${fill}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="0" width="58" height="8.5" rx="4.25"/>
  <rect x="3" y="75.5" width="58" height="8.5" rx="4.25"/>
  <path d="M12.5 8.5 C12.5 27, 32 34, 32 42 C32 50, 12.5 57, 12.5 75.5" fill="none" stroke="${fill}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M51.5 8.5 C51.5 27, 32 34, 32 42 C32 50, 51.5 57, 51.5 75.5" fill="none" stroke="${fill}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M17.5 20.5 C22 15.5, 27 16.5, 31.5 20 C36 23.5, 42 21.5, 46.5 18.5 L41 32.5 C36 35.5, 27.5 35.5, 22.5 32.5 Z"/>
  <path d="M17 69.5 C17 58.5, 47 58.5, 47 69.5 Z"/>
</svg>`;

export const SITE = "https://example.com";

export const SITE_ROOT = "https://example.com/newsletter";
export const ARCHIVE_URL = `${SITE}/newsletter`;


