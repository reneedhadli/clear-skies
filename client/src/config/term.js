export const TERM_NAME = "Fall term";
// Set TERM_START_DATE to the real first day of classes.
export const TERM_START_DATE = "2026-09-02";
export const TOTAL_WEEKS = 15;

export function getCurrentWeek(today = new Date()) {
  const start = new Date(`${TERM_START_DATE}T00:00:00`);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const elapsedDays = Math.floor((current - start) / 86_400_000);
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.floor(elapsedDays / 7) + 1));
}
