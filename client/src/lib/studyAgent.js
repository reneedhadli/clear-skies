// Stormy's "buttons".
//
// The AI never changes anything itself. It only ASKS for actions (below).
// This file is the app's own code: it checks every request and does the work.
// Anything outside the list, or anything that fails a check, is rejected.
//
// What Stormy can do:   add_study_session, move_study_session,
//                       add_course_to_next_term, add_club_to_forecast
// What Stormy can NOT do: touch deadlines, delete courses, or change anything else.

import { TOTAL_WEEKS } from "../config/term.js";
import { dailyWeather, STUDY_POINTS_PER_HOUR } from "./deadlines.js";

export const TOOL_NAMES = [
  "add_study_session",
  "move_study_session",
  "add_course_to_next_term",
  "add_club_to_forecast",
];
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MAX_ACTIONS = 8;
export const MAX_DAY_HOURS = 6; // most study hours Stormy will put on one day
export const MAX_SESSION_HOURS = 4;
export const MAX_SESSIONS = 80;
export const MAX_NEXT_TERM = 5;

const COURSE_RE = /^[A-Z]{2,6} \d{3}$/;

export function strictDay(value) {
  const key = String(value || "").trim().slice(0, 3).toLowerCase();
  return DAY_NAMES.find((day) => day.toLowerCase() === key) || null;
}

function dayIndex(day) {
  return DAY_NAMES.indexOf(day);
}

function cleanCourse(value) {
  const code = String(value || "").replace(/\s+/g, " ").trim().toUpperCase().replace(/^([A-Z]+)(\d)/, "$1 $2");
  return COURSE_RE.test(code) ? code : null;
}

function cleanHours(value) {
  const hours = Math.round(Number(value) * 2) / 2; // halves only
  if (!Number.isFinite(hours) || hours < 0.5 || hours > MAX_SESSION_HOURS) return null;
  return hours;
}

function cleanWeek(value, fallback) {
  const week = value === undefined || value === null || value === "" ? fallback : Number(value);
  return Number.isInteger(week) && week >= 1 && week <= TOTAL_WEEKS ? week : null;
}

export function hoursOnDay(sessions, week, day, ignoreId = null) {
  return sessions
    .filter((item) => item.week === week && item.day === day && item.id !== ignoreId)
    .reduce((sum, item) => sum + item.hours, 0);
}

function nextId(sessions) {
  const max = sessions.reduce((top, item) => Math.max(top, Number(String(item.id).replace(/^s/, "")) || 0), 0);
  return `s${max + 1}`;
}

function formatHours(hours) {
  return `${hours}h`;
}

