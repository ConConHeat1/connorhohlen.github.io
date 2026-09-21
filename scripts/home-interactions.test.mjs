import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULT_PROJECT_TERMINAL_HANDOFF_VH,
  DEFAULT_SCHEMATIC_BRANCH_SPAN,
  HANDOFF_COMPLETION_BOUNDARY,
  cachedSceneProgress,
  centeredTrackOffset,
  clamp,
  clampProjectIndex,
  handoffCircuitState,
  mobileHandoffCircuitState,
  projectCardState,
  projectIsCentered,
  projectHandoffShare,
  projectIndex,
  projectNavigationState,
  projectPosition,
  projectStoryState,
  schematicBranchProgress,
  schematicEntryProgress,
  schematicGroundProgress,
  schematicSegmentProgress,
  schematicStoryProgress,
  sceneProgress,
  shouldRestoreProjectInStory,
  storyHeightVh,
  storyViewportEligible,
} from "../assets/js/home-state.mjs";

const indexMarkup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const siteStyles = readFileSync(new URL("../assets/css/site.css", import.meta.url), "utf8");
const homeStyles = readFileSync(new URL("../assets/css/home.css", import.meta.url), "utf8");
const homeScript = readFileSync(new URL("../assets/js/home.mjs", import.meta.url), "utf8");

const approximatelyEqual = (actual, expected) => {
  assert.ok(
    Math.abs(actual - expected) < Number.EPSILON * 8,
    `expected ${actual} to approximately equal ${expected}`,
  );
};

const attributeValues = (markup, hook, attribute) => {
  const tags = markup.match(new RegExp(`<[^>]+${hook}(?:[\\s=>])[^>]*>`, "g")) || [];
  return tags
    .map((tag) => tag.match(new RegExp(`${attribute}="([^"]+)"`))?.[1])
    .filter(Boolean);
};

test("scene progress follows the native scroll range and clamps at both ends", () => {
  assert.equal(sceneProgress(200, 1800, 900), 0);
  assert.equal(sceneProgress(0, 1800, 900), 0);
  assert.equal(sceneProgress(-450, 1800, 900), 0.5);
  assert.equal(sceneProgress(-900, 1800, 900), 1);
  assert.equal(sceneProgress(-1400, 1800, 900), 1);
});

test("project progress maps continuously and selects the nearest real project", () => {
  assert.equal(projectPosition(0, 7), 0);
  assert.equal(projectPosition(0.5, 7), 3);
  assert.equal(projectPosition(1, 7), 6);
  assert.equal(projectIndex(0.26, 7), 2);
  assert.equal(projectIndex(0.91, 7), 5);
});

test("direct project controls clamp invalid and boundary selections", () => {
  assert.equal(clampProjectIndex(-4, 7), 0);
  assert.equal(clampProjectIndex(3.4, 7), 3);
  assert.equal(clampProjectIndex(99, 7), 6);
  assert.equal(clampProjectIndex(Number.NaN, 7), 0);
  assert.equal(clamp(1.5), 1);
});

test("cached scene progress uses document geometry without per-frame layout input", () => {
  assert.equal(cachedSceneProgress(500, 500, 900), 0);
  assert.equal(cachedSceneProgress(950, 500, 900), 0.5);
  assert.equal(cachedSceneProgress(1600, 500, 900), 1);
});

test("schematic story progress uses cached geometry and a clamped viewport trigger", () => {
  assert.equal(schematicStoryProgress(300, 1000, 2000, 1000), 0);
  assert.equal(schematicStoryProgress(320, 1000, 2000, 1000), 0);
  assert.equal(schematicStoryProgress(1320, 1000, 2000, 1000), 0.5);
  assert.equal(schematicStoryProgress(2320, 1000, 2000, 1000), 1);
  assert.equal(schematicStoryProgress(4000, 1000, 2000, 1000), 1);
  assert.equal(schematicStoryProgress(Number.NaN, 1000, 2000, 1000), 0);
  assert.equal(schematicStoryProgress(500, 1000, 1000, 1000, 2), 0.5);
  assert.equal(schematicStoryProgress(500, 1000, 1000, 1000, -1), 0);
});

test("segment progress is deterministic on deep links and reverse scrolling", () => {
  const positions = [600, 820, 1020, 1220, 1620, 2200];
  const forward = positions.map((scrollY) => schematicSegmentProgress(scrollY, 1500, 800, 1000));
  const reverse = [...positions]
    .reverse()
    .map((scrollY) => schematicSegmentProgress(scrollY, 1500, 800, 1000));

  assert.deepEqual(forward, [0, 0, 0.25, 0.5, 1, 1]);
  assert.deepEqual(reverse, [...forward].reverse());
  assert.equal(schematicSegmentProgress(5000, 1500, 800, 1000), 1);
  assert.equal(schematicSegmentProgress(Number.NaN, 1500, 800, 1000), 0);
});

