import { createFireworksScene } from "./shared.mjs";

export default function createScene(context) {
  return createFireworksScene(context, {
    colors: ["#e94b5f", "#fff4df", "#3468d4", "#72c8ff", "#f2c45f"],
    minInterval: 0.85,
    maxInterval: 1.45,
    minPairDelay: 0.18,
    maxPairDelay: 0.35,
    maxBursts: 3,
  });
}
