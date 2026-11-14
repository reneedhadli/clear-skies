"use strict";
// Real syllabi are long (20k+ characters). Keep the start (course info) and the parts
// around marks, exams and due dates, so the grading section is never cut off.
const KEY = /(\d+\s?%|midterm|final exam|exam|quiz|assignment|lab|project|essay|due|deadline|weight|grading|evaluation|marks?|worth)/gi;

function pickRelevantText(text, max = 16000) {
  const clean = String(text || "");
  if (clean.length <= max) return clean;
  const head = 2500;
  const radius = 350;
  const spans = [];
  let match;
  KEY.lastIndex = 0;
  while ((match = KEY.exec(clean)) !== null) {
    if (match.index < head) continue;
    spans.push([Math.max(head, match.index - radius), Math.min(clean.length, match.index + radius)]);
  }
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }
  let out = clean.slice(0, head);
  for (const [from, to] of merged) {
    if (out.length >= max) break;
    out += " … " + clean.slice(from, Math.min(to, from + (max - out.length)));
  }
  return out.slice(0, max);
}

module.exports = { pickRelevantText };
