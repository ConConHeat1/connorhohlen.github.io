import assert from "node:assert/strict";
import test from "node:test";

const eventIds = [
  "new-year",
  "valentines-day",
  "st-patricks-day",
  "easter",
  "earth-day",
  "mothers-day",
  "fathers-day",
  "independence-day",
  "halloween",
  "thanksgiving",
  "christmas",
];

class FakeStyle {
  setProperty(name, value) {
    this[name] = String(value);
  }

  removeProperty(name) {
    delete this[name];
  }
}

class FakeClassList {
  #values = new Set();

  add(...values) {
    values.filter(Boolean).forEach((value) => this.#values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.#values.delete(value));
  }

  contains(value) {
    return this.#values.has(value);
  }
}

class FakeElement {
  constructor(tagName, ownerDocument, context2d = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.context2d = context2d;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.style = new FakeStyle();
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.width = 0;
    this.height = 0;
  }

  append(...children) {
    children.forEach((child) => {
      child.parentNode = this;
      this.children.push(child);
    });
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const isMatch = (element) => {
      if (selector === "*") return true;
      if (selector.startsWith(".")) return element.classList.contains(selector.slice(1));
      const dataMatch = selector.match(/^\[data-([a-z0-9-]+)(?:="([^"]+)")?\]$/);
      if (!dataMatch) return false;
      const key = dataMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (!Object.hasOwn(element.dataset, key)) return false;
      return dataMatch[2] === undefined || element.dataset[key] === dataMatch[2];
    };
    const visit = (element) => {
      element.children.forEach((child) => {
        if (isMatch(child)) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(name, listener, options = {}) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push({ listener, once: options.once === true });
    this.listeners.set(name, listeners);
  }

  dispatch(name) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.forEach(({ listener }) => listener({ type: name, target: this }));
    this.listeners.set(name, listeners.filter(({ once }) => !once));
  }

  getBoundingClientRect() {
    return { width: 1440, height: 900 };
  }

  getContext() {
    return this.context2d;
  }
}

function createContext2d() {
  const gradient = () => ({ addColorStop() {} });
  const context = {
    globalAlpha: 1,
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {},
    fillRect() {},
    translate() {},
    rotate() {},
    scale() {},
    setLineDash() {},
    createLinearGradient: gradient,
    createRadialGradient: gradient,
  };
  return context;
}

function createRecordingContext2d() {
  const calls = {
    arc: [],
    ellipse: [],
    lineTo: [],
    bezierCurveTo: [],
    fillStyles: [],
    radialGradients: 0,
    radialGradientArgs: [],
    linearGradients: 0,
  };
  const context = createContext2d();
  context.arc = (...args) => calls.arc.push(args);
  context.ellipse = (...args) => calls.ellipse.push(args);
  context.lineTo = (...args) => calls.lineTo.push(args);
  context.bezierCurveTo = (...args) => calls.bezierCurveTo.push(args);
  context.fill = () => calls.fillStyles.push(context.fillStyle);
  context.createRadialGradient = (...args) => {
    calls.radialGradients += 1;
    calls.radialGradientArgs.push(args);
    return { addColorStop() {} };
  };
  context.createLinearGradient = () => {
    calls.linearGradients += 1;
    return { addColorStop() {} };
  };
  context.resetCalls = () => {
    calls.arc.length = 0;
    calls.ellipse.length = 0;
    calls.lineTo.length = 0;
    calls.bezierCurveTo.length = 0;
    calls.fillStyles.length = 0;
    calls.radialGradients = 0;
    calls.radialGradientArgs.length = 0;
    calls.linearGradients = 0;
  };
  return { context, calls };
}

async function withMockedRandom(value, callback) {
  const originalRandom = Math.random;
  Math.random = typeof value === "function" ? value : () => value;
  try {
    return await callback();
  } finally {
    Math.random = originalRandom;
  }
}

function createDom(context2d = createContext2d()) {
  const listeners = new Map();
  const documentRef = {
    visibilityState: "visible",
    documentElement: { dataset: { theme: "slate" } },
    defaultView: {
      Image: class {
        set src(value) {
          this.currentSrc = value;
          this.onload?.();
        }
      },
    },
    createElement(tagName) {
      return new FakeElement(tagName, documentRef, tagName === "canvas" ? context2d : null);
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    dispatch(name) {
      listeners.get(name)?.();
    },
  };
  return { documentRef, context2d };
}

function createSceneContext(theme = "slate") {
  const { documentRef, context2d } = createDom();
  documentRef.documentElement.dataset.theme = theme;
  const propLayer = documentRef.createElement("div");
  const veil = documentRef.createElement("div");
  return {
    context2d,
    propLayer,
    veil,
    sceneContext: {
      propLayer,
      veil,
      event: Object.freeze({ id: "test-event" }),
      getTheme: () => theme,
      getSize: () => ({ width: 1440, height: 900, dpr: 1 }),
      setVeilOpacity(value) {
        veil.style.setProperty("--seasonal-veil-opacity", value);
      },
    },
  };
}

test("all eleven scene lifecycles render across themes at desktop and mobile sizes", async (t) => {
  for (const eventId of eventIds) {
    await t.test(eventId, async () => {
      const module = await import(`../assets/js/seasonal/scenes/${eventId}.mjs`);
      assert.equal(typeof module.default, "function");

      for (const theme of ["dark", "slate", "light"]) {
        for (const [width, height] of [
          [1440, 900],
          [390, 844],
        ]) {
          const { context2d, propLayer, sceneContext } = createSceneContext(theme);
          const scene = module.default(sceneContext);
          assert.equal(typeof scene, "object");
          assert.equal(typeof scene.destroy, "function");

          scene.resize?.(width, height);
          scene.renderStatic?.(context2d, width, height);
          scene.update?.(1 / 60, 1);
          scene.draw?.(context2d, width, height, 1);
          scene.destroy();

          assert.equal(
            propLayer.querySelectorAll("[data-seasonal-prop]").length,
            0,
            `${eventId} must remove mounted props on destroy in ${theme} at ${width}px`,
          );
        }
      }
    });
  }
});

test("fireworks use refined density, paired timing, alternating regions, and a three-burst cap", async (t) => {
  const expectations = {
    "new-year": ["#f8d477", "#78e7ff", "#fff7e7", "#b996ff", "#ff8eae"],
    "independence-day": ["#e94b5f", "#fff4df", "#3468d4", "#72c8ff", "#f2c45f"],
  };

  for (const [eventId, palette] of Object.entries(expectations)) {
    await t.test(eventId, async () => {
      const module = await import(`../assets/js/seasonal/scenes/${eventId}.mjs`);

      await withMockedRandom(0.5, async () => {
        const { context, calls } = createRecordingContext2d();
        const { sceneContext } = createSceneContext();
        const scene = module.default(sceneContext);
        scene.resize(1440, 900);
        scene.update(0.26);
        scene.draw(context);

        assert.equal(calls.arc.length, 42, "desktop bursts contain 42 particles");
        assert.equal(new Set(calls.fillStyles).size, 2, "each explosion mixes exactly two colors");
        const xValues = calls.arc.map(([x]) => x);
        assert.ok(Math.max(...xValues) - Math.min(...xValues) > 35, "burst opens at a visible radius");

        context.resetCalls();
        scene.update(1.2);
        scene.draw(context);
        assert.ok(
          calls.arc.length >= 42 && calls.arc.length <= 84,
          "particles remain visible while the next restrained burst begins",
        );
        scene.destroy();
      });

      await withMockedRandom(0, async () => {
        const { context, calls } = createRecordingContext2d();
        const { sceneContext } = createSceneContext();
        const scene = module.default(sceneContext);
        scene.resize(1440, 900);
        scene.update(0.09);
        scene.update(0.18);
        scene.update(0.85);
        scene.draw(context);
        assert.equal(calls.arc.length, 126, "a paired launch can build to three simultaneous bursts");
        const centers = [0, 1, 2].map((burstIndex) => {
          const points = calls.arc.slice(burstIndex * 42, burstIndex * 42 + 42);
          return points.reduce((sum, [x]) => sum + x, 0) / points.length;
        });
        assert.ok(centers[0] < 1440 * 0.4, "the first burst launches in the left outer region");
        assert.ok(centers[1] > 1440 * 0.6, "the paired burst alternates to the right outer region");
        assert.ok(centers[2] < 1440 * 0.4, "the next burst alternates back to the left");
        context.resetCalls();
        scene.update(0.01);
        scene.draw(context);
        assert.ok(calls.arc.length <= 126, "no more than three bursts overlap");
        scene.destroy();
      });

      await withMockedRandom(0.5, async () => {
        const { context, calls } = createRecordingContext2d();
        const { sceneContext } = createSceneContext();
        const scene = module.default(sceneContext);
        scene.resize(390, 844);
        scene.update(0.26);
        scene.draw(context);
        assert.equal(calls.arc.length, 28, "mobile bursts contain 28 particles");
        scene.destroy();
      });

      const observedPalette = new Set();
      for (const randomValue of [0, 0.21, 0.41, 0.61, 0.81]) {
        await withMockedRandom(randomValue, async () => {
          const { context, calls } = createRecordingContext2d();
          const { sceneContext } = createSceneContext();
          const scene = module.default(sceneContext);
          scene.resize(1440, 900);
          scene.update(0.3);
          scene.draw(context);
          calls.fillStyles.forEach((color) => observedPalette.add(color));
          scene.destroy();
        });
      }
      assert.deepEqual([...observedPalette].sort(), [...palette].sort());
    });
  }
});

test("Valentine quotas and Christmas snowflake ratio stay exact on both breakpoints", async () => {
  const valentinesModule = await import("../assets/js/seasonal/scenes/valentines-day.mjs");
  const christmasModule = await import("../assets/js/seasonal/scenes/christmas.mjs");

  for (const [width, height, heartCount, petalCount, dotCount, crystalCount] of [
    [1440, 900, 32, 12, 103, 12],
    [390, 844, 19, 7, 56, 6],
  ]) {
    await withMockedRandom(0.5, async () => {
      const valentinesRecorder = createRecordingContext2d();
      const valentinesContext = createSceneContext();
      const valentines = valentinesModule.default(valentinesContext.sceneContext);
      valentines.resize(width, height);
      valentines.draw(valentinesRecorder.context);
      assert.equal(
        valentinesRecorder.calls.bezierCurveTo.length,
        heartCount * 2,
        `${width}px Valentine scene has ${heartCount} hearts`,
      );
      assert.equal(
        valentinesRecorder.calls.ellipse.length,
        petalCount,
        `${width}px Valentine scene has ${petalCount} petals`,
      );
      valentines.destroy();

      const christmasRecorder = createRecordingContext2d();
      const christmasContext = createSceneContext();
      const christmas = christmasModule.default(christmasContext.sceneContext);
      christmas.resize(width, height);
      christmas.draw(christmasRecorder.context);
      assert.equal(christmasRecorder.calls.arc.length, dotCount);
      assert.equal(
        christmasRecorder.calls.lineTo.length,
        crystalCount * 30,
        `${width}px snow includes ${crystalCount} six-armed branched flakes`,
      );
      christmas.destroy();
    });
  }
});

test("Easter, flowers, camping, and pumpkins expose the refined scene structures", async (t) => {
  await t.test("Easter hopping ground contact, shadow, and egg patterns", async () => {
    const module = await import("../assets/js/seasonal/scenes/easter.mjs");
    const { propLayer, sceneContext } = createSceneContext();
    const scene = module.default(sceneContext);
    scene.resize(1440, 900);
    const bunny = propLayer.querySelector(".seasonal-bunny");
    assert.ok(bunny);
    assert.equal(propLayer.querySelectorAll(".seasonal-bunny-shadow").length, 1);
    const eggs = propLayer.querySelectorAll(".seasonal-egg");
    assert.equal(eggs.length, 6);
    assert.deepEqual(eggs.map((egg) => egg.dataset.pattern), [
      "stripes",
      "dots",
      "chevron",
      "chevron",
      "dots",
      "stripes",
    ]);
    const expectedGround = Math.max(10, 900 * 0.024);
    scene.update(0.5);
    const airborneBottom = Number.parseFloat(bunny.style.bottom);
    assert.ok(airborneBottom > expectedGround + 20, "the rabbit follows a visible hop arc");
    scene.update(0.52);
    assert.ok(
      Math.abs(Number.parseFloat(bunny.style.bottom) - expectedGround) < 1,
      "the rabbit returns to the ground between hops",
    );
    scene.destroy();
  });

  await t.test("Mother's Day draws individual swaying flowers", async () => {
    const module = await import("../assets/js/seasonal/scenes/mothers-day.mjs");
    const { propLayer, sceneContext } = createSceneContext();
    const scene = module.default(sceneContext);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower-bed").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower").length, 18);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower__stem").length, 18);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower__bloom").length, 18);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower__petal").length, 90);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower__leaf").length, 36);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower__leaf--upper").length, 18);
    assert.equal(propLayer.querySelectorAll(".seasonal-flower__leaf--lower").length, 18);
    const loweredCenters = propLayer.querySelectorAll("[data-lower-center]");
    assert.equal(loweredCenters.length, 2, "only the middle pink flower in each bed is adjusted");
    loweredCenters.forEach((flower) => assert.equal(flower.style["--flower-x"], "39%"));
    scene.destroy();
  });

