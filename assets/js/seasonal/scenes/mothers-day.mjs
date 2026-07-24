import {
  drawPetal,
  isCompact,
  makeDrifter,
  mountDecorativeProp,
  themeIsLight,
  updateDrifters,
} from "./shared.mjs";

const PETAL_OPTIONS = {
  minSpeed: 9,
  maxSpeed: 26,
  minDrift: -8,
  maxDrift: 8,
  minSize: 4,
  maxSize: 9,
  minAlpha: 0.2,
  maxAlpha: 0.48,
  minSpin: -0.7,
  maxSpin: 0.7,
  colors: ["#f7b3c8", "#e9c4f2", "#ffd1db", "#f4d9a8"],
  sway: 11,
  margin: 36,
};

const FLOWERS = [
  { x: 5, height: 7.4, color: "#f7a6c3", delay: -1.2, sway: 1.8 },
  { x: 15, height: 10.2, color: "#f4cf72", delay: -3.8, sway: 2.4 },
  { x: 27, height: 6.5, color: "#c9a2ed", delay: -2.1, sway: 1.5 },
  { x: 39, height: 8.8, color: "#f59bb7", delay: -5.4, sway: 2.1, lowerCenter: true },
  { x: 51, height: 11.4, color: "#e9b7f5", delay: -0.7, sway: 2.8 },
  { x: 64, height: 7.2, color: "#f6d889", delay: -4.5, sway: 1.7 },
  { x: 76, height: 9.5, color: "#f2a7c5", delay: -2.9, sway: 2.3 },
  { x: 88, height: 6.1, color: "#bfa4e8", delay: -6.2, sway: 1.4 },
  { x: 96, height: 8.1, color: "#f3c478", delay: -3.2, sway: 2 },
];

function createFlowerBed(context, side) {
  const bed = mountDecorativeProp(context, "seasonal-flower-bed");
  if (!bed) return null;
  bed.classList.add(`seasonal-flower-bed--${side}`);

  const documentRef = context.propLayer.ownerDocument;
  const specs = side === "right" ? [...FLOWERS].reverse() : FLOWERS;
  specs.forEach((spec, index) => {
    const flower = documentRef.createElement("span");
    const stem = documentRef.createElement("span");
    const bloom = documentRef.createElement("span");
    const upperLeaf = documentRef.createElement("i");
    const lowerLeaf = documentRef.createElement("i");

    flower.classList.add("seasonal-flower");
    stem.classList.add("seasonal-flower__stem");
    bloom.classList.add("seasonal-flower__bloom");
    upperLeaf.classList.add("seasonal-flower__leaf", "seasonal-flower__leaf--upper");
    lowerLeaf.classList.add("seasonal-flower__leaf", "seasonal-flower__leaf--lower");
    flower.style.setProperty("--flower-x", `${spec.x}%`);
    flower.style.setProperty("--flower-height", `${spec.height}rem`);
    flower.style.setProperty("--flower-color", spec.color);
    flower.style.setProperty("--flower-delay", `${spec.delay - (side === "right" ? 0.6 : 0)}s`);
    flower.style.setProperty("--flower-sway", `${spec.sway * (index % 2 ? -1 : 1)}deg`);
    flower.style.setProperty("--flower-sway-start", `${spec.sway * (index % 2 ? 0.65 : -0.65)}deg`);
    if (spec.lowerCenter) flower.dataset.lowerCenter = "";

    for (let petalIndex = 0; petalIndex < 5; petalIndex += 1) {
      const petal = documentRef.createElement("i");
      petal.classList.add("seasonal-flower__petal");
      petal.style.setProperty("--petal-angle", `${petalIndex * 72}deg`);
      bloom.append(petal);
    }

    stem.append(upperLeaf, lowerLeaf);
    flower.append(stem, bloom);
    bed.append(flower);
  });

  return bed;
}

export default function createScene(context) {
  const flowerBeds = [
    createFlowerBed(context, "left"),
    createFlowerBed(context, "right"),
  ];
  let width = 1;
  let height = 1;
  let petals = [];
  context.setVeilOpacity?.(themeIsLight(context) ? 0.07 : 0.1);

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const target = isCompact(width) ? 13 : 22;
    while (petals.length < target) petals.push(makeDrifter(width, height, PETAL_OPTIONS));
    petals.length = target;
  }

  function update(delta) {
    updateDrifters(petals, delta, width, height, PETAL_OPTIONS);
  }

  function draw(ctx, nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    ctx.save();
    petals.forEach((petal) => {
      ctx.globalAlpha = petal.alpha;
      drawPetal(ctx, petal.x, petal.y, petal.size, petal.rotation, petal.color);
    });
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic(ctx, nextWidth, nextHeight) {
      resize(nextWidth, nextHeight);
      draw(ctx, nextWidth, nextHeight);
    },
    destroy() {
      petals = [];
      flowerBeds.forEach((bed) => bed?.remove());
    },
  };
}
