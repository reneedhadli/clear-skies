import { calmestWeek, sunnyWeeks } from "./forecast.js";

const COURSE_TAGS = {
  CMPUT: ["tech", "coding", "ai", "gaming", "math"],
  MATH: ["math", "tech"],
  STAT: ["math", "tech", "science"],
  ENGL: ["writing", "books", "art"],
  PSYCH: ["community", "health", "social"],
  BIOL: ["science", "environment", "health"],
  PHYS: ["science", "math", "tech"],
};

const INTEREST_LABELS = {
  gaming: "gaming",
  sports: "sports",
  music: "music",
  tech: "tech",
  art: "art",
  volunteering: "volunteering",
};

function courseTags(courseCodes = []) {
  const tags = new Set();
  courseCodes.forEach((code) => {
    const prefix = String(code).split(" ")[0];
    (COURSE_TAGS[prefix] || []).forEach((tag) => tags.add(tag));
  });
  return tags;
}

export function computeMatch(club, quizAnswers = {}, forecast = [], courseCodes = []) {
  const interests = quizAnswers.interests || [];
  const matchedInterests = interests.filter((interest) => club.tags.includes(interest));
  const interestScore = matchedInterests.length
    ? Math.min(1, 0.9 + matchedInterests.length * 0.05)
    : 0.15;

  const academicTags = courseTags(courseCodes);
  const relevantTags = club.tags.filter((tag) => academicTags.has(tag));
  const courseScore = relevantTags.length
    ? Math.min(1, 0.7 + relevantTags.length * 0.15)
    : 0.12;

  const sun = sunnyWeeks(forecast);
  const sunnyFit = Math.min(1, sun.length / 4);
  const hoursFit =
    club.hoursPerWeek == null
      ? 0.75
      : Math.max(0, 1 - Math.abs(club.hoursPerWeek - (quizAnswers.hours || 3)) / 6);
  const preference = quizAnswers.meetingDay || "Any";
  const weekend = ["Saturday", "Sunday"].includes(club.meetingDay);
  const dayFit =
    !club.meetingDay || preference === "Any"
      ? 0.8
      : preference === "Weekends"
        ? (weekend ? 1 : 0.25)
        : weekend
          ? 0.35
          : 1;
  const timeScore = 0.45 + 0.3 * hoursFit + 0.15 * sunnyFit + 0.1 * dayFit;

  const vibeFit =
    quizAnswers.vibe === "either" || club.vibe === "both"
      ? true
      : quizAnswers.vibe === club.vibe;
  const vibeAdjust = quizAnswers.vibe ? (vibeFit ? 6 : -6) : 0;
  const score = Math.round(50 * interestScore + 25 * courseScore + 25 * timeScore) + vibeAdjust;

  return {
    score: Math.max(38, Math.min(98, score)),
    matchedInterests,
    relevantTags,
    vibeFit,
    why: fallbackWhy(club, matchedInterests, relevantTags, forecast, quizAnswers),
  };
}

export function fallbackWhy(club, matchedInterests = [], relevantTags = [], forecast = [], quizAnswers = {}) {
  const bits = [];
  if (matchedInterests.length) {
    bits.push(`you are both into ${matchedInterests.slice(0, 2).join(" and ")}`);
  } else if (club.vibe === quizAnswers.vibe) {
    bits.push(`you both like a ${club.vibe} pace`);
  }
  if (relevantTags.length) {
    bits.push("your courses line up with what they build");
  }
  const best = calmestWeek(forecast, 1);
  if (best && club.meetingDay) {
    bits.push(
      `their ${club.meetingDay} meetups land near your ${best.weather === "sunny" ? "sunny" : "calmer"} weeks`
    );
  }
  return bits.length
    ? `${bits[0][0].toUpperCase()}${bits[0].slice(1)}${bits.length > 1 ? `, and ${bits.slice(1).join(", and ")}` : ""}.`
    : "New people, low pressure, and a very good snack table.";
}

export function nextEventWeather(forecast, currentWeek = 6) {
  const upcoming = forecast.filter((week) => week.week >= currentWeek);
  const sunny = upcoming.find((week) => week.weather === "sunny");
  const best = sunny || calmestWeek(forecast, currentWeek) || { weather: "cloudy" };
  return best.weather;
}

export function rankedClubs(clubs, quizAnswers, forecast, courseCodes) {
  return clubs
    .map((club) => {
      const match = computeMatch(club, quizAnswers, forecast, courseCodes);
      return { ...club, match: match.score, why: match.why };
    })
    .sort((a, b) => b.match - a.match);
}

export function clubEventsForForecast(likedClubIds, clubs, forecast, currentWeek = 1) {
  const clubsById = new Map(clubs.map((club) => [club.id, club]));
  const weatherByWeek = new Map(forecast.map((week) => [week.week, week.weather]));

  return likedClubIds.flatMap((id) => {
    const club = clubsById.get(id);
    if (!club) return [];

    let event;
    if (club.nextEvent && Number.isInteger(Number(club.nextEvent.week))) {
      event = {
        ...club.nextEvent,
        week: Number(club.nextEvent.week),
      };
    } else if (!club.nextEvent && club.meetingDay) {
      const sunnyWeek = forecast.find(
        (week) => week.week >= currentWeek && week.weather === "sunny"
      );
      if (!sunnyWeek) return [];
      event = {
        title: "Club meetup",
        week: sunnyWeek.week,
        day: club.meetingDay,
        time: "",
      };
    } else {
      return [];
    }

    return [{
      clubId: club.id,
      club,
      ...event,
      weather: weatherByWeek.get(event.week) || "cloudy",
      isDemoEvent: Boolean(club.nextEvent && club.isDemoEvent),
    }];
  });
}

export { INTEREST_LABELS };
