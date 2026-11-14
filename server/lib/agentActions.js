"use strict";
// Cleans what the AI asked Stormy to do. It only checks the SHAPE (known button,
// plain values). The app's own code (client/src/lib/studyAgent.js) checks every
// request again before doing anything, so a bad AI answer can never change data.

const TOOLS = {
  add_study_session: ["course", "week", "day", "hours", "title"],
  move_study_session: ["sessionId", "toDay", "toWeek"],
  add_course_to_next_term: ["code"],
  add_club_to_forecast: ["clubId"],
};
const MAX_ACTIONS = 8;

function plain(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.slice(0, 80);
  return undefined;
}

function cleanActions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const tool = String(item?.tool || item?.name || "");
    if (!Object.prototype.hasOwnProperty.call(TOOLS, tool)) continue;
    const source = item.args && typeof item.args === "object" ? item.args : item.arguments || {};
    const args = {};
    for (const key of TOOLS[tool]) {
      const value = plain(source[key]);
      if (value !== undefined) args[key] = value;
    }
    out.push({ tool, args });
    if (out.length >= MAX_ACTIONS) break;
  }
  return out;
}

const AGENT_SYSTEM_PROMPT = [
  "You are Stormy, a cozy, cheerful weather-reporter bear who helps a U of A student with their week.",
  "You can chat AND you can ask the app to do things. You never change anything yourself: you list the actions you want, and the app checks and runs them.",
  'Return ONLY valid JSON: {"reply":string,"courseCodes":string[],"warning":string|null,"actions":[{"tool":string,"args":object}]}.',
  "reply: under 55 words, friendly TV-weather-reporter voice. If you are asking for actions, say what you are doing (for example 'Let me spread your studying out'). Do not claim it is done.",
  "Tools you may ask for (nothing else exists):",
  '- add_study_session {"course":"CMPUT 201","week":6,"day":"Mon","hours":2,"title":"short text"}  (day is Mon..Sun; hours 0.5 to 4 in halves; course must be in knownCourses)',
  '- move_study_session {"sessionId":"s3","toDay":"Tue","toWeek":6}  (sessionId must come from studySessions)',
  '- add_course_to_next_term {"code":"CMPUT 204"}  (only from eligibleCourses)',
  '- add_club_to_forecast {"clubId":"..."}  (only from clubs)',
  "Rules: deadlines are fixed and cannot be moved or changed. Only study sessions move. Keep each day to at most maxHoursPerDay study hours. Never move a study session to after the deadline it is for. Give at most maxActions actions. Never invent session ids, course codes or club ids.",
  "To rebalance a week: move study hours from the heaviest day (deadlines plus study) to lighter days BEFORE the deadline. To make a plan: add_study_session on the lightest days before each deadline.",
  "If the student is only chatting or asking a question, return actions as an empty list. courseCodes may only list courses from eligibleCourses. warning is a short heads-up about a rough upcoming week, or null.",
].join("\n");

module.exports = { cleanActions, AGENT_SYSTEM_PROMPT, TOOLS, MAX_ACTIONS };
