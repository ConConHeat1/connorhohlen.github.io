import {
  DEFAULT_SCHEMATIC_ACTIVATION_LINE,
  DEFAULT_SCHEMATIC_GROUND_ENTRY_LINE,
  cachedSceneProgress,
  centeredTrackOffset,
  clamp,
  clampProjectIndex,
  handoffCircuitState,
  mobileHandoffCircuitState,
  projectCardState,
  projectIsCentered,
  projectHandoffShare,
  projectNavigationState,
  projectStoryState,
  schematicBranchProgress,
  schematicEntryProgress,
  schematicGroundProgress,
  schematicSegmentProgress,
  schematicStoryProgress,
  shouldRestoreProjectInStory,
  storyHeightVh,
  storyViewportEligible,
} from "./home-state.mjs?v=20260921-projects2";

const root = document.documentElement;
const heroScene = document.querySelector("[data-hero-scene]");
const engineeringCore = document.querySelector("[data-engineering-core]");
const coreCallouts = engineeringCore ? Array.from(engineeringCore.querySelectorAll("[data-core-callout]")) : [];
const projectScene = document.querySelector("[data-project-scene]");
const projectTrack = projectScene?.querySelector("[data-project-track]");
const projectCards = projectTrack ? Array.from(projectTrack.querySelectorAll("[data-project-card]")) : [];
const projectPositionLabel = projectScene?.querySelector("[data-project-position]");
const projectAnnouncer = projectScene?.querySelector("[data-project-announcer]");
const projectPrevious = projectScene?.querySelector("[data-project-previous]");
const projectNext = projectScene?.querySelector("[data-project-next]");
const projectKeyboard = projectScene?.querySelector("[data-project-keyboard]");
const projectKeyboardHelp = document.querySelector("#project-keyboard-help");
const projectDots = projectScene ? Array.from(projectScene.querySelectorAll("[data-project-select]")) : [];
const projectCarousel = projectScene?.querySelector("[data-project-carousel]");
const projectHandoff = document.querySelector("[data-project-handoff]");
const projectHandoffOutputAnchors = Array.from(document.querySelectorAll("[data-handoff-output-anchor]"));
const schematicGround = document.querySelector("[data-schematic-ground]");
const schematicGroundAnchor = schematicGround?.querySelector("[data-schematic-ground-symbol]");
const schematicGroundEntry = schematicGround?.querySelector("[data-schematic-ground-entry]");
const navigationSections = Array.from(document.querySelectorAll("[data-nav-section]"));
const schematicStory = document.querySelector("[data-schematic-story]");
const schematicBridge = document.querySelector("[data-schematic-bridge]");
const schematicBridgeGuide = schematicBridge?.querySelector("[data-schematic-bridge-guide]");
const schematicBridgeSignal = schematicBridge?.querySelector("[data-schematic-bridge-line]");
const schematicBridgeCurrent = schematicBridge?.querySelector("[data-schematic-bridge-current]");
const schematicModules = Array.from(document.querySelectorAll("[data-schematic-module][data-schematic-key]"));
const schematicModuleByKey = new Map(schematicModules.map((module) => [module.dataset.schematicKey, module]));
const schematicSegments = Array.from(document.querySelectorAll("[data-schematic-segment]")).map((element) => {
  const section = element.closest("[data-schematic-section]");
  const branches = Array.from(element.querySelectorAll("[data-schematic-branch][data-schematic-key]")).map((branch) => ({
    element: branch,
    key: branch.dataset.schematicKey,
    guide: branch.querySelector(".schematic-branch-guide"),
    signal: branch.querySelector("[data-schematic-branch-line]"),
    current: branch.querySelector("[data-schematic-branch-current]"),
    junction: branch.querySelector("[data-schematic-junction]"),
    terminal: branch.querySelector("[data-schematic-terminal]"),
    module: schematicModuleByKey.get(branch.dataset.schematicKey),
    lastProgress: null,
  }));
  return {
    element,
    section,
    key: element.dataset.schematicSegment,
    guide: element.querySelector("[data-schematic-guide]"),
    signal: element.querySelector("[data-schematic-line]"),
    current: element.querySelector("[data-schematic-current-line]"),
    entryAnchor: element.querySelector("[data-schematic-entry-anchor]"),
    branches,
    metric: null,
    lastProgress: null,
  };
});
const schematicBranchByKey = new Map(
  schematicSegments.flatMap((segment) => segment.branches.map((branch) => [branch.key, branch])),
);
const schematicTerminalClearance = 7;
const schematicEntryOverlap = 16;
const schematicSegmentOverlap = 3;
const schematicBridgeOverlap = 3;
const phoneLayoutMaximumWidth = 760;
const supportsPointerQuery = typeof window.matchMedia === "function";
const finePointerExperience = supportsPointerQuery
  ? window.matchMedia("(hover: hover) and (pointer: fine)")
  : { matches: false };
const supportsSceneObservation = typeof window.IntersectionObserver === "function";
const supportsResizeObservation = typeof window.ResizeObserver === "function";
const projectScrollKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Space",
  "Spacebar",
]);

let scrollScenesEnabled = false;
let activeProjectIndex = -1;
let requestedProjectIndex = null;
let scheduledFrame = 0;
let measureFrame = 0;
let resizeTimer = 0;
let mobileScrollFrame = 0;
let mobileScrollEndTimer = 0;
let lastHeroProgress = null;
let lastProjectPosition = null;
let lastHandoffProgress = null;
let lastSchematicProgress = null;
let lastBridgeProgress = null;
let lastGroundProgress = null;
let projectTouchOrigin = null;
const sceneVisibility = new Map([[heroScene, true], [projectScene, false], [schematicStory, true]]);
const sceneMetrics = {
  hero: null,
  projects: null,
  handoff: null,
  schematic: null,
  groundTop: null,
  maximumScrollY: 0,
  viewportHeight: window.innerHeight,
};
let mobileCardCenters = [];
let projectCardSpacing = 430;

root.classList.add("home-enhanced");

if (projectKeyboard) {
  projectKeyboard.tabIndex = 0;
  projectKeyboard.setAttribute("aria-describedby", "project-keyboard-help");
}
if (projectKeyboardHelp) projectKeyboardHelp.hidden = false;
if (projectPositionLabel) projectPositionLabel.hidden = false;

