import { postJSON } from "./api.js";

// What does this course need, can I take it now, and what is the path to it?
// -> { course, requirement, canTakeNow, missing:[{oneOf:[codes]}], blockedBy, path }
export function checkCourse(course, completed = [], options = {}) {
  return postJSON("/api/degree/prereqs", { course, completed, ...options });
}

// Any major. Pass `targets` to plan exactly those courses; leave it out and the AI
// suggests 3 pathways for the major. Every pathway is planned from real catalogue data.
// -> { source, summary, pathways:[{ name, why, terms:[{ term, courses }], choices, warnings }] }
export function planDegree({ major, completed = [], targets = [], interests = [], startTerm, maxPerTerm }) {
  return postJSON(
    "/api/degree/plan",
    { major, completed, targets, interests, startTerm, maxPerTerm },
    60000
  );
}

// Look up one course in the official catalogue (for a search box / autocomplete).
export async function lookupCourse(code) {
  const [subject, number] = String(code).trim().split(/\s+/);
  const response = await fetch(`/api/degree/course/${subject}/${number}`);
  if (!response.ok) return null;
  return (await response.json()).course;
}
