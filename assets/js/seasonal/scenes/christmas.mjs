import {
  ASSETS,
  TAU,
  clamp,
  isCompact,
  mountImageProp,
  random,
  themeIsLight,
} from "./shared.mjs";

function makeSnowParticle(width, height, initial = true, kind = "dot") {
  const depth = random(0.35, 1);
  return {
    kind,
    x: random(0, width),
    y: initial ? random(0, height) : random(-40, -8),
    radius: kind === "crystal"
      ? random(4.2, 7.2) * (0.7 + depth * 0.3)
      : random(0.8, 2.7) * depth,
    speed: random(20, 58) * depth,
    drift: random(-12, 12),
    alpha: random(0.25, 0.72) * (0.55 + depth * 0.45),
    phase: random(0, TAU),
    rotation: random(0, TAU),
    spin: kind === "crystal" ? random(-0.2, 0.2) : 0,
  };
}

function drawSnowCrystal(ctx, flake) {
  const radius = flake.radius;
  ctx.save();
  ctx.translate(flake.x, flake.y);
  ctx.rotate(flake.rotation);
  ctx.beginPath();
  for (let arm = 0; arm < 6; arm += 1) {
    const angle = (arm / 6) * TAU;
    const axisX = Math.cos(angle);
    const axisY = Math.sin(angle);
    const sideX = -axisY;
    const sideY = axisX;
    ctx.moveTo(0, 0);
    ctx.lineTo(axisX * radius, axisY * radius);
    [0.56, 0.78].forEach((branchPoint) => {
      const baseX = axisX * radius * branchPoint;
      const baseY = axisY * radius * branchPoint;
      const branchReach = radius * (branchPoint === 0.56 ? 0.18 : 0.14);
      const branchBack = radius * 0.14;
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(
        baseX - axisX * branchBack + sideX * branchReach,
        baseY - axisY * branchBack + sideY * branchReach,
      );
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(
        baseX - axisX * branchBack - sideX * branchReach,
        baseY - axisY * branchBack - sideY * branchReach,
      );
    });
  }
  ctx.stroke();
  ctx.restore();
}

export default function createScene(context) {
  const santa = mountImageProp(context, ASSETS.santa, "seasonal-santa");
  let width = 1;
  let height = 1;
  let elapsed = 0;
  let snow = [];
  let waitUntilPass = 1.8;
  let pass = null;
  let direction = 1;
  context.setVeilOpacity?.(themeIsLight(context) ? 0.08 : 0.13);

  function startSantaPass() {
    const duration = random(10, 13.5);
    pass = {
      elapsed: 0,
      duration,
      y: random(0.13, 0.38),
      angle: random(-4.5, 4.5),
      bobCount: random(3.4, 4.8),
      bobPhase: random(0, TAU),
      bobAmplitude: random(0.009, 0.016),
      direction,
    };
    direction *= -1;
  }

  function positionSanta() {
    if (!santa) return;
    const heroWidth = isCompact(width)
      ? clamp(width * 0.54, 190, 300)
      : clamp(width * 0.3, 330, 520);
    santa.style.width = `${heroWidth}px`;
    if (!pass) {
      santa.style.opacity = "0";
      return;
    }
    const progress = clamp(pass.elapsed / pass.duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const xPercent = pass.direction > 0 ? -28 + eased * 156 : 128 - eased * 156;
    const motionEnvelope = Math.sin(progress * Math.PI);
    const bounceWave = Math.sin(progress * TAU * pass.bobCount + pass.bobPhase);
    const arc = motionEnvelope * -height * 0.06;
    const bounce = bounceWave * height * pass.bobAmplitude * motionEnvelope;
    const pitch = pass.angle + bounceWave * 1.35 * motionEnvelope;
    santa.style.left = `${xPercent}%`;
    santa.style.top = `${pass.y * height + arc + bounce}px`;
    santa.style.opacity = String(clamp(motionEnvelope * 3));
    santa.style.transform =
      `translate3d(-50%, -50%, 0) rotate(${pitch}deg) scaleX(${pass.direction})`;
  }

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const target = isCompact(width) ? 62 : 115;
    const crystalTarget = Math.round(target * 0.1);
    const reconcile = (kind, count) => {
      const matching = snow.filter((flake) => flake.kind === kind).slice(0, count);
      while (matching.length < count) {
        matching.push(makeSnowParticle(width, height, true, kind));
      }
      return matching;
    };
    snow = [
      ...reconcile("dot", target - crystalTarget),
      ...reconcile("crystal", crystalTarget),
    ];
    positionSanta();
  }

  function update(delta) {
    elapsed += delta;
    snow.forEach((flake, index) => {
      flake.phase += delta * 0.75;
      flake.y += flake.speed * delta;
      flake.x += (flake.drift + Math.sin(flake.phase) * 8) * delta;
      flake.rotation += flake.spin * delta;
      if (flake.y > height + 10) {
        snow[index] = makeSnowParticle(width, height, false, flake.kind);
      }
      if (flake.x < -12) flake.x = width + 10;
      if (flake.x > width + 12) flake.x = -10;
    });

    if (pass) {
      pass.elapsed += delta;
      if (pass.elapsed >= pass.duration) {
        const priorDuration = pass.duration;
        pass = null;
        waitUntilPass = random(35, 55) - priorDuration;
      }
    } else {
      waitUntilPass -= delta;
      if (waitUntilPass <= 0) startSantaPass();
    }
    positionSanta();
  }

  function draw(ctx) {
    ctx.save();
    snow.forEach((flake) => {
      ctx.globalAlpha = flake.alpha * (themeIsLight(context) ? 0.62 : 1);
      const color = themeIsLight(context) ? "#b7d6e6" : "#f2fbff";
      if (flake.kind === "crystal") {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(0.65, flake.radius * 0.12);
        ctx.lineCap = "round";
        drawSnowCrystal(ctx, flake);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, TAU);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  return {
    resize,
    update,
    draw,
    renderStatic(ctx, nextWidth, nextHeight) {
      resize(nextWidth, nextHeight);
      if (santa) {
        santa.style.left = "72%";
        santa.style.top = `${height * 0.22}px`;
        santa.style.opacity = "0.8";
        santa.style.transform = "translate3d(-50%, -50%, 0)";
      }
      draw(ctx);
    },
    destroy() {
      snow = [];
      santa?.remove();
    },
  };
}