test("schematic branches start at their measured trunk junctions", () => {
  const junctionProgress = 0.42;
  const branchSpan = 0.18;

  assert.equal(DEFAULT_SCHEMATIC_BRANCH_SPAN, branchSpan);
  assert.equal(schematicBranchProgress(junctionProgress - 0.01, junctionProgress, branchSpan), 0);
  assert.equal(schematicBranchProgress(junctionProgress, junctionProgress, branchSpan), 0);
  approximatelyEqual(
    schematicBranchProgress(junctionProgress + branchSpan / 2, junctionProgress, branchSpan),
    0.5,
  );
  assert.equal(schematicBranchProgress(junctionProgress + branchSpan, junctionProgress, branchSpan), 1);
  assert.equal(schematicBranchProgress(1, junctionProgress, branchSpan), 1);

  // Inputs outside the normalized story range remain deterministic and safe.
  assert.equal(schematicBranchProgress(Number.NaN, junctionProgress), 0);
  approximatelyEqual(schematicBranchProgress(0.09, Number.NaN), 0.5);
  assert.equal(schematicBranchProgress(0.5, 2), 0);
  approximatelyEqual(schematicBranchProgress(0.99, 0.98, 0.18), 0.5);
  approximatelyEqual(schematicBranchProgress(0.59, 0.5, Number.NaN), 0.5);
});

test("Skills entry waits for the completed switched output", () => {
  assert.equal(HANDOFF_COMPLETION_BOUNDARY, 1);
  assert.equal(schematicEntryProgress(0.4, 0), 0);
  assert.equal(schematicEntryProgress(0.4, 0.999), 0);
  assert.equal(schematicEntryProgress(0.4, 1), 0.4);
  assert.equal(schematicEntryProgress(2, 1), 1);
  assert.equal(schematicEntryProgress(0.4, Number.NaN), 0);
});

test("the final ground completes inside the reachable document range", () => {
  assert.equal(schematicGroundProgress(119, 1000, 1000, 5000), 0);
  assert.equal(schematicGroundProgress(120, 1000, 1000, 5000), 0);
  approximatelyEqual(schematicGroundProgress(270, 1000, 1000, 5000), 0.5);
  assert.equal(schematicGroundProgress(420, 1000, 1000, 5000), 1);

  // When the natural completion point is beyond the page bottom, the same
  // animation is normalized into the remaining reachable scroll distance.
  assert.equal(schematicGroundProgress(120, 1000, 1000, 300), 0);
  approximatelyEqual(schematicGroundProgress(210, 1000, 1000, 300), 0.5);
  assert.equal(schematicGroundProgress(300, 1000, 1000, 300), 1);
  assert.equal(schematicGroundProgress(3000, 1000, 1000, 300), 1);
  assert.equal(schematicGroundProgress(0, 1000, 1000, 50), 0);
  approximatelyEqual(schematicGroundProgress(25, 1000, 1000, 50), 0.5);
  assert.equal(schematicGroundProgress(50, 1000, 1000, 50), 1);
  assert.equal(schematicGroundProgress(Number.NaN, 1000, 1000, 300), 0);
  assert.equal(schematicGroundProgress(300, Number.NaN, 1000, 300), 0);

  const positions = [0, 120, 210, 300, 600];
  const forward = positions.map((scrollY) => schematicGroundProgress(scrollY, 1000, 1000, 300));
  const reverse = [...positions].reverse().map((scrollY) => schematicGroundProgress(scrollY, 1000, 1000, 300));
  assert.deepEqual(reverse, [...forward].reverse());
});

test("story height scales with the real project count", () => {
  assert.equal(DEFAULT_PROJECT_TERMINAL_HANDOFF_VH, 240);
  assert.equal(DEFAULT_PROJECT_TERMINAL_HANDOFF_VH / 200, 1.2);
  assert.equal(storyHeightVh(1), 340);
  assert.equal(storyHeightVh(7), 592);
  assert.equal(storyHeightVh(0), 100);
  assert.equal(storyHeightVh(7, 42, 0), 352);
  assert.equal(storyHeightVh(2, 40, 30), 170);
  assert.equal(projectHandoffShare(7), 240 / (6 * 42 + 240));
  assert.equal(projectHandoffShare(7, 42, 0), 0);
  assert.equal(projectHandoffShare(0), 0);
});

test("project story holds the final card while the terminal handoff completes", () => {
  assert.deepEqual(projectStoryState(0, 7), {
    cardProgress: 0,
    cardPosition: 0,
    activeIndex: 0,
    handoffProgress: 0,
  });

  const handoffShare = projectHandoffShare(7);
  const handoffStart = 1 - handoffShare;
  const handoffBoundary = projectStoryState(handoffStart, 7);
  assert.equal(handoffBoundary.cardProgress, 1);
  assert.equal(handoffBoundary.cardPosition, 6);
  assert.equal(handoffBoundary.activeIndex, 6);
  assert.equal(handoffBoundary.handoffProgress, 0);

  const halfwayThroughHandoff = projectStoryState(handoffStart + handoffShare / 2, 7);
  assert.equal(halfwayThroughHandoff.cardProgress, 1);
  assert.equal(halfwayThroughHandoff.cardPosition, 6);
  assert.equal(halfwayThroughHandoff.activeIndex, 6);
  assert.ok(Math.abs(halfwayThroughHandoff.handoffProgress - 0.5) < Number.EPSILON * 4);

  assert.deepEqual(projectStoryState(1, 7), {
    cardProgress: 1,
    cardPosition: 6,
    activeIndex: 6,
    handoffProgress: 1,
  });
});

