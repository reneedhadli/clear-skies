const DAYS = {
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun",
};

export function normalizeDay(value) {
  return DAYS[String(value || "").toLowerCase().replace(/[^a-z]/g, "")] || "Fri";
}

export function normalizeTime(value) {
  const text = String(value || "").trim();
  if (!text) return "Time TBA";
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (match) {
    const hour = Number(match[1]);
    const minute = match[2] || "00";
    const meridiem = match[3].replace(/\./g, "").toUpperCase();
    return `${hour}:${minute} ${meridiem}`;
  }
  const twentyFourHour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    return `${hour % 12 || 12}:${twentyFourHour[2]} ${hour < 12 ? "AM" : "PM"}`;
  }
  return "Time TBA";
}

export function normalizeDeadline(item) {
  return {
    ...item,
    day: normalizeDay(item.day),
    time: normalizeTime(item.time),
  };
}

export function timeOrder(value) {
  const time = normalizeTime(value);
  if (time === "Time TBA") return Number.POSITIVE_INFINITY;
  const [, hourText, minuteText, meridiem] = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/) || [];
  if (!hourText) return Number.POSITIVE_INFINITY;
  const hour = Number(hourText) % 12 + (meridiem === "PM" ? 12 : 0);
  return hour * 60 + Number(minuteText);
}

export function dateKey(date) {
  if (!date) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

export function dailyWeather(items) {
  if (!items.length) return "sunny";
  if (items.some((item) => item.type === "final")) return "deepfreeze";
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const largeItems = items.filter((item) => Number(item.weight) >= 10).length;
  if (totalWeight >= 25 || largeItems >= 2) return "blizzard";
  if (totalWeight >= 10) return "storm";
  return "cloudy";
}