function usesScrollScenes() {
  return scrollScenesEnabled;
}

function usesPhoneLayout() {
  return window.innerWidth <= phoneLayoutMaximumWidth;
}

function measureScene(scene) {
  if (!scene) return null;
  const bounds = scene.getBoundingClientRect();
  return {
    top: window.scrollY + bounds.top,
    range: Math.max(1, bounds.height - window.innerHeight),
  };
}

function setPathGeometry(path, geometry) {
  if (path) path.setAttribute("d", geometry);
}

function setCircleGeometry(circle, x, y) {
  if (!circle) return;
  circle.setAttribute("cx", x.toFixed(2));
  circle.setAttribute("cy", y.toFixed(2));
}

function renderSchematicGround(progress) {
  if (!schematicGround) return;
  const normalizedProgress = clamp(progress);
  const renderedProgress = normalizedProgress.toFixed(4);
  if (renderedProgress === lastGroundProgress) return;
  lastGroundProgress = renderedProgress;
  schematicGround.style.setProperty("--ground-progress", renderedProgress);
  schematicGround.style.setProperty("--ground-glow-radius", `${(normalizedProgress * 11).toFixed(2)}px`);
  schematicGround.classList.toggle("is-current", normalizedProgress > 0.001 && normalizedProgress < 0.995);
  schematicGround.classList.toggle("is-powered", normalizedProgress >= 0.995);
}

function renderSchematicBridge(progress) {
  if (!schematicBridge) return;
  const normalizedProgress = clamp(progress);
  const renderedProgress = normalizedProgress.toFixed(4);
  if (renderedProgress === lastBridgeProgress) return;
  lastBridgeProgress = renderedProgress;
  schematicBridge.style.setProperty("--bridge-progress", renderedProgress);
  schematicBridge.classList.toggle("is-current", normalizedProgress > 0.001 && normalizedProgress < 0.995);
  schematicBridge.classList.toggle("is-powered", normalizedProgress >= 0.995);
}

function leadingChargeOpacity(progress) {
  const normalizedProgress = clamp(progress);
  if (normalizedProgress <= 0.001 || normalizedProgress >= 0.999) return 0;
  return clamp(Math.min(normalizedProgress / 0.08, (1 - normalizedProgress) / 0.08));
}

function measureSchematicBridge(storyBounds) {
  if (!schematicBridge || !schematicSegments[0]?.entryAnchor || usesPhoneLayout()) return;
  const outputMeasurement = projectHandoffOutputAnchors
    .map((anchor) => ({ anchor, bounds: anchor.getBoundingClientRect() }))
    .find(({ bounds }) => bounds.width > 0 && bounds.height > 0);
  const entryBounds = schematicSegments[0].entryAnchor.getBoundingClientRect();
  if (!outputMeasurement || entryBounds.width <= 0 || entryBounds.height <= 0) return;

  const storyDocumentTop = window.scrollY + storyBounds.top;
  const outputBounds = outputMeasurement.bounds;
  const startDocumentY = window.scrollY + outputBounds.top + outputBounds.height / 2;
  const endDocumentY = window.scrollY + entryBounds.top + entryBounds.height / 2;
  const bridgeDocumentTop = Math.min(startDocumentY, endDocumentY) - schematicBridgeOverlap;
  const bridgeDocumentBottom = Math.max(startDocumentY, endDocumentY) + schematicBridgeOverlap;
  const bridgeHeight = Math.max(1, bridgeDocumentBottom - bridgeDocumentTop);
  const startX = outputBounds.left + outputBounds.width / 2 - storyBounds.left;
  const endX = entryBounds.left + entryBounds.width / 2 - storyBounds.left;
  const startY = startDocumentY - bridgeDocumentTop;
  const endY = endDocumentY - bridgeDocumentTop;
  const geometry = `M${startX.toFixed(2)} ${startY.toFixed(2)}L${endX.toFixed(2)} ${endY.toFixed(2)}`;

  schematicBridge.setAttribute("viewBox", `0 0 ${Math.max(1, storyBounds.width).toFixed(2)} ${bridgeHeight.toFixed(2)}`);
  schematicBridge.style.top = `${(bridgeDocumentTop - storyDocumentTop).toFixed(2)}px`;
  schematicBridge.style.height = `${bridgeHeight.toFixed(2)}px`;
  setPathGeometry(schematicBridgeGuide, geometry);
  setPathGeometry(schematicBridgeSignal, geometry);
  setPathGeometry(schematicBridgeCurrent, geometry);
}

