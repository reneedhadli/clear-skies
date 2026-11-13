const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callGemini(systemPrompt, userPrompt) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      signal: AbortSignal.timeout(35000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function callProvider(systemPrompt, userPrompt) {
  if (process.env.GEMINI_API_KEY) return callGemini(systemPrompt, userPrompt);
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is not configured");

  const response = await fetch(process.env.AI_BASE_URL || ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(35000),
    body: JSON.stringify({
      model: process.env.AI_MODEL || "claude-sonnet-4-5",
      max_tokens: 1800,
      temperature: 0.65,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Anthropic returned an empty response");
  return text;
}

// ---- record once, replay later --------------------------------------------------
// Every good AI answer is saved on disk, keyed by the exact prompt. Asking the same thing
// again (a rehearsed demo) costs no API call, so rate limits cannot break it.
// Turn off with AI_CACHE=0 in server/.env.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const AI_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const AI_CACHE_MAX = 600;
let aiCache = null;

const aiCacheFile = () => process.env.AI_CACHE_PATH || path.join(__dirname, "data", "ai-cache.json");

function loadAiCache() {
  if (aiCache) return aiCache;
  try {
    aiCache = JSON.parse(fs.readFileSync(aiCacheFile(), "utf8"));
  } catch {
    aiCache = {};
  }
  return aiCache;
}

function saveAiCache() {
  try {
    const entries = Object.entries(aiCache);
    if (entries.length > AI_CACHE_MAX) {
      entries.sort((a, b) => b[1].at - a[1].at);
      aiCache = Object.fromEntries(entries.slice(0, AI_CACHE_MAX));
    }
    fs.mkdirSync(path.dirname(aiCacheFile()), { recursive: true });
    fs.writeFileSync(aiCacheFile(), JSON.stringify(aiCache));
  } catch (error) {
    console.error("[ai-cache] could not save:", error.message);
  }
}

function resetAiCacheForTests() {
  aiCache = null;
}

async function callLLM(systemPrompt, userPrompt) {
  if (process.env.AI_CACHE === "0") return callProvider(systemPrompt, userPrompt);
  const provider = process.env.GEMINI_API_KEY ? `gemini:${process.env.GEMINI_MODEL || ""}` : `anthropic:${process.env.AI_MODEL || ""}`;
  const key = crypto.createHash("sha256").update(`${provider}\u0000${systemPrompt}\u0000${userPrompt}`).digest("hex");
  const hit = loadAiCache()[key];
  if (hit && Date.now() - hit.at < AI_CACHE_TTL_MS) return hit.text;

  const text = await callProvider(systemPrompt, userPrompt);
  try {
    parseJSON(text); // only keep answers the app can actually use
    loadAiCache()[key] = { at: Date.now(), text };
    saveAiCache();
  } catch {
    // not valid JSON: return it (callers handle that) but never replay it
  }
  return text;
}

function parseJSON(text) {
  const raw = String(text || "").trim();
  const unfenced = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    const firstObject = unfenced.indexOf("{");
    const firstArray = unfenced.indexOf("[");
    const starts = [firstObject, firstArray].filter((index) => index >= 0);
    if (!starts.length) throw new Error("No JSON found in model response");
    const start = Math.min(...starts);
    const end = Math.max(unfenced.lastIndexOf("}"), unfenced.lastIndexOf("]"));
    if (end <= start) throw new Error("Incomplete JSON in model response");
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

module.exports = { callLLM, parseJSON, resetAiCacheForTests };
