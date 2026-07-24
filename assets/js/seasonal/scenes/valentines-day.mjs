import {
  drawHeart,
  drawPetal,
  isCompact,
  makeDrifter,
  random,
  themeIsLight,
  updateDrifters,
} from "./shared.mjs";

const COLORS = ["#ff6688", "#ff91aa", "#e94b76", "#ffc1cf"];
const OPTIONS = {
  minSpeed: 14,
  maxSpeed: 38,
  minDrift: -10,
  maxDrift: 10,
  minSize: 7,
  maxSize: 19,
  minSpin: -0.55,
  maxSpin: 0.55,
  minAlpha: 0.18,
  maxAlpha: 0.48,
  kinds: ["heart", "heart", "petal"],
  colors: COLORS,
  sway: 10,
  margin: 48,
  preserveKind: true,
};

export default function createScene(context) {
  let width = 1;
  let height = 1;
  let particles = [];
  context.setVeilOpacity?.(themeIsLight(context) ? 0.08 : 0.12);

  function reconcileKind(kind, target) {
    const matching = particles.filter((particle) => particle.kind === kind).slice(0, target);
    while (matching.length < target) {
      matching.push(makeDrifter(width, height, { ...OPTIONS, kinds: [kind] }));
    }
    return matching;
  }

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const compact = isCompact(width);
    particles = [
      ...reconcileKind("heart", compact ? 19 : 32),
      ...reconcileKind("petal", compact ? 7 : 12),
    ];
  }

  function update(delta) {
    updateDrifters(particles, delta, width, height, OPTIONS);
  }

  function drawParticle(ctx, particle) {
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    if (particle.kind === "petal") {
      drawPetal(ctx, particle.x, particle.y, particle.size * 0.7, particle.rotation, particle.color);
    } else {
      drawHeart(ctx, particle.x, particle.y, particle.size, particle.rotation);
    }
  }

  function draw(ctx) {
    ctx.save();
    particles.forEach((particle) => drawParticle(ctx, particle));
    ctx.restore();
  }

  function renderStatic(ctx, nextWidth, nextHeight) {
    resize(nextWidth, nextHeight);
    ctx.save();
    [
      [nextWidth * 0.08, nextHeight * 0.22, 17, -0.2],
      [nextWidth * 0.91, nextHeight * 0.35, 13, 0.25],
      [nextWidth * 0.15, nextHeight * 0.72, 10, 0.4],
      [nextWidth * 0.86, nextHeight * 0.78, 19, -0.35],
    ].forEach(([x, y, size, rotation], index) => {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = COLORS[index % COLORS.length];
      drawHeart(ctx, x, y, size, rotation);
    });
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic,
    destroy() {
      particles = [];
    },
  };
}
