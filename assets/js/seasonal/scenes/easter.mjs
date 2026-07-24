import {
  ASSETS,
  clamp,
  drawPetal,
  isCompact,
  makeDrifter,
  mountDecorativeProp,
  mountImageProp,
  themeIsLight,
  updateDrifters,
} from "./shared.mjs";

const PASTELS = ["#f4a8c2", "#a9d7f5", "#c8b0ef", "#f4d47b", "#a8dfbd"];
const EGG_PATTERNS = ["stripes", "dots", "chevron"];
const HOP_COUNT = 6;
const HOP_PERIOD = 1.38;
const AIR_TIME = 1.02;
const ACTIVE_DURATION = HOP_COUNT * HOP_PERIOD;
const CYCLE_DURATION = 18;
const PETAL_OPTIONS = {
  minSpeed: 12,
  maxSpeed: 31,
  minSize: 4,
  maxSize: 10,
  minAlpha: 0.22,
  maxAlpha: 0.5,
  minSpin: -0.9,
  maxSpin: 0.9,
  colors: ["#f6bdcf", "#f7dce6", "#dca6ca"],
  sway: 12,
  margin: 40,
};

export default function createScene(context) {
  const bunny = mountImageProp(context, ASSETS.bunny, "seasonal-bunny");
  const shadow = mountDecorativeProp(context, "seasonal-bunny-shadow");
  const eggs = [4, 10, 17, 83, 91, 97].map((left, index) => {
    const egg = mountDecorativeProp(context, "seasonal-egg");
    if (!egg) return null;
    egg.style.left = `${left}%`;
    egg.style.bottom = `${9 + (index % 3) * 8}px`;
    egg.style.setProperty("--egg-color", PASTELS[index % PASTELS.length]);
    egg.style.setProperty("--egg-angle", `${-14 + index * 6}deg`);
    egg.style.opacity = String(0.52 + (index % 2) * 0.1);
    egg.dataset.pattern = EGG_PATTERNS[index < 3 ? index : 5 - index];
    return egg;
  });
  let width = 1;
  let height = 1;
  let elapsed = 1.4;
  let petals = [];
  context.setVeilOpacity?.(themeIsLight(context) ? 0.07 : 0.1);

  function positionBunny(time = elapsed) {
    if (!bunny) return;

    const cycle = time % CYCLE_DURATION;
    const active = cycle < ACTIVE_DURATION;
    const hopIndex = Math.min(HOP_COUNT - 1, Math.floor(cycle / HOP_PERIOD));
    const localTime = cycle - hopIndex * HOP_PERIOD;
    const flightProgress = clamp(localTime / AIR_TIME);
    const overallProgress = clamp((hopIndex + flightProgress) / HOP_COUNT);
    const fromLeft = Math.floor(time / CYCLE_DURATION) % 2 === 0;
    const directionalProgress = fromLeft ? overallProgress : 1 - overallProgress;
    const percent = -13 + directionalProgress * 126;
    const airborne = localTime < AIR_TIME ? Math.sin(flightProgress * Math.PI) : 0;
    const landingProgress =
      localTime >= AIR_TIME ? clamp((localTime - AIR_TIME) / (HOP_PERIOD - AIR_TIME)) : 0;
    const landingPulse = Math.sin(landingProgress * Math.PI);
    const jumpHeight = isCompact(width) ? 34 : 55;
    const ground = Math.max(10, height * 0.024);
    const scaleX = 1 + landingPulse * 0.08;
    const scaleY = 1 - landingPulse * 0.13;
    const rotation = airborne * (fromLeft ? 2.2 : -2.2);
    const edgeFade = clamp(Math.min(cycle / 0.65, (ACTIVE_DURATION - cycle) / 0.7));
    const opacity = active ? edgeFade * 0.86 : 0;
    const bunnyWidth = isCompact(width) ? clamp(width * 0.3, 98, 132) : 154;

    bunny.style.width = `${bunnyWidth}px`;
    bunny.style.left = `${percent}%`;
    bunny.style.bottom = `${ground + airborne * jumpHeight}px`;
    bunny.style.opacity = String(opacity);
    bunny.style.transform =
      `translate3d(-50%, 0, 0) rotate(${rotation}deg) ` +
      `scaleX(${(fromLeft ? 1 : -1) * scaleX}) scaleY(${scaleY})`;

    if (shadow) {
      shadow.style.left = `${percent}%`;
      shadow.style.bottom = `${ground - 2}px`;
      shadow.style.width = `${bunnyWidth * (0.72 - airborne * 0.28)}px`;
      shadow.style.opacity = String(opacity * (0.38 - airborne * 0.2));
      shadow.style.transform = "translateX(-50%)";
    }
  }

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const target = isCompact(width) ? 13 : 23;
    while (petals.length < target) petals.push(makeDrifter(width, height, PETAL_OPTIONS));
    petals.length = target;
    positionBunny();
  }

  function update(delta) {
    elapsed += delta;
    updateDrifters(petals, delta, width, height, PETAL_OPTIONS);
    positionBunny();
  }

  function draw(ctx) {
    ctx.save();
    petals.forEach((petal) => {
      ctx.globalAlpha = petal.alpha;
      drawPetal(ctx, petal.x, petal.y, petal.size, petal.rotation, petal.color);
    });
    ctx.restore();
  }

  function renderStatic(ctx, nextWidth, nextHeight) {
    resize(nextWidth, nextHeight);
    positionBunny(HOP_PERIOD * 2 + AIR_TIME * 0.5);
    draw(ctx);
  }

  return {
    resize,
    update,
    draw,
    renderStatic,
    destroy() {
      petals = [];
      bunny?.remove();
      shadow?.remove();
      eggs.forEach((egg) => egg?.remove());
    },
  };
}
