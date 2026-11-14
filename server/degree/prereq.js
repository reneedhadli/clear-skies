"use strict";
// Turns U of A prerequisite text into a small logic tree and checks it.
//
// Example text:
//   "CMPUT 175 or 275, and CMPUT 272; and one of MATH 100, 114, 117, 134, 144, or 154."
// Tree:
//   and[ or[CMPUT 175, CMPUT 275], CMPUT 272, or[MATH 100, ... MATH 154] ]
//
// Node shapes:  { op: "course", code }  |  { op: "and", items }  |  { op: "or", items }
// Anything that is not a course (high school marks, "consent of the Department",
// "second-year standing", "any 300-level course") goes in `notes` and is never
// enforced, only shown to the student.

const CODE_SOURCE = String.raw`\b([A-Z]{1,6}(?: [A-Z]{1,3})?)\s(\d{3}[A-Z]?)\b|\b(\d{3}[A-Z]?)\b(?!\s*-?\s*level)`;

function normalizeCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^([A-Z ]+?)\s*(\d{3}[A-Z]?)$/, "$1 $2");
}

function cleanText(text) {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  s = s.replace(/^(?:pre|co|anti)requisites?\s*(?:\(s\))?\s*:\s*/i, "");
  // "204 (or 275)" -> "204 or 275"
  s = s.replace(/\(\s*or\s+/gi, " or ").replace(/[()]/g, " ");
  // grade rules are shown to the student but do not change the logic
  s = s.replace(
    /,?\s*(?:with\s+)?(?:a\s+)?minimum\s+(?:grade|mark)\s+(?:of\s+)?[A-D][+-]?(?:\s+or\s+(?:higher|better))?/gi,
    ""
  );
  return s.replace(/\.\s*$/, "").replace(/\s+/g, " ").trim();
}

// Every course code in a piece of text. Bare numbers inherit the last subject.
function extractCodes(text, startSubject = null) {
  const re = new RegExp(CODE_SOURCE, "g");
  const codes = [];
  let subject = startSubject;
  let match;
  while ((match = re.exec(String(text || "")))) {
    if (match[1]) {
      subject = match[1];
      codes.push(`${match[1]} ${match[2]}`);
    } else if (subject) {
      codes.push(`${subject} ${match[3]}`);
    }
  }
  return codes.map(normalizeCode);
}

function parseRequirement(text) {
  const result = { tree: null, notes: [], raw: text ? String(text).trim() : "" };
  if (!text || !String(text).trim()) return result;

  const cleaned = cleanText(text);
  const pieces = cleaned
    .split(/\s*;\s*|,?\s+and\s+/i)
    .map((piece) => piece.replace(/^(?:and|or)\s+/i, "").trim())
    .filter(Boolean);

  const items = [];
  let subject = null;
  for (const piece of pieces) {
    const re = new RegExp(CODE_SOURCE, "g");
    const codes = [];
    let match;
    while ((match = re.exec(piece))) {
      if (match[1]) {
        subject = match[1];
        codes.push(normalizeCode(`${match[1]} ${match[2]}`));
      } else if (subject) {
        codes.push(normalizeCode(`${subject} ${match[3]}`));
      }
    }
    const leftover = piece
      .replace(new RegExp(CODE_SOURCE, "g"), " ")
      .replace(/\b(?:one of|any of|either|or|and|of|the|following|a|an)\b/gi, " ")
      .replace(/[,.\s]+/g, " ")
      .trim();
    if (leftover) result.notes.push(piece);
    const unique = [...new Set(codes)];
    if (unique.length === 1) items.push({ op: "course", code: unique[0] });
    else if (unique.length > 1) {
      items.push({ op: "or", items: unique.map((code) => ({ op: "course", code })) });
    }
  }

  if (items.length === 1) result.tree = items[0];
  else if (items.length > 1) result.tree = { op: "and", items };
  return result;
}

function satisfied(tree, done) {
  if (!tree) return true;
  if (tree.op === "course") return done.has(tree.code);
  if (tree.op === "and") return tree.items.every((item) => satisfied(item, done));
  return tree.items.some((item) => satisfied(item, done));
}

// The requirements still unmet, as groups: each group is "pick one of these".
function unmetGroups(tree, done) {
  if (!tree || satisfied(tree, done)) return [];
  if (tree.op === "course") return [{ oneOf: [tree.code] }];
  if (tree.op === "or") return [{ oneOf: collectCodes(tree) }];
  return tree.items.flatMap((item) => unmetGroups(item, done));
}

function collectCodes(tree) {
  if (!tree) return [];
  if (tree.op === "course") return [tree.code];
  return [...new Set(tree.items.flatMap(collectCodes))];
}

// Plain-English sentence for the UI, e.g. "CMPUT 175 or CMPUT 275, and CMPUT 272".
function describeTree(tree) {
  if (!tree) return "No course prerequisites";
  if (tree.op === "course") return tree.code;
  if (tree.op === "or") return `one of ${tree.items.map(describeTree).join(", ")}`;
  return tree.items.map(describeTree).join("; and ");
}

module.exports = {
  normalizeCode,
  extractCodes,
  parseRequirement,
  satisfied,
  unmetGroups,
  collectCodes,
  describeTree,
};
