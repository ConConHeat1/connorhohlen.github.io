const SCENE_LOADERS = Object.freeze({
  "new-year": () => import("./scenes/new-year.mjs"),
  "valentines-day": () => import("./scenes/valentines-day.mjs"),
  "st-patricks-day": () => import("./scenes/st-patricks-day.mjs"),
  easter: () => import("./scenes/easter.mjs"),
  "earth-day": () => import("./scenes/earth-day.mjs"),
  "mothers-day": () => import("./scenes/mothers-day.mjs"),
  "fathers-day": () => import("./scenes/fathers-day.mjs"),
  "independence-day": () => import("./scenes/independence-day.mjs"),
  halloween: () => import("./scenes/halloween.mjs"),
  thanksgiving: () => import("./scenes/thanksgiving.mjs"),
  christmas: () => import("./scenes/christmas.mjs"),
});

const MAX_DELTA_SECONDS = 0.05;
const MAX_DPR = 2;

/**
 * Creates the single animation owner for the seasonal layer.
 *
 * Scene modules deliberately do not schedule animation frames. They receive
 * CSS-pixel dimensions and are driven exclusively by this engine.
 */
export function createSeasonalEngine({ canvas, propLayer, veil, getTheme } = {}) {
  if (!canvas || typeof canvas.getContext !== "function") {
    throw new TypeError("createSeasonalEngine requires a canvas element.");
  }

  const context2d = canvas.getContext("2d", { alpha: true });
  if (!context2d) {
    throw new Error("This browser does not support the Canvas 2D seasonal layer.");
  }

  let activeScene = null;
  let activeEvent = null;
  let enabled = true;
  let manuallyPaused = false;
  let generation = 0;
  let frameRequest = 0;
  let previousTime = 0;
  let elapsedTime = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let destroyed = false;

  const safeTheme = () => {
    try {
      return getTheme?.() || document.documentElement.dataset.theme || "slate";
    } catch {
      return "slate";
    }
  };

  function clearCanvas() {
    context2d.save();
    context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    context2d.clearRect(0, 0, width, height);
    context2d.restore();
  }

  function removeMountedProps() {
    propLayer?.querySelectorAll("[data-seasonal-prop]").forEach((element) => element.remove());
  }

  function setLayerVisibility(visible) {
    canvas.hidden = !visible;
    if (propLayer) propLayer.hidden = !visible;
    if (veil) veil.hidden = !visible;
  }

  function setPropAnimationsPaused(paused) {
    propLayer?.querySelectorAll("[data-seasonal-prop]").forEach((element) => {
      [element, ...element.querySelectorAll("*")].forEach((animatedElement) => {
        animatedElement.style.animationPlayState = paused ? "paused" : "";
      });
    });
  }

  function canAnimate() {
    return Boolean(
      !destroyed &&
        enabled &&
        activeScene &&
        !manuallyPaused &&
        document.visibilityState !== "hidden",
    );
  }

  function cancelFrame() {
    if (!frameRequest) return;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  }

  function drawFrame(timeSeconds) {
    if (!activeScene) return;
    clearCanvas();
    context2d.save();
    context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    activeScene.draw?.(context2d, width, height, timeSeconds);
    context2d.restore();
  }

  function renderStaticFrame() {
    if (!activeScene || !enabled) {
      clearCanvas();
      return;
    }

    clearCanvas();
    context2d.save();
    context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (typeof activeScene.renderStatic === "function") {
      activeScene.renderStatic(context2d, width, height);
    } else {
      activeScene.draw?.(context2d, width, height, elapsedTime);
    }
    context2d.restore();
  }

  function tick(now) {
    frameRequest = 0;
    if (!canAnimate()) return;

    const nowSeconds = now / 1000;
    const delta = previousTime
      ? Math.min(Math.max(nowSeconds - previousTime, 0), MAX_DELTA_SECONDS)
      : 0;
    previousTime = nowSeconds;
    elapsedTime += delta;

    activeScene.update?.(delta, elapsedTime);
    drawFrame(elapsedTime);
    frameRequest = requestAnimationFrame(tick);
  }

  function startFrameLoop() {
    cancelFrame();
    previousTime = 0;
    if (canAnimate()) frameRequest = requestAnimationFrame(tick);
  }

  function teardownScene() {
    cancelFrame();
    const sceneToDestroy = activeScene;
    activeScene = null;
    activeEvent = null;
    try {
      sceneToDestroy?.destroy?.();
    } finally {
      removeMountedProps();
      clearCanvas();
      if (veil) {
        veil.style.removeProperty("--seasonal-veil-opacity");
        delete veil.dataset.seasonalEvent;
      }
      delete canvas.dataset.seasonalEvent;
      if (propLayer) delete propLayer.dataset.seasonalEvent;
      setLayerVisibility(false);
    }
  }

  function resize() {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width || window.innerWidth || 1));
    height = Math.max(1, Math.round(bounds.height || window.innerHeight || 1));
    dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DPR);

    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    activeScene?.resize?.(width, height);
    if (activeScene && enabled) renderStaticFrame();
  }

  async function load(eventConfig) {
    if (destroyed) return false;
    const eventId =
      typeof eventConfig === "string"
        ? eventConfig
        : eventConfig?.id || eventConfig?.eventId || eventConfig?.slug;
    const loader = SCENE_LOADERS[eventId];
    const loadGeneration = ++generation;

    teardownScene();
    if (!loader) return false;

    try {
      const module = await loader();
      if (destroyed || loadGeneration !== generation) return false;
      if (typeof module.default !== "function") {
        throw new TypeError(`Seasonal scene "${eventId}" has no default factory.`);
      }

      activeEvent =
        typeof eventConfig === "object" && eventConfig
          ? Object.freeze({ ...eventConfig, id: eventId })
          : Object.freeze({ id: eventId });
      const sceneContext = Object.freeze({
        canvas,
        propLayer,
        veil,
        event: activeEvent,
        getTheme: safeTheme,
        getSize: () => ({ width, height, dpr }),
        setVeilOpacity(value) {
          if (!veil) return;
          const opacity = Math.min(Math.max(Number(value) || 0, 0), 1);
          veil.style.setProperty("--seasonal-veil-opacity", String(opacity));
        },
      });

      const scene = module.default(sceneContext);
      if (!scene || typeof scene !== "object") {
        throw new TypeError(`Seasonal scene "${eventId}" returned an invalid lifecycle.`);
      }
      if (destroyed || loadGeneration !== generation) {
        scene.destroy?.();
        return false;
      }

      activeScene = scene;
      canvas.dataset.seasonalEvent = eventId;
      if (propLayer) propLayer.dataset.seasonalEvent = eventId;
      if (veil) veil.dataset.seasonalEvent = eventId;
      setLayerVisibility(enabled);
      setPropAnimationsPaused(manuallyPaused || document.visibilityState === "hidden");
      resize();
      startFrameLoop();
      return true;
    } catch (error) {
      if (loadGeneration === generation) teardownScene();
      console.warn(`Unable to load seasonal scene "${eventId}".`, error);
      return false;
    }
  }

  function setEnabled(nextEnabled) {
    if (destroyed) return;
    enabled = Boolean(nextEnabled);
    setLayerVisibility(enabled && Boolean(activeScene));
    if (!enabled) {
      cancelFrame();
      setPropAnimationsPaused(true);
      previousTime = 0;
      clearCanvas();
      return;
    }
    if (activeScene) {
      setPropAnimationsPaused(manuallyPaused || document.visibilityState === "hidden");
      renderStaticFrame();
      startFrameLoop();
    }
  }

  function pause() {
    if (destroyed || manuallyPaused) return;
    manuallyPaused = true;
    cancelFrame();
    setPropAnimationsPaused(true);
    previousTime = 0;
    if (enabled && document.visibilityState !== "hidden") renderStaticFrame();
  }

  function resume() {
    if (destroyed) return;
    manuallyPaused = false;
    setPropAnimationsPaused(document.visibilityState === "hidden");
    startFrameLoop();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      cancelFrame();
      setPropAnimationsPaused(true);
      previousTime = 0;
      return;
    }
    setPropAnimationsPaused(manuallyPaused);
    if (activeScene) {
      activeScene.resize?.(width, height);
      renderStaticFrame();
      startFrameLoop();
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    generation += 1;
    window.removeEventListener("resize", resize);
    window.removeEventListener("orientationchange", resize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    teardownScene();
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  resize();
  setLayerVisibility(false);

  return Object.freeze({
    load,
    setEnabled,
    resize,
    pause,
    resume,
    destroy,
  });
}

export default createSeasonalEngine;
