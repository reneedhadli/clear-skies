require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const { callLLM, parseJSON } = require("./llm");
const {
  fallbackExtract,
  normalizeDay,
  normalizeType,
} = require("./fallbacks/sampleDeadlines");
const { fallbackPlan } = require("./fallbacks/plans");
const { fallbackChat } = require("./fallbacks/chat");
const { fallbackClubCopy } = require("./fallbacks/clubCopy");

const app = express();
const PORT = process.env.PORT || 3001;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu"];
const WEATHERS = ["sunny", "cloudy", "storm", "blizzard", "deepfreeze"];

app.use(cors());
app.use(express.json({ limit: "3mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
    provider: process.env.GEMINI_API_KEY ? "gemini" : "anthropic",
    model: process.env.GEMINI_API_KEY
      ? process.env.GEMINI_MODEL || "gemini-3.5-flash"
      : process.env.AI_MODEL || "claude-sonnet-4-5",
  });
});

function cleanDeadline(raw) {
  if (!raw || typeof raw !== "object") return null;
  const course = String(raw.course || "").replace(/\s+/g, " ").trim().toUpperCase();
  const title = String(raw.title || "").replace(/\s+/g, " ").trim().slice(0, 120);
  const week = Number(String(raw.week).match(/\d{1,2}/)?.[0]);
  const weight = Number.parseFloat(String(raw.weight).replace(/[^0-9.]/g, ""));
  if (!course || !title || !Number.isFinite(week) || week < 1 || week > 15) return null;
  if (!Number.isFinite(weight) || weight <= 0) return null;
  return {
    course,
    title,
    type: normalizeType(raw.type, title),
    week,
    day: normalizeDay(raw.day),
    weight: Math.min(100, Math.round(weight * 10) / 10),
  };
}

