"use strict";
// Save AI pathway suggestions for the majors you will demo, spaced out to stay under rate limits.
//   npm --prefix server run warm-pathways -- "Computing Science" "Physics" "History"
require("dotenv").config({ quiet: true, path: require("node:path").join(__dirname, "../.env") });
const { lookup } = require("./catalogue");
const { getSuggestions } = require("./suggestions");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const majors = process.argv.slice(2).map((m) => m.trim()).filter(Boolean);
  if (!majors.length) {
    console.log('Usage: node degree/warm.js "Physics" "History" ...');
    return;
  }
  for (const major of majors) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const { suggestions, cached } = await getSuggestions({ major, completed: [], interests: [], lookup });
        console.log(`${major}: ${cached ? "already saved" : "saved"} (${suggestions.map((s) => s.name).join(" / ")})`);
        if (!cached) await sleep(15000);
        break;
      } catch (error) {
        console.log(`${major}: failed - ${error.message.replace(/\s+/g, " ").slice(0, 160)}`);
        if (/\b429\b|quota|exhausted/i.test(error.message)) {
          console.log("\nThe AI quota is used up. Stopping now so we do not waste more calls.");
          console.log("Check your limits in Google AI Studio, wait for the reset, then run this again.");
          console.log("Majors already saved are kept.");
          return;
        }
        if (attempt < 3) {
          console.log("waiting 60 seconds...");
          await sleep(60000);
        }
      }
    }
  }
  console.log("Done.");
}

main();
