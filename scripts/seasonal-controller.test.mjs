import assert from "node:assert/strict";
import test from "node:test";

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
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.style = new FakeStyle();
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.inert = false;
    this.textContent = "";
    this.value = "";
  }

  append(...children) {
    children.forEach((child) => {
      child.parentNode = this;
      this.children.push(child);
    });
  }

  replaceChildren(...children) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    this.append(...children);
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  dispatch(name, suppliedEvent = {}) {
    const event = {
      type: name,
      target: this,
      currentTarget: this,
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
      ...suppliedEvent,
    };
    for (const listener of this.listeners.get(name) ?? []) {
      listener(event);
    }
    return event;
  }

  click() {
    this.dispatch("click");
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  querySelectorAll(selector) {
    if (selector !== "[data-seasonal-prop]") return [];
    const matches = [];
    const visit = (element) => {
      element.children.forEach((child) => {
        if (Object.hasOwn(child.dataset, "seasonalProp")) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  getBoundingClientRect() {
    return { width: 1440, height: 900 };
  }
}

function createContext2d() {
  const gradient = () => ({ addColorStop() {} });
  return {
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
}

class FakeCanvasElement extends FakeElement {
  constructor(ownerDocument) {
    super("canvas", ownerDocument);
    this.context2d = createContext2d();
    this.width = 0;
    this.height = 0;
  }

  getContext() {
    return this.context2d;
  }
}

class FakeOption extends FakeElement {
  constructor(text, value) {
    super("option", null);
    this.textContent = text;
    this.value = value;
  }
}

function fixedDateClass() {
  const NativeDate = globalThis.Date;
  return class FixedDate extends NativeDate {
    constructor(...values) {
      super(...(values.length ? values : [2026, 6, 23, 12, 0, 0, 0]));
    }

    static now() {
      return new NativeDate(2026, 6, 23, 12, 0, 0, 0).getTime();
    }
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

let controllerImport = 0;

async function createHarness({
  href = "https://example.test/",
  storedPreference = null,
  storageThrows = false,
  reducedMotion = false,
  mobileMenuOpen = false,
  fetchImplementation,
} = {}) {
  const originals = new Map(
    [
      "window",
      "document",
      "localStorage",
      "HTMLCanvasElement",
      "Option",
      "fetch",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "Date",
    ].map((name) => [name, globalThis[name]]),
  );
  const documentListeners = new Map();
  const windowListeners = new Map();
  const selectorMap = new Map();
  const timerDelays = [];
  const timers = new Map();
  const frames = new Set();
  const storageWrites = [];
  let nextTimerId = 0;
  let nextFrameId = 0;

  const documentRef = {
    hidden: false,
    visibilityState: "visible",
    defaultView: {
      Image: class {
        set src(value) {
          this.currentSrc = value;
          this.onload?.();
        }
      },
    },
    createElement(tagName) {
      return tagName === "canvas"
        ? new FakeCanvasElement(documentRef)
        : new FakeElement(tagName, documentRef);
    },
    querySelector(selector) {
      return selectorMap.get(selector) ?? null;
    },
    addEventListener(name, listener) {
      const listeners = documentListeners.get(name) ?? [];
      listeners.push(listener);
      documentListeners.set(name, listeners);
    },
    removeEventListener(name, listener) {
      documentListeners.set(
        name,
        (documentListeners.get(name) ?? []).filter((entry) => entry !== listener),
      );
    },
    dispatch(name, suppliedEvent = {}) {
      const event = {
        type: name,
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {
          this.propagationStopped = true;
        },
        ...suppliedEvent,
      };
      for (const listener of documentListeners.get(name) ?? []) listener(event);
      return event;
    },
  };
  documentRef.documentElement = new FakeElement("html", documentRef);
  documentRef.documentElement.dataset.theme = "slate";
  documentRef.body = new FakeElement("body", documentRef);
  documentRef.body.dataset.page = "home";
  documentRef.activeElement = documentRef.body;

  const elements = {
    stage: new FakeElement("div", documentRef),
    canvas: new FakeCanvasElement(documentRef),
    propLayer: new FakeElement("div", documentRef),
    veil: new FakeElement("div", documentRef),
    toggle: new FakeElement("button", documentRef),
    previewLauncher: new FakeElement("button", documentRef),
    previewTray: new FakeElement("aside", documentRef),
    previewMinimize: new FakeElement("button", documentRef),
    previewSelect: new FakeElement("select", documentRef),
    previewAuto: new FakeElement("button", documentRef),
    previewClose: new FakeElement("button", documentRef),
    menuToggle: new FakeElement("button", documentRef),
    primaryNav: new FakeElement("nav", documentRef),
    brand: new FakeElement("a", documentRef),
    quoteText: new FakeElement("blockquote", documentRef),
    quoteLabel: new FakeElement("span", documentRef),
    quoteDate: new FakeElement("time", documentRef),
    quoteMark: new FakeElement("span", documentRef),
    quoteMetaLabel: new FakeElement("span", documentRef),
    greeting: new FakeElement("p", documentRef),
  };
  elements.stage.hidden = true;
  elements.toggle.hidden = true;
  elements.previewLauncher.hidden = true;
  elements.previewTray.hidden = true;
  elements.greeting.hidden = true;
  elements.quoteText.textContent = "Fallback quote";

  for (const [selector, element] of [
    ["[data-seasonal-stage]", elements.stage],
    ["[data-seasonal-canvas]", elements.canvas],
    ["[data-seasonal-props]", elements.propLayer],
    ["[data-seasonal-veil]", elements.veil],
    ["[data-seasonal-toggle]", elements.toggle],
    ["[data-event-preview-launcher]", elements.previewLauncher],
    ["[data-event-preview]", elements.previewTray],
    ["[data-event-preview-minimize]", elements.previewMinimize],
    ["[data-event-preview-select]", elements.previewSelect],
    ["[data-event-preview-auto]", elements.previewAuto],
    ["[data-event-preview-close]", elements.previewClose],
    ["[data-menu-toggle]", elements.menuToggle],
    ["[data-primary-nav]", elements.primaryNav],
    [".brand", elements.brand],
    ["[data-daily-quote]", elements.quoteText],
    ["[data-daily-quote-label]", elements.quoteLabel],
    ["[data-quote-date]", elements.quoteDate],
    ["[data-quote-mark]", elements.quoteMark],
    ["[data-quote-meta-label]", elements.quoteMetaLabel],
    ["[data-special-greeting]", elements.greeting],
  ]) {
    selectorMap.set(selector, element);
  }

  const mobileMenuClosures = [];
  elements.menuToggle.setAttribute("aria-expanded", String(mobileMenuOpen));
  elements.primaryNav.inert = false;
  if (mobileMenuOpen) {
    elements.primaryNav.classList.add("is-open");
    documentRef.body.classList.add("menu-open");
  }
  elements.menuToggle.addEventListener("click", () => {
    if (elements.menuToggle.getAttribute("aria-expanded") === "true") {
      elements.menuToggle.setAttribute("aria-expanded", "false");
      elements.menuToggle.setAttribute("aria-label", "Open navigation");
      elements.primaryNav.classList.remove("is-open");
      elements.primaryNav.inert = true;
      documentRef.body.classList.remove("menu-open");
      mobileMenuClosures.push("closed");
    } else {
      elements.menuToggle.setAttribute("aria-expanded", "true");
      elements.menuToggle.setAttribute("aria-label", "Close navigation");
      elements.primaryNav.classList.add("is-open");
      elements.primaryNav.inert = false;
      documentRef.body.classList.add("menu-open");
    }
  });

  const location = { href };
  const motionListeners = [];
  const motionPreference = {
    matches: reducedMotion,
    addEventListener(name, listener) {
      if (name === "change") motionListeners.push(listener);
    },
    emit(matches) {
      this.matches = matches;
      motionListeners.forEach((listener) => listener({ matches }));
    },
  };
  const windowRef = {
    location,
    history: {
      replaceState(_state, _title, nextUrl) {
        location.href = String(nextUrl);
      },
    },
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    matchMedia: () => motionPreference,
    setTimeout(callback, delay) {
      const id = ++nextTimerId;
      timerDelays.push(delay);
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    addEventListener(name, listener) {
      const listeners = windowListeners.get(name) ?? [];
      listeners.push(listener);
      windowListeners.set(name, listeners);
    },
    removeEventListener(name, listener) {
      windowListeners.set(
        name,
        (windowListeners.get(name) ?? []).filter((entry) => entry !== listener),
      );
    },
    dispatch(name) {
      for (const listener of windowListeners.get(name) ?? []) listener();
    },
  };

  globalThis.document = documentRef;
  globalThis.window = windowRef;
  globalThis.HTMLCanvasElement = FakeCanvasElement;
  globalThis.Option = FakeOption;
  globalThis.Date = fixedDateClass();
  globalThis.localStorage = {
    getItem() {
      if (storageThrows) throw new Error("Storage unavailable");
      return storedPreference;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error("Storage unavailable");
      storageWrites.push([key, value]);
    },
  };
  globalThis.fetch =
    fetchImplementation ??
    (async () => ({
      ok: true,
      async text() {
        return "Loaded quote";
      },
    }));
  globalThis.requestAnimationFrame = () => {
    const id = ++nextFrameId;
    frames.add(id);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);

  await import(`../assets/js/seasonal/index.mjs?controller-test=${++controllerImport}`);
  await flush();
  await flush();

  return {
    documentRef,
    windowRef,
    motionPreference,
    elements,
    frames,
    timerDelays,
    storageWrites,
    mobileMenuClosures,
    async settle() {
      await flush();
      await flush();
    },
    restore() {
      for (const [name, value] of originals) {
        if (typeof value === "undefined") {
          delete globalThis[name];
        } else {
          globalThis[name] = value;
        }
      }
    },
  };
}

test("preview switching keeps the greeting, toggle, URL, and quote in sync", async () => {
  const harness = await createHarness({
    href: "https://example.test/?event-preview=christmas",
  });

  try {
    const { elements } = harness;
    assert.equal(harness.documentRef.body.dataset.specialEvent, "christmas");
    assert.equal(elements.previewTray.hidden, false);
    assert.equal(elements.previewSelect.children.length, 13);
    assert.equal(elements.greeting.textContent, "Merry Christmas!");
    assert.equal(elements.greeting.hidden, false);
    assert.equal(elements.quoteText.hidden, true);
    assert.equal(elements.toggle.hidden, false);
    assert.equal(elements.toggle.textContent, "Turn off animation");
    assert.equal(elements.stage.hidden, false);

    elements.previewSelect.value = "valentines-day";
    elements.previewSelect.dispatch("change");
    await harness.settle();
    assert.match(harness.windowRef.location.href, /event-preview=valentines-day/);
    assert.equal(harness.documentRef.body.dataset.specialEvent, "valentines-day");
    assert.equal(elements.greeting.textContent, "Happy Valentine’s Day!");

    elements.toggle.dispatch("click");
    await harness.settle();
    assert.deepEqual(harness.storageWrites.at(-1), ["portfolio-special-effects", "off"]);
    assert.equal(elements.stage.hidden, true);
    assert.equal(elements.toggle.textContent, "Turn on animation");
    assert.equal(elements.greeting.hidden, false, "the greeting stays visible when motion is off");
    assert.equal(
      elements.propLayer.querySelectorAll("[data-seasonal-prop]").length,
      0,
      "turning animation off destroys the inactive scene",
    );

    elements.previewSelect.value = "none";
    elements.previewSelect.dispatch("change");
    await harness.settle();
    assert.equal(harness.documentRef.body.dataset.specialEvent, undefined);
    assert.equal(elements.toggle.hidden, true);
    assert.equal(elements.greeting.hidden, true);
    assert.equal(elements.quoteText.hidden, false);
    assert.equal(elements.quoteText.textContent, "Loaded quote");

    elements.previewSelect.value = "not-a-real-event";
    elements.previewSelect.dispatch("change");
    await harness.settle();
    assert.match(harness.windowRef.location.href, /event-preview=auto/);
    assert.equal(harness.documentRef.body.dataset.specialEvent, undefined);

    elements.previewClose.dispatch("click");
    assert.doesNotMatch(harness.windowRef.location.href, /event-preview=/);
    assert.equal(elements.previewTray.hidden, true);
    assert.equal(harness.documentRef.activeElement, elements.brand);
  } finally {
    harness.restore();
  }
});

test("scene tester collapses, restores focus, preserves its URL, and closes the mobile menu", async () => {
  const harness = await createHarness({
    href: "https://example.test/?event-preview=easter&keep=this",
    mobileMenuOpen: true,
  });

  try {
    const { documentRef, elements, windowRef } = harness;
    const previewUrl = windowRef.location.href;

    assert.equal(elements.previewLauncher.hidden, true, "the launcher stays out of the way while the tray is open");
    assert.equal(elements.previewLauncher.getAttribute("aria-expanded"), "true");
    assert.equal(elements.previewTray.hidden, false, "a newly loaded preview starts expanded");

    elements.previewMinimize.click();
    assert.equal(elements.previewTray.hidden, true);
    assert.equal(elements.previewLauncher.hidden, false);
    assert.equal(elements.previewLauncher.getAttribute("aria-expanded"), "false");
    assert.equal(documentRef.activeElement, elements.previewLauncher);
    assert.equal(elements.menuToggle.getAttribute("aria-expanded"), "true");
    assert.equal(harness.mobileMenuClosures.length, 0);
    assert.equal(windowRef.location.href, previewUrl, "collapsing does not change the URL");

    elements.previewLauncher.click();
    assert.equal(elements.previewTray.hidden, false);
    assert.equal(elements.previewLauncher.hidden, true);
    assert.equal(elements.previewLauncher.getAttribute("aria-expanded"), "true");
    assert.equal(elements.menuToggle.getAttribute("aria-expanded"), "false");
    assert.equal(elements.primaryNav.classList.contains("is-open"), false);
    assert.equal(documentRef.body.classList.contains("menu-open"), false);
    assert.equal(documentRef.activeElement, elements.previewSelect);
    assert.equal(harness.mobileMenuClosures.length, 1);
    assert.equal(windowRef.location.href, previewUrl, "reopening does not change the URL");

    elements.previewMinimize.click();
    assert.equal(elements.previewTray.hidden, true);
    assert.equal(elements.previewLauncher.hidden, false);
    assert.equal(elements.previewLauncher.getAttribute("aria-expanded"), "false");
    assert.equal(documentRef.activeElement, elements.previewLauncher);

    elements.previewLauncher.click();
    const escapeEvent = documentRef.dispatch("keydown", { key: "Escape" });
    assert.equal(escapeEvent.defaultPrevented, true);
    assert.equal(escapeEvent.propagationStopped, true);
    assert.equal(elements.previewTray.hidden, true);
    assert.equal(elements.previewLauncher.hidden, false);
    assert.equal(elements.previewLauncher.getAttribute("aria-expanded"), "false");
    assert.equal(documentRef.activeElement, elements.previewLauncher);
    assert.equal(windowRef.location.href, previewUrl, "Escape does not change the URL");

    elements.previewLauncher.click();
    elements.previewClose.click();
    await harness.settle();
    assert.doesNotMatch(windowRef.location.href, /event-preview=/);
    assert.match(windowRef.location.href, /keep=this/);
    assert.equal(elements.previewTray.hidden, true);
    assert.equal(elements.previewLauncher.hidden, true);
    assert.equal(elements.previewLauncher.getAttribute("aria-expanded"), "false");
    assert.equal(documentRef.activeElement, elements.brand);
  } finally {
    harness.restore();
  }
});

test("desktop tester minimize and Escape return focus to the Scene tester button", async () => {
  const harness = await createHarness({
    href: "https://example.test/?event-preview=fathers-day",
  });

  try {
    const { documentRef, elements } = harness;
    assert.equal(elements.primaryNav.inert, false);
    elements.previewMinimize.click();
    assert.equal(elements.previewLauncher.hidden, false);
    assert.equal(documentRef.activeElement, elements.previewLauncher);
    elements.previewLauncher.click();
    assert.equal(elements.previewLauncher.hidden, true);
    documentRef.dispatch("keydown", { key: "Escape" });
    assert.equal(elements.previewLauncher.hidden, false);
    assert.equal(documentRef.activeElement, elements.previewLauncher);
  } finally {
    harness.restore();
  }
});

test("an in-flight quote cannot overwrite a holiday greeting and restores afterward", async () => {
  let resolveFetch;
  const fetchPromise = new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const harness = await createHarness({
    fetchImplementation: () => fetchPromise,
  });

  try {
    const { elements } = harness;
    assert.equal(elements.quoteText.hidden, false);

    elements.previewSelect.value = "christmas";
    elements.previewSelect.dispatch("change");
    await harness.settle();
    assert.equal(elements.greeting.textContent, "Merry Christmas!");

    resolveFetch({
      ok: true,
      async text() {
        return "Late quote";
      },
    });
    await harness.settle();
    assert.equal(elements.quoteText.textContent, "Fallback quote");
    assert.equal(elements.greeting.hidden, false);

    elements.previewSelect.value = "none";
    elements.previewSelect.dispatch("change");
    await harness.settle();
    assert.equal(elements.greeting.hidden, true);
    assert.equal(elements.quoteText.hidden, false);
    assert.equal(elements.quoteText.textContent, "Late quote");
  } finally {
    harness.restore();
  }
});

test("stored opt-out and unavailable storage honor reduced-motion changes", async () => {
  const optedOut = await createHarness({
    href: "https://example.test/?event-preview=christmas",
    storedPreference: "off",
  });

  try {
    assert.equal(optedOut.elements.toggle.textContent, "Turn on animation");
    assert.equal(optedOut.elements.stage.hidden, true);
    optedOut.motionPreference.emit(false);
    assert.equal(optedOut.elements.stage.hidden, true, "an explicit opt-out wins over system motion");
  } finally {
    optedOut.restore();
  }

  const unavailable = await createHarness({
    href: "https://example.test/?event-preview=christmas",
    storageThrows: true,
    reducedMotion: true,
  });

  try {
    assert.equal(unavailable.elements.toggle.textContent, "Turn on animation");
    assert.equal(unavailable.elements.stage.hidden, true);
    unavailable.motionPreference.emit(false);
    await unavailable.settle();
    assert.equal(unavailable.elements.toggle.textContent, "Turn off animation");
    assert.equal(unavailable.elements.stage.hidden, false);
  } finally {
    unavailable.restore();
  }
});

test("midnight scheduling and page visibility pause and resume animation", async () => {
  const harness = await createHarness({
    href: "https://example.test/?event-preview=christmas",
  });

  try {
    assert.equal(harness.timerDelays.length, 1);
    assert.ok(harness.timerDelays[0] > 11 * 60 * 60 * 1000);
    assert.ok(harness.timerDelays[0] < 13 * 60 * 60 * 1000);
    assert.equal(harness.frames.size, 1);

    harness.documentRef.hidden = true;
    harness.documentRef.visibilityState = "hidden";
    harness.documentRef.dispatch("visibilitychange");
    assert.equal(harness.frames.size, 0);

    harness.documentRef.hidden = false;
    harness.documentRef.visibilityState = "visible";
    harness.documentRef.dispatch("visibilitychange");
    await harness.settle();
    assert.equal(harness.frames.size, 1);
  } finally {
    harness.restore();
  }
});
