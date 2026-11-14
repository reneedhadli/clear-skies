const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "client/src/data/clubs_source.csv");
const OUTPUT = path.join(ROOT, "client/src/data/clubs.json");

const CATEGORIES = new Set([
  "Academic",
  "Tech & Engineering",
  "Sports & Recreation",
  "Arts & Performance",
  "Music",
  "Cultural",
  "Faith & Spirituality",
  "Volunteering & Advocacy",
  "Gaming",
  "Professional & Career",
  "Health & Wellness",
  "Hobbies & Interests",
  "Faculty Associations",
]);

const CATEGORY_PRESENTATION = {
  Academic: ["📚", "#8EC9FF"],
  "Tech & Engineering": ["💻", "#7FD1A8"],
  "Sports & Recreation": ["⚽", "#FFB547"],
  "Arts & Performance": ["🎭", "#C6BEFF"],
  Music: ["🎵", "#F4A8B8"],
  Cultural: ["🌎", "#F4A261"],
  "Faith & Spirituality": ["🕊️", "#B6A1D8"],
  "Volunteering & Advocacy": ["🤝", "#7FD1A8"],
  Gaming: ["🎮", "#8EC9FF"],
  "Professional & Career": ["💼", "#B6B8C6"],
  "Health & Wellness": ["🌿", "#7FD1A8"],
  "Hobbies & Interests": ["✨", "#FFB547"],
  "Faculty Associations": ["🎓", "#C6BEFF"],
};

const COMPUTER_ENGINEERING_CLUB = {
  id: "computer-engineering-club",
  name: "Computer Engineering Club",
  emoji: "💻",
  category: "Tech & Engineering",
  tags: ["tech", "engineering", "hackathons"],
  vibe: "competitive",
  hoursPerWeek: null,
  meetingDay: null,
  description:
    "Build things, meet fellow computer engineers, and take part in HackED and other club events.",
  website: "https://www.compeclub.com",
  instagram: "https://www.instagram.com/compeclub/",
  email: "",
  nextEvent: {
    title: "HackED hackathon",
    week: 8,
    day: "Saturday",
    time: "9am",
  },
  isDemoEvent: true,
  color: "#7FD1A8",
};

function parseCsvRow(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  cells.push(value.trim());
  return cells;
}

function stableId(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateUrl(value, label, errors) {
  if (value && !/^https:\/\//i.test(value)) {
    errors.push(`${label} must start with https://`);
  }
}

async function main() {
  const source = await readFile(SOURCE, "utf8");
  const lines = source.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("The clubs CSV is empty.");
  const headers = parseCsvRow(lines[0]);
  const requiredHeaders = [
    "name",
    "category",
    "description",
    "website",
    "instagram",
    "email",
    "meetingDay",
    "hoursPerWeek",
    "vibe",
    "tags",
  ];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}`);
  }

  const rows = [];
  const ids = new Set();
  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    let cells;
    try {
      cells = parseCsvRow(line);
    } catch (error) {
      console.error(`Row ${rowNumber}: ${error.message}`);
      return;
    }
    if (cells.length !== headers.length) {
      console.error(`Row ${rowNumber}: expected ${headers.length} columns, got ${cells.length}`);
      return;
    }
    const raw = Object.fromEntries(headers.map((header, cell) => [header, cells[cell]]));
    const errors = [];
    if (!raw.name) errors.push("name is required");
    if (!raw.description) errors.push("description is required");
    if (raw.category && !CATEGORIES.has(raw.category)) {
      errors.push(`unsupported category "${raw.category}"`);
    }
    validateUrl(raw.website, "website", errors);
    validateUrl(raw.instagram, "instagram", errors);
    if (raw.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
      errors.push("email must be a valid public email address");
    }
    const hoursPerWeek = raw.hoursPerWeek ? Number(raw.hoursPerWeek) : null;
    if (raw.hoursPerWeek && (!Number.isFinite(hoursPerWeek) || hoursPerWeek < 0)) {
      errors.push("hoursPerWeek must be a non-negative number");
    }
    if (errors.length) {
      console.error(`Row ${rowNumber} (${raw.name || "unnamed"}): ${errors.join("; ")}`);
      return;
    }

    const id = stableId(raw.name);
    if (ids.has(id)) {
      console.error(`Row ${rowNumber} (${raw.name}): duplicate stable id "${id}"`);
      return;
    }
    ids.add(id);
    const category = raw.category || "Hobbies & Interests";
    const [emoji, color] = CATEGORY_PRESENTATION[category];
    rows.push({
      id,
      name: raw.name,
      emoji,
      category,
      tags: raw.tags ? raw.tags.split(";").map((tag) => tag.trim().toLowerCase()).filter(Boolean) : [],
      vibe: raw.vibe || "chill",
      hoursPerWeek,
      meetingDay: raw.meetingDay || null,
      description: raw.description,
      website: raw.website || "",
      instagram: raw.instagram || "",
      email: raw.email || "",
      color,
      ...(id === COMPUTER_ENGINEERING_CLUB.id
        ? {
            nextEvent: COMPUTER_ENGINEERING_CLUB.nextEvent,
            isDemoEvent: true,
            color: COMPUTER_ENGINEERING_CLUB.color,
          }
        : {}),
    });
  });

  if (rows.length < 10) {
    console.warn(
      `Warning: only ${rows.length} valid club(s) imported. Add at least 10 public directory entries; Computer Engineering Club is retained.`
    );
    if (!rows.some((club) => club.id === COMPUTER_ENGINEERING_CLUB.id)) {
      rows.unshift(COMPUTER_ENGINEERING_CLUB);
    }
  }
  if (!rows.length) {
    throw new Error("No valid clubs to import, and the required Computer Engineering Club entry is missing.");
  }

  await writeFile(OUTPUT, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`Imported ${rows.length} club(s) to ${path.relative(ROOT, OUTPUT)}.`);
}

main().catch((error) => {
  console.error(`[import:clubs] ${error.message}`);
  process.exitCode = 1;
});
