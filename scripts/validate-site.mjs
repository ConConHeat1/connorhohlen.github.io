#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
const publicPages = [
  "index.html",
  "about.html",
  "404.html",
  "college.html",
  "highschool.html",
  "workspace1.html",
  "workspace2.html",
  "projects/flexin.html",
  "projects/fpv-drone.html",
  "projects/portfolio.html",
  "projects/led-lighting.html",
  "projects/plant-monitor.html",
  "projects/sql-java-data-system.html",
  "projects/rocket-computer.html",
];
const legacyPages = [
  "project1.html",
  "project2.html",
  "project3.html",
  "project4.html",
  "project5.html",
  "project6.html",
  "project7.html",
  "project8.html",
  "404.shtml",
];
const seasonalEventIds = [
  "new-year",
  "valentines-day",
  "st-patricks-day",
  "easter",
  "earth-day",
  "mothers-day",
  "fathers-day",
  "independence-day",
  "halloween",
  "thanksgiving",
  "christmas",
];
const seasonalFiles = [
  "assets/css/seasonal.css",
  "assets/js/seasonal/index.mjs",
  "assets/js/seasonal/events.mjs",
  "assets/js/seasonal/engine.mjs",
  "assets/js/seasonal/scenes/shared.mjs",
  ...seasonalEventIds.map((id) => `assets/js/seasonal/scenes/${id}.mjs`),
  "assets/images/seasonal/santa-sleigh.webp",
  "assets/images/seasonal/bunny.webp",
  "assets/images/seasonal/earth-blue-marble.webp",
  "assets/images/seasonal/turkey-running.webp",
  "scripts/seasonal-controller.test.mjs",
  "scripts/seasonal-events.test.mjs",
  "scripts/seasonal-scenes.test.mjs",
];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function withoutNonvisibleContent(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function localTarget(reference, file) {
  const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!clean || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return null;
  if (clean.startsWith("/")) return join(root, clean.slice(1));
  return resolve(join(root, file), "..", clean);
}

for (const required of [
  "CNAME",
  "robots.txt",
  "sitemap.xml",
  "assets/css/site.css",
  "assets/js/site.js",
  "quotes.txt",
  "assets/images/og-card.png",
  "assets/images/resume-preview.png",
  "output/pdf/connor-hohlen-resume.pdf",
  ...seasonalFiles,
]) {
  if (!existsSync(join(root, required))) fail(required, "required file is missing");
}

for (const file of [...publicPages, ...legacyPages]) {
  const path = join(root, file);
  if (!existsSync(path)) {
    fail(file, "HTML file is missing");
    continue;
  }

  const html = readFileSync(path, "utf8");
  const visible = withoutNonvisibleContent(html);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();

  if (!/<html[^>]+\blang="en"/i.test(html)) fail(file, "missing document language");
  if (!title) fail(file, "missing title");
  if (h1Count !== 1) fail(file, `expected one H1, found ${h1Count}`);
  if (/on(?:click|change|input|load|keydown|mouseover)\s*=/i.test(html)) fail(file, "contains an inline event handler");
  if (/This is where you can provide|Coming Soon|Description of Project/i.test(visible)) fail(file, "contains visible placeholder text");
  if (/\b\d{3}[-. )]\s*\d{3}[-. ]\d{4}\b/.test(html)) fail(file, "contains a public phone number");

  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=(?:"[^"]*"|'[^']*')/i.test(image[0])) fail(file, `image missing alt text: ${image[0].slice(0, 80)}`);
    if (/\balt=(?:"(?:image|project image|your picture)"|'(?:image|project image|your picture)')/i.test(image[0])) {
      fail(file, "contains generic alt text");
    }
  }

  const references = [];
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*"([^"]+)"/gi)) references.push(match[1]);
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*'([^']+)'/gi)) references.push(match[1]);
  for (const match of html.matchAll(/\bsrcset\s*=\s*"([^"]+)"/gi)) {
    references.push(...match[1].split(",").map((candidate) => candidate.trim().split(/\s+/)[0]));
  }

  for (const reference of references) {
    const target = localTarget(reference, file);
    if (target && !existsSync(target)) fail(file, `missing local target ${reference}`);
  }
}