function measureSchematic() {
  if (!schematicStory || !schematicSegments.length) {
    sceneMetrics.schematic = null;
    return;
  }

  if (usesPhoneLayout()) {
    sceneMetrics.schematic = null;
    sceneMetrics.groundTop = null;
    schematicSegments.forEach((segment) => { segment.metric = null; });
    return;
  }

  const viewportWidth = window.innerWidth;
  const mobileLayout = viewportWidth <= 760;
  const storyBounds = schematicStory.getBoundingClientRect();
  const groundAnchorBounds = schematicGroundAnchor?.getBoundingClientRect() || null;
  const groundEntryBounds = schematicGroundEntry?.getBoundingClientRect() || null;
  const groundAnchorPosition = groundAnchorBounds
    ? window.scrollY + groundAnchorBounds.top
    : null;
  const finalSegment = schematicSegments[schematicSegments.length - 1];
  const measurements = schematicSegments.map((segment) => {
    const sectionBounds = segment.section?.getBoundingClientRect();
    const moduleBounds = segment.branches.map((branch) => branch.module?.getBoundingClientRect() || null);
    const segmentGroundBounds = segment === finalSegment ? groundEntryBounds : null;
    return { segment, sectionBounds, moduleBounds, groundBounds: segmentGroundBounds };
  });

  sceneMetrics.schematic = {
    top: window.scrollY + storyBounds.top,
    height: Math.max(1, storyBounds.height),
  };
  sceneMetrics.groundTop = groundAnchorPosition;
  const documentHeight = Math.max(root.scrollHeight, document.body?.scrollHeight || 0);
  sceneMetrics.maximumScrollY = Math.max(0, documentHeight - sceneMetrics.viewportHeight);

  measurements.forEach(({ segment, sectionBounds, moduleBounds, groundBounds: segmentGroundBounds }) => {
    if (!sectionBounds || sectionBounds.width <= 0 || sectionBounds.height <= 0) {
      segment.metric = null;
      return;
    }

    const width = sectionBounds.width;
    const height = sectionBounds.height;
    const railX = mobileLayout ? Math.min(30, width * 0.085) : width / 2;
    const entryBendY = Math.min(96, Math.max(56, height * 0.075));
    const routeStartY = segment === schematicSegments[0] ? -schematicEntryOverlap : -schematicSegmentOverlap;
    const routeEndY = segmentGroundBounds
      ? segmentGroundBounds.top - sectionBounds.top + segmentGroundBounds.height / 2
      : height + schematicSegmentOverlap;
    const hasEntryBend = mobileLayout && segment === schematicSegments[0];
    const entryX = width / 2;
    const exitX = segmentGroundBounds
      ? segmentGroundBounds.left - sectionBounds.left + segmentGroundBounds.width / 2
      : railX;
    const hasExitBend = mobileLayout && Boolean(segmentGroundBounds);
    const entryTravel = hasEntryBend ? Math.abs(entryX - railX) : 0;
    const exitTravel = hasExitBend ? Math.abs(exitX - railX) : 0;
    const routeLength = Math.max(1, routeEndY - routeStartY + entryTravel + exitTravel);
    const route = hasEntryBend
      ? `M${entryX.toFixed(2)} ${routeStartY.toFixed(2)}V${entryBendY.toFixed(2)}H${railX.toFixed(2)}V${routeEndY.toFixed(2)}`
      : hasExitBend
        ? `M${railX.toFixed(2)} ${routeStartY.toFixed(2)}V${routeEndY.toFixed(2)}H${exitX.toFixed(2)}`
      : `M${railX.toFixed(2)} ${routeStartY.toFixed(2)}V${routeEndY.toFixed(2)}`;

    segment.element.setAttribute("viewBox", `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`);
    setPathGeometry(segment.guide, route);
    setPathGeometry(segment.signal, route);
    setPathGeometry(segment.current, route);
    if (segment === schematicSegments[0]) setCircleGeometry(segment.entryAnchor, entryX, routeStartY);

    const branchMetrics = segment.branches.map((branch, index) => {
      const moduleBoundsForBranch = moduleBounds[index];
      if (!moduleBoundsForBranch) return { branch, y: routeEndY / 2, junctionProgress: 0.5 };
      const minimumY = hasEntryBend ? entryBendY + 20 : 42;
      const y = clamp(
        moduleBoundsForBranch.top - sectionBounds.top + moduleBoundsForBranch.height / 2,
        minimumY,
        Math.max(minimumY, routeEndY - 42),
      );
      const moduleCenterX = moduleBoundsForBranch.left - sectionBounds.left + moduleBoundsForBranch.width / 2;
      const targetX = mobileLayout
        ? Math.max(
          railX + 18,
          moduleBoundsForBranch.left - sectionBounds.left - schematicTerminalClearance,
        )
        : moduleCenterX < railX
          ? moduleBoundsForBranch.right - sectionBounds.left + schematicTerminalClearance
          : moduleBoundsForBranch.left - sectionBounds.left - schematicTerminalClearance;
      const branchRoute = `M${railX.toFixed(2)} ${y.toFixed(2)}H${targetX.toFixed(2)}`;
      setPathGeometry(branch.guide, branchRoute);
      setPathGeometry(branch.signal, branchRoute);
      setPathGeometry(branch.current, branchRoute);
      setCircleGeometry(branch.junction, railX, y);
      setCircleGeometry(branch.terminal, targetX, y);
      const junctionDistance = y - routeStartY + entryTravel;
      return { branch, y, junctionProgress: clamp(junctionDistance / routeLength) };
    });

    const segmentTop = window.scrollY + sectionBounds.top;
    const groundEntryProgress = segmentGroundBounds
      ? clamp(
        (
          groundAnchorPosition
          - sceneMetrics.viewportHeight * DEFAULT_SCHEMATIC_GROUND_ENTRY_LINE
          - (segmentTop - sceneMetrics.viewportHeight * DEFAULT_SCHEMATIC_ACTIVATION_LINE)
        ) / Math.max(1, height),
        0.05,
        1,
      )
      : null;
    segment.metric = {
      top: segmentTop,
      height: Math.max(1, height),
      routeEndY,
      groundEntryProgress,
      branches: branchMetrics,
    };
  });
  measureSchematicBridge(storyBounds);
}

function measureScenes() {
  sceneMetrics.viewportHeight = window.innerHeight;
  sceneMetrics.hero = measureScene(heroScene);
  sceneMetrics.projects = measureScene(projectScene);
  if (projectHandoff && !usesPhoneLayout()) {
    const handoffBounds = projectHandoff.getBoundingClientRect();
    sceneMetrics.handoff = {
      top: window.scrollY + handoffBounds.top,
      height: Math.max(1, handoffBounds.height),
    };
  } else {
    sceneMetrics.handoff = null;
  }
  mobileCardCenters = projectCards.map((card) => card.offsetLeft + card.offsetWidth / 2);
  projectCardSpacing = Math.min(window.innerWidth * 0.31, 430);
  measureSchematic();
}

function scheduleMeasure() {
  if (measureFrame) return;
  measureFrame = requestAnimationFrame(() => {
    measureFrame = 0;
    measureScenes();
    scheduleUpdate({ force: true });
  });
}

function scheduleUpdate({ force = false } = {}) {
  const schematicMotionEnabled = supportsSceneObservation
    && supportsResizeObservation
    && !usesPhoneLayout()
    && Boolean(schematicStory);
  if (scheduledFrame || (!usesScrollScenes() && !schematicMotionEnabled)) return;
  const scrollSceneVisible = usesScrollScenes()
    && (sceneVisibility.get(heroScene) || sceneVisibility.get(projectScene));
  const mobileHandoffVisible = !usesScrollScenes() && sceneVisibility.get(projectScene);
  const schematicVisible = schematicMotionEnabled && sceneVisibility.get(schematicStory);
  if (!force && !scrollSceneVisible && !mobileHandoffVisible && !schematicVisible) return;
  scheduledFrame = requestAnimationFrame(updateScrollScenes);
}

