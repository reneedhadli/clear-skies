import directory from "./uofa-clubs.json";

// Club names come from the U of A student group directory.
// Category, tags, vibe and hours are AI-guessed from the name only (hoursEstimated: true).
const CATEGORY_STYLE = {
  gaming: { emoji: "🎮", color: "#9B8CFF" },
  sports: { emoji: "⚽", color: "#7FD1A8" },
  music: { emoji: "🎵", color: "#FFB547" },
  tech: { emoji: "💻", color: "#8EC9FF" },
  art: { emoji: "🎨", color: "#FF9EB5" },
  volunteering: { emoji: "🤝", color: "#A8D87A" },
};

const directoryClubs = directory.map((club) => ({
  ...club,
  ...CATEGORY_STYLE[club.category],
  tags: [...new Set([club.category, ...club.tags])],
  meetingDay: null,
  description: "",
  website: null,
  instagram: null,
  nextEvent: null,
  isDemoEvent: false,
}));

const confirmedClubs = [
  {
    id: "computer-engineering-club",
    name: "Computer Engineering Club",
    emoji: "💻",
    category: "engineering",
    tags: ["tech", "engineering", "hackathons"],
    vibe: "competitive",
    hoursPerWeek: null,
    meetingDay: null,
    description:
      "Build things, meet fellow computer engineers, and take part in HackED and other club events.",
    website: "https://www.compeclub.com",
    instagram: "@compeclub",
    nextEvent: {
      title: "HackED hackathon",
      week: 8,
      day: "Saturday",
      time: "9am",
    },
    isDemoEvent: true,
    color: "#7FD1A8",
  },
];

export const clubs = [...confirmedClubs, ...directoryClubs];
