# Clear Skies ⛅

**See the storms coming, from this week's midterms to graduation.**

Clear Skies turns a pile of syllabi into a 15-week semester *weather forecast*. Calm weeks are sunny, heavy weeks are storms, and the weeks where everything lands at once are blizzards. Stormy, a weather-reporter bear, reads the forecast to you, and because Stormy is an AI agent, they can also do something about it: plan your studying, spread a stormy week out, and show you the weather clearing.

Built at **HackED Beta 2026**, University of Alberta.

## The problem

At the start of term every course hands you a syllabus. Nobody adds them together. Students find out in week 9 that three assignments and a midterm are due in the same five days. Advising tools tell you *what* a degree requires, but not *when* it will hurt, and they leave the planning to you.

Clear Skies answers three questions in one place:

1. **When will my semester get hard?** (the forecast)
2. **What do I do about it?** (Stormy, the study planner and agent)
3. **What should I take next, and what do I join?** (degree map and club match)

## What it does

| Feature | What you get |
| --- | --- |
| **Semester forecast** | Upload PDF or `.txt` syllabi (or paste text). The app extracts every graded deadline and gives each of the 15 weeks a weather state and a stress score. A day-by-day view shows each day's weather, what is due, planned study time and club events. |
| **Stormy, the study agent** | Chat with Stormy. Say "Rebalance my week, I'm overwhelmed" or "Make a study plan" and Stormy adds and moves study sessions, then shows what changed, how the weather shifted (for example Blizzard to Storm) and an **Undo** button. Stormy can also add a course to next term or put a club on your forecast. |
| **Spoken forecast** | "Play Stormy's forecast" reads a short TV-style weather report for the selected week out loud, using the browser's built-in speech. |
| **Degree map for any major** | Type any major (Chemistry, Fine Arts, Computing Science...). The AI proposes three pathways, every course is checked against the official U of A catalogue, and a planner builds a term-by-term schedule with real prerequisites. The map below redraws as a flowchart for the pathway you pick. You can also name courses you want to reach (for example `CMPUT 304`) and get the exact path to them. |
| **Club match** | A short vibe quiz ranks U of A student groups by your interests, hours and vibe. Swipe through your shortlist, then let Stormy pick your top 3. Liked clubs with events show up on your forecast. |

There is no login and no database. Everything you add is stored in your browser (`localStorage`, key `clear-skies-v1`).

## How the AI is used (and kept honest)

The AI never has the last word on anything that must be correct.

- **Syllabus extraction:** the AI reads the syllabus; the server validates every deadline (course, week 1 to 15, valid weight) before it reaches the app. Long syllabi are trimmed to the start plus the grading-related passages so the marks section is never cut off.
- **Stormy as an agent:** one AI request returns a reply plus a list of *requested actions*. The AI never changes anything itself. The app's own code checks every request and runs only the ones that pass. Stormy has exactly four "buttons": add a study session, move a study session, add a course to next term, add a club to the forecast. Anything else, a made-up course, an impossible day, more than 6 study hours on one day, more than 8 actions at once, is rejected and the rejection is shown to you. Deadlines cannot be touched at all. Only the latest run can be undone.
- **Degree pathways:** the AI only *suggests* course names. Every code is looked up in the official U of A catalogue (`apps.ualberta.ca/catalogue`); courses that do not exist are dropped and you are told. Prerequisites are parsed from the catalogue's own text as "one of / all of" expressions, and a deterministic planner (no AI) schedules them. If a course's prerequisites cannot be checked, the app says so instead of guessing.
- **Clubs:** a deterministic score shortlists the best matches first; the AI only ranks and writes short bios from the clubs it is given and may not invent new ones.
- **It works without AI too.** If no key is set, the quota is used up, or the model returns junk, every route falls back to built-in logic: a rule-based syllabus reader, canned Stormy replies, and a no-AI study planner that understands phrases like "rebalance my week" and "make a study plan".
- **Record and replay:** every good AI answer is saved to `server/data/ai-cache.json`, so a rehearsed demo costs no API calls and cannot be broken by a rate limit.

## Tech stack

