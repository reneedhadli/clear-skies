"use strict";
const { lookup, splitCode } = require("./catalogue");
const { normalizeCode, unmetGroups, describeTree } = require("./prereq");
const { planPathway } = require("./planner");
const { suggestPathways, summarizePlans } = require("./ai");

const DEFAULT_START = "Winter 2027";

function codeList(value, max = 60) {
  if (!Array.isArray(value)) return [];
  const codes = value.map(normalizeCode).filter((code) => splitCode(code));
  return [...new Set(codes)].slice(0, max);
}

function publicCourse(entry) {
  return {
    code: entry.code,
    title: entry.title,
    units: entry.units,
    prereqText: entry.prereqText,
    coreqText: entry.coreqText,
    antireqText: entry.antireqText,
    antireqs: entry.antireqs,
    notes: entry.notes,
    prereqKnown: entry.prereqKnown,
    source: entry.source, // verified | live | listing | unverified
  };
}

function readOptions(body) {
  const startTerm = /^(Fall|Winter)\s+\d{4}$/i.test(body?.startTerm || "") ? body.startTerm : DEFAULT_START;
  const maxPerTerm = Math.min(6, Math.max(1, Number(body?.maxPerTerm) || 5));
  return { startTerm, maxPerTerm };
}

module.exports = function mountDegreeRoutes(app) {
  // Look up one course in the official catalogue.
  app.get("/api/degree/course/:subject/:number", async (req, res) => {
    const code = normalizeCode(`${req.params.subject} ${req.params.number}`);
    if (!splitCode(code)) return res.status(400).json({ error: "Use a course like CMPUT 204." });
    const entry = await lookup(code);
    if (!entry) return res.status(404).json({ error: `${code} is not in the U of A catalogue.` });
    res.json({ course: publicCourse(entry) });
  });

  // Body: { course: "CMPUT 304", completed: ["CMPUT 174", ...], startTerm?, maxPerTerm? }
  // What does this course need, can I take it now, and what is the path to it?
  app.post("/api/degree/prereqs", async (req, res) => {
    const code = normalizeCode(req.body?.course);
    if (!splitCode(code)) return res.status(400).json({ error: "Send a course like CMPUT 304." });
    const completed = codeList(req.body?.completed);
    const done = new Set(completed);
    const { startTerm, maxPerTerm } = readOptions(req.body);
    try {
      const entry = await lookup(code);
      if (!entry) return res.status(404).json({ error: `${code} is not in the U of A catalogue.` });

      const missing = unmetGroups(entry.prereq, done);
      const missingCoreq = unmetGroups(entry.coreq, done);
      const blockedBy = entry.antireqs.filter((other) => done.has(other));
      const path = await planPathway({
        name: `Path to ${code}`,
        goals: [code],
        completed,
        lookup,
        startTerm,
        maxPerTerm,
      });
      res.json({
        course: publicCourse(entry),
        requirement: entry.prereqKnown ? describeTree(entry.prereq) : null,
        canTakeNow: entry.prereqKnown && !missing.length && !blockedBy.length,
        alreadyCompleted: done.has(code),
        missing, // each item: { oneOf: [codes] }  (take one of these)
        missingCorequisites: missingCoreq,
        blockedBy,
        path,
      });
    } catch (error) {
      console.error("[degree/prereqs]", error.message);
      res.status(500).json({ error: "Could not check that course right now." });
    }
  });

  // Body: { major, completed: [...], targets?: [...], interests?: [...], startTerm?, maxPerTerm? }
  // With targets: one plan for exactly those courses.
  // Without: the AI suggests 3 pathways for the major and each one is planned from the catalogue.
  app.post("/api/degree/plan", async (req, res) => {
    const major = String(req.body?.major || "").replace(/\s+/g, " ").trim().slice(0, 100);
    const completed = codeList(req.body?.completed);
    const targets = codeList(req.body?.targets, 12);
    const interests = Array.isArray(req.body?.interests)
      ? req.body.interests.map((item) => String(item).slice(0, 40)).slice(0, 8)
      : [];
    const { startTerm, maxPerTerm } = readOptions(req.body);
    if (!targets.length && !major) {
      return res.status(400).json({ error: "Send a major, or the courses you want to reach." });
    }

    try {
      let suggestions;
      let source;
      if (targets.length) {
        suggestions = [{ name: "Your goals", why: "The courses you picked.", courses: targets, dropped: [] }];
        source = "user";
      } else {
        try {
          suggestions = await suggestPathways({ major, completed, interests, lookup });
          source = "ai";
        } catch (error) {
          console.error("[degree/plan] suggestions:", error.message);
          return res.json({
            major,
            startTerm,
            source: "unavailable",
            message: "The AI is offline right now. Pick the courses you want to reach and I will plan them.",
            summary: null,
            pathways: [],
          });
        }
      }

      const pathways = [];
      for (const suggestion of suggestions) {
        const plan = await planPathway({
          name: suggestion.name,
          why: suggestion.why,
          goals: suggestion.courses,
          completed,
          lookup,
          startTerm,
          maxPerTerm,
        });
        for (const code of suggestion.dropped || []) {
          plan.warnings.unshift(`The AI suggested ${code}, but it is not in the U of A catalogue, so it was removed.`);
        }
        if (source === "ai") {
          plan.warnings.unshift(
            `AI-suggested pathway for ${major}. Confirm your program requirements with your faculty advisor.`
          );
        }
        pathways.push(plan);
      }

      const summary = pathways.length > 1 ? await summarizePlans(pathways, major) : null;
      res.json({ major, startTerm, source, summary, pathways });
    } catch (error) {
      console.error("[degree/plan]", error.message);
      res.status(500).json({ error: "Could not build a plan right now." });
    }
  });
};
