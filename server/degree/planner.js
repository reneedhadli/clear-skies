"use strict";
// Deterministic pathway planner. No AI in here: it only uses the catalogue's
// real prerequisite logic, so a plan can never invent a prerequisite.

const { satisfied, unmetGroups, normalizeCode } = require("./prereq");

const DEFAULT_MAX_PER_TERM = 5;
const DEFAULT_MAX_TERMS = 10;

// "Winter 2027" -> Winter 2027, Fall 2027, Winter 2028, ... (spring/summer skipped)
function termName(startTerm, index) {
  const match = /^(Fall|Winter)\s+(\d{4})$/i.exec(startTerm || "");
  let season = match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : "Winter";
  let year = match ? Number(match[2]) : 2027;
  for (let i = 0; i < index; i += 1) {
    if (season === "Winter") season = "Fall";
    else {
      season = "Winter";
      year += 1;
    }
  }
  return `${season} ${year}`;
}

// Work out which courses a student still needs for the goals.
// For every "one of" group, pick the option that needs the fewest extra courses.
async function resolveGoals({ goals, done, lookup, avoid = new Set() }) {
  const picks = new Map(); // code -> { entry, pre: [codes], co: [codes] }
  const choices = [];
  const unknown = [];
  const blocked = [];
  const notFound = [];
  const alreadyDone = [];
  const costMemo = new Map();

  const blockedBy = (entry) => entry.antireqs.filter((code) => done.has(code));

  async function cost(code, stack) {
    if (done.has(code)) return 0;
    if (avoid.has(code)) return Infinity;
    if (costMemo.has(code)) return costMemo.get(code);
    if (stack.has(code)) return Infinity;
    const entry = await lookup(code);
    if (!entry || blockedBy(entry).length) {
      costMemo.set(code, Infinity);
      return Infinity;
    }
    stack.add(code);
    // courses whose prerequisites we could not check are a last resort
    let total = entry.prereqKnown === false ? 4 : 1;
    for (const group of unmetGroups(entry.prereq, done)) {
      let best = Infinity;
      for (const option of group.oneOf) best = Math.min(best, await cost(option, stack));
      total += best;
    }
    stack.delete(code);
    costMemo.set(code, total);
    return total;
  }

  async function expand(code) {
    if (done.has(code) || picks.has(code)) return;
    const entry = await lookup(code);
    if (!entry) {
      notFound.push(code);
      return;
    }
    const conflicts = blockedBy(entry);
    if (conflicts.length) {
      blocked.push({ code, becauseOf: conflicts });
      return;
    }
    const record = { entry, pre: [], co: [] };
    picks.set(code, record);
    if (entry.prereqKnown === false) unknown.push(code);

    for (const [kind, tree] of [["pre", entry.prereq], ["co", entry.coreq]]) {
      const have = new Set([...done, ...picks.keys()]);
      for (const group of unmetGroups(tree, have)) {
        let pick = group.oneOf[0];
        if (group.oneOf.length > 1) {
          let best = Infinity;
          for (const option of group.oneOf) {
            const optionCost = await cost(option, new Set([code]));
            if (optionCost < best) {
              best = optionCost;
              pick = option;
            }
          }
          choices.push({ for: code, oneOf: group.oneOf, picked: pick });
        }
        record[kind].push(pick);
        await expand(pick);
      }
    }
  }

  for (const goal of goals) {
    if (done.has(goal)) alreadyDone.push(goal);
    else await expand(goal);
  }
  return { picks, choices, unknown, blocked, notFound, alreadyDone };
}

function findConflict(resolved, goals) {
  const pickedAsOption = new Set(resolved.choices.map((choice) => choice.picked));
  for (const [code, record] of resolved.picks) {
    for (const other of record.entry.antireqs) {
      if (!resolved.picks.has(other)) continue;
      const avoidable = [code, other].find((c) => pickedAsOption.has(c) && !goals.includes(c));
      return { a: code, b: other, avoidable: avoidable || null };
    }
  }
  return null;
}

