import { TAU, isCompact, mountDecorativeProp, random, themeIsLight } from "./shared.mjs";

function makeBat() {
  return {
    x: random(-0.3, 1),
    y: random(0.09, 0.48),
    speed: random(0.018, 0.042),
    size: random(5, 11),
    phase: random(0, TAU),
  };
}

function createPumpkin(context, side) {
  const pumpkin = mountDecorativeProp(context, "seasonal-pumpkin");
  if (!pumpkin) return null;
  pumpkin.classList.add("is-glowing", `seasonal-pumpkin--${side}`);

  const documentRef = context.propLayer.ownerDocument;
  const shell = documentRef.createElement("span");
  const face = documentRef.createElement("span");
  const leftEye = documentRef.createElement("span");
  const rightEye = documentRef.createElement("span");
  const mouth = documentRef.createElement("span");
  const vine = documentRef.createElement("span");

  shell.classList.add("seasonal-pumpkin__shell");
  ["outer-left", "left", "center", "right", "outer-right"].forEach((lobeName) => {
    const lobe = documentRef.createElement("i");
    lobe.classList.add("seasonal-pumpkin__lobe", `seasonal-pumpkin__lobe--${lobeName}`);
    shell.append(lobe);
  });
  face.classList.add("seasonal-pumpkin__face");
  leftEye.classList.add("seasonal-pumpkin__eye", "seasonal-pumpkin__eye--left");
  rightEye.classList.add("seasonal-pumpkin__eye", "seasonal-pumpkin__eye--right");
  mouth.classList.add("seasonal-pumpkin__mouth");
  vine.classList.add("seasonal-pumpkin__vine");
  face.append(leftEye, rightEye, mouth);
  pumpkin.append(shell, face, vine);
  return pumpkin;
}

export default function createScene(context) {
  const moon = mountDecorativeProp(context, "seasonal-moon");
  const nearFog = mountDecorativeProp(context, "seasonal-fog");
  const farFog = mountDecorativeProp(context, "seasonal-fog");
  if (farFog) farFog.dataset.depth = "far";
  const pumpkins = [
    createPumpkin(context, "left"),
    createPumpkin(context, "right"),
  ];
  let width = 1;
  let height = 1;
  let bats = [];
  context.setVeilOpacity?.(themeIsLight(context) ? 0.1 : 0.14);

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const target = isCompact(width) ? 5 : 9;
    while (bats.length < target) bats.push(makeBat());
    bats.length = target;
  }

  function update(delta) {
    bats.forEach((bat, index) => {
      bat.x += bat.speed * delta;
      if (bat.x > 1.18) bats[index] = { ...makeBat(), x: -0.16 };
    });
  }

  function drawBat(ctx, bat, time) {
    const x = bat.x * width;
    const y = (bat.y + Math.sin(time * 0.5 + bat.phase) * 0.018) * height;
    const flap = Math.sin(time * 8 + bat.phase) * bat.size * 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - bat.size * 0.55, y - bat.size * 0.75 - flap, x - bat.size, y);
    ctx.quadraticCurveTo(x - bat.size * 0.45, y - bat.size * 0.12, x, y + bat.size * 0.3);
    ctx.quadraticCurveTo(x + bat.size * 0.45, y - bat.size * 0.12, x + bat.size, y);
    ctx.quadraticCurveTo(x + bat.size * 0.55, y - bat.size * 0.75 - flap, x, y);
    ctx.fill();
  }

  function draw(ctx, nextWidth, nextHeight, time) {
    width = nextWidth;
    height = nextHeight;
    ctx.save();
    ctx.fillStyle = themeIsLight(context) ? "rgba(43,31,56,.48)" : "rgba(10,7,16,.76)";
    bats.forEach((bat) => drawBat(ctx, bat, time));
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic(ctx, nextWidth, nextHeight) {
      resize(nextWidth, nextHeight);
      draw(ctx, nextWidth, nextHeight, 0);
    },
    destroy() {
      bats = [];
      moon?.remove();
      nearFog?.remove();
      farFog?.remove();
      pumpkins.forEach((pumpkin) => pumpkin?.remove());
    },
  };
}
