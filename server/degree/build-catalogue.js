"use strict";
// Pre-load real course data from the official U of A catalogue so the demo works offline.
//
//   node degree/build-catalogue.js CMPUT MATH STAT        (whole subjects, 100-499 level)
//   node degree/build-catalogue.js "CMPUT 304" "MATH 125" (just these courses)
//
// Writes server/data/catalogue.cache.json (git-ignored).

const { lookup, resetForTests, cacheCourses, saveCache, BASE_URL, splitCode } = require("./catalogue");
const { normalizeCode } = require("./prereq");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function codesForSubject(subject) {
  const slug = subject.toLowerCase();
  const response = await fetch(`${BASE_URL}/${slug}`, { headers: { "user-agent": "ClearSkies-hackathon/1.0" } });
  if (!response.ok) throw new Error(`${subject} listing returned HTTP ${response.status}`);
  const html = await response.text();
  const found = new Set();
  const re = new RegExp(`/catalogue/course/${slug}/(\\d{3})(?![0-9a-z])`, "gi");
  let match;
  while ((match = re.exec(html))) {
    if (Number(match[1]) < 500) found.add(`${subject.toUpperCase()} ${match[1]}`);
  }
  return [...found];
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('Usage: node degree/build-catalogue.js CMPUT MATH STAT   or   "CMPUT 304" "MATH 125"');
    return;
  }
  resetForTests();
  const codes = [];
  for (const arg of args) {
    if (splitCode(normalizeCode(arg))) codes.push(normalizeCode(arg));
    else {
      try {
        const list = await codesForSubject(arg);
        console.log(`${arg}: found ${list.length} courses`);
        codes.push(...list);
      } catch (error) {
        console.error(`${arg}: ${error.message}`);
      }
    }
  }

  let ok = 0;
  for (const code of codes) {
    // lookup() fetches live and writes the cache itself
    const entry = await lookup(code);
    if (entry && entry.source === "live") ok += 1;
    console.log(`${code}: ${entry ? `${entry.source}${entry.title ? " - " + entry.title : ""}` : "not in catalogue"}`);
    await sleep(250);
  }
  saveCache();
  console.log(`Done. ${ok}/${codes.length} courses saved to server/data/catalogue.cache.json`);
  console.log(`(${Object.keys(cacheCourses()).length} courses in the cache)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
