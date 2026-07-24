import { createFireworksScene } from "./shared.mjs";

export default function createScene(context) {
  return createFireworksScene(context, {
    colors: ["#f8d477", "#78e7ff", "#fff7e7", "#b996ff", "#ff8eae"],
    minInterval: 0.85,
    maxInterval: 1.45,
    minPairDelay: 0.18,
    maxPairDelay: 0.35,
    maxBursts: 3,
  });
}
