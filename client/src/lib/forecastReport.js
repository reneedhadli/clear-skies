import { dailyWeather } from "./deadlines.js";
import { weatherMeta } from "./weather.js";

const DAY_NAMES = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function dayGroups(deadlines) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
    const items = deadlines
      .filter((item) => item.day === day)
      .sort((a, b) => Number(b.weight) - Number(a.weight));
    return {
      day,
      items,
      weight: items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0),
      weather: dailyWeather(items),
    };
  });
}

function describeDeadline(item) {
  return `${item.course} ${item.title}, ${item.time || "Time TBA"}, worth ${item.weight}%`;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function buildLocalForecastReport({
  week,
  weather,
  deadlines = [],
  clubEvents = [],
}) {
  const number = Number(week?.week) || 1;
  if (!deadlines.length) {
    return `${greeting()}, U of A! Stormy here with your forecast for week ${number}. Clear skies all week! Perfect time to get ahead or join a club. Stay warm, stay ahead. This has been Stormy, back to you!`;
  }

  const groups = dayGroups(deadlines);
  const stormiest = [...groups].sort((a, b) => b.weight - a.weight)[0];
  const lightest = groups
    .filter((day) => day.day !== stormiest.day)
    .sort((a, b) => a.weight - b.weight)[0];
  const headline = weatherMeta(weather).label.toLowerCase();
  const featuredItems = stormiest.items.slice(0, 2).map(describeDeadline).join("; ");
  const event = clubEvents.find((item) => item.day === lightest.day);
  const lightDay = event
    ? `A brighter window arrives ${DAY_NAMES[lightest.day]}, with ${event.club.name}'s ${event.title}${event.time ? ` at ${event.time}` : ""}.`
    : lightest.items.length
      ? `${DAY_NAMES[lightest.day]} brings a lighter slate, with ${lightest.items
          .slice(0, 2)
          .map(describeDeadline)
          .join("; ")}.`
      : `${DAY_NAMES[lightest.day]} has no deadlines on the radar, so take a breather or get ahead.`;
  const dueCount = deadlines.length;
  const overview =
    `Week ${number} is shaping up as ${headline} weather, with ${dueCount} ${
      dueCount === 1 ? "graded item" : "graded items"
    } on the radar.`;

  return [
    `${greeting()}, U of A! Stormy here with your forecast for week ${number}.`,
    overview,
    `The stormiest day is ${DAY_NAMES[stormiest.day]}, featuring ${featuredItems}.`,
    lightDay,
    "Stormy's tip: pick one priority, give yourself a little breathing room, and remember that steady progress counts.",
    "Stay warm, stay ahead. This has been Stormy, back to you!",
  ].join(" ");
}

export async function generateForecastReport(data) {
  try {
    const response = await fetch("/api/forecast-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        week: data.week,
        weather: data.weather,
        deadlines: data.deadlines,
        clubEvents: data.clubEvents,
        studentName: data.studentName,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`Forecast report request failed (${response.status})`);
    const result = await response.json();
    const report = String(result.report || "").trim();
    const wordCount = report.split(/\s+/).filter(Boolean).length;
    if (!report || wordCount > 120 || (data.deadlines.length && wordCount < 80)) {
      throw new Error("Forecast report response was invalid");
    }
    return report;
  } catch {
    return buildLocalForecastReport(data);
  }
}

export const COURSE_PRONUNCIATIONS = {
  CMPUT: "Computing",
  MATH: "Math",
  ENGL: "English",
  STAT: "Stats",
  PHYS: "Physics",
  BIOL: "Biology",
  PSYCH: "Psych",
};

export function spokenReportText(text) {
  let spoken = String(text || "");
  Object.entries(COURSE_PRONUNCIATIONS).forEach(([code, name]) => {
    spoken = spoken.replace(new RegExp(`\\b${code}\\s+(\\d+[A-Z]?)\\b`, "gi"), `${name} $1`);
  });
  return spoken
    .replace(/(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi, "$1 $2 $3")
    .replace(/(\d+(?:\.\d+)?)\s*%/g, "$1 percent")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[^\p{L}\p{N}\s.,!?;:'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitReportSentences(text) {
  return String(text || "")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}