function setCoreCalloutState(progress) {
  if (!engineeringCore || !coreCallouts.length) return;
  const complete = progress >= 0.88;
  engineeringCore.classList.toggle("is-core-complete", complete);
  const thresholds = [0.23, 0.46, 0.69, 0.88];
  const currentIndex = thresholds.findIndex((threshold) => progress < threshold);
  coreCallouts.forEach((callout, index) => callout.classList.toggle("is-core-active", !complete && index === Math.max(0, currentIndex)));
}

function updateHeroScene(progress) {
  if (!heroScene) return;
  const renderedProgress = progress.toFixed(4);
  if (renderedProgress === lastHeroProgress) return;
  lastHeroProgress = renderedProgress;
  heroScene.style.setProperty("--scene-progress", renderedProgress);
  heroScene.style.setProperty("--quote-opacity", clamp(1 - progress * 1.25).toFixed(4));
  heroScene.style.setProperty("--quote-shift", `${(-progress * 28).toFixed(2)}px`);
  heroScene.style.setProperty("--quote-scale", (1 - progress * 0.035).toFixed(4));
  heroScene.style.setProperty("--hero-opacity", clamp(1 - progress * 0.72).toFixed(4));
  heroScene.style.setProperty("--hero-shift", `${(-progress * 26).toFixed(2)}px`);
  heroScene.style.setProperty("--core-tilt-x", `${(progress * 7).toFixed(2)}deg`);
  heroScene.style.setProperty("--core-tilt-y", `${(-progress * 18).toFixed(2)}deg`);
  heroScene.style.setProperty("--trace-opacity", clamp(1 - progress * 0.48).toFixed(4));
  heroScene.style.setProperty("--trace-scale", (1 + progress * 0.08).toFixed(4));
  heroScene.style.setProperty("--software-x", `${(-progress * 105).toFixed(2)}px`);
  heroScene.style.setProperty("--software-y", `${(-progress * 108).toFixed(2)}px`);
  heroScene.style.setProperty("--software-z", `${(72 + progress * 150).toFixed(2)}px`);
  heroScene.style.setProperty("--software-rotation", `${(45 - progress * 12).toFixed(2)}deg`);
  heroScene.style.setProperty("--connected-x", `${(progress * 112).toFixed(2)}px`);
  heroScene.style.setProperty("--connected-y", `${(-progress * 52).toFixed(2)}px`);
  heroScene.style.setProperty("--connected-z", `${(36 + progress * 70).toFixed(2)}px`);
  heroScene.style.setProperty("--connected-rotation", `${(45 + progress * 9).toFixed(2)}deg`);
  heroScene.style.setProperty("--hardware-x", `${(-progress * 112).toFixed(2)}px`);
  heroScene.style.setProperty("--hardware-y", `${(progress * 72).toFixed(2)}px`);
  heroScene.style.setProperty("--hardware-z", `${(-34 - progress * 65).toFixed(2)}px`);
  heroScene.style.setProperty("--hardware-rotation", `${(45 + progress * 8).toFixed(2)}deg`);
  heroScene.style.setProperty("--sensors-x", `${(progress * 96).toFixed(2)}px`);
  heroScene.style.setProperty("--sensors-y", `${(progress * 116).toFixed(2)}px`);
  heroScene.style.setProperty("--sensors-z", `${(-70 - progress * 110).toFixed(2)}px`);
  heroScene.style.setProperty("--sensors-rotation", `${(45 - progress * 10).toFixed(2)}deg`);
  heroScene.style.setProperty("--chip-z", `${(118 + progress * 95).toFixed(2)}px`);
  heroScene.style.setProperty("--chip-rotation", `${(45 + progress * 16).toFixed(2)}deg`);
  heroScene.style.setProperty("--cue-opacity", clamp(1 - progress * 3).toFixed(4));
  setCoreCalloutState(progress);
}

function releaseRequestedProject() {
  if (requestedProjectIndex === null) return false;
  requestedProjectIndex = null;
  return true;
}

function setProjectCarouselInert(shouldBeInert) {
  if (!projectCarousel || projectCarousel.inert === shouldBeInert) return;
  if (shouldBeInert && projectCarousel.contains(document.activeElement)) {
    projectKeyboard?.focus({ preventScroll: true });
  }
  projectCarousel.inert = shouldBeInert;
}

