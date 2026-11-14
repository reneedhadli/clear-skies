import clubsData from "./clubs.json";

// clubs.json holds the confirmed clubs plus the U of A directory clubs
// (directory clubs: category, tags, vibe and hours are guessed from the name, hoursEstimated: true).
const CATEGORY_STYLE = {
  gaming: { emoji: "🎮", color: "#9B8CFF" },
  sports: { emoji: "⚽", color: "#7FD1A8" },
  music: { emoji: "🎵", color: "#FFB547" },
  tech: { emoji: "💻", color: "#8EC9FF" },
  art: { emoji: "🎨", color: "#FF9EB5" },
  volunteering: { emoji: "🤝", color: "#A8D87A" },
};

export const clubs = clubsData.map((club) => ({
  ...CATEGORY_STYLE[String(club.category).toLowerCase()],
  ...club,
}));