for (const file of publicPages) {
  const html = readFileSync(join(root, file), "utf8");
  if (!/<meta\s+name="description"/i.test(html)) fail(file, "missing meta description");
  if (file !== "404.html" && !/<link\s+rel="canonical"/i.test(html)) fail(file, "missing canonical URL");
  if (file !== "404.html" && !/<meta\s+property="og:title"/i.test(html)) fail(file, "missing Open Graph metadata");
  if (!/<meta\s+name="theme-color"/i.test(html)) fail(file, "missing theme color");
  if (/<a\b[^>]*href=(?:"\/?#resume"|'\/?#resume')/i.test(html)) {
    fail(file, "résumé must be opened from the Contact section rather than navigation");
  }
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
if (!/<button\b[^>]*data-resume-toggle/i.test(indexHtml)) fail("index.html", "missing Contact résumé button");
if (!/<dialog\b[^>]*data-resume-dialog/i.test(indexHtml)) fail("index.html", "missing résumé dialog");
if (!/<link\b[^>]*href="\/assets\/css\/seasonal\.css"/i.test(indexHtml)) {
  fail("index.html", "missing seasonal stylesheet");
}
if (!/<script\b[^>]*type="module"[^>]*src="\/assets\/js\/seasonal\/index\.mjs"/i.test(indexHtml)) {
  fail("index.html", "missing seasonal module");
}
for (const hook of [
  "data-seasonal-stage",
  "data-seasonal-canvas",
  "data-seasonal-props",
  "data-seasonal-veil",
  "data-seasonal-toggle",
  "data-event-preview-launcher",
  "data-event-preview",
  "data-event-preview-minimize",
  "data-event-preview-select",
  "data-event-preview-auto",
  "data-event-preview-close",
  "data-special-greeting",
]) {
  const matches = indexHtml.match(new RegExp(`\\b${hook}(?:\\s|=|>)`, "gi")) || [];
  if (matches.length !== 1) fail("index.html", `expected one ${hook} hook, found ${matches.length}`);
}

const themeSwitcherIndex = indexHtml.indexOf('class="theme-switcher"');
const seasonalToggleIndex = indexHtml.indexOf("data-seasonal-toggle");
const primaryNavCloseIndex = indexHtml.indexOf("</nav>", themeSwitcherIndex);
const headerCloseIndex = indexHtml.indexOf("</header>", primaryNavCloseIndex);
const previewLauncherIndex = indexHtml.indexOf("data-event-preview-launcher");
if (
  !(
    themeSwitcherIndex >= 0 &&
    themeSwitcherIndex < seasonalToggleIndex &&
    seasonalToggleIndex < primaryNavCloseIndex
  )
) {
  fail("index.html", "seasonal toggle must follow the theme switcher inside primary navigation");
}
if (
  !(
    headerCloseIndex >= 0 &&
    headerCloseIndex < previewLauncherIndex
  )
) {
  fail("index.html", "preview launcher must remain outside the site header");
}

const browserScripts = [
  "assets/js/site.js",
  ...seasonalFiles.filter((file) => /\.(?:js|mjs)$/.test(file) && file.startsWith("assets/")),
]
  .map((file) => readFileSync(join(root, file), "utf8"))
  .join("\n");
if (/document\.cookie|\bgtag\s*\(|google-analytics|googletagmanager|facebook\.net\/.*fbevents/i.test(browserScripts)) {
  fail("assets/js", "must not introduce cookies or analytics without consent");
}

for (const file of legacyPages) {
  const html = readFileSync(join(root, file), "utf8");
  if (!/<meta\s+name="robots"\s+content="noindex, follow"/i.test(html)) fail(file, "legacy page must be noindex");
  if (!/<meta\s+http-equiv="refresh"/i.test(html)) fail(file, "legacy page must redirect");
}

const sourceFiles = walk(root).filter((path) => {
  const extension = extname(path).toLowerCase();
  return [".html", ".shtml", ".css", ".js", ".mjs", ".xml", ".txt"].includes(extension);
});

for (const path of sourceFiles) {
  const relative = path.slice(root.length + 1);
  if (relative.startsWith("tmp/")) continue;
  const content = readFileSync(path, "utf8");
  if (/api[_-]?key\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|password\s*[:=]/i.test(content)) {
    fail(relative, "contains a possible committed secret");
  }
}

const cname = readFileSync(join(root, "CNAME"), "utf8").trim();
if (cname !== "connorhohlen.com") fail("CNAME", "must contain connorhohlen.com");

const ogSize = statSync(join(root, "assets/images/og-card.png")).size;
if (ogSize > 1_000_000) fail("assets/images/og-card.png", "social card should remain below 1 MB");

for (const asset of seasonalFiles.filter((file) => file.startsWith("assets/images/seasonal/"))) {
  if (statSync(join(root, asset)).size > 500_000) fail(asset, "seasonal image should remain below 500 KB");
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Validated ${publicPages.length} public pages, ${legacyPages.length} redirects, ${seasonalEventIds.length} seasonal scenes, local assets, metadata, privacy rules, and deployment files.`,
);
