export function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum);
}

export function sceneProgress(top, sceneHeight, viewportHeight) {
  const range = Math.max(1, sceneHeight - viewportHeight);
  return clamp(-top / range);
}

export function cachedSceneProgress(scrollY, sceneTop, sceneRange) {
  return clamp((scrollY - sceneTop) / Math.max(1, sceneRange));
}

export const DEFAULT_SCHEMATIC_ACTIVATION_LINE = 0.68;
export const DEFAULT_SCHEMATIC_BRANCH_SPAN = 0.18;
export const DEFAULT_SCHEMATIC_GROUND_ENTRY_LINE = 0.88;
export const DEFAULT_SCHEMATIC_GROUND_COMPLETION_LINE = 0.58;
export const HANDOFF_COMPLETION_BOUNDARY = 1;

function schematicRangeProgress(
  scrollY,
  rangeTop,
  rangeHeight,
  viewportHeight,
  activationLine = DEFAULT_SCHEMATIC_ACTIVATION_LINE,
) {
  if (!Number.isFinite(scrollY)) return 0;
  const top = Number.isFinite(rangeTop) ? rangeTop : 0;
  const height = Math.max(1, Number.isFinite(rangeHeight) ? rangeHeight : 1);
  const viewport = Math.max(0, Number.isFinite(viewportHeight) ? viewportHeight : 0);
  const trigger = Number.isFinite(activationLine)
    ? clamp(activationLine)
    : DEFAULT_SCHEMATIC_ACTIVATION_LINE;
  const start = top - viewport * trigger;
  return clamp((scrollY - start) / height);
}

// These helpers depend only on cached document geometry. Recomputing at any
// scroll position gives the same result, including on reverse scroll or a hash
// navigation that lands in the middle of the story.
export function schematicStoryProgress(
  scrollY,
  storyTop,
  storyHeight,
  viewportHeight,
  activationLine = DEFAULT_SCHEMATIC_ACTIVATION_LINE,
) {
  return schematicRangeProgress(scrollY, storyTop, storyHeight, viewportHeight, activationLine);
}

export function schematicSegmentProgress(
  scrollY,
  segmentTop,
  segmentHeight,
  viewportHeight,
  activationLine = DEFAULT_SCHEMATIC_ACTIVATION_LINE,
) {
  return schematicRangeProgress(scrollY, segmentTop, segmentHeight, viewportHeight, activationLine);
}

export function schematicBranchProgress(
  segmentProgress,
  junctionProgress,
  branchSpan = DEFAULT_SCHEMATIC_BRANCH_SPAN,
) {
  const progress = clamp(segmentProgress);
  const junction = clamp(junctionProgress);
  const requestedSpan = Number.isFinite(branchSpan)
    ? clamp(branchSpan, Number.EPSILON, 1)
    : DEFAULT_SCHEMATIC_BRANCH_SPAN;
  const availableSpan = Math.max(Number.EPSILON, 1 - junction);
  const normalizedSpan = Math.min(requestedSpan, availableSpan);

  if (progress <= junction) return 0;
  return clamp((progress - junction) / normalizedSpan);
}

export function schematicEntryProgress(
  segmentProgress,
  switchedOutputProgress,
  completionBoundary = HANDOFF_COMPLETION_BOUNDARY,
) {
  const boundary = Number.isFinite(completionBoundary)
    ? clamp(completionBoundary)
    : HANDOFF_COMPLETION_BOUNDARY;
  if (clamp(switchedOutputProgress) < boundary - Number.EPSILON * 4) return 0;
  return clamp(segmentProgress);
}

export function schematicGroundProgress(
  scrollY,
  groundTop,
  viewportHeight,
  maximumScrollY,
  entryLine = DEFAULT_SCHEMATIC_GROUND_ENTRY_LINE,
  completionLine = DEFAULT_SCHEMATIC_GROUND_COMPLETION_LINE,
) {
  if (!Number.isFinite(scrollY) || !Number.isFinite(groundTop)) return 0;

  const viewport = Math.max(0, Number.isFinite(viewportHeight) ? viewportHeight : 0);
  const normalizedEntryLine = Number.isFinite(entryLine)
    ? clamp(entryLine)
    : DEFAULT_SCHEMATIC_GROUND_ENTRY_LINE;
  const normalizedCompletionLine = Number.isFinite(completionLine)
    ? clamp(completionLine)
    : DEFAULT_SCHEMATIC_GROUND_COMPLETION_LINE;
  const entryScrollY = groundTop - viewport * normalizedEntryLine;
  const naturalCompletionScrollY = Math.max(
    entryScrollY,
    groundTop - viewport * normalizedCompletionLine,
  );
  const reachableMaximumScrollY = Number.isFinite(maximumScrollY)
    ? Math.max(0, maximumScrollY)
    : naturalCompletionScrollY;
  const completionScrollY = Math.min(naturalCompletionScrollY, reachableMaximumScrollY);
  let startScrollY = Math.min(entryScrollY, completionScrollY);

  // If even the entry line is below the reachable page bottom, shift the
  // animation into the remaining scroll range instead of jumping at max scroll.
  if (completionScrollY <= startScrollY + Number.EPSILON && completionScrollY > 0) {
    const naturalDuration = Math.max(1, naturalCompletionScrollY - entryScrollY);
    startScrollY = Math.max(0, completionScrollY - naturalDuration);
  }

  if (completionScrollY <= startScrollY + Number.EPSILON) {
    return scrollY >= completionScrollY ? 1 : 0;
  }

  return clamp((scrollY - startScrollY) / (completionScrollY - startScrollY));
}

export const DEFAULT_PROJECT_TRANSITION_VH = 42;
export const DEFAULT_PROJECT_TERMINAL_HANDOFF_VH = 240;

