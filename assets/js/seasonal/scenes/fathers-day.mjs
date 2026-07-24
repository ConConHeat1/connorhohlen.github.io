import {
  TAU,
  isCompact,
  mountDecorativeProp,
  random,
  themeIsLight,
} from "./shared.mjs";

function appendElement(documentRef, parent, className, tagName = "span") {
  const element = documentRef.createElement(tagName);
  element.classList.add(...className.split(/\s+/).filter(Boolean));
  parent.append(element);
  return element;
}

function createCampsite(context) {
  const campsite = mountDecorativeProp(context, "seasonal-campsite");
  if (!campsite) return null;

  const documentRef = context.propLayer.ownerDocument;
  const forest = mountDecorativeProp(context, "seasonal-camp-forest");
  if (forest) {
    [
      { left: 0, height: 7.2, scale: 0.72, opacity: 0.5 },
      { left: 18, height: 10.4, scale: 0.92, opacity: 0.7 },
      { left: 42, height: 8.6, scale: 0.8, opacity: 0.58 },
      { left: 68, height: 11.3, scale: 1, opacity: 0.76 },
    ].forEach((spec, index) => {
      const tree = appendElement(documentRef, forest, "seasonal-camp-tree");
      tree.classList.add("seasonal-camp-tree--left");
      tree.style.setProperty("--camp-tree-left", `${spec.left}%`);
      tree.style.setProperty("--camp-tree-height", `${spec.height}rem`);
      tree.style.setProperty("--camp-tree-scale", String(spec.scale));
      tree.style.setProperty("--camp-tree-opacity", String(spec.opacity));
      tree.style.setProperty("--camp-tree-depth", String(index));
    });
  }

  const trees = appendElement(documentRef, campsite, "seasonal-camp-trees");
  ["far", "middle", "near"].forEach((depth) => {
    const tree = appendElement(documentRef, trees, "seasonal-camp-tree");
    tree.classList.add(`seasonal-camp-tree--${depth}`);
  });

  const tent = appendElement(documentRef, campsite, "seasonal-camp-tent", "div");
  const canopy = appendElement(documentRef, tent, "seasonal-camp-tent__canopy");
  appendElement(documentRef, canopy, "seasonal-camp-tent__panel seasonal-camp-tent__panel--left");
  appendElement(documentRef, canopy, "seasonal-camp-tent__panel seasonal-camp-tent__panel--right");
  appendElement(documentRef, canopy, "seasonal-camp-tent__door");
  appendElement(documentRef, tent, "seasonal-camp-tent__ridge");
  appendElement(documentRef, tent, "seasonal-camp-tent__guyline seasonal-camp-tent__guyline--left");
  appendElement(documentRef, tent, "seasonal-camp-tent__guyline seasonal-camp-tent__guyline--right");
  appendElement(documentRef, tent, "seasonal-camp-tent__stake seasonal-camp-tent__stake--left");
  appendElement(documentRef, tent, "seasonal-camp-tent__stake seasonal-camp-tent__stake--right");

  const fire = appendElement(documentRef, campsite, "seasonal-campfire", "div");
  appendElement(documentRef, fire, "seasonal-campfire__glow");
  const smoke = appendElement(documentRef, fire, "seasonal-campfire__smoke");
  const smokeSpecs = [
    { size: 0.86, duration: 7.1, delay: 0, drift: -3.2, start: -0.35, blur: 0.2 },
    { size: 1.08, duration: 8.4, delay: -1.15, drift: 2.5, start: 0.3, blur: 0.24 },
    { size: 0.94, duration: 7.7, delay: -2.3, drift: -1.8, start: 0.05, blur: 0.22 },
    { size: 1.2, duration: 9.1, delay: -3.45, drift: 3.6, start: -0.2, blur: 0.28 },
    { size: 0.82, duration: 7.4, delay: -4.6, drift: -2.6, start: 0.4, blur: 0.19 },
    { size: 1.12, duration: 8.8, delay: -5.75, drift: 1.9, start: -0.45, blur: 0.26 },
    { size: 0.98, duration: 8, delay: -6.9, drift: -3.8, start: 0.18, blur: 0.23 },
  ];
  smokeSpecs.forEach((spec, index) => {
    const wisp = appendElement(documentRef, smoke, "seasonal-campfire__smoke-wisp");
    wisp.style.setProperty("--smoke-index", String(index));
    wisp.style.setProperty("--smoke-delay", `${spec.delay}s`);
    wisp.style.setProperty("--smoke-duration", `${spec.duration}s`);
    wisp.style.setProperty("--smoke-size", `${spec.size}rem`);
    wisp.style.setProperty("--smoke-drift", `${spec.drift}rem`);
    wisp.style.setProperty("--smoke-mobile-drift", `${spec.drift * 0.52}rem`);
    wisp.style.setProperty("--smoke-start", `${spec.start}rem`);
    wisp.style.setProperty("--smoke-blur", `${spec.blur}rem`);
  });
  appendElement(documentRef, fire, "seasonal-campfire__log");
  appendElement(documentRef, fire, "seasonal-campfire__log");
  const flame = appendElement(documentRef, fire, "seasonal-campfire__flame");
  appendElement(documentRef, flame, "seasonal-campfire__flame-core");

  return { campsite, forest };
}