// ---------------------------------------------------------------------------
// Run a list of requested actions. Pure: it returns the new data and a report.
//   current = { studySessions, nextTermCourses, likedClubIds, clubMatches }
//   env     = { currentWeek, knownCourses: string[], clubs: [{id,name}], clubMatchById: {id: number} }
// ---------------------------------------------------------------------------
export function runAgentActions(current, rawActions, env = {}) {
  const next = {
    studySessions: current.studySessions.map((item) => ({ ...item })),
    nextTermCourses: [...current.nextTermCourses],
    likedClubIds: [...current.likedClubIds],
    clubMatches: { ...current.clubMatches },
  };
  const applied = [];
  const rejected = [];
  const currentWeek = env.currentWeek || 1;
  const known = new Set((env.knownCourses || []).map((code) => cleanCourse(code)).filter(Boolean));
  const clubs = env.clubs || [];
  const list = Array.isArray(rawActions) ? rawActions.slice(0, MAX_ACTIONS) : [];
  if (Array.isArray(rawActions) && rawActions.length > MAX_ACTIONS) {
    rejected.push(`I only do up to ${MAX_ACTIONS} things at a time, so I skipped the rest.`);
  }

  for (const action of list) {
    const tool = String(action?.tool || "");
    const args = action && typeof action.args === "object" && action.args ? action.args : {};

    if (!TOOL_NAMES.includes(tool)) {
      rejected.push("I can't do that one. It is not one of my buttons.");
      continue;
    }

    if (tool === "add_study_session") {
      const course = cleanCourse(args.course);
      const day = strictDay(args.day);
      const week = cleanWeek(args.week, currentWeek);
      const hours = cleanHours(args.hours);
      if (!course || !day || !week || !hours) {
        rejected.push("A study session was missing a course, day, week or hours, so I skipped it.");
        continue;
      }
      if (!known.has(course)) {
        rejected.push(`${course} is not one of your courses, so I did not add study time for it.`);
        continue;
      }
      if (week < currentWeek) {
        rejected.push(`Week ${week} has already passed, so I did not add ${course} on ${day}.`);
        continue;
      }
      if (next.studySessions.length >= MAX_SESSIONS) {
        rejected.push("You already have a lot of study sessions. Clear some before adding more.");
        continue;
      }
      if (hoursOnDay(next.studySessions, week, day) + hours > MAX_DAY_HOURS) {
        rejected.push(`${day} (week ${week}) would go over ${MAX_DAY_HOURS} study hours, so I skipped ${course}.`);
        continue;
      }
      next.studySessions.push({
        id: nextId(next.studySessions),
        course,
        week,
        day,
        hours,
        title: String(args.title || "").replace(/\s+/g, " ").trim().slice(0, 60),
        by: "stormy",
      });
      applied.push(`Added ${formatHours(hours)} of ${course} on ${day}${week === currentWeek ? "" : ` (week ${week})`}.`);
    }

    if (tool === "move_study_session") {
      const session = next.studySessions.find((item) => item.id === String(args.sessionId || ""));
      if (!session) {
        rejected.push("I could not find that study session, so I did not move it.");
        continue;
      }
      const day = strictDay(args.toDay ?? args.day);
      const week = cleanWeek(args.toWeek ?? args.week, session.week);
      if (!day || !week) {
        rejected.push(`I did not understand where to move ${session.course}, so I left it.`);
        continue;
      }
      if (week < currentWeek) {
        rejected.push(`Week ${week} has already passed, so I left ${session.course} where it was.`);
        continue;
      }
      if (hoursOnDay(next.studySessions, week, day, session.id) + session.hours > MAX_DAY_HOURS) {
        rejected.push(`${day} would go over ${MAX_DAY_HOURS} study hours, so I left ${session.course} where it was.`);
        continue;
      }
      const from = session.day;
      session.day = day;
      session.week = week;
      applied.push(`Moved ${formatHours(session.hours)} of ${session.course} from ${from} to ${day}.`);
    }

    if (tool === "add_course_to_next_term") {
      const code = cleanCourse(args.code);
      if (!code) {
        rejected.push("I did not recognise that course code, so I did not add it.");
        continue;
      }
      if (next.nextTermCourses.includes(code)) {
        rejected.push(`${code} is already in your next term.`);
        continue;
      }
      if (next.nextTermCourses.length >= MAX_NEXT_TERM) {
        rejected.push(`Your next term is full (${MAX_NEXT_TERM} courses), so I did not add ${code}.`);
        continue;
      }
      next.nextTermCourses.push(code);
      applied.push(`Added ${code} to your next term.`);
    }

    if (tool === "add_club_to_forecast") {
      const club = clubs.find((item) => item.id === String(args.clubId || ""));
      if (!club) {
        rejected.push("I could not find that club, so I did not add it.");
        continue;
      }
      if (next.likedClubIds.includes(club.id)) {
        rejected.push(`${club.name} is already on your forecast.`);
        continue;
      }
      next.likedClubIds.push(club.id);
      next.clubMatches[club.id] = { match: Number(env.clubMatchById?.[club.id]) || 80, why: "" };
      applied.push(`Put ${club.name} on your forecast.`);
    }
  }

  return { next, applied, rejected };
}

// ---------------------------------------------------------------------------
// Day load (same math as the weather) so the planner and the weather agree.
// ---------------------------------------------------------------------------
export function dayLoad(deadlines, sessions, week, day) {
  const due = deadlines.filter((item) => Number(item.week) === week && item.day === day);
  const weight = due.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  return weight + hoursOnDay(sessions, week, day) * STUDY_POINTS_PER_HOUR;
}

export function dayWeather(deadlines, sessions, week, day) {
  const due = deadlines.filter((item) => Number(item.week) === week && item.day === day);
  return dailyWeather(due, hoursOnDay(sessions, week, day));
}

// The first week (from `fromWeek`) that has something due. Used when this week is empty.
export function firstBusyWeek(deadlines, fromWeek) {
  const weeks = deadlines.map((item) => Number(item.week)).filter((week) => week >= fromWeek && week <= TOTAL_WEEKS);
  return weeks.length ? Math.min(...weeks) : null;
}

