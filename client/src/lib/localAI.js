import { demoDeadlines } from "../data/demo.js";
import { fallbackWhy } from "./clubs.js";

const WEATHER_LABEL = {
  sunny: "sunny",
  cloudy: "cloudy",
  storm: "a storm",
  blizzard: "a blizzard",
  deepfreeze: "a deep freeze",
};

export function localExtract(text) {
  const value = String(text || "").toLowerCase();
  const courseCodes = [...new Set(demoDeadlines.map((item) => item.course))];
  const matched = courseCodes.filter((code) => value.includes(code.toLowerCase()));
  if (matched.length) {
    return demoDeadlines
      .filter((item) => matched.includes(item.course))
      .map((item) => ({ ...item }));
  }

  const codeMatch = String(text || "").match(/\b[A-Z]{3,4}\s?\d{3}\b/);
  const course = (codeMatch?.[0] || "Your course").replace(/\s+/g, " ").trim();
  const found = [];
  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const week = Number(line.match(/week\s*(\d{1,2})/i)?.[1]);
      const weight = Number.parseFloat(line.match(/(\d{1,3})\s*%/)?.[1]);
      if (!week || week > 15 || !Number.isFinite(weight) || weight <= 0) return;
      if (!/(due|exam|midterm|quiz|assignment|lab|project|essay|portfolio|presentation)/i.test(line)) return;
      const type = /midterm/i.test(line)
        ? "midterm"
        : /final|exam/i.test(line)
          ? "final"
          : /quiz/i.test(line)
            ? "quiz"
            : /lab/i.test(line)
              ? "lab"
              : /project/i.test(line)
                ? "project"
                : "assignment";
      const dayMatch = line.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i);
      const day = dayMatch
        ? dayMatch[1][0].toUpperCase() + dayMatch[1].slice(1, 3).toLowerCase()
        : "Fri";
      const time = line.match(
        /\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i
      );
      const time24 = line.match(/\b(?:at\s*)?([01]?\d|2[0-3]):([0-5]\d)\b/);
      const title = line
        .replace(/week\s*\d{1,2}/i, "")
        .replace(/\d{1,3}\s*%/g, "")
        .replace(/\bdue\b/gi, "")
        .replace(/^[\s—–\-·:,.]+|[\s—–\-·:,.]+$/g, "")
        .slice(0, 80);
      if (!title) return;
      found.push({
        course,
        title,
        type,
        week,
        day,
        time: time?.[0]?.replace(/^at\s*/i, "") || time24?.[0]?.replace(/^at\s*/i, "") || "Time TBA",
        weight,
      });
    });
  return found;
}

export function localPlan(week, deadlines = []) {
  const due = [...deadlines].sort(
    (a, b) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(a.day) -
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(b.day)
  );
  const first = due[0];
  const second = due[1] || first;
  const last = due[due.length - 1] || first;
  const label = (item) => (item ? `${item.course} ${item.title}` : "your next deadline");
  return [
    {
      day: "Mon",
      tasks: first
        ? [`Map out ${label(first)}`, `Start a 45-min focus block for ${first.course}`]
        : ["Pick one small task and start for 25 minutes", "Check eClass for anything new"],
    },
    {
      day: "Tue",
      tasks: second
        ? [`Draft or practise ${label(second)}`, `Review ${second.course} notes for 30 minutes`]
        : ["Review this week's lecture notes", "Ask Stormy for a study plan"],
    },
    {
      day: "Wed",
      tasks: [
        `Do practice questions for ${first?.course || "your midterm"}`,
        "Teach one hard concept out loud",
      ],
    },
    {
      day: "Thu",
      tasks: last
        ? [`Finish ${label(last)}`, "Pack your bag and get to bed early"]
        : ["Do a light 20-minute review", "Close the laptop and rest"],
    },
  ];
}

export function localChat(message, context = {}) {
  const text = String(message || "").toLowerCase();
  const currentWeek = context.currentWeek || 1;
  const week =
    context.forecast?.find((item) => item.week === currentWeek) || {
      weather: "cloudy",
      stress: 40,
    };
  const due = context.deadlines || [];
  const weekDue = due.filter((item) => Number(item.week) === currentWeek);
  const courses = context.courses || [];
  const warningWeek = (context.forecast || []).find(
    (item) => item.week > currentWeek && ["blizzard", "deepfreeze"].includes(item.weather)
  );
  const warning = warningWeek
    ? `Heads up ⚠️ week ${warningWeek.week} is shaping up as a ${WEATHER_LABEL[warningWeek.weather]}.`
    : null;

  if (/(next term|next semester|what should i take|course load)/.test(text)) {
    const picks = (context.eligibleCourses || []).slice(0, 3);
    return {
      reply: picks.length
        ? `${picks.slice(0, 2).join(" and ")} could be a fun pair. Keep one heavy course and one lighter one so the week stays manageable. Want a plan?`
        : "Pick one course you're curious about and one that balances the workload. Want me to compare a few?",
      courseCodes: picks.slice(0, 2),
      warning,
    };
  }

  if (/(why|how come).*(storm|week|stress)|(storm|week).*(why|stress)/.test(text)) {
    const weight = weekDue.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const midterm = weekDue.find((item) => item.type === "midterm");
    return {
      reply: `Week ${currentWeek} is ${WEATHER_LABEL[week.weather] || "busy"} because ${
        weekDue.length
      } things are due, worth about ${weight}% together${
        midterm ? ` — including the ${midterm.course} midterm` : ""
      }. Want a plan?`,
      courseCodes: [...new Set(weekDue.slice(0, 3).map((item) => item.course))],
      warning,
    };
  }

  if (/plan|midterm|finals|study/.test(text)) {
    return {
      reply:
        "Here is the cozy version: Monday review notes, Tuesday practice questions, Wednesday try a past paper, Thursday recap and sleep early. Short sessions beat panic cramming. You've got this.",
      courseCodes: [
        ...new Set(
          due
            .filter((item) => item.type === "midterm" || item.type === "final")
            .slice(0, 3)
            .map((item) => item.course)
        ),
      ],
      warning,
    };
  }

  const next = weekDue[0];
  return {
    reply: `Week ${currentWeek} is looking ${WEATHER_LABEL[week.weather] || "cloudy"} with about ${
      week.stress
    }% stress. ${
      next
        ? `I'd start with ${next.course} ${next.title} and keep Friday light.`
        : "Nothing due — take a walk and get ahead a little."
    } What's worrying you most?`,
    courseCodes: [...new Set(weekDue.slice(0, 2).map((item) => item.course))],
    warning,
  };
}

export function localClubCopy(quizAnswers = {}, clubs = []) {
  const interests = quizAnswers.interests || [];
  return Object.fromEntries(
    clubs.map((club) => {
      const matched = (club.tags || []).filter((tag) => interests.includes(tag));
      return [
        club.id,
        {
          bio: club.description,
          why: fallbackWhy(club, matched, [], [], quizAnswers),
        },
      ];
    })
  );
}