export function storyHeightVh(
  projectCount,
  transitionVh = DEFAULT_PROJECT_TRANSITION_VH,
  terminalHandoffVh = DEFAULT_PROJECT_TERMINAL_HANDOFF_VH,
) {
  if (!Number.isInteger(projectCount) || projectCount < 1) return 100;
  return 100
    + Math.max(0, projectCount - 1) * Math.max(0, transitionVh)
    + Math.max(0, terminalHandoffVh);
}

export function projectHandoffShare(
  projectCount,
  transitionVh = DEFAULT_PROJECT_TRANSITION_VH,
  terminalHandoffVh = DEFAULT_PROJECT_TERMINAL_HANDOFF_VH,
) {
  if (!Number.isInteger(projectCount) || projectCount < 1) return 0;
  const cardTravelVh = Math.max(0, projectCount - 1) * Math.max(0, transitionVh);
  const handoffTravelVh = Math.max(0, terminalHandoffVh);
  const totalTravelVh = cardTravelVh + handoffTravelVh;
  return totalTravelVh > 0 ? clamp(handoffTravelVh / totalTravelVh, 0, 0.95) : 0;
}

// Keeps a named seven-card homepage default while allowing the live story to
// derive the exact share from its real card count.
export const DEFAULT_PROJECT_HANDOFF_SHARE = projectHandoffShare(7);

export function storyViewportEligible({ width, height, finePointer }) {
  return width >= 1024 && height >= 650 && Boolean(finePointer);
}

export function shouldRestoreProjectInStory({ enhanced, projectIsAnchor }) {
  return Boolean(enhanced) && Boolean(projectIsAnchor);
}

export function projectPosition(progress, projectCount) {
  if (!Number.isInteger(projectCount) || projectCount < 1) return 0;
  return clamp(progress) * Math.max(0, projectCount - 1);
}

export function projectIndex(progress, projectCount) {
  return Math.round(projectPosition(progress, projectCount));
}

export function projectStoryState(progress, projectCount, handoffShare = projectHandoffShare(projectCount)) {
  const storyProgress = clamp(progress);
  const normalizedHandoffShare = clamp(handoffShare, 0, 0.95);
  const cardShare = 1 - normalizedHandoffShare;
  const atHandoffBoundary = storyProgress >= cardShare - Number.EPSILON * 4;
  const cardProgress = atHandoffBoundary ? 1 : clamp(storyProgress / cardShare);
  const cardPosition = projectPosition(cardProgress, projectCount);
  const activeIndex = projectIndex(cardProgress, projectCount);
  let handoffProgress = 0;
  if (storyProgress >= 1 && normalizedHandoffShare > 0) {
    handoffProgress = 1;
  } else if (normalizedHandoffShare > 0 && atHandoffBoundary) {
    handoffProgress = clamp((storyProgress - cardShare) / normalizedHandoffShare);
  }

  return { cardProgress, cardPosition, activeIndex, handoffProgress };
}

function stageProgress(progress, start, end) {
  return clamp((clamp(progress) - start) / Math.max(Number.EPSILON, end - start));
}

export function handoffCircuitState(progress) {
  return {
    projectFadeProgress: stageProgress(progress, 0, 0.15),
    sourceBuildProgress: stageProgress(progress, 0.17, 0.29),
    logicBuildProgress: stageProgress(progress, 0.27, 0.42),
    wiringProgress: stageProgress(progress, 0.39, 0.55),
    switchProgress: stageProgress(progress, 0.55, 0.62),
    sourceCurrentProgress: stageProgress(progress, 0.62, 0.74),
    r2ReturnProgress: stageProgress(progress, 0.72, 0.8),
    latchSignalProgress: stageProgress(progress, 0.7, 0.82),
    gateSignalProgress: stageProgress(progress, 0.82, 0.87),
    mosfetEnableProgress: stageProgress(progress, 0.87, 0.9),
    switchedOutputProgress: stageProgress(progress, 0.9, 1),
  };
}

export function mobileHandoffCircuitState(progress) {
  return {
    projectFadeProgress: 1,
    sourceBuildProgress: stageProgress(progress, 0, 0.16),
    logicBuildProgress: stageProgress(progress, 0.12, 0.3),
    wiringProgress: stageProgress(progress, 0.26, 0.48),
    switchProgress: stageProgress(progress, 0.48, 0.56),
    sourceCurrentProgress: stageProgress(progress, 0.56, 0.7),
    r2ReturnProgress: stageProgress(progress, 0.61, 0.72),
    latchSignalProgress: stageProgress(progress, 0.66, 0.8),
    gateSignalProgress: stageProgress(progress, 0.8, 0.85),
    mosfetEnableProgress: stageProgress(progress, 0.85, 0.89),
    switchedOutputProgress: stageProgress(progress, 0.89, 1),
  };
}

export function clampProjectIndex(index, projectCount) {
  if (!Number.isInteger(projectCount) || projectCount < 1) return 0;
  return Math.round(clamp(Number(index), 0, projectCount - 1));
}

export function projectCardState(index, position, nearbyRadius = 2.05) {
  const offset = index - position;
  const distance = Math.min(Math.abs(offset), 3);
  return { offset, distance, nearby: Math.abs(offset) <= nearbyRadius };
}

export function centeredTrackOffset(cardLeft, cardWidth, trackWidth, maximumScroll) {
  const target = cardLeft + cardWidth / 2 - trackWidth / 2;
  return clamp(target, 0, Math.max(0, maximumScroll));
}

export function projectNavigationState(index, projectCount) {
  const activeIndex = clampProjectIndex(index, projectCount);
  return {
    activeIndex,
    previousDisabled: activeIndex <= 0,
    nextDisabled: projectCount < 1 || activeIndex >= projectCount - 1,
  };
}
