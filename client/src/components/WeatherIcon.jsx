import { weatherMeta } from "../lib/weather.js";

const sizes = {
  sm: { emoji: "text-xl", label: "text-xs" },
  md: { emoji: "text-3xl", label: "text-sm" },
  lg: { emoji: "text-5xl", label: "text-base" },
};

export default function WeatherIcon({
  weather,
  size = "md",
  className = "",
  stacked = false,
}) {
  const meta = weatherMeta(weather);
  const scale = sizes[size] || sizes.md;
  return (
    <span
      className={`inline-flex ${stacked ? "flex-col items-center gap-1" : "items-center gap-2"} ${className}`}
    >
      <span aria-hidden="true" className={scale.emoji}>
        {meta.emoji}
      </span>
      <span className={`font-extrabold ${scale.label} ${meta.text}`}>{meta.label}</span>
    </span>
  );
}