test("desktop handoff follows every exact circuit phase boundary", () => {
  const stages = [
    ["projectFadeProgress", 0, 0.15],
    ["sourceBuildProgress", 0.17, 0.29],
    ["logicBuildProgress", 0.27, 0.42],
    ["wiringProgress", 0.39, 0.55],
    ["switchProgress", 0.55, 0.62],
    ["sourceCurrentProgress", 0.62, 0.74],
    ["r2ReturnProgress", 0.72, 0.8],
    ["latchSignalProgress", 0.7, 0.82],
    ["gateSignalProgress", 0.82, 0.87],
    ["mosfetEnableProgress", 0.87, 0.9],
    ["switchedOutputProgress", 0.9, 1],
  ];

  assert.deepEqual(Object.keys(handoffCircuitState(0.5)), stages.map(([field]) => field));

  for (const [field, start, end] of stages) {
    assert.equal(handoffCircuitState(start)[field], 0, `${field} starts at ${start}`);
    approximatelyEqual(handoffCircuitState((start + end) / 2)[field], 0.5);
    assert.equal(handoffCircuitState(end)[field], 1, `${field} completes at ${end}`);
  }

  assert.ok(Object.values(handoffCircuitState(-1)).every((value) => value === 0));
  assert.ok(Object.values(handoffCircuitState(2)).every((value) => value === 1));
});

test("desktop projects fully fade before any circuit geometry builds", () => {
  const fadeComplete = handoffCircuitState(0.15);
  const cleanGap = handoffCircuitState(0.16);
  const buildStart = handoffCircuitState(0.17);
  const buildFields = ["sourceBuildProgress", "logicBuildProgress", "wiringProgress"];

  assert.equal(fadeComplete.projectFadeProgress, 1);
  assert.ok(buildFields.every((field) => fadeComplete[field] === 0));
  assert.equal(cleanGap.projectFadeProgress, 1);
  assert.ok(buildFields.every((field) => cleanGap[field] === 0));
  assert.ok(buildFields.every((field) => buildStart[field] === 0));
  assert.ok(handoffCircuitState(0.18).sourceBuildProgress > 0);
  assert.equal(handoffCircuitState(0.62).switchProgress, 1);
  assert.equal(handoffCircuitState(0.62).sourceCurrentProgress, 0);
});

test("P-MOS output current waits for the gate signal and enabled channel", () => {
  const desktopGateComplete = handoffCircuitState(0.87);
  const desktopMosfetComplete = handoffCircuitState(0.9);
  assert.equal(desktopGateComplete.gateSignalProgress, 1);
  assert.equal(desktopGateComplete.switchedOutputProgress, 0);
  assert.equal(desktopMosfetComplete.mosfetEnableProgress, 1);
  assert.equal(desktopMosfetComplete.switchedOutputProgress, 0);
  assert.ok(handoffCircuitState(0.91).switchedOutputProgress > 0);

  const mobileGateComplete = mobileHandoffCircuitState(0.85);
  const mobileMosfetComplete = mobileHandoffCircuitState(0.89);
  assert.equal(mobileGateComplete.gateSignalProgress, 1);
  assert.equal(mobileGateComplete.switchedOutputProgress, 0);
  assert.equal(mobileMosfetComplete.mosfetEnableProgress, 1);
  assert.equal(mobileMosfetComplete.switchedOutputProgress, 0);
  assert.ok(mobileHandoffCircuitState(0.9).switchedOutputProgress > 0);
});

test("only the SET-side R2 return powers after current reaches its junction", () => {
  const desktopBeforeR2 = handoffCircuitState(0.72);
  assert.ok(desktopBeforeR2.sourceCurrentProgress > 0.8);
  assert.equal(desktopBeforeR2.r2ReturnProgress, 0);
  assert.ok(handoffCircuitState(0.73).r2ReturnProgress > 0);

  const mobileBeforeR2 = mobileHandoffCircuitState(0.61);
  assert.ok(mobileBeforeR2.sourceCurrentProgress > 0.35);
  assert.equal(mobileBeforeR2.r2ReturnProgress, 0);
  assert.ok(mobileHandoffCircuitState(0.62).r2ReturnProgress > 0);
});

test("mobile handoff follows the compact normal-flow circuit sequence", () => {
  const stages = [
    ["sourceBuildProgress", 0, 0.16],
    ["logicBuildProgress", 0.12, 0.3],
    ["wiringProgress", 0.26, 0.48],
    ["switchProgress", 0.48, 0.56],
    ["sourceCurrentProgress", 0.56, 0.7],
    ["r2ReturnProgress", 0.61, 0.72],
    ["latchSignalProgress", 0.66, 0.8],
    ["gateSignalProgress", 0.8, 0.85],
    ["mosfetEnableProgress", 0.85, 0.89],
    ["switchedOutputProgress", 0.89, 1],
  ];

  assert.deepEqual(
    Object.keys(mobileHandoffCircuitState(0.5)),
    ["projectFadeProgress", ...stages.map(([field]) => field)],
  );
  assert.equal(mobileHandoffCircuitState(Number.NaN).projectFadeProgress, 1);
  for (const [field, start, end] of stages) {
    assert.equal(mobileHandoffCircuitState(start)[field], 0, `${field} starts at ${start}`);
    approximatelyEqual(mobileHandoffCircuitState((start + end) / 2)[field], 0.5);
    assert.equal(mobileHandoffCircuitState(end)[field], 1, `${field} completes at ${end}`);
  }

  assert.ok(Object.values(mobileHandoffCircuitState(2)).every((value) => value === 1));
});

