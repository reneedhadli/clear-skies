"use strict";
// Course lookup. Order of trust:
//   1. data/catalogue.cache.json  (fetched live from the official catalogue on your machine)
//   2. data/catalogue.json        (verified starter set shipped with the app)
//   3. live fetch from https://apps.ualberta.ca/catalogue/course/{subject}/{number}
// If none of those work, the course comes back as "unverified" with unknown
// prerequisites. The planner flags those instead of guessing.

const fs = require("node:fs");
const path = require("node:path");
const { parseRequirement, extractCodes, normalizeCode } = require("./prereq");

const SEED_PATH = path.join(__dirname, "../data/catalogue.json");
const CACHE_PATH = process.env.CATALOGUE_CACHE_PATH || path.join(__dirname, "../data/catalogue.cache.json");
const BASE_URL = "https://apps.ualberta.ca/catalogue/course";

let seed = null;
let cache = null;
const memory = new Map();
let liveFailures = 0;
let liveOffUntil = 0;
let fetchImpl = (...args) => fetch(...args);

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function seedCourses() {
  if (!seed) seed = readJSON(SEED_PATH, { courses: {} }).courses || {};
  return seed;
}

function cacheCourses() {
  if (!cache) cache = readJSON(CACHE_PATH, { courses: {} }).courses || {};
  return cache;
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ courses: cacheCourses() }, null, 1));
  } catch (error) {
    console.error("[catalogue] could not write cache:", error.message);
  }
}

function splitCode(code) {
  const match = /^(.+) (\d{3}[A-Z]?)$/.exec(code);
  return match ? { subject: match[1], number: match[2] } : null;
}

function buildEntry(raw) {
  const pre = parseRequirement(raw.prereqText);
  const co = parseRequirement(raw.coreqText);
  const prereqKnown = raw.prereqKnown !== false;
  return {
    code: raw.code,
    title: raw.title || null,
    units: raw.units ?? null,
    prereqText: raw.prereqText || null,
    coreqText: raw.coreqText || null,
    antireqText: raw.antireqText || null,
    prereq: prereqKnown ? pre.tree : null,
    coreq: prereqKnown ? co.tree : null,
    notes: prereqKnown ? [...pre.notes, ...co.notes] : [],
    antireqs: extractCodes(raw.antireqText).filter((code) => code !== raw.code),
    prereqKnown,
    source: raw.source || "unknown",
    exists: raw.source === "unverified" ? null : true,
  };
}

// ---- reading the official page ----------------------------------------------

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h\d|tr|dd|dt)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/[ \t\r\f]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
}

function parsePage(html, code) {
  const text = htmlToText(html);
  if (!text.includes(code.split(" ").slice(-1)[0])) return null;

  const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const headingText = heading ? htmlToText(heading[1]) : "";
  const titleMatch = new RegExp(`${code.replace(/ /g, "\\s*")}\\s*[-–—:]\\s*(.+)`, "i").exec(
    headingText || text
  );
  const title = titleMatch ? titleMatch[1].split("\n")[0].trim() : null;

  const unitsMatch = /(\d+(?:\.\d+)?)\s*units?\b/i.exec(text);
  const grab = (label) => {
    const match = new RegExp(
      `${label}s?\\s*:\\s*(.+?)(?=\\s*(?:Prerequisites?|Corequisites?|Antirequisites?|Notes?)\\s*:|\\n|$)`,
      "i"
    ).exec(text);
    return match ? `${label}: ${match[1].trim()}` : null;
  };
  const antireqLines = text
    .split("\n")
    .filter((line) => /^(?:This course cannot be taken for credit|Credit (?:cannot|may))/i.test(line.trim()))
    .map((line) => line.trim());

  return {
    code,
    title,
    units: unitsMatch ? Number(unitsMatch[1]) : null,
    prereqText: grab("Prerequisite"),
    coreqText: grab("Corequisite"),
    antireqText: antireqLines.length ? antireqLines.join(" ") : grab("Antirequisite"),
    source: "live",
  };
}

async function fetchLive(code) {
  if (process.env.CATALOGUE_LIVE === "0" || Date.now() < liveOffUntil) return null;
  const parts = splitCode(code);
  if (!parts) return null;
  const slug = parts.subject.toLowerCase().replace(/\s+/g, "");
  try {
    const response = await fetchImpl(`${BASE_URL}/${slug}/${parts.number.toLowerCase()}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "ClearSkies-hackathon/1.0" },
    });
    // 404 = no such course, 410 = course discontinued. Only trust this when the subject
    // is a single plain word (we know the URL pattern works for those).
    if (response.status === 404 || response.status === 410) {
      liveFailures = 0;
      return parts.subject.includes(" ") ? null : { exists: false };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parsePage(await response.text(), code);
    if (!parsed) throw new Error("page did not look like a course page");
    liveFailures = 0;
    return parsed;
  } catch (error) {
    liveFailures += 1;
    console.error(`[catalogue] live lookup failed for ${code}: ${error.message}`);
    if (liveFailures >= 2) liveOffUntil = Date.now() + 60_000;
    return null;
  }
}

// ---- public API ----------------------------------------------------------------

// Returns a course entry, or null if the official catalogue says it does not exist.
async function lookup(rawCode, { live = true } = {}) {
  const code = normalizeCode(rawCode);
  if (!splitCode(code)) return null;
  if (memory.has(code)) return memory.get(code);

  const cached = cacheCourses()[code];
  if (cached) {
    if (cached.missing) {
      memory.set(code, null);
      return null;
    }
    const entry = buildEntry(cached);
    memory.set(code, entry);
    return entry;
  }

  const seeded = seedCourses()[code];
  if (seeded && seeded.prereqKnown !== false) {
    const entry = buildEntry(seeded);
    memory.set(code, entry);
    return entry;
  }

  const fetched = live ? await fetchLive(code) : null;
  if (fetched && fetched.exists === false) {
    cacheCourses()[code] = { code, missing: true };
    saveCache();
    memory.set(code, null);
    return null;
  }
  if (fetched) {
    cacheCourses()[code] = fetched;
    saveCache();
    const entry = buildEntry(fetched);
    memory.set(code, entry);
    return entry;
  }

  // Could not verify: title-only listing entry, or a bare unverified placeholder.
  const entry = buildEntry(
    seeded
      ? { ...seeded, prereqKnown: false }
      : { code, prereqKnown: false, source: "unverified" }
  );
  // Do not memoise failures, so a later request can try the live lookup again.
  return entry;
}

function setFetch(fn) {
  fetchImpl = fn;
  liveFailures = 0;
  liveOffUntil = 0;
}

function resetForTests() {
  memory.clear();
  cache = null;
  seed = null;
  liveFailures = 0;
  liveOffUntil = 0;
}

module.exports = {
  lookup,
  parsePage,
  htmlToText,
  buildEntry,
  splitCode,
  setFetch,
  resetForTests,
  cacheCourses,
  saveCache,
  BASE_URL,
};