  await t.test("Father's Day contains a complete camping-night scene", async () => {
    const module = await import("../assets/js/seasonal/scenes/fathers-day.mjs");
    const recorder = createRecordingContext2d();
    const { propLayer, sceneContext } = createSceneContext();
    const scene = module.default(sceneContext);
    scene.resize(1440, 900);
    scene.draw(recorder.context, 1440, 900, 1);
    assert.equal(propLayer.querySelectorAll(".seasonal-campsite").length, 1);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-forest").length, 1);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-tree").length, 7);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-tree--left").length, 4);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-tent").length, 1);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-tent__panel").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-tent__guyline").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-camp-tent__stake").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-campfire").length, 1);
    const smokeWisps = propLayer.querySelectorAll(".seasonal-campfire__smoke-wisp");
    assert.equal(smokeWisps.length, 7);
    assert.equal(
      new Set(smokeWisps.map((wisp) => wisp.style["--smoke-duration"])).size,
      7,
      "the smoke stream uses seven independently timed wisps",
    );
    assert.ok(smokeWisps.some((wisp) => Number.parseFloat(wisp.style["--smoke-drift"]) < 0));
    assert.ok(smokeWisps.some((wisp) => Number.parseFloat(wisp.style["--smoke-drift"]) > 0));
    smokeWisps.forEach((wisp) => {
      assert.ok(
        Math.abs(Number.parseFloat(wisp.style["--smoke-mobile-drift"])) <
          Math.abs(Number.parseFloat(wisp.style["--smoke-drift"])),
        "mobile smoke keeps a narrower horizontal spread",
      );
    });
    assert.equal(recorder.calls.arc.length, 56, "desktop night contains 32 stars and 24 fireflies");
    assert.equal(recorder.calls.radialGradients, 24);
    const fireflyX = recorder.calls.radialGradientArgs.map(([x]) => x);
    assert.ok(Math.min(...fireflyX) < 1440 * 0.2);
    assert.ok(Math.max(...fireflyX) > 1440 * 0.8);
    scene.destroy();

    const mobileRecorder = createRecordingContext2d();
    const mobileContext = createSceneContext();
    const mobileScene = module.default(mobileContext.sceneContext);
    mobileScene.resize(390, 844);
    mobileScene.draw(mobileRecorder.context, 390, 844, 1);
    assert.equal(mobileRecorder.calls.arc.length, 32, "mobile night contains 18 stars and 14 fireflies");
    assert.equal(mobileRecorder.calls.radialGradients, 14);
    mobileScene.destroy();
  });

  await t.test("Halloween has one consistent face on each pumpkin", async () => {
    const module = await import("../assets/js/seasonal/scenes/halloween.mjs");
    const { propLayer, sceneContext } = createSceneContext();
    const scene = module.default(sceneContext);
    const pumpkins = propLayer.querySelectorAll(".seasonal-pumpkin");
    assert.equal(pumpkins.length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-pumpkin__shell").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-pumpkin__lobe").length, 10);
    assert.equal(propLayer.querySelectorAll(".seasonal-pumpkin__vine").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-pumpkin__face").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-pumpkin__eye").length, 4);
    assert.equal(propLayer.querySelectorAll(".seasonal-pumpkin__mouth").length, 2);
    pumpkins.forEach((pumpkin) => {
      assert.equal(pumpkin.querySelectorAll(".seasonal-pumpkin__face").length, 1);
      assert.equal(pumpkin.style.background, undefined, "no conflicting inline face override");
    });
    scene.destroy();
  });
});