// ---------------------------------------------------------------------------
// Planner 1: move study sessions off the heaviest days. No AI needed.
// Sessions never move past a deadline of their own course.
// ---------------------------------------------------------------------------
export function planRebalance({ week, deadlines, studySessions }) {
  const sessions = studySessions.map((item) => ({ ...item }));
  const actions = [];
  const lastDayFor = (course) => {
    const days = deadlines
      .filter((item) => Number(item.week) === week && item.course === course)
      .map((item) => dayIndex(item.day))
      .filter((index) => index >= 0);
    return days.length ? Math.max(...days) : 6;
  };

  for (let step = 0; step < MAX_ACTIONS; step += 1) {
    const loads = DAY_NAMES.map((day) => ({ day, load: dayLoad(deadlines, sessions, week, day) }));
    const candidates = sessions
      .filter((item) => item.week === week)
      .sort((a, b) => dayLoad(deadlines, sessions, week, b.day) - dayLoad(deadlines, sessions, week, a.day) || b.hours - a.hours);
    let moved = false;
    for (const session of candidates) {
      const fromLoad = loads.find((item) => item.day === session.day).load;
      const limit = lastDayFor(session.course);
      const options = loads
        .filter((item) => item.day !== session.day && dayIndex(item.day) <= limit)
        .filter((item) => hoursOnDay(sessions, week, item.day) + session.hours <= MAX_DAY_HOURS)
        .filter((item) => item.load + session.hours * STUDY_POINTS_PER_HOUR < fromLoad)
        .sort((a, b) => a.load - b.load || dayIndex(a.day) - dayIndex(b.day));
      if (!options.length) continue;
      const target = options[0].day;
      actions.push({ tool: "move_study_session", args: { sessionId: session.id, toDay: target, toWeek: week } });
      session.day = target;
      moved = true;
      break;
    }
    if (!moved) break;
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Planner 2: make study sessions for what is due that week. No AI needed.
// ---------------------------------------------------------------------------
const HOURS_FOR = { final: 8, midterm: 6, project: 4, assignment: 3, quiz: 2 };

export function planStudy({ week, deadlines, studySessions, currentWeek = 1 }) {
  const sessions = studySessions.map((item) => ({ ...item }));
  const actions = [];
  const due = deadlines
    .filter((item) => Number(item.week) === week && HOURS_FOR[item.type])
    .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0));

  for (const item of due) {
    const course = cleanCourse(item.course);
    if (!course) continue;
    const dueIndex = Math.max(0, dayIndex(item.day));
    let need = HOURS_FOR[item.type];
    if (item.type === "assignment" && Number(item.weight) >= 10) need += 1;
    need -= sessions
      .filter((session) => session.course === course && session.week === week && dayIndex(session.day) <= dueIndex)
      .reduce((sum, session) => sum + session.hours, 0);

    // Days before the deadline (same week, then the weekend before if it is due early).
    const slots = [];
    for (let index = dueIndex - 1; index >= 0 && slots.length < 4; index -= 1) slots.push({ week, day: DAY_NAMES[index] });
    if (slots.length < 3 && week - 1 >= currentWeek) {
      for (const day of ["Sun", "Sat"]) slots.push({ week: week - 1, day });
    }
    if (!slots.length) slots.push({ week, day: DAY_NAMES[dueIndex] });

    while (need >= 0.5 && actions.length < MAX_ACTIONS) {
      const chunk = Math.min(2, need);
      const choices = slots
        .filter((slot) => slot.week >= currentWeek)
        .filter((slot) => hoursOnDay(sessions, slot.week, slot.day) + chunk <= MAX_DAY_HOURS)
        .sort(
          (a, b) =>
            dayLoad(deadlines, sessions, a.week, a.day) - dayLoad(deadlines, sessions, b.week, b.day) ||
            b.week * 7 + dayIndex(b.day) - (a.week * 7 + dayIndex(a.day))
        );
      if (!choices.length) break;
      const slot = choices[0];
      actions.push({
        tool: "add_study_session",
        args: { course, week: slot.week, day: slot.day, hours: chunk, title: `Study for ${item.title}`.slice(0, 60) },
      });
      sessions.push({ id: `p${actions.length}`, course, week: slot.week, day: slot.day, hours: chunk });
      need -= chunk;
    }
    if (actions.length >= MAX_ACTIONS) break;
  }
  return actions;
}

