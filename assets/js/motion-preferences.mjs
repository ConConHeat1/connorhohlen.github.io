export const MOTION_STORAGE_KEY = "portfolio-special-effects";

export function getMotionState() {
  return "full";
}

export function resolveMotionState() {
  return "full";
}

export function initializeMotionPreferences() {
  clearLegacyMotionPreference();
  if (typeof document !== "undefined") document.documentElement.dataset.motion = "full";
  return { getState: getMotionState, subscribe: subscribeMotion };
}

export function subscribeMotion(listener) {
  if (typeof listener !== "function") return () => {};
  listener("full");
  return () => {};
}

function clearLegacyMotionPreference() {
  try {
    localStorage.removeItem(MOTION_STORAGE_KEY);
  } catch {
    // Full motion still applies when storage is unavailable.
  }
}
