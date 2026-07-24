export const ASSETS = Object.freeze({
  santa: "/assets/images/seasonal/santa-sleigh.webp",
  bunny: "/assets/images/seasonal/bunny.webp",
  earth: "/assets/images/seasonal/earth-blue-marble.webp",
  turkey: "/assets/images/seasonal/turkey-running.webp",
});

export const TAU = Math.PI * 2;

export function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function random(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

export function randomItem(values) {
  return values[Math.floor(Math.random() * values.length)];
}

export function smoothstep(value) {
  const amount = clamp(value);
  return amount * amount * (3 - 2 * amount);
}

export function isCompact(width) {
  return width < 720;
}

export function themeIsLight(context) {
  return context.getTheme?.() === "light";
}

export function mountProp(context, element, className) {
  if (!element || !context.propLayer) return element;
  element.classList.add("seasonal-prop", className);
  element.dataset.seasonalProp = "";
  element.setAttribute("aria-hidden", "true");
  context.propLayer.append(element);
  return element;
}

export function mountImageProp(context, source, className) {
  if (!context.propLayer) return null;
  const image = context.propLayer.ownerDocument.createElement("img");
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;
  image.src = source;
  image.addEventListener(
    "error",
    () => {
      image.classList.add("is-missing");
      image.remove();
    },
    { once: true },
  );
  return mountProp(context, image, className);
}

export function mountDecorativeProp(context, className, tagName = "div") {
  if (!context.propLayer) return null;
  const element = context.propLayer.ownerDocument.createElement(tagName);
  return mountProp(context, element, className);
}

export function removeProp(element) {
  element?.remove();
}

export function makeDrifter(width, height, options = {}) {
  const margin = options.margin ?? 24;
  return {
    x: random(-margin, width + margin),
    y: random(-height, height),
    speed: random(options.minSpeed ?? 18, options.maxSpeed ?? 45),
    drift: random(options.minDrift ?? -12, options.maxDrift ?? 12),
    size: random(options.minSize ?? 5, options.maxSize ?? 14),
    rotation: random(0, TAU),
    spin: random(options.minSpin ?? -0.7, options.maxSpin ?? 0.7),
    alpha: random(options.minAlpha ?? 0.25, options.maxAlpha ?? 0.7),
    phase: random(0, TAU),
    kind: options.kinds ? randomItem(options.kinds) : "particle",
    color: options.colors ? randomItem(options.colors) : "#ffffff",
  };
}

export function recycleDrifter(particle, width, height, options = {}) {
  if (particle.y <= height + (options.margin ?? 40)) return;
  const kind = particle.kind;
  Object.assign(particle, makeDrifter(width, height, options), {
    y: random(-(options.margin ?? 40) * 2, -(options.margin ?? 40)),
  });
  if (options.preserveKind) particle.kind = kind;
}

export function updateDrifters(particles, delta, width, height, options = {}) {
  particles.forEach((particle) => {
    particle.phase += delta * 0.8;
    particle.y += particle.speed * delta;
    particle.x +=
      (particle.drift + Math.sin(particle.phase) * (options.sway ?? 8)) * delta;
    particle.rotation += particle.spin * delta;
    if (particle.x < -60) particle.x = width + 50;
    if (particle.x > width + 60) particle.x = -50;
    recycleDrifter(particle, width, height, options);
  });
}

export function drawHeart(ctx, x, y, size, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size / 30, size / 30);
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.bezierCurveTo(-21, -5, -14, -22, 0, -12);
  ctx.bezierCurveTo(14, -22, 21, -5, 0, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawLeaf(ctx, x, y, length, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-length * 0.5, 0);
  ctx.quadraticCurveTo(0, -length * 0.42, length * 0.55, 0);
  ctx.quadraticCurveTo(0, length * 0.36, -length * 0.5, 0);
  ctx.fill();
  ctx.strokeStyle = "rgba(91, 48, 16, 0.35)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-length * 0.35, 0);
  ctx.lineTo(length * 0.42, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawShamrock(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  [[0, -0.35], [-0.32, 0], [0.32, 0]].forEach(([offsetX, offsetY]) => {
    ctx.beginPath();
    ctx.arc(offsetX * size, offsetY * size, size * 0.34, 0, TAU);
    ctx.fill();
  });
  ctx.fillRect(-size * 0.06, size * 0.12, size * 0.12, size * 0.62);
  ctx.restore();
}

export function drawPetal(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.42, size, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawPaperPlane(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.045);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-size * 0.55, -size * 0.18);
  ctx.lineTo(size * 0.58, 0);
  ctx.lineTo(-size * 0.42, size * 0.3);
  ctx.lineTo(-size * 0.14, 0.04);
  ctx.closePath();
  ctx.globalAlpha *= 0.17;
  ctx.fill();
  ctx.globalAlpha *= 5.88;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-size * 0.14, 0.04);
  ctx.lineTo(size * 0.58, 0);
  ctx.stroke();
  ctx.restore();
}

function createBurst(width, height, palette, compact, side) {
  const x = side
    ? random(width * 0.68, width * 0.95)
    : random(width * 0.05, width * 0.32);
  const y = random(height * 0.12, height * 0.48);
  const count = compact ? 28 : 42;
  const primaryColor = randomItem(palette);
  const remainingColors = palette.filter((color) => color !== primaryColor);
  const secondaryColor = randomItem(remainingColors.length ? remainingColors : palette);
  const particles = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * TAU + random(-0.035, 0.035);
    const speed = random(compact ? 58 : 72, compact ? 104 : 126);
    const maxLife = random(1.35, 1.75);
    return {
      x,
      y,
      previousX: x,
      previousY: y,
      trail: [{ x, y }],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      color: index % 3 === 0 ? secondaryColor : primaryColor,
      size: random(compact ? 1.15 : 1.25, compact ? 2.25 : 2.55),
    };
  });
  return {
    particles,
    colors: [primaryColor, secondaryColor],
  };
}

