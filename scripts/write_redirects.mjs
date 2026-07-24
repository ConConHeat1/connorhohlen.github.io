#!/usr/bin/env node

import { writeFileSync } from "node:fs";

const redirects = {
  "project1.html": ["/projects/portfolio.html", "Portfolio Website"],
  "project2.html": ["/projects/fpv-drone.html", "Custom FPV Drone"],
  "project3.html": ["/#projects", "Featured Projects"],
  "project4.html": ["/#projects", "Featured Projects"],
  "project5.html": ["/#projects", "Featured Projects"],
  "project6.html": ["/#projects", "Featured Projects"],
  "project7.html": ["/#projects", "Featured Projects"],
  "project8.html": ["/#projects", "Featured Projects"],
  "workspace1.html": ["/#experience", "Professional Experience"],
  "workspace2.html": ["/#experience", "Professional Experience"],
  "college.html": ["/#education", "Education"],
  "highschool.html": ["/#education", "Education"],
  "404.shtml": ["/404.html", "Page Not Found"],
};

function absoluteUrl(target) {
  if (target === "/404.html") return "https://connorhohlen.com/404.html";
  return `https://connorhohlen.com${target}`;
}

for (const [file, [target, label]] of Object.entries(redirects)) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <meta http-equiv="refresh" content="0; url=${target}">
  <title>${label} | Connor Hohlen</title>
  <link rel="canonical" href="${absoluteUrl(target)}">
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #070b10; color: #f4f8fb; font: 1rem/1.6 system-ui, sans-serif; }
    main { width: min(36rem, calc(100% - 2rem)); padding: 2rem; border: 1px solid #28404d; border-radius: 1rem; background: #101923; text-align: center; }
    a { color: #8ff5f2; text-underline-offset: 0.2em; }
  </style>
</head>
<body>
  <main>
    <h1>This page has moved.</h1>
    <p>Continue to <a href="${target}">${label}</a>.</p>
  </main>
</body>
</html>
`;
  writeFileSync(file, html);
}

console.log(`Wrote ${Object.keys(redirects).length} legacy redirect pages.`);
