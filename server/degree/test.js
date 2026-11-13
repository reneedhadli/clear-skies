"use strict";
process.env.CATALOGUE_LIVE = "0"; // tests never touch the network
const assert = require("node:assert/strict");
const prereq = require("./prereq");
const catalogue = require("./catalogue");
const { planPathway, termName } = require("./planner");

const codes = (tree) => JSON.stringify(prereq.collectCodes(tree));
let passed = 0;
const check = (name, fn) =>
  Promise.resolve(fn()).then(() => {
    passed += 1;
    console.log("ok  -", name);
  });

(async () => {
  // ---- the parser, on real catalogue sentences --------------------------------
  await check("CMPUT 204 text -> and(or, course, or)", () => {
    const { tree } = prereq.parseRequirement(
      "Prerequisites: CMPUT 175 or 275, and CMPUT 272; and one of MATH 100, 114, 117, 134, 144, or 154."
    );
    assert.equal(tree.op, "and");
    assert.equal(tree.items.length, 3);
    assert.deepEqual(tree.items[0].items.map((i) => i.code), ["CMPUT 175", "CMPUT 275"]);
    assert.equal(tree.items[1].code, "CMPUT 272");
    assert.deepEqual(
      tree.items[2].items.map((i) => i.code),
      ["MATH 100", "MATH 114", "MATH 117", "MATH 134", "MATH 144", "MATH 154"]
    );
  });

  await check("CMPUT 304 text (semicolons, mixed subjects)", () => {
    const { tree } = prereq.parseRequirement(
      "Prerequisites: CMPUT 204; one of STAT 151, 161, 181, 235, 265, SCI 151, or MATH 181; and one of MATH 102, 125, 126, 127."
    );
    assert.equal(tree.items.length, 3);
    assert.equal(tree.items[0].code, "CMPUT 204");
    assert.ok(tree.items[1].items.some((i) => i.code === "SCI 151"));
    assert.ok(tree.items[1].items.some((i) => i.code === "MATH 181"));
    assert.deepEqual(tree.items[2].items.map((i) => i.code), ["MATH 102", "MATH 125", "MATH 126", "MATH 127"]);
  });

  await check("bare number inherits subject across 'and' (CMPUT 291)", () => {
    const { tree } = prereq.parseRequirement("Prerequisites: CMPUT 175 or 274, and 272.");
    assert.equal(codes(tree), '["CMPUT 175","CMPUT 274","CMPUT 272"]');
  });

  await check("high school marks become notes, not courses", () => {
    const r = prereq.parseRequirement("Prerequisite: Math 30, 30-1, or 30-2.");
    assert.equal(r.tree, null);
    assert.equal(r.notes.length, 1);
  });

  await check("non-course conditions are kept as notes", () => {
    const r = prereq.parseRequirement("Prerequisite: CMPUT 201 or 275, and consent of the Department.");
    assert.equal(codes(r.tree), '["CMPUT 201","CMPUT 275"]');
    assert.equal(r.notes.length, 1);
  });

  await check("'204 (or 275)' and grade rules", () => {
    const r = prereq.parseRequirement("CMPUT 201 and 204 (or 275) with a minimum grade of C-");
    assert.equal(r.tree.items.length, 2);
    assert.deepEqual(r.tree.items[1].items.map((i) => i.code), ["CMPUT 204", "CMPUT 275"]);
  });

  await check("'any 300-level course' is not read as course 300", () => {
    const r = prereq.parseRequirement("Prerequisite: CMPUT 204 and any 300-level CS course.");
    assert.equal(codes(r.tree), '["CMPUT 204"]');
  });

  await check("antirequisite codes (E E 380 style)", () => {
    const entry = catalogue.buildEntry({
      code: "CMPUT 229",
      antireqText: "Credit may be obtained in only one of CMPUT 229, E E 380 or ECE 212.",
      source: "verified",
    });
    assert.deepEqual(entry.antireqs, ["E E 380", "ECE 212"]);
  });

  await check("satisfied / unmetGroups", () => {
    const { tree } = prereq.parseRequirement("CMPUT 175 or 275, and CMPUT 272");
    assert.equal(prereq.satisfied(tree, new Set(["CMPUT 275", "CMPUT 272"])), true);
    assert.equal(prereq.satisfied(tree, new Set(["CMPUT 175"])), false);
    assert.deepEqual(prereq.unmetGroups(tree, new Set(["CMPUT 175"])), [{ oneOf: ["CMPUT 272"] }]);
  });

  // ---- catalogue ---------------------------------------------------------------
  await check("verified seed entry loads and parses", async () => {
    const e = await catalogue.lookup("cmput204");
    assert.equal(e.title, "Algorithms I");
    assert.equal(e.source, "verified");
    assert.equal(e.prereq.items.length, 3);
  });

  await check("unreachable course -> unverified, not invented", async () => {
    const e = await catalogue.lookup("MATH 100");
    assert.equal(e.prereqKnown, false);
    assert.equal(e.prereq, null);
    assert.equal(e.source, "unverified");
  });

  await check("listing-only course: title kept, prerequisites unknown", async () => {
    const e = await catalogue.lookup("CMPUT 325");
    assert.equal(e.title, "Non-Procedural Programming Languages");
    assert.equal(e.prereqKnown, false);
  });

  await check("live page parsing (fake official page)", () => {
    const html = `<html><body><h1>CMPUT 204 - Algorithms I</h1>
      <p>3 units (fi 6)(EITHER, 3-1S-0)</p>
      <p>Prerequisites: CMPUT 175 or 275, and CMPUT 272; and one of MATH 100, 114, or 144.</p>
      <p>Credit cannot be obtained for both CMPUT 204 and CMPUT 304.</p></body></html>`;
    const parsed = catalogue.parsePage(html, "CMPUT 204");
    assert.equal(parsed.title, "Algorithms I");
    assert.equal(parsed.units, 3);
    assert.match(parsed.prereqText, /^Prerequisite: CMPUT 175 or 275/);
    assert.match(parsed.antireqText, /both CMPUT 204 and CMPUT 304/);
    const entry = catalogue.buildEntry(parsed);
    assert.equal(entry.prereq.items.length, 3);
    assert.deepEqual(entry.antireqs, ["CMPUT 304"]);
  });

  await check("live lookup: 404 means the course does not exist", async () => {
    catalogue.resetForTests();
    process.env.CATALOGUE_LIVE = "1";
    catalogue.setFetch(async () => ({ status: 404, ok: false, text: async () => "" }));
    const e = await catalogue.lookup("CMPUT 999", { live: true });
    assert.equal(e, null);
    process.env.CATALOGUE_LIVE = "0";
    catalogue.setFetch((...a) => fetch(...a));
    catalogue.resetForTests();
  });

  await check("live lookup: 410 (discontinued course) is 'not in catalogue', not an error", async () => {
    catalogue.resetForTests();
    process.env.CATALOGUE_LIVE = "1";
    catalogue.setFetch(async () => ({ status: 410, ok: false, text: async () => "" }));
    assert.equal(await catalogue.lookup("MATH 181", { live: true }), null);
    assert.equal(await catalogue.lookup("SCI 151", { live: true }), null);
    // two 410s in a row must not switch live lookups off
    catalogue.setFetch(async () => ({
      status: 200,
      ok: true,
      text: async () => "<h1>MATH 100 - Calculus I</h1><p>Prerequisite: Math 30-1.</p>",
    }));
    const e = await catalogue.lookup("MATH 100", { live: true });
    assert.equal(e.source, "live");
    process.env.CATALOGUE_LIVE = "0";
    catalogue.setFetch((...a) => fetch(...a));
    catalogue.resetForTests();
  });

  // ---- the planner -----------------------------------------------------------
  const lookup = (code) => catalogue.lookup(code, { live: false });

  await check("term names alternate Fall / Winter", () => {
    assert.deepEqual(
      [0, 1, 2, 3].map((i) => termName("Winter 2027", i)),
      ["Winter 2027", "Fall 2027", "Winter 2028", "Fall 2028"]
    );
  });

  await check("path to CMPUT 304 from CMPUT 174: real chain, right order", async () => {
    const plan = await planPathway({
      name: "t",
      goals: ["CMPUT 304"],
      completed: ["CMPUT 174"],
      lookup,
      startTerm: "Winter 2027",
      maxPerTerm: 5,
    });
    const all = plan.terms.flatMap((t) => t.courses.map((c) => c.code));
    assert.ok(all.includes("CMPUT 175"));
    assert.ok(all.includes("CMPUT 272"));
    assert.ok(all.includes("CMPUT 204"));
    assert.ok(all.includes("CMPUT 304"));
    assert.ok(!all.includes("CMPUT 174"), "completed course must not be planned again");
    const termOf = (code) => plan.terms.findIndex((t) => t.courses.some((c) => c.code === code));
    assert.ok(termOf("CMPUT 175") < termOf("CMPUT 204"));
    assert.ok(termOf("CMPUT 272") < termOf("CMPUT 204"));
    assert.ok(termOf("CMPUT 204") < termOf("CMPUT 304"));
    assert.equal(plan.choices.length >= 2, true, "'one of' groups are reported as choices");
    assert.ok(plan.warnings.some((w) => /could not be checked/.test(w)), "unknown MATH/STAT prereqs flagged");
  });

  await check("max courses per term is respected", async () => {
    const plan = await planPathway({
      name: "t",
      goals: ["CMPUT 304"],
      completed: [],
      lookup,
      startTerm: "Fall 2027",
      maxPerTerm: 2,
    });
    assert.ok(plan.terms.every((t) => t.courses.length <= 2));
    assert.equal(plan.terms[0].term, "Fall 2027");
  });

  await check("completed alternative satisfies an 'or' (CMPUT 275 instead of 175)", async () => {
    const plan = await planPathway({
      name: "t",
      goals: ["CMPUT 204"],
      completed: ["CMPUT 275", "CMPUT 101", "MATH 144"],
      lookup,
      startTerm: "Winter 2027",
    });
    const all = plan.terms.flatMap((t) => t.courses.map((c) => c.code));
    assert.deepEqual(all, ["CMPUT 272", "CMPUT 204"].filter((c) => all.includes(c)));
    assert.ok(!all.includes("CMPUT 175"));
    assert.ok(!all.some((c) => c.startsWith("MATH")), "MATH 144 already satisfies the math requirement");
  });

  await check("a course already completed needs nothing", async () => {
    const plan = await planPathway({
      name: "t",
      goals: ["CMPUT 175"],
      completed: ["CMPUT 175"],
      lookup,
      startTerm: "Winter 2027",
    });
    assert.equal(plan.totalCourses, 0);
    assert.deepEqual(plan.alreadyDone, ["CMPUT 175"]);
  });

  await check("antirequisite blocks a course (credit in CMPUT 274 blocks CMPUT 174)", async () => {
    const plan = await planPathway({
      name: "t",
      goals: ["CMPUT 174"],
      completed: ["CMPUT 274"],
      lookup,
      startTerm: "Winter 2027",
    });
    assert.equal(plan.totalCourses, 0);
    assert.ok(plan.warnings.some((w) => /blocked/.test(w)));
  });

  await check("corequisite (CMPUT 291 needs CMPUT 201 or 275 in the same term or earlier)", async () => {
    const plan = await planPathway({
      name: "t",
      goals: ["CMPUT 291"],
      completed: ["CMPUT 175", "CMPUT 101"],
      lookup,
      startTerm: "Winter 2027",
    });
    const termOf = (code) => plan.terms.findIndex((t) => t.courses.some((c) => c.code === code));
    assert.ok(termOf("CMPUT 201") !== -1 && termOf("CMPUT 201") <= termOf("CMPUT 291"));
  });

  // ---- the HTTP routes ---------------------------------------------------------
  await check("routes: prereqs + plan with targets (no AI needed) + AI offline message", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_API_KEY;
    const express = require("express");
    const app = express();
    app.use(express.json());
    require("./routes")(app);
    const server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = async (path, body) => {
      const r = await fetch(base + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };
    try {
      const a = await post("/api/degree/prereqs", { course: "CMPUT 204", completed: ["CMPUT 175"] });
      assert.equal(a.status, 200);
      assert.equal(a.body.canTakeNow, false);
      assert.equal(a.body.missing.length, 2); // CMPUT 272 and the MATH choice
      assert.ok(a.body.path.terms.length >= 2);

      const b = await post("/api/degree/plan", { targets: ["cmput 204", "CMPUT 301"], completed: ["CMPUT 174"] });
      assert.equal(b.status, 200);
      assert.equal(b.body.source, "user");
      assert.equal(b.body.pathways.length, 1);

      const c = await post("/api/degree/plan", { major: "Psychology", completed: [] });
      assert.equal(c.status, 200);
      assert.equal(c.body.source, "unavailable");

      const d = await post("/api/degree/plan", {});
      assert.equal(d.status, 400);
      const e = await post("/api/degree/prereqs", { course: "nonsense" });
      assert.equal(e.status, 400);
    } finally {
      server.close();
    }
  });

  console.log(`\n${passed} checks passed`);
})().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
