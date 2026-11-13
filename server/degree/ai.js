"use strict";
// The AI only does two things here, and both are checked afterwards:
//   1. suggest named pathways (sets of goal courses) for a major
//      -> every course code is verified against the official catalogue
//   2. write a short summary of the finished plans from numbers we computed
// It never decides prerequisites. Those come from the catalogue.

const { callLLM, parseJSON } = require("../llm");
const { normalizeCode } = require("./prereq");

async function suggestPathways({ major, completed, interests, lookup }) {
  const systemPrompt =
    'You help University of Alberta undergraduates plan their degree. Return ONLY valid JSON: {"pathways":[{"name":string,"why":string,"courses":[string]}]}. Give exactly 3 different pathways (for example specializations or focus areas) for the student\'s major. Each has 4 to 7 courses written like "CMPUT 304", all real University of Alberta courses that count toward that major, mostly at the 200 to 400 level, none already completed. If the major is broad (for example Engineering or Science), make each pathway a different discipline or specialization, and include its first-year core courses. If you are not sure a course exists, leave it out. name is under 5 words. why is one friendly sentence under 25 words.';
  const userPrompt = `Major: ${major}
Completed courses: ${JSON.stringify(completed)}
Interests: ${JSON.stringify(interests || [])}`;

  const parsed = parseJSON(await callLLM(systemPrompt, userPrompt));
  const list = Array.isArray(parsed?.pathways) ? parsed.pathways.slice(0, 3) : [];
  const done = new Set(completed.map(normalizeCode));
  const pathways = [];

  for (const item of list) {
    const name = String(item?.name || "").trim().slice(0, 60);
    if (!name || !Array.isArray(item.courses)) continue;
    const courses = [];
    const dropped = [];
    for (const raw of item.courses.slice(0, 10)) {
      const code = normalizeCode(raw);
      if (done.has(code) || courses.includes(code)) continue;
      const entry = await lookup(code);
      if (entry === null) dropped.push(code); // the catalogue says it does not exist
      else courses.push(code);
    }
    if (courses.length) {
      pathways.push({
        name,
        why: String(item.why || "").trim().slice(0, 200) || null,
        courses,
        dropped,
      });
    }
  }
  if (!pathways.length) throw new Error("No usable pathways returned");
  return pathways;
}

function plainSummary(facts) {
  const fastest = [...facts].sort((a, b) => a.terms - b.terms)[0];
  return {
    headline: "Here are your pathways.",
    advice: fastest
      ? `${fastest.name} is the quickest at ${fastest.terms} term${fastest.terms === 1 ? "" : "s"}.`
      : "",
    source: "computed",
  };
}

async function summarizePlans(plans, major) {
  const facts = plans.map((plan) => ({
    name: plan.name,
    terms: plan.totalTerms,
    courses: plan.totalCourses,
    firstTerm: plan.terms[0]?.courses.map((course) => course.code) || [],
  }));
  // Saves an AI call (and rate limit) per search. Set DEGREE_AI_SUMMARY=1 to have the AI write it.
  if (process.env.DEGREE_AI_SUMMARY !== "1") return plainSummary(facts);
  try {
    const systemPrompt =
      'You are Stormy, a friendly weather-reporter bear. Return ONLY valid JSON: {"headline":string,"advice":string}. headline is one short sentence. advice is 2 sentences comparing the pathways using ONLY the numbers given. Never invent courses, numbers, or prerequisites.';
    const parsed = parseJSON(
      await callLLM(systemPrompt, `Major: ${major}\nPathways: ${JSON.stringify(facts)}`)
    );
    const headline = String(parsed?.headline || "").trim();
    const advice = String(parsed?.advice || "").trim();
    if (!headline || !advice) throw new Error("Empty summary");
    return { headline: headline.slice(0, 160), advice: advice.slice(0, 400), source: "ai" };
  } catch (error) {
    console.error("[degree-summary]", error.message);
    return { ...plainSummary(facts), source: "fallback" };
  }
}

module.exports = { suggestPathways, summarizePlans };
