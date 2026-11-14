import { rankedClubs } from "./clubs.js";

export function localShortlist(clubs, quizAnswers, forecast, courseCodes, excludeIds = []) {
  const excluded = new Set(excludeIds);
  return rankedClubs(clubs, quizAnswers, forecast, courseCodes)
    .filter((club) => !excluded.has(club.id))
    .slice(0, 15)
    .map((club) => ({
      ...club,
      bio: club.description,
      wildcard: false,
    }));
}
