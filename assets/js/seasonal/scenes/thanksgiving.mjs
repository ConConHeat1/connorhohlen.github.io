import {
  ASSETS,
  TAU,
  clamp,
  drawLeaf,
  isCompact,
  lerp,
  makeDrifter,
  mountDecorativeProp,
  mountImageProp,
  random,
  themeIsLight,
  updateDrifters,
} from "./shared.mjs";

const LEAF_COLORS = ["#c86e32", "#d9943e", "#a6502a", "#e2af57", "#8e4930"];
const LEAF_OPTIONS = {
  minSpeed: 15,
  maxSpeed: 40,
  minDrift: -13,
  maxDrift: 13,
  minSize: 9,
  maxSize: 22,
  minAlpha: 0.2,
  maxAlpha: 0.54,
  minSpin: -1.05,
  maxSpin: 1.05,
  colors: LEAF_COLORS,
  sway: 16,
  margin: 46,
};

function createWheatCluster(context, side) {
  const cluster = mountDecorativeProp(context, "seasonal-wheat");
  if (!cluster) return null;
  cluster.classList.add(`seasonal-wheat--${side}`);
  const documentRef = context.propLayer.ownerDocument;

  for (let index = 0; index < 8; index += 1) {
    const stalk = documentRef.createElement("span");
    stalk.classList.add("seasonal-wheat__stalk");
    stalk.style.setProperty("--wheat-left", `${4 + index * 13}%`);
    stalk.style.setProperty("--wheat-height", `${62 + (index % 4) * 11}%`);
    stalk.style.setProperty("--wheat-lean", `${-8 + (index % 5) * 4}deg`);
    stalk.style.setProperty("--wheat-delay", `${-index * 0.34}s`);

    const grainCount = 5 + (index % 3);
    for (let grainIndex = 0; grainIndex < grainCount; grainIndex += 1) {
      const grain = documentRef.createElement("i");
      grain.classList.add("seasonal-wheat__grain");
      grain.style.setProperty("--grain-top", `${4 + grainIndex * 7.4}%`);
      grain.style.setProperty(
        "--grain-offset",
        `${(grainIndex % 2 === 0 ? -1 : 1) * (3 + (grainIndex % 3))}px`,
      );
      grain.style.setProperty("--grain-angle", `${grainIndex % 2 === 0 ? -28 : 28}deg`);
      stalk.append(grain);
    }
    cluster.append(stalk);
  }

  return cluster;
}