test("Thanksgiving turkey runs in, pauses, turns back, waits, and fails cleanly", async () => {
  const module = await import("../assets/js/seasonal/scenes/thanksgiving.mjs");
  await withMockedRandom(0.5, async () => {
    const { propLayer, sceneContext } = createSceneContext();
    const scene = module.default(sceneContext);
    scene.resize(1440, 900);
    const turkey = propLayer.querySelector(".seasonal-turkey");
    assert.ok(turkey);
    assert.equal(propLayer.querySelectorAll(".seasonal-wheat").length, 2);
    assert.equal(propLayer.querySelectorAll(".seasonal-wheat__stalk").length, 16);
    assert.equal(
      propLayer.querySelectorAll(".seasonal-wheat__grain").length,
      94,
      "each foreground crop cluster has eight varied, grain-heavy stalks",
    );
    assert.equal(turkey.style.opacity, "0");

    scene.update(4.6, 4.6);
    const readPose = () => ({
      x: Number.parseFloat(turkey.style.left),
      lift: Number(turkey.style.transform.match(/translate3d\(-50%, ([-+0-9.e]+)px/)?.[1]),
      pitch: Number(turkey.style.transform.match(/rotate\(([-+0-9.e]+)deg\)/)?.[1]),
      scaleX: Number(turkey.style.transform.match(/scaleX\(([-+0-9.e]+)\)/)?.[1]),
      scaleY: Number(turkey.style.transform.match(/scaleY\(([-+0-9.e]+)\)/)?.[1]),
    });
    const enteringPoses = [];
    for (let index = 0; index < 12; index += 1) {
      scene.update(0.2, 4.8 + index * 0.2);
      enteringPoses.push(readPose());
    }
    assert.equal(turkey.style.opacity, "1", "the turkey runs into view");
    const enteringDirection = Math.sign(enteringPoses.at(-1).scaleX);
    assert.ok(
      enteringPoses.slice(1).every((pose, index) => (
        enteringDirection > 0
          ? pose.x >= enteringPoses[index].x
          : pose.x <= enteringPoses[index].x
      )),
      "entrance travel remains monotonic beneath the stride gait",
    );
    const enteringLifts = enteringPoses.map((pose) => pose.lift);
    const enteringPitches = enteringPoses.map((pose) => pose.pitch);
    const enteringScaleY = enteringPoses.map((pose) => pose.scaleY);
    assert.ok(Math.min(...enteringLifts) < -8, "the run includes a visible airborne bounce");
    assert.ok(Math.max(...enteringLifts) - Math.min(...enteringLifts) > 6);
    assert.ok(Math.max(...enteringPitches) - Math.min(...enteringPitches) > 3);
    assert.ok(Math.min(...enteringScaleY) < 0.98, "footfalls gently compress the body");
    assert.ok(Math.max(...enteringScaleY) > 1, "airborne strides slightly lengthen the body");
    scene.update(0.4, 7.4);
    assert.equal(turkey.style.opacity, "0.86", "the turkey begins its roughly two-second pause");
    scene.update(1.5, 7.5);
    assert.equal(turkey.style.opacity, "0.86", "the turkey pauses for roughly two seconds");
    scene.update(0.7, 9.7);
    const exitingPoses = [];
    for (let index = 0; index < 10; index += 1) {
      scene.update(0.2, 9.9 + index * 0.2);
      exitingPoses.push(readPose());
    }
    const exitingDirection = Math.sign(exitingPoses[0].scaleX);
    assert.equal(exitingDirection, -enteringDirection, "the turkey turns around");
    assert.ok(
      exitingPoses.slice(1).every((pose, index) => (
        exitingDirection > 0
          ? pose.x >= exitingPoses[index].x
          : pose.x <= exitingPoses[index].x
      )),
      "exit travel stays monotonic while the turkey bounces",
    );
    assert.ok(Math.min(...exitingPoses.map((pose) => pose.lift)) < -8);
    scene.update(0.7, 12.4);
    assert.equal(turkey.style.opacity, "0", "the turkey returns offscreen");
    scene.destroy();
    assert.equal(propLayer.querySelectorAll("[data-seasonal-prop]").length, 0);
  });

  const { propLayer, sceneContext } = createSceneContext();
  const scene = module.default(sceneContext);
  const missingTurkey = propLayer.querySelector(".seasonal-turkey");
  missingTurkey.dispatch("error");
  assert.equal(propLayer.querySelector(".seasonal-turkey"), null, "a failed asset is removed cleanly");
  scene.resize(390, 844);
  scene.update(1, 1);
  scene.destroy();
});

test("Christmas Santa follows a broad arc with repeated gentle bobs and pitch changes", async () => {
  const module = await import("../assets/js/seasonal/scenes/christmas.mjs");
  await withMockedRandom(0.5, async () => {
    const { propLayer, sceneContext } = createSceneContext();
    const scene = module.default(sceneContext);
    scene.resize(1440, 900);
    const santa = propLayer.querySelector(".seasonal-santa");
    assert.ok(santa);

    scene.update(1.81);
    const tops = [];
    const pitches = [];
    for (let index = 0; index < 18; index += 1) {
      scene.update(0.5);
      tops.push(Number.parseFloat(santa.style.top));
      pitches.push(Number(santa.style.transform.match(/rotate\(([-0-9.]+)deg\)/)?.[1]));
    }

    const topDeltas = tops.slice(1).map((top, index) => top - tops[index]);
    const slopeChanges = topDeltas.slice(1).filter((delta, index) => (
      Math.sign(delta) !== Math.sign(topDeltas[index])
    )).length;
    assert.ok(slopeChanges >= 3, "several vertical bobs are layered over the broad route arc");
    assert.ok(
      Math.max(...pitches) - Math.min(...pitches) > 1.5,
      "small pitch changes accompany the vertical motion",
    );
    assert.ok(tops.every(Number.isFinite));
    scene.destroy();
  });
});

test("engine loads, pauses, resumes, disables, and destroys a scene", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const { documentRef, context2d } = createDom();
  const windowListeners = new Map();
  let nextFrameId = 0;
  const requestedFrames = new Set();

  globalThis.document = documentRef;
  globalThis.window = {
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 3,
    addEventListener(name, listener) {
      windowListeners.set(name, listener);
    },
    removeEventListener(name, listener) {
      if (windowListeners.get(name) === listener) windowListeners.delete(name);
    },
  };
  globalThis.requestAnimationFrame = () => {
    const id = ++nextFrameId;
    requestedFrames.add(id);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => requestedFrames.delete(id);

  try {
    const { createSeasonalEngine } = await import("../assets/js/seasonal/engine.mjs");
    const canvas = new FakeElement("canvas", documentRef, context2d);
    const propLayer = documentRef.createElement("div");
    const veil = documentRef.createElement("div");
    const engine = createSeasonalEngine({
      canvas,
      propLayer,
      veil,
      getTheme: () => "slate",
    });

    engine.setEnabled(false);
    assert.equal(await engine.load({ id: "fathers-day" }), true);
    assert.equal(canvas.hidden, true);
    assert.equal(requestedFrames.size, 0);

    engine.setEnabled(true);
    assert.equal(canvas.hidden, false);
    assert.equal(canvas.width, 2880, "device-pixel ratio is capped at two");
    assert.equal(requestedFrames.size, 1);

    engine.pause();
    assert.equal(requestedFrames.size, 0);
    engine.resume();
    assert.equal(requestedFrames.size, 1);

    documentRef.visibilityState = "hidden";
    documentRef.dispatch("visibilitychange");
    assert.equal(requestedFrames.size, 0);
    assert.equal(
      propLayer.querySelector(".seasonal-campfire__flame").style.animationPlayState,
      "paused",
      "descendant CSS animations pause with the tab",
    );
    documentRef.visibilityState = "visible";
    documentRef.dispatch("visibilitychange");
    assert.equal(requestedFrames.size, 1);
    assert.equal(
      propLayer.querySelector(".seasonal-campfire__flame").style.animationPlayState,
      "",
      "descendant CSS animations resume with the tab",
    );

    assert.equal(await engine.load({ id: "not-an-event" }), false);
    assert.equal(propLayer.querySelectorAll("[data-seasonal-prop]").length, 0);
    engine.destroy();
    assert.equal(requestedFrames.size, 0);
    assert.equal(windowListeners.size, 0);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  }
});
