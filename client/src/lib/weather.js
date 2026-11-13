export const WEATHER = {
  sunny: {
    key: "sunny",
    emoji: "☀️",
    label: "Sunny",
    tagline: "Easy week",
    headline: "Clear skies ahead",
    glow: "#FFB547",
    text: "text-weather-sunny",
    bg: "bg-weather-sunny",
  },
  cloudy: {
    key: "cloudy",
    emoji: "⛅",
    label: "Cloudy",
    tagline: "A few things due",
    headline: "A little cloud cover",
    glow: "#A9A3B8",
    text: "text-weather-cloudy",
    bg: "bg-weather-cloudy",
  },
  storm: {
    key: "storm",
    emoji: "⛈️",
    label: "Storm",
    tagline: "Midterm week",
    headline: "Storm warning",
    glow: "#6B5BD6",
    text: "text-weather-storm",
    bg: "bg-weather-storm",
  },
  blizzard: {
    key: "blizzard",
    emoji: "❄️",
    label: "Blizzard",
    tagline: "Many big things at once",
    headline: "Blizzard incoming",
    glow: "#8EC9FF",
    text: "text-weather-blizzard",
    bg: "bg-weather-blizzard",
  },
  deepfreeze: {
    key: "deepfreeze",
    emoji: "🧊",
    label: "Deep freeze",
    tagline: "Finals",
    headline: "Deep freeze: finals",
    glow: "#CFE8FF",
    text: "text-weather-deepfreeze",
    bg: "bg-weather-deepfreeze",
  },
};

export function weatherMeta(weather) {
  return WEATHER[weather] || WEATHER.cloudy;
}