export default function createScene(context) {
  const turkey = mountImageProp(context, ASSETS.turkey, "seasonal-turkey");
  const wheatProps = [
    createWheatCluster(context, "left"),
    createWheatCluster(context, "right"),
  ];
  const leafProps = [7, 27, 69, 91].map((left, index) => {
    const leaf = mountDecorativeProp(context, "seasonal-leaf");
    if (!leaf) return null;
    leaf.classList.add("is-falling");
    leaf.style.setProperty("--leaf-x", `${left}%`);
    leaf.style.setProperty("--leaf-color", LEAF_COLORS[index % LEAF_COLORS.length]);
    leaf.style.setProperty("--leaf-delay", `${-index * 2.7}s`);
    leaf.style.setProperty("--leaf-duration", `${11 + index * 1.3}s`);
    leaf.style.setProperty("--leaf-opacity", "0.34");
    return leaf;
  });
  let width = 1;
  let height = 1;
  let leaves = [];
  let turkeySide = Math.random() > 0.5 ? 1 : -1;
  let turkeyPhase = "waiting";
  let turkeyPhaseTime = 0;
  let turkeyWait = random(3, 6);
  context.setVeilOpacity?.(themeIsLight(context) ? 0.07 : 0.11);

  function easeInOut(value) {
    const amount = clamp(value);
    return amount < 0.5
      ? 2 * amount * amount
      : 1 - Math.pow(-2 * amount + 2, 2) / 2;
  }

  function turkeyGeometry() {
    const compact = isCompact(width);
    const offscreenX = turkeySide > 0 ? -0.18 : 1.18;
    const restingX = turkeySide > 0
      ? (compact ? 0.2 : 0.14)
      : (compact ? 0.8 : 0.86);
    return { compact, offscreenX, restingX };
  }

  function setTurkeyTransform(
    x,
    lift,
    direction,
    rotation,
    opacity,
    { stretch = 1, squash = 1 } = {},
  ) {
    if (!turkey) return;
    const { compact } = turkeyGeometry();
    turkey.style.width = `${compact ? clamp(width * 0.36, 118, 156) : clamp(width * 0.15, 175, 235)}px`;
    turkey.style.left = `${x * width}px`;
    turkey.style.bottom = `${Math.max(5, height * (compact ? 0.015 : 0.022))}px`;
    turkey.style.opacity = String(clamp(opacity));
    turkey.style.transform =
      `translate3d(-50%, ${lift}px, 0) rotate(${rotation}deg) ` +
      `scaleX(${direction * stretch}) scaleY(${squash})`;
  }

  function runningPose(progress, direction) {
    const compact = isCompact(width);
    const stridePhase = progress * TAU * 4;
    const airborne = Math.abs(Math.sin(stridePhase));
    const landing = Math.pow(1 - airborne, 4);
    return {
      lift: -airborne * (compact ? 6 : 10),
      rotation: Math.sin(stridePhase) * (compact ? 1.55 : 2.15) + direction * 0.7,
      stretch: 1 + airborne * 0.025 + landing * 0.035,
      squash: 1 + airborne * 0.018 - landing * 0.055,
    };
  }

  function positionTurkey() {
    if (!turkey) return;
    const { offscreenX, restingX } = turkeyGeometry();

    if (turkeyPhase === "waiting") {
      setTurkeyTransform(offscreenX, 0, turkeySide, 0, 0);
      return;
    }

    if (turkeyPhase === "entering") {
      const progress = clamp(turkeyPhaseTime / 2.8);
      const eased = easeInOut(progress);
      const pose = runningPose(progress, turkeySide);
      setTurkeyTransform(
        lerp(offscreenX, restingX, eased),
        pose.lift,
        turkeySide,
        pose.rotation,
        clamp(progress * 4),
        pose,
      );
      return;
    }

    if (turkeyPhase === "pausing") {
      const bob = Math.sin(turkeyPhaseTime * 5.4);
      setTurkeyTransform(restingX, bob * -2.2, turkeySide, bob * 1.1, 0.86);
      return;
    }

    const progress = clamp(turkeyPhaseTime / 2.6);
    const eased = easeInOut(progress);
    const exitDirection = -turkeySide;
    const pose = runningPose(progress, exitDirection);
    setTurkeyTransform(
      lerp(restingX, offscreenX, eased),
      pose.lift,
      exitDirection,
      pose.rotation,
      clamp((1 - progress) * 4),
      pose,
    );
  }

  function advanceTurkey(delta) {
    if (!turkey) return;

    if (turkeyPhase === "waiting") {
      turkeyWait -= delta;
      if (turkeyWait <= 0) {
        turkeyPhase = "entering";
        turkeyPhaseTime = 0;
      }
      positionTurkey();
      return;
    }

    turkeyPhaseTime += delta;
    if (turkeyPhase === "entering" && turkeyPhaseTime >= 2.8) {
      turkeyPhase = "pausing";
      turkeyPhaseTime = 0;
    } else if (turkeyPhase === "pausing" && turkeyPhaseTime >= 2.1) {
      turkeyPhase = "exiting";
      turkeyPhaseTime = 0;
    } else if (turkeyPhase === "exiting" && turkeyPhaseTime >= 2.6) {
      turkeySide = Math.random() > 0.5 ? 1 : -1;
      turkeyPhase = "waiting";
      turkeyPhaseTime = 0;
      turkeyWait = random(20, 35);
    }
    positionTurkey();
  }

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const target = isCompact(width) ? 18 : 31;
    while (leaves.length < target) leaves.push(makeDrifter(width, height, LEAF_OPTIONS));
    leaves.length = target;
    positionTurkey();
  }

  function update(delta, time) {
    updateDrifters(leaves, delta, width, height, LEAF_OPTIONS);
    const gust = Math.max(0, Math.sin(time * 0.24) - 0.82) * 75;
    leaves.forEach((leaf) => {
      leaf.x += gust * delta;
      leaf.rotation += gust * delta * 0.006;
    });
    advanceTurkey(delta);
  }

  function drawWheat(ctx, x, baseY, heightValue, mirror) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(mirror, 1);
    ctx.strokeStyle = "rgba(211, 166, 87, 0.42)";
    ctx.fillStyle = "rgba(225, 181, 99, 0.38)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(heightValue * 0.08, -heightValue * 0.54, heightValue * 0.22, -heightValue);
    ctx.stroke();
    for (let index = 0; index < 7; index += 1) {
      const stemY = -heightValue * (0.45 + index * 0.075);
      const stemX = heightValue * (0.07 + index * 0.02);
      const direction = index % 2 === 0 ? -1 : 1;
      ctx.save();
      ctx.translate(stemX, stemY);
      ctx.rotate(direction * 0.55);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function draw(ctx) {
    ctx.save();
    drawWheat(ctx, 14, height + 3, isCompact(width) ? 92 : 142, 1);
    drawWheat(ctx, width - 14, height + 3, isCompact(width) ? 86 : 132, -1);
    leaves.forEach((leaf) => {
      ctx.globalAlpha = leaf.alpha;
      drawLeaf(ctx, leaf.x, leaf.y, leaf.size, leaf.rotation, leaf.color);
    });
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic(ctx, nextWidth, nextHeight) {
      resize(nextWidth, nextHeight);
      if (turkey) {
        const { restingX } = turkeyGeometry();
        setTurkeyTransform(restingX, 0, turkeySide, 0, 0.82);
      }
      ctx.save();
      drawWheat(ctx, 14, height + 3, isCompact(width) ? 92 : 142, 1);
      drawWheat(ctx, width - 14, height + 3, isCompact(width) ? 86 : 132, -1);
      ctx.globalAlpha = 0.32;
      drawLeaf(ctx, width * 0.1, height * 0.3, 18, -0.4, LEAF_COLORS[0]);
      drawLeaf(ctx, width * 0.91, height * 0.62, 22, 0.65, LEAF_COLORS[3]);
      ctx.restore();
    },
    destroy() {
      leaves = [];
      wheatProps.forEach((wheat) => wheat?.remove());
      leafProps.forEach((leaf) => leaf?.remove());
      turkey?.remove();
    },
  };
}