- **Client:** React 19, Vite 7, Tailwind CSS 4, Framer Motion, React Router, `pdfjs-dist` (PDF syllabus text), Lucide icons
- **Server:** Node.js, Express 5
- **AI:** Google Gemini (default) or Anthropic Claude, both through plain REST calls in `server/llm.js`
- **Data:** official U of A course catalogue, UASU student groups directory, a bundled verified course seed
- **Tests:** plain Node scripts, no test framework needed

## Quick start

Requirements: Node.js 20.19 or newer and npm.

```bash
npm run setup
npm run dev
```

Open the address the terminal prints (normally `http://localhost:5173`). The Vite dev server proxies `/api` to the Express server on `http://localhost:3001`.

To see everything instantly, click **Load demo student** on the empty forecast. The demo is Maya, a second-year Computing Science student with four current courses, completed prerequisites and quiz answers.

## Turn on the AI

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`. The easiest option is a free Gemini key from <https://aistudio.google.com/apikey>:

```dotenv
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.5-flash
```

Or use an Anthropic key:

```dotenv
AI_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-5
```

If both are set, Gemini is used. Restart the server and open `http://localhost:3001/api/health`; it should show `"aiConfigured": true` plus the provider and model in use.

Free tiers have rate limits. If you hit one, the app tells you ("The AI is busy right now") and keeps working with its built-in fallbacks. Keys are only read by the server, never sent to the browser, and `server/.env` is gitignored.

Optional settings: `AI_CACHE=0` turns the answer cache off, `DEGREE_AI_SUMMARY=1` lets the AI write the degree-pathway summary instead of the built-in one, `PORT` changes the server port. With the 1Password CLI, put an `op://` reference in `.env` and run `npm run dev:secure`.

## Try it in 90 seconds

1. Click **Load demo student**. Point out the storm in week 6 and the blizzard in week 9.
2. Press **See week N day by day** to scroll through the days, then **Play Stormy's forecast** to hear it.
3. Open Stormy and type **"Make a study plan"**, then **"Rebalance my week, I'm overwhelmed"**. Watch the study sessions appear, the weather change and the **Undo** button.
4. Click **Add syllabus**, choose **Load sample syllabi** (or drop in a real PDF) and press **Extract deadlines**.
5. Open **Degree Map**, type any major (try *Chemistry*) and press **Show my map**. The flowchart redraws.
6. Open **Club Match**, take the quiz, swipe, then press **Pick my top 3**.

## How it works

### Forecast rules

Each deadline has a weight (its share of the final grade). A week's weight is the sum of its deadlines plus **1 point per planned study hour**.

| Weekly weather | Rule |
| --- | --- |
| Sunny | Weight below 5 |
| Cloudy | Weight 5 or more |
| Storm | Weight 15 or more, or any midterm |
| Blizzard | Weight 30 or more, or three items worth 10+ |
| Deep freeze | Weeks 14 and 15 with a final exam |

Stress is `min(100, round(weight x 2.5))`.

The **day-by-day** weather uses the same idea per day: deadline weight plus 2 points per study hour. A 20% midterm plus 5 hours of cramming is a blizzard; the same midterm with 1 hour of review is a storm. That is how Stormy visibly clears a stormy day by moving study time to lighter days. The total work stays the same, it is just spread out.

### The degree planner

For a major, the AI suggests pathways (sets of goal courses). For each pathway the planner:

1. looks up every course in the catalogue (bundled starter set first, then a local cache, then a live lookup),
2. resolves "one of" prerequisite groups by picking the option that needs the fewest extra courses,
3. avoids picking two courses that cannot both count for credit (antirequisites),
4. places co-requisites in the same term,
5. schedules Fall and Winter terms, up to 5 courses a term, deepest prerequisite chains first.

It assumes each course is offered every Fall and Winter, and tells you to confirm real offerings in Bear Tracks.

### Club matching

`client/src/data/clubs.json` holds the clubs. The server scores each one against your quiz answers, free time and courses, takes the best 60, and asks the AI to pick and describe the best matches (with a score-based fallback if the AI is unavailable).