test("circuit states are monotonic forward and deterministic in reverse", () => {
  const positions = Array.from({ length: 21 }, (_, index) => index / 20);

  for (const stateForProgress of [handoffCircuitState, mobileHandoffCircuitState]) {
    const forward = positions.map(stateForProgress);
    const reverse = [...positions].reverse().map(stateForProgress);

    assert.deepEqual(reverse, [...forward].reverse());
    for (const field of Object.keys(forward[0])) {
      for (let index = 1; index < forward.length; index += 1) {
        assert.ok(forward[index][field] >= forward[index - 1][field], `${field} must not unwind forward`);
      }
    }
  }
});

test("project story safely supports a disabled or custom handoff phase", () => {
  assert.deepEqual(projectStoryState(0.5, 3, 0), {
    cardProgress: 0.5,
    cardPosition: 1,
    activeIndex: 1,
    handoffProgress: 0,
  });
  assert.equal(projectStoryState(0.75, 3, 0.5).handoffProgress, 0.5);
  assert.equal(projectStoryState(Number.NaN, 0).activeIndex, 0);
});

test("story mode depends on viewport and pointer capability, not motion state", () => {
  const baseline = { width: 1440, height: 900, finePointer: true, motionState: "full" };
  assert.equal(storyViewportEligible(baseline), true);
  assert.equal(storyViewportEligible({ ...baseline, width: 1023 }), false);
  assert.equal(storyViewportEligible({ ...baseline, height: 649 }), false);
  assert.equal(storyViewportEligible({ ...baseline, finePointer: false }), false);
  assert.equal(storyViewportEligible({ ...baseline, motionState: "reduced" }), true);
  assert.equal(storyViewportEligible({ ...baseline, motionState: "off" }), true);
  assert.equal(storyViewportEligible({ ...baseline, motionState: undefined }), true);
});

test("story geometry changes preserve the selected project while projects are in focus", () => {
  assert.equal(shouldRestoreProjectInStory({ wasEnhanced: false, enhanced: true, projectIsAnchor: true }), true);
  assert.equal(shouldRestoreProjectInStory({ wasEnhanced: false, enhanced: true, projectIsAnchor: false }), false);
  assert.equal(shouldRestoreProjectInStory({ wasEnhanced: true, enhanced: true, projectIsAnchor: true }), true);
  assert.equal(shouldRestoreProjectInStory({ wasEnhanced: false, enhanced: false, projectIsAnchor: true }), false);
});