export function createFireworksScene(context, options) {
  let width = 1;
  let height = 1;
  let bursts = [];
  let launchTimer = random(0.08, 0.25);
  let nextSide = Math.random() > 0.5 ? 1 : 0;
  let nextLaunchIsPair = false;
  const palette = options.colors;

  context.setVeilOpacity?.(themeIsLight(context) ? 0.08 : 0.13);

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
  }

  function update(delta) {
    launchTimer -= delta;
    if (launchTimer <= 0 && bursts.length < (options.maxBursts ?? 3)) {
      bursts.push(createBurst(width, height, palette, isCompact(width), nextSide));
      nextSide = nextSide ? 0 : 1;
      if (!nextLaunchIsPair && Math.random() < (options.pairChance ?? 0.34)) {
        nextLaunchIsPair = true;
        launchTimer = random(options.minPairDelay ?? 0.18, options.maxPairDelay ?? 0.35);
      } else {
        nextLaunchIsPair = false;
        launchTimer = random(options.minInterval ?? 0.85, options.maxInterval ?? 1.45);
      }
    }

    bursts.forEach((burst) => {
      burst.particles.forEach((particle) => {
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= Math.max(0, 1 - delta * 0.38);
        particle.vy += 28 * delta;
        particle.life -= delta;
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > 10) particle.trail.shift();
      });
      burst.particles = burst.particles.filter((particle) => particle.life > 0);
    });
    bursts = bursts.filter((burst) => burst.particles.length > 0);
  }

  function draw(ctx) {
    ctx.save();
    ctx.lineCap = "round";
    bursts.forEach((burst) => {
      burst.particles.forEach((particle) => {
        const lifeRatio = clamp(particle.life / particle.maxLife);
        const opacity = Math.sqrt(lifeRatio) * 0.76;
        particle.trail.forEach((point, index) => {
          if (index === 0) return;
          const prior = particle.trail[index - 1];
          ctx.globalAlpha = opacity * (index / particle.trail.length) * 0.58;
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = particle.size * (0.45 + index / particle.trail.length * 0.55);
          ctx.beginPath();
          ctx.moveTo(prior.x, prior.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        });
        ctx.globalAlpha = opacity;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.9, 0, TAU);
        ctx.fill();
      });
    });
    ctx.restore();
  }

  function renderStatic(ctx, nextWidth, nextHeight) {
    const locations = [
      [nextWidth * 0.16, nextHeight * 0.27, 38],
      [nextWidth * 0.84, nextHeight * 0.19, 26],
    ];
    ctx.save();
    ctx.lineWidth = 1.25;
    locations.forEach(([x, y, radius], locationIndex) => {
      ctx.globalAlpha = 0.28;
      for (let index = 0; index < 24; index += 1) {
        const angle = (index / 24) * TAU;
        ctx.strokeStyle = palette[
          (locationIndex + (index % 3 === 0 ? 1 : 0)) % palette.length
        ];
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * radius * 0.35, y + Math.sin(angle) * radius * 0.35);
        ctx.lineTo(x + Math.cos(angle) * radius * 1.18, y + Math.sin(angle) * radius * 1.18);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic,
    destroy() {
      bursts = [];
    },
  };
}
