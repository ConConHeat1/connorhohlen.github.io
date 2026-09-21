(() => {
  "use strict";

  const root = document.documentElement;
  root.dataset.motion = "full";

  try {
    localStorage.removeItem("portfolio-special-effects");
  } catch {
    // Full motion still applies when storage is unavailable.
  }
})();