function makeStar() {
  return {
    x: random(0.03, 0.97),
    y: random(0.04, 0.58),
    size: random(0.55, 1.55),
    alpha: random(0.18, 0.54),
    phase: random(0, TAU),
  };
}

function makeFirefly(compact, index, total) {
  const column = (index + 0.5) / total;
  return {
    x: Math.min(0.96, Math.max(0.04, column + random(-0.035, 0.035))),
    y: random(compact ? 0.25 : 0.18, 0.92),
    baseX: 0,
    baseY: 0,
    size: random(1.5, 3.1),
    phase: random(0, TAU),
    drift: random(0.25, 0.58),
  };
}

export default function createScene(context) {
  const campsite = createCampsite(context);
  let width = 1;
  let height = 1;
  let elapsed = 0;
  let stars = [];
  let fireflies = [];
  let fireflyLayout = "";
  context.setVeilOpacity?.(themeIsLight(context) ? 0.1 : 0.13);

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const compact = isCompact(width);
    const starTarget = compact ? 18 : 32;
    const fireflyTarget = compact ? 14 : 24;
    while (stars.length < starTarget) stars.push(makeStar());
    stars.length = starTarget;
    const nextLayout = compact ? "compact" : "desktop";
    if (fireflies.length !== fireflyTarget || fireflyLayout !== nextLayout) {
      fireflies = Array.from({ length: fireflyTarget }, (_, index) => {
        const firefly = makeFirefly(compact, index, fireflyTarget);
        firefly.baseX = firefly.x;
        firefly.baseY = firefly.y;
        return firefly;
      });
      fireflyLayout = nextLayout;
    }
  }

  function update(delta) {
    elapsed += delta;
    fireflies.forEach((firefly) => {
      firefly.x =
        firefly.baseX +
        Math.sin(elapsed * firefly.drift + firefly.phase) * 0.025 +
        Math.sin(elapsed * 0.21 + firefly.phase) * 0.012;
      firefly.y =
        firefly.baseY +
        Math.cos(elapsed * firefly.drift * 0.78 + firefly.phase) * 0.022;
    });
  }

  function drawNight(ctx, time) {
    const night = ctx.createLinearGradient(width, 0, width * 0.42, height);
    night.addColorStop(0, themeIsLight(context) ? "rgba(33, 62, 88, 0.12)" : "rgba(7, 23, 42, 0.2)");
    night.addColorStop(0.64, "rgba(20, 54, 70, 0.045)");
    night.addColorStop(1, "rgba(214, 133, 66, 0.035)");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    stars.forEach((star) => {
      const twinkle = 0.7 + Math.sin(time * 0.75 + star.phase) * 0.3;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = "#e8f3ff";
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.size, 0, TAU);
      ctx.fill();
    });

    fireflies.forEach((firefly) => {
      const pulse = 0.5 + Math.sin(time * 1.6 + firefly.phase) * 0.5;
      const x = firefly.x * width;
      const y = firefly.y * height;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, firefly.size * 5);
      glow.addColorStop(0, `rgba(255, 221, 119, ${0.68 * pulse})`);
      glow.addColorStop(0.22, `rgba(255, 185, 72, ${0.32 * pulse})`);
      glow.addColorStop(1, "rgba(255, 158, 57, 0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, firefly.size * 5, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  return {
    resize,
    update,
    draw(ctx, nextWidth, nextHeight, time) {
      width = nextWidth;
      height = nextHeight;
      drawNight(ctx, time);
    },
    renderStatic(ctx, nextWidth, nextHeight) {
      resize(nextWidth, nextHeight);
      drawNight(ctx, 1.4);
    },
    destroy() {
      stars = [];
      fireflies = [];
      campsite?.campsite.remove();
      campsite?.forest?.remove();
    },
  };
}
