import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

export default function WeatherFX({ weather = "sunny", className = "" }) {
  const reduce = useReducedMotion();
  const isRain = weather === "storm";
  const isSnow = weather === "blizzard" || weather === "deepfreeze";
  const count = weather === "deepfreeze" ? 26 : 18;

  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 41 + 7) % 100}%`,
        delay: `${((i * 0.7) % 7).toFixed(2)}s`,
        duration: `${(isRain ? 1.3 : 5.5) + (i % 5) * 0.55}s`,
        size: isRain ? 2 : 4 + (i % 4) * 2,
      })),
    [count, isRain]
  );

  if (reduce || (!isRain && !isSnow)) return null;

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {flakes.map((flake, index) => (
        <span
          key={index}
          className={
            isRain
              ? "absolute top-0 rounded-full bg-weather-blizzard/60"
              : "absolute top-0 select-none text-weather-deepfreeze/80"
          }
          style={{
            left: flake.left,
            width: isRain ? 2 : undefined,
            height: isRain ? 22 : undefined,
            fontSize: isRain ? undefined : flake.size,
            animationName: isRain ? "rainfall" : "snowfall",
            animationDuration: flake.duration,
            animationDelay: flake.delay,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        >
          {isRain ? "" : "❄"}
        </span>
      ))}
    </div>
  );
}