function schedule({ picks, goals, done, startTerm, maxPerTerm, maxTerms }) {
  const dependents = new Map();
  for (const [code, record] of picks) {
    for (const need of [...record.pre, ...record.co]) {
      if (!dependents.has(need)) dependents.set(need, []);
      dependents.get(need).push(code);
    }
  }
  const depthMemo = new Map();
  const depth = (code, stack = new Set()) => {
    if (depthMemo.has(code)) return depthMemo.get(code);
    if (stack.has(code)) return 0;
    stack.add(code);
    const next = (dependents.get(code) || []).map((dependent) => depth(dependent, stack));
    stack.delete(code);
    const value = 1 + (next.length ? Math.max(...next) : 0);
    depthMemo.set(code, value);
    return value;
  };
  const level = (code) => Number(/(\d{3})/.exec(code)?.[1] || 999);

  const remaining = new Set(picks.keys());
  const placed = new Set();
  const terms = [];

  for (let t = 0; t < maxTerms && remaining.size; t += 1) {
    const before = new Set([...done, ...placed]);
    const thisTerm = [];
    const prereqReady = (code) => satisfied(picks.get(code).entry.prereq, before);
    // Co-requisite partners that can join this term (they may need each other, so place them together).
    const partnersFor = (code) =>
      picks
        .get(code)
        .co.filter((other) => remaining.has(other) && !thisTerm.includes(other) && prereqReady(other));
    const coreqOk = (code) => {
      const { entry } = picks.get(code);
      const have = new Set([...before, ...thisTerm]);
      if (satisfied(entry.coreq, have)) return true;
      const extra = partnersFor(code);
      return (
        satisfied(entry.coreq, new Set([...have, ...extra])) &&
        thisTerm.length + 1 + extra.length <= maxPerTerm
      );
    };
    while (thisTerm.length < maxPerTerm) {
      const ready = [...remaining]
        .filter((code) => prereqReady(code) && coreqOk(code))
        .sort((a, b) => depth(b) - depth(a) || level(a) - level(b) || a.localeCompare(b));
      if (!ready.length) break;
      const chosen = ready[0];
      const have = new Set([...before, ...thisTerm]);
      const group = satisfied(picks.get(chosen).entry.coreq, have) ? [chosen] : [chosen, ...partnersFor(chosen)];
      for (const code of group) {
        thisTerm.push(code);
        remaining.delete(code);
      }
    }
    if (!thisTerm.length) break;
    thisTerm.forEach((code) => placed.add(code));
    terms.push({
      term: termName(startTerm, t),
      courses: thisTerm.map((code) => {
        const { entry, pre, co } = picks.get(code);
        const neededFor = (dependents.get(code) || []).filter((dep) => picks.has(dep));
        return {
          code,
          title: entry.title,
          units: entry.units,
          isGoal: goals.includes(code),
          neededFor,
          prereqs: [...new Set([...pre, ...co])], // links for the flowchart
          requirementText: entry.prereqText,
          corequisiteText: entry.coreqText,
          notes: entry.notes,
          verified: entry.source === "verified" || entry.source === "live",
          prereqKnown: entry.prereqKnown !== false,
        };
      }),
    });
  }
  // Say why anything is stuck, so it is never a mystery.
  const stuck = [...remaining].map((code) => {
    const { entry } = picks.get(code);
    const waiting = [...unmetGroups(entry.prereq, placed), ...unmetGroups(entry.coreq, placed)]
      .map((group) => group.oneOf.join(" / "))
      .join("; ");
    return waiting ? `${code} (waiting on ${waiting})` : code;
  });
  return { terms, unscheduled: [...remaining], stuck };
}

// One pathway: a named set of goal courses -> term-by-term plan.
async function planPathway({ name, why, goals, completed, lookup, startTerm, maxPerTerm, maxTerms }) {
  const done = new Set(completed.map(normalizeCode));
  const goalCodes = [...new Set(goals.map(normalizeCode))];
  // If two chosen courses block each other for credit (e.g. CMPUT 101 and CMPUT 174),
  // avoid the one that was only picked as an "or" option, then resolve again.
  const avoid = new Set();
  let resolved;
  let conflictLeft = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    resolved = await resolveGoals({ goals: goalCodes, done, lookup, avoid });
    const conflict = findConflict(resolved, goalCodes);
    if (!conflict) {
      conflictLeft = null;
      break;
    }
    conflictLeft = conflict;
    if (!conflict.avoidable) break;
    avoid.add(conflict.avoidable);
  }
  const { terms, unscheduled, stuck } = schedule({
    picks: resolved.picks,
    goals: goalCodes,
    done,
    startTerm,
    maxPerTerm: maxPerTerm || DEFAULT_MAX_PER_TERM,
    maxTerms: maxTerms || DEFAULT_MAX_TERMS,
  });

  const warnings = [];
  for (const code of resolved.notFound) warnings.push(`${code} was not found in the U of A catalogue, so it was left out.`);
  for (const item of resolved.blocked) {
    warnings.push(`${item.code} is blocked: you already have credit in ${item.becauseOf.join(", ")}.`);
  }
  if (unscheduled.length) {
    warnings.push(`Could not schedule: ${stuck.join(", ")}.`);
  }
  if (conflictLeft && !conflictLeft.avoidable) {
    warnings.push(
      `${conflictLeft.a} and ${conflictLeft.b} cannot both be taken for credit. Pick one of them.`
    );
  }
  if (resolved.unknown.length) {
    warnings.push(
      `Prerequisites for ${resolved.unknown.join(", ")} could not be checked (catalogue unreachable). Verify them in Bear Tracks.`
    );
  }
  warnings.push("Assumes each course is offered every Fall and Winter. Check Bear Tracks for what actually runs each term.");

  const totalCourses = terms.reduce((sum, term) => sum + term.courses.length, 0);
  return {
    name,
    why: why || null,
    goals: goalCodes,
    alreadyDone: resolved.alreadyDone,
    terms,
    totalCourses,
    totalTerms: terms.length,
    choices: resolved.choices,
    warnings,
  };
}

module.exports = { planPathway, resolveGoals, schedule, termName, DEFAULT_MAX_PER_TERM, DEFAULT_MAX_TERMS };
