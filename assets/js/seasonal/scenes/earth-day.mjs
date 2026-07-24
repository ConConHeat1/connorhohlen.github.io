import {
  ASSETS,
  TAU,
  clamp,
  isCompact,
  mountProp,
  random,
  themeIsLight,
} from "./shared.mjs";

export default function createScene(context) {
  const documentRef = context.propLayer?.ownerDocument;
  const earth = documentRef?.createElement("div") || null;
  const shade = documentRef?.createElement("span") || null;
  const attribution = documentRef?.createElement("span") || null;
  let width = 1;
  let height = 1;
  let rotation = 0;
  let assetReady = false;

  if (earth) {
    earth.style.backgroundImage = `url("${ASSETS.earth}")`;
    earth.style.backgroundRepeat = "repeat-x";
    earth.style.backgroundSize = "200% 100%";
    earth.style.backgroundPosition = "0% center";
    earth.style.borderRadius = "50%";
    earth.style.overflow = "hidden";
    earth.style.opacity = "0";
    earth.style.boxShadow =
      "inset -28px 0 42px rgba(0,0,0,.58), inset 10px 0 24px rgba(93,194,255,.18), 0 0 34px rgba(76,178,255,.2)";
    mountProp(context, earth, "seasonal-earth");
  }

  if (shade && earth) {
    shade.className = "seasonal-earth-shade";
    shade.setAttribute("aria-hidden", "true");
    shade.style.position = "absolute";
    shade.style.inset = "0";
    shade.style.borderRadius = "inherit";
    shade.style.background =
      "radial-gradient(circle at 31% 36%, rgba(255,255,255,.13), transparent 33%), linear-gradient(90deg, transparent 42%, rgba(0,0,0,.52) 100%)";
    earth.append(shade);
  }

  if (attribution) {
    attribution.textContent = "Earth imagery: NASA/GSFC";
    mountProp(context, attribution, "seasonal-earth-attribution");
  }

  const ImageConstructor = documentRef?.defaultView?.Image;
  const preloader = ImageConstructor ? new ImageConstructor() : null;
  if (preloader) {
    preloader.decoding = "async";
    preloader.onload = () => {
      assetReady = true;
      if (earth) earth.style.opacity = "0.82";
    };
    preloader.onerror = () => {
      earth?.remove();
      attribution?.remove();
    };
    preloader.src = ASSETS.earth;
  }

  const stars = Array.from({ length: 56 }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: random(0.35, 1.35),
    alpha: random(0.12, 0.52),
    phase: random(0, TAU),
  }));
  context.setVeilOpacity?.(themeIsLight(context) ? 0.09 : 0.14);

  function sizeEarth() {
    if (!earth) return;
    const diameter = isCompact(width)
      ? clamp(Math.min(width * 0.76, height * 0.46), 220, 390)
      : clamp(Math.min(width * 0.51, height * 0.74), 360, 760);
    earth.style.width = `${diameter}px`;
    earth.style.height = `${diameter}px`;
    earth.style.left = isCompact(width) ? `${-diameter * 0.18}px` : `${-diameter * 0.13}px`;
    earth.style.top = isCompact(width) ? `${height * 0.49}px` : "50%";
    earth.style.transform = "translate3d(0, -50%, 0) rotate(-8deg)";
    if (attribution) {
      attribution.style.left = "12px";
      attribution.style.bottom = "10px";
    }
  }

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    sizeEarth();
  }

  function update(delta) {
    rotation = (rotation + delta * 1.6) % 100;
    if (earth && assetReady) earth.style.backgroundPosition = `${rotation}% center`;
  }

  function draw(ctx, nextWidth, nextHeight, time) {
    width = nextWidth;
    height = nextHeight;
    ctx.save();
    stars.forEach((star) => {
      const alpha = star.alpha * (0.75 + Math.sin(time * 0.55 + star.phase) * 0.25);
      ctx.globalAlpha = alpha * (themeIsLight(context) ? 0.45 : 1);
      ctx.fillStyle = themeIsLight(context) ? "#337399" : "#d8f1ff";
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.radius, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function renderStatic(ctx, nextWidth, nextHeight) {
    resize(nextWidth, nextHeight);
    draw(ctx, nextWidth, nextHeight, 0);
  }

  return {
    resize,
    update,
    draw,
    renderStatic,
    destroy() {
      if (preloader) {
        preloader.onload = null;
        preloader.onerror = null;
      }
      earth?.remove();
      attribution?.remove();
    },
  };
}