function updateProjectHandoff(
  handoffProgress,
  { staticPresentation = false, mobilePresentation = false } = {},
) {
  if (!projectScene) return;
  const renderedProgress = clamp(handoffProgress).toFixed(4);
  if (renderedProgress !== lastHandoffProgress) {
    lastHandoffProgress = renderedProgress;
    projectScene.style.setProperty("--handoff-progress", renderedProgress);
    projectHandoff?.style.setProperty("--handoff-progress", renderedProgress);
    const circuitState = mobilePresentation
      ? mobileHandoffCircuitState(Number(renderedProgress))
      : handoffCircuitState(Number(renderedProgress));
    projectScene.style.setProperty("--handoff-project-fade", circuitState.projectFadeProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-source-build", circuitState.sourceBuildProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-logic-build", circuitState.logicBuildProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-wiring-build", circuitState.wiringProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-switch-progress", circuitState.switchProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-switch-angle", `${(circuitState.switchProgress * 26).toFixed(2)}deg`);
    projectHandoff?.style.setProperty("--handoff-switch-glow-radius", `${(circuitState.switchProgress * 8).toFixed(2)}px`);
    projectHandoff?.style.setProperty("--handoff-mosfet-progress", circuitState.mosfetEnableProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-current-source", circuitState.sourceCurrentProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-current-r2", circuitState.r2ReturnProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-current-latch", circuitState.latchSignalProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-current-gate", circuitState.gateSignalProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-current-output", circuitState.switchedOutputProgress.toFixed(4));
    projectHandoff?.style.setProperty("--handoff-head-source", leadingChargeOpacity(circuitState.sourceCurrentProgress).toFixed(4));
    projectHandoff?.style.setProperty("--handoff-head-r2", leadingChargeOpacity(circuitState.r2ReturnProgress).toFixed(4));
    projectHandoff?.style.setProperty("--handoff-head-latch", leadingChargeOpacity(circuitState.latchSignalProgress).toFixed(4));
    projectHandoff?.style.setProperty("--handoff-head-output", leadingChargeOpacity(circuitState.switchedOutputProgress).toFixed(4));
  }

  const isActive = !staticPresentation && Number(renderedProgress) > 0;
  const isComplete = Number(renderedProgress) >= 1;
  setProjectCarouselInert(!mobilePresentation && isActive);
  projectHandoff?.setAttribute(
    "data-handoff-presentation",
    staticPresentation ? "static" : mobilePresentation ? "mobile" : "desktop",
  );
  [projectScene, projectHandoff].filter(Boolean).forEach((element) => {
    element.classList.toggle("is-handoff-active", isActive);
    element.classList.toggle("is-handoff-complete", isComplete);
    element.classList.toggle("is-handoff-static", staticPresentation);
  });
}

function updateProjectScene(progress) {
  if (!projectScene || !projectCards.length) return;
  const state = projectStoryState(progress, projectCards.length);
  updateProjectHandoff(state.handoffProgress);
  if (requestedProjectIndex !== null && Math.abs(state.cardPosition - requestedProjectIndex) < 0.08) requestedProjectIndex = null;
  setActiveProject(requestedProjectIndex ?? state.activeIndex, { announce: false });

  const renderedPosition = state.cardPosition.toFixed(4);
  if (renderedPosition === lastProjectPosition) return;
  lastProjectPosition = renderedPosition;

  projectCards.forEach((card, index) => {
    const cardState = projectCardState(index, state.cardPosition);
    card.classList.toggle("is-nearby", cardState.nearby);
    card.classList.toggle("is-distant", !cardState.nearby);
    if (!cardState.nearby) return;
    card.style.setProperty("--project-x", `${(cardState.offset * projectCardSpacing).toFixed(2)}px`);
    card.style.setProperty("--project-z", `${(-cardState.distance * 170).toFixed(2)}px`);
    card.style.setProperty("--project-yaw", `${(-Math.sign(cardState.offset) * Math.min(cardState.distance * 42, 64)).toFixed(2)}deg`);
    card.style.setProperty("--project-scale", Math.max(0.78, 1 - cardState.distance * 0.075).toFixed(4));
    card.style.setProperty("--project-opacity", Math.max(0.62, 1 - cardState.distance * 0.16).toFixed(4));
    card.style.zIndex = String(20 - Math.round(cardState.distance * 4));
  });
}

function updateMobileProjectHandoff() {
  if (!projectHandoff || !sceneMetrics.handoff) return;
  const progress = schematicSegmentProgress(
    window.scrollY,
    sceneMetrics.handoff.top,
    sceneMetrics.handoff.height,
    sceneMetrics.viewportHeight,
    0.82,
  );
  updateProjectHandoff(progress, { mobilePresentation: true });
}

function handoffStateAtScroll(scrollY) {
  if (usesScrollScenes() && sceneMetrics.projects) {
    const projectProgress = cachedSceneProgress(
      scrollY,
      sceneMetrics.projects.top,
      sceneMetrics.projects.range,
    );
    const handoffProgress = projectStoryState(projectProgress, projectCards.length).handoffProgress;
    return handoffCircuitState(handoffProgress);
  }

  if (sceneMetrics.handoff) {
    const handoffProgress = schematicSegmentProgress(
      scrollY,
      sceneMetrics.handoff.top,
      sceneMetrics.handoff.height,
      sceneMetrics.viewportHeight,
      0.82,
    );
    return mobileHandoffCircuitState(handoffProgress);
  }

  return handoffCircuitState(1);
}

function updateSchematicStory() {
  if (!schematicStory || !sceneMetrics.schematic) return;
  const viewportHeight = sceneMetrics.viewportHeight;
  const scrollY = window.scrollY;
  const currentHandoffState = handoffStateAtScroll(scrollY);
  const storyProgress = schematicStoryProgress(
    scrollY,
    sceneMetrics.schematic.top,
    sceneMetrics.schematic.height,
    viewportHeight,
  );
  const renderedStoryProgress = storyProgress.toFixed(4);
  if (renderedStoryProgress !== lastSchematicProgress) {
    lastSchematicProgress = renderedStoryProgress;
    schematicStory.style.setProperty("--schematic-progress", renderedStoryProgress);
  }
  renderSchematicBridge(currentHandoffState.switchedOutputProgress);

  schematicSegments.forEach((segment) => {
    if (!segment.metric) return;
    const isFirstSegment = segment === schematicSegments[0];
    const activationLine = isFirstSegment ? (usesScrollScenes() ? 1 : 0.82) : undefined;
    const progressHeight = isFirstSegment
      ? Math.max(
        1,
        segment.metric.height
          + viewportHeight * (activationLine - DEFAULT_SCHEMATIC_ACTIVATION_LINE),
      )
      : segment.metric.height;
    const progress = schematicSegmentProgress(
      scrollY,
      segment.metric.top,
      progressHeight,
      viewportHeight,
      activationLine,
    );
    const entryProgress = isFirstSegment
      ? schematicEntryProgress(progress, currentHandoffState.switchedOutputProgress)
      : progress;
    const routeProgress = segment.metric.groundEntryProgress === null
      ? entryProgress
      : clamp(entryProgress / segment.metric.groundEntryProgress);
    const renderedProgress = routeProgress.toFixed(4);
    if (renderedProgress !== segment.lastProgress) {
      segment.lastProgress = renderedProgress;
      segment.element.style.setProperty("--segment-progress", renderedProgress);
      segment.section?.classList.toggle("is-schematic-powered", routeProgress >= 0.995);
      segment.section?.classList.toggle("is-schematic-current", routeProgress > 0.001 && routeProgress < 0.995);
    }

    segment.branches.forEach((branch, index) => {
      const branchMetric = segment.metric.branches[index];
      const branchProgress = schematicBranchProgress(routeProgress, branchMetric?.junctionProgress ?? 1);
      const renderedBranchProgress = branchProgress.toFixed(4);
      if (renderedBranchProgress === branch.lastProgress) return;
      const wasPowered = branch.element.classList.contains("is-powered");
      const powered = branchProgress >= 0.995;
      branch.lastProgress = renderedBranchProgress;
      branch.element.style.setProperty("--branch-progress", renderedBranchProgress);
      const nodeOpacity = (0.2 + branchProgress * 0.8).toFixed(4);
      const nodeScale = (0.62 + branchProgress * 0.38).toFixed(4);
      branch.element.style.setProperty("--branch-node-opacity", nodeOpacity);
      branch.element.style.setProperty("--branch-node-scale", nodeScale);
      branch.element.classList.toggle("is-current", branchProgress > 0.001 && !powered);
      branch.element.classList.toggle("is-powered", powered);
      branch.module?.classList.toggle("is-current", branchProgress > 0.001 && !powered);
      branch.module?.classList.toggle("is-powered", powered);
      if (powered && !wasPowered) {
        branch.element.classList.add("is-pulsing");
      } else if (!powered) {
        branch.element.classList.remove("is-pulsing");
      }
    });

  });

  const groundProgress = sceneMetrics.groundTop === null
    ? 0
    : schematicGroundProgress(
      scrollY,
      sceneMetrics.groundTop,
      viewportHeight,
      sceneMetrics.maximumScrollY,
    );
  renderSchematicGround(groundProgress);
}

function updateScrollScenes() {
  scheduledFrame = 0;
  const schematicMotionEnabled = supportsSceneObservation
    && supportsResizeObservation
    && !usesPhoneLayout()
    && Boolean(schematicStory);
  if (!usesScrollScenes() && !schematicMotionEnabled) return;
  if (!sceneMetrics.hero || !sceneMetrics.projects || !sceneMetrics.schematic) measureScenes();

  if (usesScrollScenes() && sceneVisibility.get(heroScene) && sceneMetrics.hero) {
    const progress = cachedSceneProgress(window.scrollY, sceneMetrics.hero.top, sceneMetrics.hero.range);
    updateHeroScene(progress);
    heroScene.classList.toggle("is-scene-active", progress > 0 && progress < 1);
  }

  if (usesScrollScenes() && sceneVisibility.get(projectScene) && sceneMetrics.projects) {
    const progress = cachedSceneProgress(window.scrollY, sceneMetrics.projects.top, sceneMetrics.projects.range);
    updateProjectScene(progress);
    projectScene.classList.toggle("is-scene-active", progress > 0 && progress < 1);
  } else if (!usesScrollScenes() && sceneVisibility.get(projectScene) && sceneMetrics.handoff) {
    updateMobileProjectHandoff();
  }

  if (schematicMotionEnabled && (sceneVisibility.get(schematicStory) || lastSchematicProgress === null)) {
    updateSchematicStory();
  }
}

function setActiveProject(index, { announce = true, force = false } = {}) {
  if (!projectCards.length) return;
  const navigation = projectNavigationState(index, projectCards.length);
  const label = `${String(navigation.activeIndex + 1).padStart(2, "0")} / ${String(projectCards.length).padStart(2, "0")}`;
  const announcement = `Project ${navigation.activeIndex + 1} of ${projectCards.length}: ${projectCards[navigation.activeIndex].querySelector("h3")?.textContent.trim() || "Project"}`;
  if (!force && navigation.activeIndex === activeProjectIndex) {
    if (announce && projectAnnouncer) projectAnnouncer.textContent = announcement;
    return;
  }
  activeProjectIndex = navigation.activeIndex;
  const storyMode = usesScrollScenes();

  projectCards.forEach((card, cardIndex) => {
    const active = cardIndex === activeProjectIndex;
    card.classList.toggle("is-active", active);
    if (active) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
    card.tabIndex = storyMode ? (active ? 0 : -1) : 0;
  });
  projectDots.forEach((dot, dotIndex) => dot.setAttribute("aria-pressed", String(dotIndex === activeProjectIndex)));
  if (projectPrevious) projectPrevious.disabled = navigation.previousDisabled;
  if (projectNext) projectNext.disabled = navigation.nextDisabled;
  if (projectPositionLabel) projectPositionLabel.textContent = label;
  if (announce && projectAnnouncer) projectAnnouncer.textContent = announcement;
}

function jumpToStoryProject(index, { behavior = "auto" } = {}) {
  if (!projectScene || !sceneMetrics.projects) return;
  const cardProgress = projectCards.length > 1 ? index / (projectCards.length - 1) : 0;
  const progress = cardProgress * (1 - projectHandoffShare(projectCards.length));
  const destination = sceneMetrics.projects.top + sceneMetrics.projects.range * progress;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo({ top: destination, behavior });
  root.style.scrollBehavior = previousBehavior;
  if (behavior === "auto") updateProjectScene(progress);
}

function scrollMobileTrackTo(index, { behavior = "smooth" } = {}) {
  if (!projectTrack || !projectCards[index]) return;
  const card = projectCards[index];
  const maximumScroll = projectTrack.scrollWidth - projectTrack.clientWidth;
  const left = centeredTrackOffset(card.offsetLeft, card.offsetWidth, projectTrack.clientWidth, maximumScroll);
  projectTrack.scrollTo({ left, behavior });
}

function selectProject(index, { focusCard = false } = {}) {
  if (!projectCards.length) return;
  const nextIndex = clampProjectIndex(index, projectCards.length);
  requestedProjectIndex = nextIndex;
  setActiveProject(nextIndex, { announce: true });
  if (usesScrollScenes()) jumpToStoryProject(nextIndex, { behavior: "smooth" });
  else scrollMobileTrackTo(nextIndex);
  if (focusCard) projectCards[nextIndex]?.focus({ preventScroll: true });
}

function updateMobileProjectFromScroll({ announce = false } = {}) {
  if (usesScrollScenes() || !projectTrack || !projectCards.length) return;
  if (mobileCardCenters.length !== projectCards.length) measureScenes();
  const trackCenter = projectTrack.scrollLeft + projectTrack.clientWidth / 2;
  const nearestIndex = mobileCardCenters.reduce((best, center, index) => (
    Math.abs(trackCenter - center) < Math.abs(trackCenter - mobileCardCenters[best]) ? index : best
  ), 0);
  if (requestedProjectIndex !== null && nearestIndex === requestedProjectIndex) requestedProjectIndex = null;
  setActiveProject(requestedProjectIndex ?? nearestIndex, { announce });
}

function resetProjectPresentation() {
  projectCards.forEach((card) => {
    card.classList.remove("is-nearby", "is-distant");
    card.style.removeProperty("--project-x");
    card.style.removeProperty("--project-z");
    card.style.removeProperty("--project-yaw");
    card.style.removeProperty("--project-scale");
    card.style.removeProperty("--project-opacity");
    card.style.removeProperty("z-index");
  });
}

function currentViewportAnchor() {
  const focusLine = window.innerHeight * 0.35;
  return navigationSections.find((section) => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= focusLine && bounds.bottom >= focusLine;
  }) || null;
}

function refreshExperience() {
  const projectWasActive = usesScrollScenes() && projectScene?.classList.contains("is-scene-active");
  const anchor = currentViewportAnchor();
  const anchorTop = anchor?.getBoundingClientRect().top;
  const wasEnhanced = usesScrollScenes();
  const preservedProjectIndex = Math.max(0, activeProjectIndex);
  scrollScenesEnabled = supportsSceneObservation && supportsResizeObservation && storyViewportEligible({
    width: window.innerWidth,
    height: window.innerHeight,
    finePointer: finePointerExperience.matches,
  });
  const enhanced = usesScrollScenes();
  const restoreProjectInStory = shouldRestoreProjectInStory({
    wasEnhanced,
    enhanced,
    projectIsAnchor: anchor === projectScene,
  });
  const restoreProjectInStandard = wasEnhanced
    && !enhanced
    && (anchor === projectScene || projectWasActive);
  lastHeroProgress = null;
  lastProjectPosition = null;
  lastHandoffProgress = null;
  root.dataset.scrollExperience = enhanced ? "story" : "standard";
  heroScene?.classList.remove("is-scene-active");
  projectScene?.classList.remove("is-scene-active");
  projectScene?.style.setProperty("--project-story-height", `${storyHeightVh(projectCards.length)}svh`);

  if (!enhanced) {
    heroScene?.style.removeProperty("--scene-progress");
    engineeringCore?.classList.remove("is-core-complete");
    coreCallouts.forEach((callout) => callout.classList.remove("is-core-active"));
    resetProjectPresentation();
    const mobileCircuitEnabled = !usesPhoneLayout() && supportsSceneObservation && supportsResizeObservation;
    updateProjectHandoff(mobileCircuitEnabled ? 0 : 1, {
      mobilePresentation: mobileCircuitEnabled,
      staticPresentation: !mobileCircuitEnabled,
    });
    setActiveProject(preservedProjectIndex, { announce: false, force: true });
    scheduleMeasure();
    requestAnimationFrame(() => {
      if (restoreProjectInStandard) {
        projectScene?.scrollIntoView({ block: "start", behavior: "auto" });
      }
      scrollMobileTrackTo(preservedProjectIndex, { behavior: "auto" });
      measureScenes();
      updateMobileProjectFromScroll();
    });
  } else {
    updateProjectHandoff(0);
    setActiveProject(Math.max(0, activeProjectIndex), { announce: false, force: true });
    scheduleMeasure();
  }

  if (restoreProjectInStory) {
    requestAnimationFrame(() => {
      measureScenes();
      jumpToStoryProject(preservedProjectIndex);
    });
  } else if (!restoreProjectInStandard && anchor && Number.isFinite(anchorTop)) {
    requestAnimationFrame(() => {
      const shift = anchor.getBoundingClientRect().top - anchorTop;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, left: 0, behavior: "auto" });
    });
  }
}

