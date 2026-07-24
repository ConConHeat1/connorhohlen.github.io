# Connor Hohlen Portfolio

A lightweight static engineering portfolio for [connorhohlen.com](https://connorhohlen.com), built with semantic HTML, shared CSS, and a small amount of JavaScript.

## Preview locally

From the project folder:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Preview seasonal occasions

The home page activates seasonal scenes automatically on their visitor-local dates. For private testing, open:

```text
http://127.0.0.1:4173/?event-preview=auto
```

The preview tray can switch among the ordinary page and all eleven occasions. Use its minimize button to tuck it away, then reopen it with the fixed **Scene tester** button. Its selection stays in the URL and is never saved as a visitor preference.

## Validate

```bash
node --check assets/js/site.js
find assets/js/seasonal -name "*.mjs" -print0 | xargs -0 -n1 node --check
node --test scripts/seasonal-*.test.mjs
node scripts/validate-site.mjs
npx --yes html-validate@10.11.1 "*.html" "projects/*.html"
```

## Seasonal image credit

The Earth Day scene uses NASA/Goddard Space Flight Center Scientific Visualization Studio’s Blue Marble mosaic. The source data is courtesy of Reto Stockli (NASA/GSFC) and NASA’s Earth Observatory. Character artwork for the other scenes is original and stored locally with the site.

## Regenerate the public résumé

The generator intentionally excludes a street address and phone number.

```bash
python3 -m pip install reportlab
python3 scripts/generate_resume.py
```

After regenerating the PDF, render its first page to `assets/images/resume-preview.png` before deployment.

## Deploy

This repository is designed for GitHub Pages:

1. Confirm `CNAME` still contains `connorhohlen.com`.
2. Preview and validate every public page locally.
3. Commit the updated static files in the actual Git clone.
4. Push the commit to the `main` branch of `ConConHeat1/connorhohlen.github.io`.
5. Wait for GitHub Pages to publish, then verify the custom domain, HTTPS, the résumé download, and each case-study URL.
