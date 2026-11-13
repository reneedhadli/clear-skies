const WEATHER_LABEL = {
  sunny: "sunny",
  cloudy: "cloudy",
  storm: "a storm",
  blizzard: "a blizzard",
  deepfreeze: "a deep freeze",
};

function upcomingWarning(forecast = [], currentWeek = 1) {
  const rough = forecast.find(
    (week) =>
      week.week > currentWeek && (week.weather === "blizzard" || week.weather === "deepfreeze")
  );
  if (!rough) return null;
  return `Heads up ⚠️ week ${rough.week} is shaping up as a ${WEATHER_LABEL[rough.weather]}.`;
}

function fallbackChat(message, context = {}) {
  const text = String(message || "").toLowerCase();
  const currentWeek = context.currentWeek || 1;
  const week = context.forecast?.find((item) => item.week === currentWeek) || {
    weather: "cloudy",
    stress: 40,
  };
  const due = context.deadlines || [];
  const weekDue = due.filter((item) => Number(item.week) === currentWeek);
  const courses = context.courses || [];
  const eligible = context.eligibleCourses || [];
  const warning = upcomingWarning(context.forecast, currentWeek);

  if (/(next term|next semester|what should i take|course load|courses)/.test(text)) {
    const picks = (eligible.length ? eligible : courses.map((course) => course.code)).slice(0, 3);
    const named = picks
      .map((code) => courses.find((course) => course.code === code) || { code })
      .map((course) => course.code);
    const courseLine = named.length
      ? `${named.slice(0, 2).join(" and ")} could be a fun pair`
      : "A lighter mix would be smart";
    return {
      reply: `${courseLine}. Keep one heavy course and one lighter one so the week stays manageable. Want me to sketch a plan?`,
      courseCodes: named.slice(0, 2),
      warning,
    };
  }

  if (/(why|how come).*(storm|week|stress)|(storm|stress).*(why|week)/.test(text)) {
    const weight = weekDue.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const midterm = weekDue.find((item) => item.type === "midterm");
    const dueText =
      weekDue.length === 1
        ? "1 thing is due"
        : `${weekDue.length || "a few"} things are due`;
    return {
      reply: `Week ${currentWeek} is ${WEATHER_LABEL[week.weather] || "busy"} because ${dueText}, worth about ${weight}% together${
        midterm ? ` — including the ${midterm.course} midterm` : ""
      }. That is a lot for one week. Want a plan?`,
      courseCodes: [...new Set(weekDue.slice(0, 3).map((item) => item.course))],
      warning,
    };
  }

  if (/plan|midterm|finals|study/.test(text)) {
    const midterms = due.filter((item) => item.type === "midterm" || item.type === "final").slice(0, 3);
    return {
      reply:
        "Here is the cozy version: Monday review notes, Tuesday do practice questions, Wednesday try a past paper, Thursday recap and sleep early. Short sessions beat panic cramming. You've got this.",
      courseCodes: [...new Set(midterms.map((item) => item.course))],
      warning,
    };
  }

  const next = weekDue[0];
  return {
    reply: `Week ${currentWeek} is looking ${
      WEATHER_LABEL[week.weather] || "cloudy"
    } with about ${week.stress}% stress. ${
      next
        ? `I'd start with ${next.course} ${next.title} and keep Friday light.`
        : "Nothing due this week — take a walk and get ahead a little."
    } What is worrying you most?`,
    courseCodes: [...new Set(weekDue.slice(0, 2).map((item) => item.course))],
    warning,
  };
}

module.exports = { fallbackChat, upcomingWarning };