function setSchematicStaticPresentation() {
  lastSchematicProgress = "1.0000";
  schematicStory?.style.setProperty("--schematic-progress", "1");
  renderSchematicBridge(1);
  schematicSegments.forEach((segment) => {
    segment.lastProgress = "1.0000";
    segment.element.style.setProperty("--segment-progress", "1");
    segment.section?.classList.remove("is-schematic-current");
    segment.section?.classList.add("is-schematic-powered");
    segment.branches.forEach((branch) => {
      branch.lastProgress = "1.0000";
      branch.element.style.setProperty("--branch-progress", "1");
      branch.element.style.setProperty("--branch-node-opacity", "1");
      branch.element.style.setProperty("--branch-node-scale", "1");
      branch.module?.style.setProperty("--branch-node-opacity", "1");
      branch.module?.style.setProperty("--branch-node-scale", "1");
      branch.element.classList.remove("is-current", "is-pulsing");
      branch.element.classList.add("is-powered");
      branch.module?.classList.remove("is-current");
      branch.module?.classList.add("is-powered");
    });
  });
  lastGroundProgress = null;
  renderSchematicGround(1);
}

function resetSchematicProgress() {
  lastSchematicProgress = null;
  lastBridgeProgress = null;
  lastGroundProgress = null;
  renderSchematicBridge(0);
  schematicSegments.forEach((segment) => {
    segment.lastProgress = null;
    segment.section?.classList.remove("is-schematic-current", "is-schematic-powered");
    segment.branches.forEach((branch) => {
      branch.lastProgress = null;
      branch.element.style.setProperty("--branch-node-opacity", "0.2");
      branch.element.style.setProperty("--branch-node-scale", "0.62");
      branch.module?.style.setProperty("--branch-node-opacity", "0.2");
      branch.module?.style.setProperty("--branch-node-scale", "0.62");
      branch.element.classList.remove("is-current", "is-powered", "is-pulsing");
      branch.module?.classList.remove("is-current", "is-powered");
    });
  });
  renderSchematicGround(0);
}

