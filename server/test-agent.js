"use strict";
const assert = require("node:assert/strict");
const { cleanActions } = require("./lib/agentActions");

const cleaned = cleanActions([
  { tool: "add_study_session", args: { course: "CMPUT 201", week: 6, day: "Mon", hours: 2, evil: "x", title: "t" } },
  { tool: "delete_everything", args: {} },
  { tool: "move_study_session", args: { sessionId: { nested: 1 }, toDay: "Tue" } },
  "garbage",
  null,
]);
assert.equal(cleaned.length, 2, "unknown tools and junk are dropped");
assert.deepEqual(cleaned[0].args, { course: "CMPUT 201", week: 6, day: "Mon", hours: 2, title: "t" }, "extra args removed");
assert.deepEqual(cleaned[1].args, { toDay: "Tue" }, "non-plain values removed");
assert.equal(cleanActions(Array.from({ length: 20 }, () => ({ tool: "add_course_to_next_term", args: { code: "CMPUT 204" } }))).length, 8);
assert.deepEqual(cleanActions("nope"), []);
console.log("agent server checks passed");
