import assert from "node:assert/strict";
import { buildForecast } from "./forecast.js";
import { dailyWeather } from "./deadlines.js";
import {
  runAgentActions,
  planRebalance,
  planStudy,
  localAgent,
  dayWeather,
  hoursOnDay,
  MAX_DAY_HOURS,
} from "./studyAgent.js";

const midterm = { course: "CMPUT 201", title: "Midterm", type: "midterm", week: 6, day: "Thu", weight: 20 };
const lab = { course: "MATH 125", title: "Quiz", type: "quiz", week: 6, day: "Tue", weight: 3 };
const deadlines = [midterm, lab];
const crammed = [
  { id: "s1", course: "CMPUT 201", week: 6, day: "Thu", hours: 3, title: "", by: "you" },
  { id: "s2", course: "CMPUT 201", week: 6, day: "Thu", hours: 2, title: "", by: "you" },
];
const empty = { studySessions: [], nextTermCourses: [], likedClubIds: [], clubMatches: {} };
const env = {
  currentWeek: 6,
  knownCourses: ["CMPUT 201", "MATH 125"],
  clubs: [{ id: "chess", name: "Chess Club" }],
};

// weather counts study hours
assert.equal(dailyWeather([midterm], 5), "blizzard", "midterm + 5h cramming = blizzard");
assert.equal(dailyWeather([midterm], 1), "storm", "midterm + 1h = storm");
assert.equal(dailyWeather([], 0), "sunny");
assert.equal(dailyWeather([], 5), "storm", "5h of study alone is a storm day");
assert.equal(dailyWeather([lab], 0), "cloudy", "old behaviour unchanged with no study");
assert.equal(buildForecast(deadlines)[5].studyHours, 0);
assert.ok(buildForecast(deadlines, crammed)[5].stress > buildForecast(deadlines)[5].stress);

// rebalance: Thursday gets calmer, nothing lands after the midterm, deadlines never change
const moves = planRebalance({ week: 6, deadlines, studySessions: crammed });
assert.ok(moves.length >= 1, "it moves something");
const rebalanced = runAgentActions({ ...empty, studySessions: crammed }, moves, env);
assert.equal(rebalanced.rejected.length, 0, rebalanced.rejected.join(" | "));
const after = rebalanced.next.studySessions;
assert.equal(dayWeather(deadlines, crammed, 6, "Thu"), "blizzard");
assert.notEqual(dayWeather(deadlines, after, 6, "Thu"), "blizzard", "Thursday calmer");
assert.equal(after.reduce((s, x) => s + x.hours, 0), 5, "total hours are unchanged");
assert.ok(after.every((x) => ["Mon", "Tue", "Wed", "Thu"].includes(x.day)), "never after the midterm");
assert.deepEqual(deadlines[0], midterm, "deadlines untouched");

// rebalance with nothing to move
assert.deepEqual(planRebalance({ week: 6, deadlines, studySessions: [] }), []);

// plan: creates sessions before the deadline, within limits
const plan = planStudy({ week: 6, deadlines, studySessions: [], currentWeek: 6 });
assert.ok(plan.length >= 2 && plan.length <= 8);
const planned = runAgentActions(empty, plan, env);
assert.equal(planned.rejected.length, 0, planned.rejected.join(" | "));
assert.ok(planned.next.studySessions.every((x) => ["Mon", "Tue", "Wed", "Thu"].includes(x.day)));
assert.ok(planned.next.studySessions.filter((x) => x.course === "CMPUT 201").reduce((s, x) => s + x.hours, 0) >= 6);

// safety checks
const bad = runAgentActions(
  empty,
  [
    { tool: "delete_deadline", args: { id: 1 } },
    { tool: "add_study_session", args: { course: "FAKE 999", day: "Mon", hours: 2 } },
    { tool: "add_study_session", args: { course: "CMPUT 201", day: "Funday", hours: 2 } },
    { tool: "add_study_session", args: { course: "CMPUT 201", day: "Mon", hours: 12 } },
    { tool: "add_study_session", args: { course: "CMPUT 201", day: "Mon", hours: 2, week: 2 } },
    { tool: "move_study_session", args: { sessionId: "nope", toDay: "Mon" } },
    { tool: "add_course_to_next_term", args: { code: "not a code" } },
    { tool: "add_club_to_forecast", args: { clubId: "unknown" } },
  ],
  env
);
assert.equal(bad.applied.length, 0, "every bad request is refused");
assert.equal(bad.rejected.length, 8);
assert.deepEqual(bad.next.studySessions, []);

// day cap
const capped = runAgentActions(
  empty,
  [3, 3, 3].map(() => ({ tool: "add_study_session", args: { course: "CMPUT 201", day: "Mon", hours: 3 } })),
  env
);
assert.equal(hoursOnDay(capped.next.studySessions, 6, "Mon"), MAX_DAY_HOURS);
assert.equal(capped.rejected.length, 1);

// too many actions
const many = runAgentActions(
  empty,
  Array.from({ length: 12 }, () => ({ tool: "add_course_to_next_term", args: { code: "CMPUT 204" } })),
  env
);
assert.ok(many.rejected.length >= 1);

// other buttons
const other = runAgentActions(
  empty,
  [
    { tool: "add_course_to_next_term", args: { code: "cmput204" } },
    { tool: "add_club_to_forecast", args: { clubId: "chess" } },
  ],
  env
);
assert.deepEqual(other.next.nextTermCourses, ["CMPUT 204"]);
assert.deepEqual(other.next.likedClubIds, ["chess"]);
assert.equal(other.applied.length, 2);

// next term limit
const full = runAgentActions(
  { ...empty, nextTermCourses: ["A 100", "B 100"].map((c) => c.replace(/^(\w) /, "$1$1 ")) .concat(["CMPUT 101", "CMPUT 102", "CMPUT 103"]) },
  [{ tool: "add_course_to_next_term", args: { code: "CMPUT 204" } }],
  env
);
assert.equal(full.applied.length, 0);

// move
const moved = runAgentActions(
  { ...empty, studySessions: crammed },
  [{ tool: "move_study_session", args: { sessionId: "s1", toDay: "Mon" } }],
  env
);
assert.equal(moved.next.studySessions.find((x) => x.id === "s1").day, "Mon");
assert.equal(crammed[0].day, "Thu", "inputs are never mutated");

// no-AI Stormy
const ctx = { currentWeek: 6, deadlines, studySessions: crammed };
const overwhelmed = localAgent("Rebalance my week, I'm overwhelmed", ctx);
assert.equal(overwhelmed.handled, true);
assert.ok(overwhelmed.actions.length >= 1);
const needPlan = localAgent("Make a study plan", { ...ctx, studySessions: [] });
assert.ok(needPlan.actions.every((a) => a.tool === "add_study_session"));
assert.equal(localAgent("what's the weather like", ctx).handled, false);
const noData = localAgent("I'm overwhelmed", { currentWeek: 6, deadlines: [], studySessions: [] });
assert.equal(noData.handled, true);
assert.deepEqual(noData.actions, []);
const later = localAgent("make a study plan", { currentWeek: 3, deadlines, studySessions: [] });
assert.match(later.reply, /week 6/);

console.log("agent checks passed");
