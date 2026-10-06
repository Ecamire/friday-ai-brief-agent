

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EMBLEM_PATH = path.join(__dirname, "assets", "openhour-emblem.png");

const EMBLEM_DATA_URI = `data:image/png;base64,${fs.readFileSync(EMBLEM_PATH).toString("base64")}`;

export const EMBLEM_DISPLAY_PX = 120;

export const emblemImg = (size = EMBLEM_DISPLAY_PX, alt = "Openhour") => `
<img src="${EMBLEM_DATA_URI}" width="${size}" height="${size}" alt="${alt}"
     style="display:block;margin:0 auto;width:${size}px;height:${size}px;border:0;">`;

const LOCKUP_PATH = path.join(__dirname, "assets", "openhour-lockup-cream.svg");

const LOCKUP_DATA_URI = `data:image/svg+xml;base64,${fs.readFileSync(LOCKUP_PATH).toString("base64")}`;

const LOCKUP_RATIO = 123.842 / 36;

export const lockupImg = (h = 30) => {
  const w = Math.round(h * LOCKUP_RATIO);
  return `<img src="${LOCKUP_DATA_URI}" width="${w}" height="${h}" alt="Openhour"
     style="display:block;width:${w}px;height:${h}px;border:0;">`;
};

const BYLINE_PATH = path.join(__dirname, "assets", "evan-byline.jpg");

const BYLINE_DATA_URI = `data:image/jpeg;base64,${fs.readFileSync(BYLINE_PATH).toString("base64")}`;

export const bylineImg = (size = 44) => `
<img src="${BYLINE_DATA_URI}" width="${size}" height="${size}" alt="Evan Camire"
     style="display:block;width:${size}px;height:${size}px;border:0;border-radius:50%;object-fit:cover;">`;
