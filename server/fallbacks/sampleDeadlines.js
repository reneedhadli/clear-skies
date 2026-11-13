const BY_COURSE = {
  "CMPUT 201": [
    { course: "CMPUT 201", title: "Lab 1: Git & testing", type: "lab", week: 2, day: "Fri", weight: 2 },
    { course: "CMPUT 201", title: "Assignment 1: C pointers", type: "assignment", week: 3, day: "Fri", weight: 5 },
    { course: "CMPUT 201", title: "Quiz 1: testing habits", type: "quiz", week: 4, day: "Tue", weight: 3 },
    { course: "CMPUT 201", title: "Assignment 2: modules", type: "assignment", week: 5, day: "Fri", weight: 8 },
    { course: "CMPUT 201", title: "Midterm", type: "midterm", week: 6, day: "Thu", weight: 18 },
    { course: "CMPUT 201", title: "Lab 3: valgrind", type: "lab", week: 8, day: "Fri", weight: 2 },
    { course: "CMPUT 201", title: "Assignment 3: memory", type: "assignment", week: 9, day: "Wed", weight: 15 },
    { course: "CMPUT 201", title: "Quiz 2: design patterns", type: "quiz", week: 11, day: "Tue", weight: 3 },
    { course: "CMPUT 201", title: "Final project", type: "project", week: 12, day: "Fri", weight: 12 },
    { course: "CMPUT 201", title: "Final exam", type: "final", week: 15, day: "Tue", weight: 35 },
  ],
  "CMPUT 204": [
    { course: "CMPUT 204", title: "Quiz 1: asymptotics", type: "quiz", week: 3, day: "Wed", weight: 3 },
    { course: "CMPUT 204", title: "Assignment 1: divide & conquer", type: "assignment", week: 4, day: "Fri", weight: 8 },
    { course: "CMPUT 204", title: "Midterm", type: "midterm", week: 7, day: "Tue", weight: 20 },
    { course: "CMPUT 204", title: "Assignment 2: graphs", type: "assignment", week: 9, day: "Fri", weight: 15 },
    { course: "CMPUT 204", title: "Assignment 3: greedy", type: "assignment", week: 11, day: "Fri", weight: 12 },
    { course: "CMPUT 204", title: "Final exam", type: "final", week: 14, day: "Thu", weight: 35 },
  ],
  "MATH 125": [
    { course: "MATH 125", title: "Quiz 1: vectors", type: "quiz", week: 2, day: "Thu", weight: 3 },
    { course: "MATH 125", title: "Assignment 1", type: "assignment", week: 3, day: "Fri", weight: 3 },
    { course: "MATH 125", title: "Quiz 2: matrices", type: "quiz", week: 4, day: "Thu", weight: 3 },
    { course: "MATH 125", title: "Assignment 2", type: "assignment", week: 5, day: "Fri", weight: 4 },
    { course: "MATH 125", title: "Quiz 3: determinants", type: "quiz", week: 6, day: "Tue", weight: 4 },
    { course: "MATH 125", title: "Midterm", type: "midterm", week: 8, day: "Wed", weight: 20 },
    { course: "MATH 125", title: "Assignment 3", type: "assignment", week: 10, day: "Fri", weight: 5 },
    { course: "MATH 125", title: "Assignment 4", type: "assignment", week: 12, day: "Fri", weight: 5 },
    { course: "MATH 125", title: "Final exam", type: "final", week: 15, day: "Fri", weight: 35 },
  ],
  "ENGL 102": [
    { course: "ENGL 102", title: "Close reading response", type: "assignment", week: 3, day: "Tue", weight: 2 },
    { course: "ENGL 102", title: "Essay 1: short fiction", type: "assignment", week: 6, day: "Fri", weight: 6 },
    { course: "ENGL 102", title: "Peer review", type: "assignment", week: 7, day: "Thu", weight: 2 },
    { course: "ENGL 102", title: "Essay 2: poetry", type: "assignment", week: 9, day: "Fri", weight: 10 },
    { course: "ENGL 102", title: "Class presentation", type: "assignment", week: 11, day: "Tue", weight: 5 },
    { course: "ENGL 102", title: "Essay 3: drama", type: "assignment", week: 12, day: "Fri", weight: 10 },
    { course: "ENGL 102", title: "Final portfolio", type: "final", week: 14, day: "Thu", weight: 20 },
  ],
};

const TYPES = ["assignment", "quiz", "lab", "midterm", "final", "project"];

function normalizeDay(value) {
  const map = {
    mon: "Mon",
    monday: "Mon",
    tue: "Tue",
    tues: "Tue",
    tuesday: "Tue",
    wed: "Wed",
    wednesday: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    thursday: "Thu",
    fri: "Fri",
    friday: "Fri",
    sat: "Sat",
    saturday: "Sat",
    sun: "Sun",
    sunday: "Sun",
  };
  const key = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  return map[key] || "Fri";
}

function normalizeType(value, title = "") {
  const text = `${value || ""} ${title}`.toLowerCase();
  const found = TYPES.find((type) => text.includes(type));
  if (found) return found;
  if (text.includes("exam")) return "final";
  if (text.includes("essay") || text.includes("portfolio")) return "assignment";
  return "assignment";
}

function detectKnownCourses(text) {
  const lower = String(text || "").toLowerCase();
  return Object.keys(BY_COURSE).filter((code) =>
    lower.includes(code.toLowerCase().replace(/\s+/g, " "))
  );
}

function parseGeneric(text) {
  const body = String(text || "");
  const codeMatch = body.match(/\b[A-Z]{3,4}\s?\d{3}\b/);
  const course = (codeMatch?.[0] || "Your course").replace(/\s+/g, " ").trim();
  const results = [];
  const seen = new Set();

  body.split(/\r?\n/).forEach((line) => {
    const weekMatch = line.match(/week\s*(\d{1,2})/i);
    const weightMatch = line.match(/(\d{1,3})\s*%/);
    const looksGraded = /(due|exam|midterm|quiz|assignment|lab|project|essay|portfolio|presentation)/i.test(
      line
    );
    if (!weekMatch || !weightMatch || !looksGraded) return;

    const week = Number(weekMatch[1]);
    if (week < 1 || week > 15) return;
    const weight = Math.min(100, Number(weightMatch[1]));
    if (!Number.isFinite(weight) || weight <= 0) return;

    const dayMatch = line.match(
      /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i
    );
    const title = line
      .replace(/week\s*\d{1,2}/i, "")
      .replace(/\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i, "")
      .replace(/\d{1,3}\s*%/g, "")
      .replace(/\bdue\b/gi, "")
      .replace(/^[\s—–\-·:,.]+|[\s—–\-·:,.]+$/g, "")
      .slice(0, 80);
    if (!title) return;

    const key = `${course}|${week}|${title}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      course,
      title,
      type: normalizeType(line, title),
      week,
      day: normalizeDay(dayMatch?.[0]),
      weight,
    });
  });

  return results;
}

function fallbackExtract(text) {
  const known = detectKnownCourses(text);
  if (known.length) {
    return known.flatMap((code) => BY_COURSE[code].map((item) => ({ ...item })));
  }
  return parseGeneric(text);
}

module.exports = { fallbackExtract, normalizeDay, normalizeType, BY_COURSE };