// ---------------------------------------------------------------------------
// No-AI Stormy. Understands a few phrases and uses the two planners above.
// Returns { handled:false } for anything else (the normal chat takes over).
// ---------------------------------------------------------------------------
const REBALANCE_RE = /(rebalance|overwhelm|too much|swamped|spread (it|things|my|the)|even (it )?out|lighten|stressed|stressing|can'?t cope|so much (work|to do))/i;
const PLAN_RE = /(study plan|plan (my )?(study|studying)|schedule (my )?(study|studying)|help me (study|prepare)|study for|prepare for|make (me )?a plan)/i;

export function localAgent(message, { currentWeek, deadlines, studySessions }) {
  const text = String(message || "");
  const wantsRebalance = REBALANCE_RE.test(text);
  const wantsPlan = PLAN_RE.test(text);
  if (!wantsRebalance && !wantsPlan) return { handled: false };

  const asked = Number(text.match(/week\s*(\d{1,2})/i)?.[1]);
  let week = asked >= 1 && asked <= TOTAL_WEEKS ? asked : currentWeek;
  let note = "";
  if (!deadlines.some((item) => Number(item.week) === week) && !asked) {
    const busy = firstBusyWeek(deadlines, currentWeek);
    if (busy) {
      week = busy;
      note = ` Nothing is due this week, so I looked at week ${busy}.`;
    }
  }
  if (!deadlines.some((item) => Number(item.week) === week)) {
    return {
      handled: true,
      reply: "I don't see any deadlines yet. Add a syllabus on the Forecast page and I can plan your studying.",
      actions: [],
    };
  }

  const hasSessions = studySessions.some((item) => item.week === week);
  let actions = [];
  let reply;
  if (wantsRebalance && hasSessions) {
    actions = planRebalance({ week, deadlines, studySessions });
    reply = actions.length
      ? `Let me spread your studying out for week ${week}.${note}`
      : `Your week ${week} studying is already spread out about as evenly as it can be.${note}`;
  }
  if (!actions.length && (wantsPlan || !hasSessions)) {
    actions = planStudy({ week, deadlines, studySessions, currentWeek });
    reply = actions.length
      ? `Here's a study plan for week ${week}, placed on your lightest days.${note}`
      : reply || `I couldn't find room for more study time in week ${week}.${note}`;
  }
  return { handled: true, reply, actions };
}

// ---------------------------------------------------------------------------
// What we send the AI. Only the next few weeks, to keep the request small.
// ---------------------------------------------------------------------------
export function buildAgentContext({ profile, deadlines, studySessions, forecast, clubs = [], knownCourses = [], eligibleCourses = [] }) {
  const from = profile.currentWeek;
  const to = Math.min(TOTAL_WEEKS, from + 3);
  const inRange = (item) => Number(item.week) >= from && Number(item.week) <= to;
  return {
    profile: { program: profile.program, year: profile.year, nextTermCourses: profile.nextTermCourses },
    currentWeek: from,
    forecast: forecast.filter((item) => item.week >= from && item.week <= to).map(({ week, weather, stress, studyHours }) => ({ week, weather, stress, studyHours })),
    deadlines: deadlines.filter(inRange).map(({ course, title, type, week, day, weight }) => ({ course, title, type, week, day, weight })),
    studySessions: studySessions.filter(inRange).map(({ id, course, week, day, hours }) => ({ id, course, week, day, hours })),
    knownCourses,
    eligibleCourses: eligibleCourses.slice(0, 40),
    clubs: clubs.slice(0, 15).map(({ id, name }) => ({ id, name })),
    limits: { maxHoursPerDay: MAX_DAY_HOURS, maxHoursPerSession: MAX_SESSION_HOURS, maxActions: MAX_ACTIONS },
  };
}

// How the busiest day changed: { day, was, now } (weather names), or null if nothing to say.
export function weatherShift(deadlines, before, after, week) {
  let worst = null;
  for (const day of DAY_NAMES) {
    const load = dayLoad(deadlines, before, week, day);
    if (!worst || load > worst.load) worst = { day, load };
  }
  if (!worst || worst.load <= 0) return null;
  return {
    day: worst.day,
    was: dayWeather(deadlines, before, week, worst.day),
    now: dayWeather(deadlines, after, week, worst.day),
  };
}

// The week an action list mostly touches (used for the before/after weather line).
export function affectedWeek(sessions, actions, fallback) {
  for (const action of actions) {
    const args = action?.args || {};
    const week = Number(args.toWeek ?? args.week);
    if (Number.isInteger(week) && week >= 1) return week;
    const session = sessions.find((item) => item.id === args.sessionId);
    if (session) return session.week;
  }
  return fallback;
}