## API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | AI status, provider and model |
| `POST /api/extract` | `{ text }` to validated deadlines |
| `POST /api/storm-plan` | `{ week, deadlines }` to a four-day plan |
| `POST /api/chat` | `{ message, context }` to a reply, course cards and a warning |
| `POST /api/stormy/agent` | One request returns Stormy's reply plus requested actions (checked by the app before anything runs) |
| `POST /api/forecast-report` | Script for the spoken weather report |
| `POST /api/club-shortlist` | Quiz answers to a ranked club shortlist |
| `POST /api/club-copy` | Short bios and match reasons for clubs |
| `POST /api/club-final` | Pick the top 3 from the liked clubs |
| `GET /api/degree/course/:subject/:number` | Look up one catalogue course |
| `POST /api/degree/prereqs` | What a course needs, whether you can take it now, and the path to it |
| `POST /api/degree/plan` | Pathways and term-by-term plans for a major or a list of target courses |

Every AI route falls back to local logic if the model is missing, errors or returns invalid JSON.

## Scripts

```bash
npm run dev                          # client and server together
npm run build                        # production build of the client
npm test                             # forecast + Stormy agent checks
npm --prefix server run test:degree  # 29 degree planner checks
npm --prefix server run test:agent   # agent action sanitiser checks
npm run import:clubs                 # rebuild clubs from client/src/data/clubs_source.csv
npm --prefix server run build-catalogue  # fetch more official catalogue entries (needs internet)
npm --prefix server run warm-pathways    # pre-save AI pathways for common majors (needs an AI key)
```

## Project structure

```text
client/
  src/pages/        Forecast, Degree Map, Clubs
  src/components/   Forecast views, Stormy chat, syllabus modal, degree pathways, club swipe
  src/context/      localStorage-backed app state
  src/data/         Clubs, demo student, sample syllabi, fallback course map
  src/lib/          Forecast, weather, study agent, clubs, degree, API and speech helpers
server/
  index.js          Express routes and input validation
  llm.js            Gemini and Anthropic calls, JSON parsing, answer cache
  degree/           Catalogue lookup, prerequisite parser, planner, pathway suggestions
  lib/              Club shortlist, agent action sanitiser, syllabus text trimming
  fallbacks/        Offline extract, plan, chat and club copy
  data/catalogue.json  Bundled starter catalogue (61 courses)
```

## Data and limitations

We would rather be honest than impressive here.

- **Course data:** the bundled catalogue has 61 courses: 10 with the official requirement text copied from the U of A catalogue and 51 with a title only, whose prerequisites are fetched live from the catalogue and cached. When the catalogue cannot be reached, those courses are marked "prerequisites could not be checked". The older sample course map used as a fallback on the Degree Map is demo data, not verified (see `COURSES_TODO.md`).
- **Clubs:** the roster has 120 groups: one confirmed group (Computer Engineering Club) and 119 names from the public UASU student groups directory. For the directory groups, the category, tags, vibe and weekly hours are estimated from the group's name and flagged as estimates. Descriptions, links and meeting days are not filled in, and the one club event shown is a labelled demo event (see `CLUBS_TODO.md`).
- **Degree requirements:** pathways are AI suggestions checked against course existence and prerequisites. They are not your official program requirements, and every pathway says to confirm with your faculty advisor.
- **Course offerings:** the planner assumes every course runs every Fall and Winter.
- **Term dates:** the current week is computed from `TERM_START_DATE` in `client/src/config/term.js`.
- **AI can make mistakes:** the syllabus screen says so, and the app checks the parts that matter, but double-check big dates.

## Privacy

There are no accounts and no database. Syllabus text is sent to the AI provider you configure so it can be read. The app server does not save it; it only keeps the AI's answers in a local cache (`server/data/ai-cache.json`, gitignored). Your forecast, study sessions and preferences stay in your own browser.

## Accessibility

Skip link, visible focus rings, large touch targets, keyboard-operable dialogs, arrow-key club swiping, weather shown as text as well as icons, and reduced-motion support. The layout is responsive from a phone to a wide desktop.

## Team

Built by **Renee Dhadli** (backend, AI agent, degree planner, integration) and **Kinjal Sharma** (UI design, club import, forecast views) for HackED Beta 2026.

Thanks to the University of Alberta course catalogue and the UASU student groups directory for the public information this project builds on.
