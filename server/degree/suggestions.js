"use strict";
// AI pathway suggestions, cached in memory and on disk so a demo never depends on
// the AI being available. Pre-load majors with:  npm --prefix server run warm-pathways -- "Physics" "History"

const fs = require("node:fs");
const path = require("node:path");
const { suggestPathways } = require("./ai");

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FILE = () => process.env.PATHWAYS_CACHE_PATH || path.join(__dirname, "../data/pathways.cache.json");

let store = null;

function load() {
  if (store) return store;
  try {
    store = JSON.parse(fs.readFileSync(FILE(), "utf8"));
  } catch {
    store = {};
  }
  return store;
}

function save() {
  try {
    fs.writeFileSync(FILE(), JSON.stringify(store, null, 1));
  } catch (error) {
    console.error("[pathways cache] could not save:", error.message);
  }
}

function keyFor({ major, completed, interests }) {
  return `${major.toLowerCase()}|${[...completed].sort().join(",")}|${(interests || []).join(",")}`;
}

async function getSuggestions({ major, completed, interests, lookup }) {
  const key = keyFor({ major, completed, interests });
  const hit = load()[key];
  if (hit && Date.now() - hit.at < TTL_MS) return { suggestions: hit.value, cached: true };
  const suggestions = await suggestPathways({ major, completed, interests, lookup });
  load()[key] = { at: Date.now(), value: suggestions };
  save();
  return { suggestions, cached: false };
}

function resetForTests() {
  store = null;
}

module.exports = { getSuggestions, resetForTests };