function validateDeadlines(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Error("No deadlines returned");
  const seen = new Set();
  const cleaned = raw
    .map(cleanDeadline)
    .filter(Boolean)
    .filter((item) => {
      const key = `${item.course}|${item.title}|${item.week}|${item.type}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (!cleaned.length) throw new Error("Deadlines failed validation");
  return cleaned;
}

app.post("/api/extract", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Please provide syllabus text." });

  try {
    const systemPrompt =
      'You are a precise syllabus parser for a U of A student app. Return ONLY valid JSON, with no markdown, matching {"deadlines":[...]}. Each deadline must be {course,title,type,week,day,weight}. type must be one of assignment|quiz|lab|midterm|final|project. week is an integer 1-15 in a 15-week term. day must be one of Mon,Tue,Wed,Thu,Fri,Sat,Sun. weight is the percent of the final grade as a number. Include every graded item and exam. Do not invent items. Use the course code written in the syllabus.';

    const response = await callLLM(
      systemPrompt,
      `Extract every graded deadline and exam from this syllabus:\n\n${text.slice(0, 16000)}`
    );
    const parsed = parseJSON(response);
    const deadlines = validateDeadlines(parsed.deadlines);
    res.json({ deadlines, source: "ai" });
  } catch (error) {
    console.error("[extract]", error.message);
    res.json({ deadlines: fallbackExtract(text), source: "fallback" });
  }
});

app.post("/api/storm-plan", async (req, res) => {
  const week = Number(req.body?.week) || 1;
  const deadlines = Array.isArray(req.body?.deadlines) ? req.body.deadlines : [];

  try {
    const systemPrompt =
      'You are Stormy, a cozy weather reporter helping a U of A student plan one busy week. Return ONLY valid JSON matching {"plan":[{"day":"Mon","tasks":["..."]}]}. Give exactly four days: Mon, Tue, Wed, Thu. Each day has 2-3 short, concrete tasks. Use course codes and deadline titles. Keep every task under 18 words. Be warm and practical, never corporate.';

    const response = await callLLM(
      systemPrompt,
      `Plan week ${week}. Graded items due this week:\n${JSON.stringify(
        deadlines
      )}\n\nReturn the JSON plan only.`
    );
    const parsed = parseJSON(response);
    if (!Array.isArray(parsed.plan)) throw new Error("Plan is not an array");
    const plan = WEEKDAYS.map((day) => {
      const entry = parsed.plan.find((item) => normalizeDay(item.day) === day);
      const tasks = Array.isArray(entry?.tasks)
        ? entry.tasks
            .map((task) => String(task).replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];
      return { day, tasks };
    }).filter((day) => day.tasks.length);
    if (plan.length < 3) throw new Error("Plan is missing days");
    res.json({ plan, source: "ai" });
  } catch (error) {
    console.error("[storm-plan]", error.message);
    res.json({ ...fallbackPlan(week, deadlines), source: "fallback" });
  }
});

app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Please type a message." });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const courses = Array.isArray(context.courses) ? context.courses : [];
  const allowedCodes = new Set(courses.map((course) => course.code).filter(Boolean));

  try {
    const systemPrompt =
      'You are Stormy, a cozy, cheerful weather reporter who helps U of A students plan their semester. Talk like a friendly TV weather reporter. Keep replies under 60 words. Only suggest courses from the provided list, using their codes. Return ONLY valid JSON matching {"reply":string,"courseCodes":string[],"warning":string|null}. warning should be a short heads-up about a future rough week, or null.';

    const userPrompt = `Recent conversation:
${history.map((item) => `${item.role}: ${item.content}`).join("\n") || "(new conversation)"}

Student: ${JSON.stringify(context.profile || {})}
Current page: ${context.page || "forecast"}
Current week: ${context.currentWeek || 1}
This week's forecast: ${JSON.stringify(
      (context.forecast || []).find((week) => week.week === Number(context.currentWeek))
    )}
Full forecast: ${JSON.stringify(context.forecast || [])}
Deadlines: ${JSON.stringify(context.deadlines || [])}
Courses you may suggest: ${JSON.stringify(courses)}

Student message: ${message}

Reply as JSON only.`;

    const response = await callLLM(systemPrompt, userPrompt);
    const parsed = parseJSON(response);
    const reply = String(parsed.reply || "").trim();
    if (!reply) throw new Error("Empty reply");
    const courseCodes = Array.isArray(parsed.courseCodes)
      ? parsed.courseCodes
          .map((code) => String(code).trim())
          .filter((code) => (allowedCodes.size ? allowedCodes.has(code) : Boolean(code)))
          .slice(0, 4)
      : [];
    const warning =
      typeof parsed.warning === "string" && parsed.warning.trim()
        ? parsed.warning.trim().slice(0, 140)
        : null;
    res.json({ reply: reply.slice(0, 600), courseCodes, warning, source: "ai" });
  } catch (error) {
    console.error("[chat]", error.message);
    res.json({ ...fallbackChat(message, { ...context, courses }), source: "fallback" });
  }
});

app.post("/api/club-copy", async (req, res) => {
  const clubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 30) : [];
  const quizAnswers = req.body?.quizAnswers || {};
  const courseCodes = Array.isArray(req.body?.courses)
    ? req.body.courses.map((course) => (typeof course === "string" ? course : course.code))
    : [];

  if (!clubs.length) return res.json({});

  try {
    const systemPrompt =
      'You are a warm, playful club matchmaker for U of A students. Return ONLY valid JSON: an object keyed by club id, where each value is {"bio":string,"why":string}. bio is a fun one-sentence club bio under 16 words. why is a one-sentence reason this student matches, under 22 words, referencing their quiz interests and courses. No hashtags. No markdown.';

    const userPrompt = `Student quiz answers: ${JSON.stringify(quizAnswers)}
Student courses: ${JSON.stringify(courseCodes)}
Clubs: ${JSON.stringify(
      clubs.map((club) => ({
        id: club.id,
        name: club.name,
        description: club.description,
        tags: club.tags,
        vibe: club.vibe,
        hoursPerWeek: club.hoursPerWeek,
        meetingDay: club.meetingDay,
      }))
    )}
Return one entry for every club id.`;

    const response = await callLLM(systemPrompt, userPrompt);
    const parsed = parseJSON(response);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Club copy is not an object");
    }
    const fallback = fallbackClubCopy(quizAnswers, clubs);
    const result = {};
    clubs.forEach((club) => {
      const entry = parsed[club.id];
      result[club.id] = {
        bio:
          entry && typeof entry.bio === "string" && entry.bio.trim()
            ? entry.bio.trim().slice(0, 220)
            : fallback[club.id].bio,
        why:
          entry && typeof entry.why === "string" && entry.why.trim()
            ? entry.why.trim().slice(0, 260)
            : fallback[club.id].why,
      };
    });
    res.json(result);
  } catch (error) {
    console.error("[club-copy]", error.message);
    res.json(fallbackClubCopy(quizAnswers, clubs));
  }
});

// Body: { clubs: [{id,name,category,vibe,hoursPerWeek,hoursEstimated,match}], quizAnswers }
// Picks the best 2-3 of the clubs the student liked. Falls back to the top matches.
app.post("/api/club-final", async (req, res) => {
  const clubs = Array.isArray(req.body?.clubs) ? req.body.clubs.slice(0, 12) : [];
  const quizAnswers = req.body?.quizAnswers || {};
  if (!clubs.length) return res.status(400).json({ error: "Send the clubs the student liked." });

  const budget = Number(quizAnswers.hours) || 4;
  const ids = new Set(clubs.map((club) => club.id));
  const byId = new Map(clubs.map((club) => [club.id, club]));

  function build(picked, summary, source) {
    const hoursTotal = picked.reduce((sum, pick) => sum + (Number(byId.get(pick.id)?.hoursPerWeek) || 2), 0);
    return {
      summary,
      picks: picked,
      hoursTotal,
      budget,
      fitsBudget: hoursTotal <= budget + 1,
      source,
    };
  }

  try {
    const systemPrompt =
      'You are Stormy, a warm weather-reporter bear helping a U of A student choose clubs. Return ONLY valid JSON: {"summary":string,"picks":[{"id":string,"reason":string}]}. Pick exactly 3 clubs (or all of them if fewer than 3), only using ids from the list. reason is one friendly sentence under 22 words. summary is one short sentence. Prefer clubs whose hoursPerWeek fit the weekly time budget when added together. Hours marked hoursEstimated are guesses; never state them as facts.';
    const userPrompt = `Quiz answers: ${JSON.stringify(quizAnswers)}
Weekly time budget (hours): ${budget}
Liked clubs: ${JSON.stringify(
      clubs.map((club) => ({
        id: club.id,
        name: club.name,
        category: club.category,
        vibe: club.vibe,
        hoursPerWeek: club.hoursPerWeek,
        hoursEstimated: club.hoursEstimated,
        match: club.match,
      }))
    )}`;
    const parsed = parseJSON(await callLLM(systemPrompt, userPrompt));
    const picked = (Array.isArray(parsed.picks) ? parsed.picks : [])
      .filter((pick) => pick && ids.has(pick.id) && String(pick.reason || "").trim())
      .filter((pick, index, all) => all.findIndex((other) => other.id === pick.id) === index)
      .slice(0, 3)
      .map((pick) => ({ id: pick.id, reason: String(pick.reason).trim().slice(0, 220) }));
    if (!picked.length) throw new Error("No valid picks");
    res.json(build(picked, String(parsed.summary || "Here are your top picks.").slice(0, 160), "ai"));
  } catch (error) {
    console.error("[club-final]", error.message);
    const top = [...clubs].sort((a, b) => (b.match || 0) - (a.match || 0)).slice(0, 3);
    res.json(
      build(
        top.map((club) => ({ id: club.id, reason: "One of your strongest matches from the quiz." })),
        "Your three strongest matches.",
        "fallback"
      )
    );
  }
});

require("./degree/routes")(app);

app.use((error, _req, res, _next) => {
  console.error("[server]", error.message);
  res.status(500).json({ error: "Something went wrong. The demo fallback will cover it." });
});

app.listen(PORT, () => {
  console.log(
    `Clear Skies server on http://localhost:${PORT} · AI ${
      process.env.GEMINI_API_KEY || process.env.AI_API_KEY ? "configured" : "offline fallbacks"
    }`
  );
  if (!process.env.GEMINI_API_KEY && !process.env.AI_API_KEY) {
    console.log("Tip: copy server/.env.example to server/.env and add GEMINI_API_KEY.");
  }
});
