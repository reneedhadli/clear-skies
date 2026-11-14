export const TERM_NAME = "Fall term";
// Set TERM_START_DATE to the real first day of classes.
export const TERM_START_DATE = "2026-09-02";
export const TOTAL_WEEKS = 15;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getCurrentWeek(today = new Date()) {
  const start = new Date(`${TERM_START_DATE}T00:00:00`);
  const startDay = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startDay);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const elapsedDays = Math.floor((current - start) / 86_400_000);
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(elapsedDays / 7) + 1));
}

export function getDateForWeekDay(week, day) {
  const [year, month, date] = TERM_START_DATE.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, date));
  const mondayOffset = (start.getUTCDay() + 6) % 7;
  const dayIndex = WEEKDAYS.indexOf(day);
  if (dayIndex < 0) return null;
  start.setUTCDate(start.getUTCDate() - mondayOffset + (week - 1) * 7 + dayIndex);
  return start;
}

export function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
