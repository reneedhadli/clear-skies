function fallbackClubCopy(quizAnswers = {}, clubs = []) {
  const interests = quizAnswers.interests || [];
  return Object.fromEntries(
    clubs.map((club) => {
      const matched = (club.tags || []).filter((tag) => interests.includes(tag));
      const why = matched.length
        ? `You are both into ${matched.slice(0, 2).join(" and ")}${
            club.meetingDay ? `, and ${club.meetingDay} fits your week` : ""
          }.`
        : `${club.name} brings a ${club.vibe} pace${
            club.meetingDay ? ` and meets on ${club.meetingDay}` : ""
          }, which fits your schedule.`;
      return [
        club.id,
        {
          bio: club.description || "Good people, low pressure, very good snacks.",
          why,
        },
      ];
    })
  );
}

module.exports = { fallbackClubCopy };