function configureSchematicMotion() {
  const enabled = supportsSceneObservation
    && supportsResizeObservation
    && !usesPhoneLayout()
    && Boolean(schematicStory);
  root.classList.toggle("schematic-motion-ready", enabled);
  if (usesPhoneLayout()) {
    resetSchematicProgress();
    return;
  }
  if (!enabled) {
    setSchematicStaticPresentation();
    return;
  }
  resetSchematicProgress();
  scheduleMeasure();
}

projectCards.forEach((card, index) => card.addEventListener("click", (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  let centered;
  if (usesScrollScenes() && sceneMetrics.projects) {
    const progress = cachedSceneProgress(window.scrollY, sceneMetrics.projects.top, sceneMetrics.projects.range);
    centered = projectIsCentered(index, projectStoryState(progress, projectCards.length).cardPosition);
  } else {
    const destination = centeredTrackOffset(card.offsetLeft, card.offsetWidth, projectTrack.clientWidth, projectTrack.scrollWidth - projectTrack.clientWidth);
    centered = Math.abs(projectTrack.scrollLeft - destination) <= 6;
  }
  if (!centered) {
    event.preventDefault();
    selectProject(index, { focusCard: true });
  }
}));

projectPrevious?.addEventListener("click", () => selectProject(activeProjectIndex - 1));
projectNext?.addEventListener("click", () => selectProject(activeProjectIndex + 1));
projectDots.forEach((dot) => dot.addEventListener("click", () => selectProject(Number(dot.dataset.projectSelect))));

