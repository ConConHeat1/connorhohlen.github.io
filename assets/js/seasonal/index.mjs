import {
  SEASONAL_EVENTS,
  SEASONAL_EVENT_BY_ID,
  getSpecialEventForDate,
  resolveEventPreview,
} from "./events.mjs";
import { createSeasonalEngine } from "./engine.mjs";

const EFFECTS_STORAGE_KEY = "portfolio-special-effects";
const root = document.documentElement;
const body = document.body;

if (body?.dataset.page === "home") {
  initializeSeasonalEvents();
}

function initializeSeasonalEvents() {
  const stage = document.querySelector("[data-seasonal-stage]");
  const canvas = document.querySelector("[data-seasonal-canvas]");
  const propLayer = document.querySelector("[data-seasonal-props]");
  const veil = document.querySelector("[data-seasonal-veil]");
  const toggle = document.querySelector("[data-seasonal-toggle]");
  const previewLauncher = document.querySelector("[data-event-preview-launcher]");
  const previewTray = document.querySelector("[data-event-preview]");
  const previewMinimize = document.querySelector("[data-event-preview-minimize]");
  const previewSelect = document.querySelector("[data-event-preview-select]");
  const previewAuto = document.querySelector("[data-event-preview-auto]");
  const previewClose = document.querySelector("[data-event-preview-close]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const primaryNav = document.querySelector("[data-primary-nav]");
  const brand = document.querySelector(".brand");
  const quoteText = document.querySelector("[data-daily-quote]");
  const quoteLabel = document.querySelector("[data-daily-quote-label]");
  const quoteDate = document.querySelector("[data-quote-date]");
  const quoteMark = document.querySelector("[data-quote-mark]");
  const quoteMetaLabel = document.querySelector("[data-quote-meta-label]");
  const greeting = document.querySelector("[data-special-greeting]");

  if (
    !stage ||
    !(canvas instanceof HTMLCanvasElement) ||
    !propLayer ||
    !veil ||
    !toggle ||
    !previewLauncher ||
    !previewTray ||
    !previewMinimize ||
    !previewSelect ||
    !quoteText ||
    !quoteLabel ||
    !quoteDate ||
    !quoteMark ||
    !quoteMetaLabel ||
    !greeting
  ) {
    return;
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let storedPreference = readStoredPreference();
  let effectsEnabled = storedPreference ? storedPreference === "on" : !motionPreference.matches;
  let currentEvent = null;
  let quoteGeneration = 0;
  let sceneGeneration = 0;
  let midnightTimer = 0;
  let quoteCache = null;
  let previewExpanded = true;
  const fallbackQuote = quoteText.textContent;

  const engine = createSeasonalEngine({
    canvas,
    propLayer,
    veil,
    getTheme: () => root.dataset.theme || "slate",
  });

  populatePreviewOptions();
  setPreviewVisibility();
  updateSeasonalState();
  scheduleMidnightUpdate();

  toggle.addEventListener("click", () => {
    effectsEnabled = !effectsEnabled;
    storedPreference = effectsEnabled ? "on" : "off";
    writeStoredPreference(storedPreference);
    updateToggle();
    updateScene(currentEvent);
  });

  previewLauncher.addEventListener("click", () => {
    const willExpand = !previewExpanded;
    setPreviewExpanded(willExpand);
    closeMobileNavigation();
    if (!willExpand) {
      focusPreviewReturnTarget();
      return;
    }

    previewSelect.focus({ preventScroll: true });
  });

  previewMinimize.addEventListener("click", () => {
    setPreviewExpanded(false, { returnFocus: true });
  });

  previewSelect.addEventListener("change", () => {
    setPreviewParameter(previewSelect.value);
    updateSeasonalState();
  });

  previewAuto?.addEventListener("click", () => {
    setPreviewParameter("auto");
    if (previewSelect) previewSelect.value = "auto";
    updateSeasonalState();
  });

  previewClose?.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("event-preview");
    window.history.replaceState(null, "", url);
    previewExpanded = true;
    setPreviewVisibility();
    updateSeasonalState();
    brand?.focus({ preventScroll: true });
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key !== "Escape" ||
      previewTray.hidden ||
      !new URL(window.location.href).searchParams.has("event-preview")
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setPreviewExpanded(false, { returnFocus: true });
  });

  const handleMotionChange = () => {
    if (storedPreference) return;
    effectsEnabled = !motionPreference.matches;
    updateToggle();
    updateScene(currentEvent);
  };

  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", handleMotionChange);
  } else {
    motionPreference.addListener(handleMotionChange);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      engine.pause();
      return;
    }
    updateSeasonalState();
    engine.resume();
    scheduleMidnightUpdate();
  });

  window.addEventListener("pageshow", () => {
    updateSeasonalState();
    engine.resume();
    scheduleMidnightUpdate();
  });

  window.addEventListener("pagehide", () => {
    engine.pause();
    window.clearTimeout(midnightTimer);
  });

  function populatePreviewOptions() {
    if (!previewSelect) return;
    const options = [
      new Option("Automatic — use today’s date", "auto"),
      new Option("None — ordinary home page", "none"),
      ...SEASONAL_EVENTS.map((event) => new Option(event.previewLabel, event.id)),
    ];
    previewSelect.replaceChildren(...options);
  }

  function setPreviewVisibility() {
    const url = new URL(window.location.href);
    const isPreview = url.searchParams.has("event-preview");
    previewLauncher.hidden = !isPreview || previewExpanded;
    previewTray.hidden = !isPreview || !previewExpanded;
    previewLauncher.setAttribute("aria-expanded", String(isPreview && previewExpanded));
    if (isPreview) {
      previewSelect.value = resolveEventPreview(url.searchParams.get("event-preview"));
    }
  }

  function setPreviewExpanded(expanded, { returnFocus = false } = {}) {
    const isPreview = new URL(window.location.href).searchParams.has("event-preview");
    previewExpanded = Boolean(expanded && isPreview);
    setPreviewVisibility();
    if (returnFocus && isPreview) focusPreviewReturnTarget();
  }

  function focusPreviewReturnTarget() {
    previewLauncher?.focus({ preventScroll: true });
  }

  function closeMobileNavigation() {
    if (!menuToggle || menuToggle.getAttribute("aria-expanded") !== "true") return false;
    menuToggle.click();
    return true;
  }

  function setPreviewParameter(value) {
    const url = new URL(window.location.href);
    url.searchParams.set("event-preview", resolveEventPreview(value));
    window.history.replaceState(null, "", url);
    setPreviewVisibility();
  }

  function resolveCurrentEvent(now) {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("event-preview")) return getSpecialEventForDate(now);

    const selection = resolveEventPreview(url.searchParams.get("event-preview"));
    if (selection === "none") return null;
    if (selection === "auto") return getSpecialEventForDate(now);

    const config = SEASONAL_EVENT_BY_ID[selection];
    return Object.freeze({
      ...config,
      greeting: config.greetings.default,
    });
  }

  function updateSeasonalState() {
    const generation = ++quoteGeneration;
    const now = new Date();
    currentEvent = resolveCurrentEvent(now);
    quoteDate.textContent = dateFormatter.format(now);

    if (previewSelect && !previewTray?.hidden) {
      const url = new URL(window.location.href);
      previewSelect.value = resolveEventPreview(url.searchParams.get("event-preview"));
    }

    if (currentEvent) {
      body.dataset.specialEvent = currentEvent.id;
      showGreeting(currentEvent);
    } else {
      delete body.dataset.specialEvent;
      showDailyQuote(now, generation);
    }

    updateToggle();
    updateScene(currentEvent);
  }

  function showGreeting(event) {
    quoteText.hidden = true;
    greeting.hidden = false;
    greeting.textContent = event.greeting;
    quoteLabel.textContent = "Today’s celebration";
    quoteMetaLabel.textContent = event.label;
    quoteMark.textContent = "✦";
  }

  function showDailyQuote(now, generation) {
    greeting.hidden = true;
    greeting.textContent = "";
    quoteText.hidden = false;
    quoteLabel.textContent = "Quote of the day";
    quoteMetaLabel.textContent = "Fresh perspective";
    quoteMark.textContent = "“";

    loadDailyQuote(now)
      .then((quote) => {
        if (generation !== quoteGeneration || currentEvent || !quote) return;
        quoteText.textContent = quote;
      })
      .catch(() => {
        if (!quoteText.textContent) quoteText.textContent = fallbackQuote;
      });
  }

  function loadDailyQuote(now) {
    const dateKey = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    if (quoteCache?.dateKey === dateKey) return quoteCache.promise;

    let dateHash = 0;
    for (const character of dateKey) {
      dateHash = ((dateHash << 5) - dateHash + character.charCodeAt(0)) | 0;
    }

    const promise = fetch("/quotes.txt")
      .then((response) => {
        if (!response.ok) throw new Error("Quote collection unavailable");
        return response.text();
      })
      .then((text) => {
        const quotes = text
          .split(/\r?\n/)
          .map((quote) => quote.trim())
          .filter(Boolean);
        return quotes.length ? quotes[Math.abs(dateHash) % quotes.length] : fallbackQuote;
      })
      .catch(() => fallbackQuote);

    quoteCache = { dateKey, promise };
    return promise;
  }

  function updateToggle() {
    const hasEvent = Boolean(currentEvent);
    toggle.hidden = !hasEvent;
    toggle.setAttribute("aria-pressed", String(effectsEnabled));
    toggle.textContent = effectsEnabled ? "Turn off animation" : "Turn on animation";
    toggle.setAttribute(
      "aria-label",
      effectsEnabled
        ? `Turn off the ${currentEvent?.label ?? "seasonal"} animation`
        : `Turn on the ${currentEvent?.label ?? "seasonal"} animation`,
    );
    body.dataset.specialEffects = effectsEnabled ? "on" : "off";
  }

  async function updateScene(event) {
    const generation = ++sceneGeneration;
    const shouldAnimate = Boolean(event && effectsEnabled);

    if (!shouldAnimate) {
      stage.hidden = true;
      engine.setEnabled(false);
      await engine.load(null);
      return;
    }

    stage.hidden = false;
    engine.setEnabled(true);

    try {
      const loaded = await engine.load(event);
      if (generation !== sceneGeneration) return;
      if (!loaded) {
        stage.hidden = true;
        engine.setEnabled(false);
        return;
      }
      if (currentEvent?.id !== event.id || !effectsEnabled) {
        return;
      }
      engine.resize();
      if (!document.hidden) engine.resume();
    } catch {
      stage.hidden = true;
      engine.setEnabled(false);
    }
  }

  function scheduleMidnightUpdate() {
    window.clearTimeout(midnightTimer);
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    midnightTimer = window.setTimeout(() => {
      updateSeasonalState();
      scheduleMidnightUpdate();
    }, Math.max(1000, nextMidnight.getTime() - now.getTime() + 100));
  }
}

function readStoredPreference() {
  try {
    const value = localStorage.getItem(EFFECTS_STORAGE_KEY);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredPreference(value) {
  try {
    localStorage.setItem(EFFECTS_STORAGE_KEY, value);
  } catch {
    // The current page still honors the choice when storage is unavailable.
  }
}
