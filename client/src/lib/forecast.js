export const TOTAL_WEEKS = 15;

export function buildForecast(deadlines = []) {
  return Array.from({ length: TOTAL_WEEKS }, (_, index) => {
    const week = index + 1;
    const due = deadlines
      .filter((item) => Number(item.week) === week)
      .sort((a, b) => dayOrder(a.day) - dayOrder(b.day));
    const weight = due.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const hasFinal = due.some((item) => item.type === "final");
    const hasMidterm = due.some((item) => item.type === "midterm");
    const bigItems = due.filter((item) => (Number(item.weight) || 0) >= 10).length;

    let weather = "sunny";
    if (week >= 14 && hasFinal) {
      weather = "deepfreeze";
    } else if (weight >= 30 || bigItems >= 3) {
      weather = "blizzard";
    } else if (weight >= 15 || hasMidterm) {
      weather = "storm";
    } else if (weight >= 5) {
      weather = "cloudy";
    }

    return {
      week,
      weather,
      stress: Math.min(100, Math.round(weight * 2.5)),
      due,
    };
  });
}

export function forecastSummary(forecast) {
  return forecast.reduce(
    (summary, week) => {
      summary[week.weather] = (summary[week.weather] || 0) + 1;
      return summary;
    },
    { sunny: 0, cloudy: 0, storm: 0, blizzard: 0, deepfreeze: 0 }
  );
}

export function sunnyWeeks(forecast) {
  return forecast.filter((week) => week.weather === "sunny");
}

export function calmestWeek(forecast, fromWeek = 1) {
  const ordered = forecast.filter((week) => week.week >= fromWeek);
  const sunny = ordered.find((week) => week.weather === "sunny");
  if (sunny) return sunny;
  return [...ordered].sort((a, b) => a.stress - b.stress)[0];
}

function dayOrder(day = "") {
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const index = order.findIndex((name) => day.startsWith(name));
  return index === -1 ? 99 : index;
}