projectKeyboard?.addEventListener("keydown", (event) => {
  if (projectScrollKeys.has(event.key)) {
    if (releaseRequestedProject()) scheduleUpdate({ force: true });
    return;
  }
  if (projectCarousel?.inert) return;
  const activeCard = projectCards[activeProjectIndex];
  const handlesArrow = event.target === projectKeyboard || event.target === activeCard;
  if (!handlesArrow) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectProject(activeProjectIndex - 1, { focusCard: event.target === activeCard });
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    selectProject(activeProjectIndex + 1, { focusCard: event.target === activeCard });
  } else if (event.key === "Enter" && event.target === projectKeyboard) {
    activeCard?.click();
  }
});

projectTrack?.addEventListener("scroll", () => {
  cancelAnimationFrame(mobileScrollFrame);
  mobileScrollFrame = requestAnimationFrame(() => updateMobileProjectFromScroll());
  window.clearTimeout(mobileScrollEndTimer);
  mobileScrollEndTimer = window.setTimeout(() => updateMobileProjectFromScroll({ announce: true }), 160);
}, { passive: true });

projectScene?.addEventListener("wheel", (event) => {
  const horizontalDelta = Math.abs(event.deltaX);
  const verticalDelta = Math.abs(event.deltaY);
  const hasVerticalIntent = verticalDelta > 0 && verticalDelta >= horizontalDelta;
  const hasHorizontalIntent = horizontalDelta > verticalDelta;
  if ((hasVerticalIntent || hasHorizontalIntent) && releaseRequestedProject()) {
    scheduleUpdate({ force: true });
  }
}, { passive: true });
projectScene?.addEventListener("touchstart", (event) => {
  const touch = event.touches.length === 1 ? event.touches[0] : null;
  projectTouchOrigin = touch ? { x: touch.clientX, y: touch.clientY } : null;
}, { passive: true });
projectScene?.addEventListener("touchmove", (event) => {
  if (!projectTouchOrigin || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const horizontalTravel = Math.abs(touch.clientX - projectTouchOrigin.x);
  const verticalTravel = Math.abs(touch.clientY - projectTouchOrigin.y);
  if (Math.max(horizontalTravel, verticalTravel) < 8) return;
  projectTouchOrigin = null;
  if (releaseRequestedProject()) scheduleUpdate({ force: true });
}, { passive: true });
projectScene?.addEventListener("touchend", () => { projectTouchOrigin = null; }, { passive: true });
projectScene?.addEventListener("touchcancel", () => { projectTouchOrigin = null; }, { passive: true });
projectKeyboard?.addEventListener("focusin", () => scheduleUpdate({ force: true }));
projectKeyboard?.addEventListener("focusout", () => {
  requestAnimationFrame(() => {
    if (!projectKeyboard.contains(document.activeElement)) releaseRequestedProject();
    scheduleUpdate({ force: true });
  });
});

schematicModules.forEach((module) => {
  const branch = schematicBranchByKey.get(module.dataset.schematicKey);
  if (!branch) return;
  const activate = () => branch.element.classList.add("is-interaction-active");
  const deactivate = () => branch.element.classList.remove("is-interaction-active");
  module.addEventListener("mouseenter", activate);
  module.addEventListener("mouseleave", deactivate);
  module.addEventListener("focusin", activate);
  module.addEventListener("focusout", deactivate);
});

window.addEventListener("scroll", () => scheduleUpdate(), { passive: true });
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    refreshExperience();
    configureSchematicMotion();
  }, 120);
}, { passive: true });
window.addEventListener("load", scheduleMeasure, { once: true });
window.addEventListener("pageshow", () => {
  releaseRequestedProject();
  scheduleMeasure();
});
window.addEventListener("hashchange", scheduleMeasure);
window.addEventListener("popstate", scheduleMeasure);
document.addEventListener("load", (event) => {
  if (event.target instanceof HTMLImageElement) scheduleMeasure();
}, true);
document.fonts?.ready.then(scheduleMeasure);
if (typeof finePointerExperience.addEventListener === "function") {
  finePointerExperience.addEventListener("change", refreshExperience);
} else if (typeof finePointerExperience.addListener === "function") {
  finePointerExperience.addListener(refreshExperience);
}

if (supportsSceneObservation) {
  const sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      sceneVisibility.set(entry.target, entry.isIntersecting);
      if (entry.isIntersecting) scheduleUpdate({ force: true });
    });
  }, { rootMargin: "100% 0px" });
  if (heroScene) sceneObserver.observe(heroScene);
  if (projectScene) sceneObserver.observe(projectScene);
  if (schematicStory) sceneObserver.observe(schematicStory);
}

if (supportsResizeObservation) {
  const resizeObserver = new ResizeObserver(scheduleMeasure);
  if (heroScene) resizeObserver.observe(heroScene);
  if (projectScene) resizeObserver.observe(projectScene);
  if (projectTrack) resizeObserver.observe(projectTrack);
  if (schematicStory) resizeObserver.observe(schematicStory);
  schematicSegments.forEach((segment) => {
    if (segment.section) resizeObserver.observe(segment.section);
  });
}

setActiveProject(0, { announce: false, force: true });
refreshExperience();
configureSchematicMotion();