test("every schematic section has a one-to-one branch and module mapping", () => {
  const expectedSections = new Map([
    ["skills", ["programming", "mobile-cloud", "hardware-embedded", "development-tools"]],
    ["work", ["work-amur", "work-menards"]],
    ["education", ["education-unl", "education-northwest"]],
  ]);
  const sections = [...indexMarkup.matchAll(
    /<section\b[^>]*data-schematic-section="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g,
  )];

  assert.deepEqual(sections.map((match) => match[1]), [...expectedSections.keys()]);
  for (const [, sectionName, sectionMarkup] of sections) {
    const expectedKeys = expectedSections.get(sectionName);
    const branchKeys = attributeValues(sectionMarkup, "data-schematic-branch", "data-schematic-key");
    const moduleKeys = attributeValues(sectionMarkup, "data-schematic-module", "data-schematic-key");
    const junctions = sectionMarkup.match(/class="schematic-junction"[^>]*r="6"/g) || [];
    const terminals = sectionMarkup.match(/data-schematic-terminal(?:[\s=>])/g) || [];
    const normalizedTerminals = sectionMarkup.match(/class="schematic-terminal"[^>]*r="7"/g) || [];

    assert.deepEqual(branchKeys, expectedKeys, `${sectionName} branch keys`);
    assert.deepEqual(moduleKeys, expectedKeys, `${sectionName} module keys`);
    assert.equal(new Set(branchKeys).size, branchKeys.length, `${sectionName} branch keys must be unique`);
    assert.equal(new Set(moduleKeys).size, moduleKeys.length, `${sectionName} module keys must be unique`);
    assert.equal(junctions.length, moduleKeys.length, `${sectionName} has one normalized trunk junction per module`);
    assert.equal(terminals.length, moduleKeys.length, `${sectionName} has one SVG terminal per module`);
    assert.equal(normalizedTerminals.length, moduleKeys.length, `${sectionName} uses one normalized card terminal per module`);
  }
  assert.match(
    homeStyles,
    /\.schematic-section \.capability-grid \.skill-card::after\s*\{\s*content:\s*none;/,
  );
});

test("both responsive handoff circuits expose readable build and current hooks", () => {
  const circuitSvgs = [...indexMarkup.matchAll(
    /<svg\b(?=[^>]*class="[^"]*\bproject-handoff-circuit\b[^"]*")[^>]*>[\s\S]*?<\/svg>/g,
  )].map((match) => match[0]);
  const layouts = circuitSvgs.map((svg) => svg.match(/\bhandoff-layout-(desktop|mobile)\b/)?.[1]);
  const expectedRails = ["vcc", "gnd", "set", "reset", "q", "qbar", "qbar-driver", "switched-vcc"];
  const expectedCurrentStages = ["source", "r2", "latch", "output"];

  assert.deepEqual(layouts, ["desktop", "mobile"]);
  circuitSvgs.forEach((svg, index) => {
    const layout = layouts[index];
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /focusable="false"/);
    assert.match(svg, /data-circuit-source(?:[\s=>])/);
    assert.match(svg, /data-circuit-switch(?:[\s=>])/);
    assert.match(svg, /data-circuit-mosfet(?:[\s=>])/);
    assert.match(svg, />5 V</);
    assert.match(svg, />SET \/ ON</);
    assert.match(svg, />RESET \/ OFF</);
    assert.equal((svg.match(/>NOR</g) || []).length, 2);
    assert.match(svg, />Q</);
    assert.match(svg, />Q̄</);
    assert.equal((svg.match(/>P-MOS<\/text>/g) || []).length, 1);
    assert.doesNotMatch(svg, />Q1|Q1 ·|P-channel high-side switch/i);
    assert.match(svg, /class="handoff-mosfet-channel/);
    assert.match(svg, /ACTIVE-HIGH SR LATCH/);
    assert.match(svg, /Q̄ LOW = ON/);
    assert.match(svg, /data-circuit-resistor="reset"/);
    assert.match(svg, /data-circuit-resistor="set"/);
    assert.match(svg, /data-low-state-path/);
    assert.match(svg, /data-low-state-path data-current-stage="gate"/);
    assert.doesNotMatch(svg, /SYSTEM BUS|Skills · Work · Education/);
    assert.doesNotMatch(svg, /handoff-bus-node|handoff-bus-core/);
    assert.doesNotMatch(svg, /MPU-6050|BMP180|Arduino|SDA|SCL|Serial/i);
    assert.match(svg, /<text\b/i);
    assert.doesNotMatch(svg, /<foreignObject\b/i);

    const railValues = [...new Set(attributeValues(svg, "data-circuit-rail", "data-circuit-rail"))];
    const buildStages = [...new Set(attributeValues(svg, "data-handoff-stage", "data-handoff-stage"))];
    const currentStages = [...new Set(attributeValues(svg, "data-current-path", "data-current-stage"))];
    const currentPaths = svg.match(/<(?:path|rect)\b[^>]*data-current-path(?:[\s=>])[^>]*>/g) || [];

    assert.deepEqual([...railValues].sort(), [...expectedRails].sort());
    assert.deepEqual(buildStages, ["source", "logic", "wiring", "driver"]);
    assert.deepEqual([...currentStages].sort(), [...expectedCurrentStages].sort());
    assert.equal(currentPaths.length, 8);
    assert.ok(currentPaths.every((path) => /data-current-stage="(source|r2|latch|output)"/.test(path)));
    assert.equal((svg.match(/data-current-stage="r2"/g) || []).length, 2);
    assert.equal((svg.match(/data-circuit-rail="switched-vcc"/g) || []).length, 1);
    assert.doesNotMatch(svg, /data-circuit-rail="bus"/);
    assert.match(svg, /class="[^"]*handoff-current-trail[^"]*"/);
    assert.match(svg, /class="[^"]*handoff-current-head[^"]*"/);
    assert.doesNotMatch(svg, /class="handoff-logic-state-(?:trail|head)"[^>]*d="[^"]*Q/);

    if (layout === "desktop") {
      assert.match(svg, /d="M390 220H440H540V225H604" data-circuit-rail="reset" data-nor-anchor="upper-r"/);
      assert.match(svg, /d="M390 360H500H540V415H608" data-circuit-rail="set" data-nor-anchor="lower-s"/);
      assert.match(svg, /d="M764 250H820V455H520V365H608" data-circuit-rail="q" data-nor-anchor="lower-feedback"/);
      assert.match(svg, /d="M764 390H854V315H520V275H608" data-circuit-rail="qbar" data-nor-anchor="upper-feedback"/);
      assert.equal((svg.match(/d="M228 140H290V360H330H390H500H540V415H608"/g) || []).length, 2);
      assert.equal((svg.match(/d="M764 390H854V315H520V275H608"/g) || []).length, 3);
      assert.match(svg, /d="M440 220V250L428 262L452 278L428 294L452 310L440 322V520" data-circuit-resistor="reset"/);
      assert.match(svg, /d="M500 360V390L488 402L512 418L488 434L512 450L500 462V520" data-circuit-resistor="set"/);
      assert.match(svg, /d="M228 276H266V520H540" data-circuit-rail="gnd"/);
      assert.match(svg, /d="M500 520V540M460 540H540M472 554H528M486 568H514"/);
      assert.match(svg, /d="M1040 196V376H1120V500H600V896" data-circuit-rail="switched-vcc"/);
      assert.equal((svg.match(/d="M228 140H1040V196V376H1120V500H600V896"/g) || []).length, 2);
    } else {
      assert.match(svg, /d="M272 88H300H420V356H130" data-circuit-rail="reset" data-nor-anchor="upper-r"/);
      assert.match(svg, /d="M272 176H338H392V496H134" data-circuit-rail="set" data-nor-anchor="lower-s"/);
      assert.match(svg, /d="M276 374H320V574H88V536H134" data-circuit-rail="q" data-nor-anchor="lower-feedback"/);
      assert.match(svg, /d="M276 516H350V446H88V394H134" data-circuit-rail="qbar" data-nor-anchor="upper-feedback"/);
      assert.equal((svg.match(/d="M162 72H196V176H226H272H338H392V496H134"/g) || []).length, 2);
      assert.equal((svg.match(/d="M276 516H350V446H88V394H134"/g) || []).length, 3);
      assert.match(svg, /d="M300 88V108L290 118L310 132L290 146L310 160L300 170V278" data-circuit-resistor="reset"/);
      assert.match(svg, /d="M338 176V196L328 206L348 220L328 234L348 248L338 258V278" data-circuit-resistor="set"/);
      assert.match(svg, /d="M162 194H180V278H360" data-circuit-rail="gnd"/);
      assert.match(svg, /d="M338 278V292M302 292H374M312 304H364M324 316H352"/);
      assert.match(svg, /d="M276 628V760V840H240V996" data-circuit-rail="switched-vcc"/);
      assert.equal((svg.match(/d="M162 72H436V628H276V760V840H240V996"/g) || []).length, 2);
    }
    assert.equal((svg.match(/data-handoff-output-anchor(?:[\s=>])/g) || []).length, 1);
  });

  assert.equal((indexMarkup.match(/data-schematic-ground(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-ground-current(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-ground-head(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-ground-symbol(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-ground-entry(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-bridge(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-bridge-guide(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-bridge-line(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-bridge-current(?:[\s=>])/g) || []).length, 1);
  assert.equal((indexMarkup.match(/data-schematic-entry-anchor(?:[\s=>])/g) || []).length, 1);
  assert.doesNotMatch(indexMarkup, />GROUND · 0 V</);
  assert.doesNotMatch(indexMarkup, /schematic-ground-terminal|schematic-ground-label/);
  assert.doesNotMatch(indexMarkup, /data-schematic-endpoint|SYSTEM COMPLETE/);
  assert.doesNotMatch(indexMarkup, /data-handoff-stage="output"|handoff-output-stage/);
  assert.doesNotMatch(indexMarkup, /handoff-r1-current/);
  assert.match(homeStyles, /\.handoff-reset-switch \.handoff-switch-blade\s*\{\s*transform:\s*none;/);
  assert.match(homeStyles, /\.handoff-reset-switch \.handoff-switch-contact\s*\{\s*fill-opacity:\s*0;/);
  assert.doesNotMatch(homeStyles, /stroke-dashoffset:\s*calc\(1 - var\(--handoff-stage-progress\)\)/);
  assert.match(homeStyles, /opacity:\s*clamp\(0, calc\(var\(--handoff-current-progress\) \* 1000\), 1\)/);
  assert.match(homeStyles, /opacity:\s*var\(--handoff-head-opacity\)/);
  assert.match(homeStyles, /opacity:\s*var\(--handoff-current-gate\)/);
  assert.match(homeStyles, /opacity:\s*clamp\(0, calc\(var\(--segment-progress, 0\) \* 1000\), 1\)/);
  assert.match(homeStyles, /opacity:\s*clamp\(0, calc\(var\(--branch-progress, 0\) \* 1000\), 1\)/);
  assert.match(homeStyles, /\.handoff-mosfet-channel\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?filter:\s*none;/);
  assert.match(homeStyles, /\[data-schematic-branch\]\.is-powered \.schematic-terminal/);
  assert.match(homeScript, /const schematicTerminalClearance = 7;/);
  assert.match(homeScript, /const schematicEntryOverlap = 16;/);
  assert.match(homeScript, /const schematicSegmentOverlap = 3;/);
  assert.match(homeScript, /const schematicBridgeOverlap = 3;/);
  assert.match(homeScript, /schematicEntryProgress\(progress, currentHandoffState\.switchedOutputProgress\)/);
  assert.match(homeScript, /routeStartY = segment === schematicSegments\[0\] \? -schematicEntryOverlap : -schematicSegmentOverlap/);
  assert.match(homeScript, /moduleBoundsForBranch\.left - sectionBounds\.left - schematicTerminalClearance/);
  assert.match(homeScript, /function measureSchematicBridge\(storyBounds\)/);
  assert.match(homeScript, /renderSchematicBridge\(currentHandoffState\.switchedOutputProgress\)/);
  assert.match(homeStyles, /\.handoff-current-trail\[data-current-stage="output"\]\s*\{\s*stroke-dashoffset:\s*0;/);
});

test("ground ends Education directly before About and Contact", () => {
  const educationPosition = indexMarkup.indexOf('data-schematic-section="education"');
  const groundPosition = indexMarkup.indexOf("data-schematic-ground");
  const educationClosePosition = indexMarkup.indexOf("</section>", groundPosition);
  const contactSection = indexMarkup.match(/<section\b[^>]*id="contact"[^>]*>([\s\S]*?)<\/section>/)?.[0] || "";
  const contactPosition = indexMarkup.indexOf(contactSection);

  assert.ok(educationPosition >= 0);
  assert.ok(groundPosition >= 0);
  assert.ok(groundPosition > educationPosition);
  assert.ok(educationClosePosition > groundPosition);
  assert.ok(contactPosition > groundPosition);
  assert.match(
    indexMarkup,
    /data-schematic-section="education"[\s\S]*?<div class="schematic-ground" data-schematic-ground[\s\S]*?<\/section>\s*<\/div>\s*<section class="section container contact-section/,
  );
  assert.match(contactSection, /class="[^"]*\bfinal-contact-section\b/);
  assert.doesNotMatch(contactSection, /data-schematic-/);
  assert.ok(contactSection.indexOf('id="about"') < contactSection.indexOf("data-contact-card"));
  assert.match(homeScript, /groundEntryProgress/);
  assert.match(homeScript, /schematicGroundAnchor\?\.getBoundingClientRect\(\)/);
  assert.match(homeScript, /schematicGroundEntry\?\.getBoundingClientRect\(\)/);
  assert.match(homeStyles, /\.education-blueprint\.schematic-section\s*\{[\s\S]*?min-height:\s*0;/);
});

test("hero art cleanup and the homepage grid use one consistent system", () => {
  const schematicBackdrop = homeStyles.match(/\.schematic-story::before\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.doesNotMatch(indexMarkup, /M126 126l80 80M474 126l-80 80M126 474l80-80M474 474l-80-80/);
  assert.match(homeStyles, /\.core-layer-software\s*\{[\s\S]*?width:\s*35%;/);
  assert.match(homeStyles, /\.core-layer-connected\s*\{[\s\S]*?width:\s*35%;/);
  assert.match(
    homeStyles,
    /body\[data-page="home"\]\s*\{[\s\S]*?background-size:\s*64px 64px, 64px 64px, auto, auto;/,
  );
  assert.doesNotMatch(homeStyles, /background-size:\s*[^;]*32px/);
  assert.doesNotMatch(schematicBackdrop, /linear-gradient\(var\(--blueprint-line\)/);
});

test("phones remove every circuit surface and bypass circuit animation", () => {
  assert.match(
    homeStyles,
    /@media \(max-width: 760px\) \{[\s\S]*?\.project-handoff,\s*\.schematic-handoff-bridge,\s*\.schematic-segment,\s*\.schematic-ground\s*\{\s*display:\s*none !important;/,
  );
  assert.match(homeStyles, /\.project-handoff\s*\{[\s\S]*?height:\s*0 !important;[\s\S]*?margin:\s*0 !important;/);
  assert.match(homeStyles, /\.schematic-heading\s*\{\s*width:\s*100%;\s*margin-inline:\s*0;/);
  assert.match(
    homeStyles,
    /\.schematic-section \.schematic-module::before,[\s\S]*?html:not\(\.js\) \.schematic-section::after\s*\{\s*display:\s*none;\s*content:\s*none;/,
  );
  assert.match(homeScript, /const phoneLayoutMaximumWidth = 760;/);
  assert.match(homeScript, /function usesPhoneLayout\(\) \{\s*return window\.innerWidth <= phoneLayoutMaximumWidth;/);
  assert.match(homeScript, /if \(usesPhoneLayout\(\)\) \{\s*sceneMetrics\.schematic = null;/);
  assert.match(homeScript, /mobileCircuitEnabled = !usesPhoneLayout\(\) && supportsSceneObservation && supportsResizeObservation/);
  assert.match(homeScript, /if \(usesPhoneLayout\(\)\) \{\s*resetSchematicProgress\(\);\s*return;/);
});

test("project controls release to vertical scrolling without a focus-derived freeze", () => {
  const wheelHandler = homeScript.match(/projectScene\?\.addEventListener\("wheel",[\s\S]*?\}, \{ passive: true \}\);/)?.[0] || "";
  const touchHandler = homeScript.match(/projectScene\?\.addEventListener\("touchmove",[\s\S]*?\}, \{ passive: true \}\);/)?.[0] || "";

  assert.doesNotMatch(homeScript, /projectFocusHeld|focusProtected/);
  assert.match(homeScript, /function releaseRequestedProject\(\)/);
  assert.match(homeScript, /function setProjectCarouselInert\(shouldBeInert\)/);
  assert.match(homeScript, /projectKeyboard\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(homeScript, /projectCarousel\.inert = shouldBeInert/);
  assert.match(wheelHandler, /verticalDelta >= horizontalDelta/);
  assert.match(wheelHandler, /horizontalDelta > verticalDelta/);
  assert.match(wheelHandler, /releaseRequestedProject\(\)/);
  assert.doesNotMatch(wheelHandler, /preventDefault/);
  assert.match(touchHandler, /Math\.max\(horizontalTravel, verticalTravel\) < 8/);
  assert.match(touchHandler, /releaseRequestedProject\(\)/);
  assert.doesNotMatch(touchHandler, /preventDefault/);
  assert.match(homeScript, /projectScrollKeys\.has\(event\.key\)/);
  assert.match(homeScript, /window\.addEventListener\("pageshow", \(\) => \{\s*releaseRequestedProject\(\)/);
  assert.match(homeScript, /restoreProjectInStandard/);
  assert.match(homeScript, /projectWasActive/);
  assert.match(homeScript, /projectScene\?\.scrollIntoView\(\{ block: "start", behavior: "auto" \}\)/);
  assert.match(homeStyles, /touch-action:\s*pan-x pan-y/);
  assert.match(homeStyles, /overscroll-behavior-y:\s*auto/);
  assert.match(homeStyles, /project-story-height, 592svh/);
  assert.doesNotMatch(homeStyles, /#contact \.contact-card\.schematic-module::after/);
  assert.doesNotMatch(homeStyles, /\.schematic-section \.schematic-module::after/);
  assert.doesNotMatch(homeStyles, /handoff-bus-node|handoff-bus-core/);
  assert.match(homeStyles, /body\[data-page="home"\] #about\s*\{[\s\S]*?scroll-margin-top:/);
  assert.match(homeStyles, /html:not\(\.js\) \.schematic-ground::before/);
});

test("the always-on page has no motion control and preserves static and keyboard fallbacks", () => {
  const projectStageTag = indexMarkup.match(/<section class="project-stage container"[^>]*>/)?.[0] || "";

  assert.doesNotMatch(indexMarkup, /data-motion-toggle|class="[^"]*\bmotion-toggle\b|Motion:\s*(?:On|Off|Reduced)/i);
  assert.doesNotMatch(indexMarkup, /project-handoff-frame|data-project-handoff-frame/);
  assert.doesNotMatch(homeScript, /motion-preferences|initializeMotionPreferences|subscribeMotion|prefers-reduced-motion/);
  assert.doesNotMatch(homeStyles, /data-motion="(?:reduced|off)"|prefers-reduced-motion/);
  assert.match(homeScript, /typeof window\.matchMedia === "function"/);
  assert.match(homeScript, /if \(supportsResizeObservation\)/);
  assert.match(homeScript, /scrollScenesEnabled = supportsSceneObservation && supportsResizeObservation/);
  assert.match(siteStyles, /\.reveal\s*\{\s*opacity:\s*1;/);
  assert.doesNotMatch(projectStageTag, /tabindex=|aria-describedby=/);
  assert.match(indexMarkup, /id="project-keyboard-help" hidden/);
  assert.match(indexMarkup, /data-project-position hidden/);
  assert.match(homeScript, /projectKeyboard\.tabIndex = 0;/);
  assert.match(homeScript, /projectKeyboard\.setAttribute\("aria-describedby", "project-keyboard-help"\);/);
  assert.match(homeScript, /projectKeyboardHelp\.hidden = false;/);
  assert.match(homeScript, /projectPositionLabel\.hidden = false;/);
});

test("project presentation keeps nearby layers and hides distant work", () => {
  assert.deepEqual(projectCardState(3, 3), { offset: 0, distance: 0, nearby: true });
  assert.equal(projectCardState(1, 3).nearby, true);
  assert.equal(projectCardState(0, 3).nearby, false);
  assert.equal(projectCardState(6, 0).distance, 3);
});

test("mobile centering and project boundary controls clamp safely", () => {
  assert.equal(centeredTrackOffset(400, 300, 390, 1000), 355);
  assert.equal(centeredTrackOffset(0, 300, 390, 1000), 0);
  assert.equal(centeredTrackOffset(1100, 300, 390, 1000), 1000);
  assert.deepEqual(projectNavigationState(0, 7), { activeIndex: 0, previousDisabled: true, nextDisabled: false });
  assert.deepEqual(projectNavigationState(6, 7), { activeIndex: 6, previousDisabled: false, nextDisabled: true });
});


test("a halfway or nearby card centers before it can open", () => {
  assert.equal(projectIsCentered(2, 1.5), false);
  assert.equal(projectIsCentered(2, 2.45), false);
  assert.equal(projectIsCentered(1, 2), false);
  assert.equal(projectIsCentered(2, 2), true);
  assert.equal(projectIsCentered(0, 0.002), true);
  assert.equal(projectIsCentered(7, 6.998), true);
  assert.equal(projectIsCentered(2, NaN), false);
});

test("dropdown, carousel, and previous/next pages share the same project order", () => {
  const order = ["orbit-shift", "wearable-ecg", "fpv-drone", "flexin", "sql-java-data-system", "led-lighting", "plant-monitor", "portfolio"];
  const script = readFileSync(new URL("../assets/js/site.js", import.meta.url), "utf8");
  const menu = script.slice(script.indexOf('label: "Projects"'), script.indexOf('label: "Experience"'));
  assert.deepEqual([...menu.matchAll(/url: "\/projects\/([^"/]+)\.html"/g)].map(m => m[1]), order);
  assert.deepEqual(attributeValues(indexMarkup, "data-project-card", "href"), order.map(id => `/projects/${id}.html`));
  order.forEach((id, index) => {
    const page = readFileSync(new URL(`../projects/${id}.html`, import.meta.url), "utf8");
    const nav = page.slice(page.indexOf('aria-label="Project navigation"'), page.indexOf('</main>'));
    assert.deepEqual([...nav.matchAll(/href="\/projects\/([^"/]+)\.html"/g)].map(m => m[1]), [order[(index + 7) % 8], order[(index + 1) % 8]]);
  });
});
