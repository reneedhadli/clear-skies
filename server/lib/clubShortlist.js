const INTEREST_TERMS = {
  gaming: ["gaming", "games", "esports", "video games"],
  sports: ["sports", "athletics", "fitness", "recreation"],
  music: ["music", "band", "singing", "instrument"],
  tech: ["tech", "technology", "coding", "engineering", "programming", "robots"],
  art: ["art", "arts", "design", "performance", "theatre"],
  volunteering: ["volunteer", "community", "advocacy", "service"],
  culture: ["culture", "cultural", "language", "heritage"],
  career: ["career", "professional", "industry", "networking"],
  wellness: ["wellness", "health", "mental health", "wellbeing"],
  outdoors: ["outdoors", "outdoor", "nature", "hiking", "environment"],
};

const COURSE_TAGS = {
  CMPUT: ["tech", "coding", "engineering", "programming", "gaming"],
  MATH: ["math", "academic", "tech"],
  STAT: ["math", "academic", "tech"],
  ENGL: ["writing", "arts", "academic"],
  PSYCH: ["wellness", "health", "academic"],
  BIOL: ["science", "wellness", "academic"],
  PHYS: ["science", "tech", "academic"],
};

function tokens(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function hourPreference(answers) {
  if (Number.isFinite(Number(answers.hours))) return Number(answers.hours);
  if (/under|less|1|2/i.test(answers.time || "")) return 1.5;
  if (/2\s*(to|-)\s*4/i.test(answers.time || "")) return 3;
  if (/5\+|5 or more/i.test(answers.time || "")) return 6;
  return 3;
}

function preferredDays(answers) {
  const meetingDay = String(answers.meetingDay || "").toLowerCase();
  if (meetingDay.includes("weekend")) return ["sat", "sun", "saturday", "sunday"];
  if (meetingDay.includes("weeknight")) return ["mon", "tue", "wed", "thu", "monday", "tuesday", "wednesday", "thursday"];
  return [];
}

function scoreClub(club, quizAnswers, profile, freeWeeks) {
  const interestTags = new Set((quizAnswers.interests || []).map((tag) => String(tag).toLowerCase()));
  const clubTags = (club.tags || []).map((tag) => String(tag).toLowerCase());
  const category = String(club.category || "").toLowerCase();
  let score = 0;
  for (const interest of interestTags) {
    if (clubTags.includes(interest) || category.includes(interest)) score += 12;
    const synonyms = INTEREST_TERMS[interest] || [interest];
    if (synonyms.some((term) => category.includes(term) || clubTags.some((tag) => tag.includes(term)))) {
      score += 8;
    }
  }

  const descriptionTokens = new Set(tokens(club.description));
  const keywords = [
    ...tokens(quizAnswers.extraContext),
    ...[...interestTags].flatMap((interest) => tokens(INTEREST_TERMS[interest]?.join(" "))),
  ];
  score += Math.min(20, new Set(keywords).filter((word) => descriptionTokens.has(word)).size * 4);

  const coursePrefixes = new Set(
    (profile.courses || [])
      .map((course) => String(course).split(/\s+/)[0].toUpperCase())
      .filter(Boolean)
  );
  const academicTags = new Set([...coursePrefixes].flatMap((prefix) => COURSE_TAGS[prefix] || []));
  if (coursePrefixes.has("CMPUT") && /tech|engineering|academic/.test(category)) score += 8;
  score += Math.min(16, clubTags.filter((tag) => academicTags.has(tag)).length * 4);

  const hours = Number(club.hoursPerWeek);
  if (Number.isFinite(hours) && hoursPerWeekValue(club.hoursPerWeek)) {
    score += Math.max(0, 10 - Math.abs(hours - hourPreference(quizAnswers)) * 2);
  } else {
    score += 3;
  }
  const days = preferredDays(quizAnswers);
  if (club.meetingDay && days.length) {
    score += days.some((day) => String(club.meetingDay).toLowerCase().startsWith(day)) ? 5 : 0;
  } else {
    score += 2;
  }
  if (freeWeeks.length && club.meetingDay) score += 1;
  if (quizAnswers.vibe && quizAnswers.vibe !== "either" && club.vibe === quizAnswers.vibe) {
    score += 4;
  }
  return score;
}

function hoursPerWeekValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function prefilterClubs({ clubs, quizAnswers = {}, profile = {}, freeWeeks = [], excludeIds = [] }) {
  const excluded = new Set(excludeIds);
  return clubs
    .filter((club) => !excluded.has(club.id))
    .map((club, index) => ({ club, score: scoreClub(club, quizAnswers, profile, freeWeeks), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 60)
    .map(({ club, score }) => ({ club, score }));
}

function words(value, maxWords) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function localFallback(candidates, quizAnswers) {
  return candidates.slice(0, 15).map(({ club, score }) => {
    const interests = (quizAnswers.interests || []).slice(0, 2).join(" and ");
    const category = club.category || "student group";
    const why = interests
      ? `Your ${interests} interests could be a fit for this ${category} group.`
      : `This ${category} group may fit the interests you shared.`;
    return {
      ...club,
      match: Math.max(35, Math.min(96, Math.round(45 + score))),
      bio: words(club.description, 11),
      why: words(why, 24),
      wildcard: false,
    };
  });
}

function cleanAIShortlist(raw, candidates, quizAnswers) {
  if (!raw || !Array.isArray(raw.clubs)) throw new Error("Club shortlist is not an array");
  const allowed = new Map(candidates.map(({ club }) => [club.id, club]));
  const seen = new Set();
  const cleaned = [];
  for (const item of raw.clubs) {
    if (!item || typeof item.id !== "string" || !allowed.has(item.id) || seen.has(item.id)) continue;
    const club = allowed.get(item.id);
    seen.add(item.id);
    cleaned.push({
      ...club,
      match: Math.round(Math.max(0, Math.min(100, Number(item.match) || 0))),
      bio: words(item.bio || club.description, 11),
      why: words(item.why, 24),
      wildcard: Boolean(item.wildcard),
    });
  }

  if (cleaned.length < 8) {
    const fallback = localFallback(candidates, quizAnswers);
    for (const item of fallback) {
      if (cleaned.length >= 15) break;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      cleaned.push(item);
    }
  }
  return cleaned.slice(0, 20);
}

module.exports = {
  cleanAIShortlist,
  localFallback,
  prefilterClubs,
};
