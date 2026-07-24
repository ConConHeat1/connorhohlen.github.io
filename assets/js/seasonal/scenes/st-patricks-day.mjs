import {
  TAU,
  drawShamrock,
  isCompact,
  makeDrifter,
  mountDecorativeProp,
  themeIsLight,
  updateDrifters,
} from "./shared.mjs";

const OPTIONS = {
  minSpeed: 13,
  maxSpeed: 32,
  minSize: 6,
  maxSize: 16,
  minAlpha: 0.2,
  maxAlpha: 0.52,
  minSpin: -0.6,
  maxSpin: 0.6,
  colors: ["#1fa864", "#42c979", "#0b7d49"],
  kinds: ["shamrock", "shamrock", "gold"],
  sway: 7,
  margin: 44,
};

export default function createScene(context) {
  const rainbow = mountDecorativeProp(context, "seasonal-rainbow");
  let width = 1;
  let height = 1;
  let particles = [];
  context.setVeilOpacity?.(themeIsLight(context) ? 0.07 : 0.11);

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const count = isCompact(width) ? 18 : 32;
    while (particles.length < count) particles.push(makeDrifter(width, height, OPTIONS));
    particles.length = count;
  }

  function update(delta) {
    updateDrifters(particles, delta, width, height, OPTIONS);
  }

  function draw(ctx) {
    ctx.save();
    particles.forEach((particle) => {
      ctx.globalAlpha = particle.alpha;
      if (particle.kind === "gold") {
        ctx.fillStyle = "#f5c84c";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.22, 0, TAU);
        ctx.fill();
      } else {
        drawShamrock(
          ctx,
          particle.x,
          particle.y,
          particle.size,
          particle.rotation,
          particle.color,
        );
      }
    });
    ctx.restore();
  }

  function renderStatic(ctx, nextWidth, nextHeight) {
    resize(nextWidth, nextHeight);
    ctx.save();
    ctx.globalAlpha = 0.3;
    drawShamrock(ctx, width * 0.09, height * 0.26, 15, -0.2, "#1fa864");
    drawShamrock(ctx, width * 0.9, height * 0.68, 20, 0.25, "#42c979");
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic,
    destroy() {
      particles = [];
      rainbow?.remove();
    },
  };
}
