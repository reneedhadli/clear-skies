import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

function WeatherFX({ weather = "sunny", className = "" }) {
  const rootRef = useRef(null);
  const reduce = useReducedMotion();
  const [sectionVisible, setSectionVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(
    () => document.visibilityState === "visible"
  );
  const isRain = weather === "storm";
  const isSnow = weather === "blizzard" || weather === "deepfreeze";
  const count = weather === "deepfreeze" ? 14 : 16;
  const effectsRunning = sectionVisible && documentVisible && !reduce;

  useEffect(() => {
    if (!isRain && !isSnow) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [isRain, isSnow]);

  useEffect(() => {
    const updateVisibility = () =>
      setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

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

  if (!isRain && !isSnow) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`weather-fx ${effectsRunning ? "weather-fx-running" : "weather-fx-paused"} pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {flakes.map((flake, index) => (
        <span
          key={index}
          className={
            isRain
              ? "weather-fx-particle absolute top-0 rounded-full bg-weather-blizzard/60"
              : "weather-fx-particle absolute top-0 select-none text-weather-deepfreeze/80"
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

export default memo(WeatherFX);
