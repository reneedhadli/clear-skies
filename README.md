# Clear Skies

See the storms coming, from this week's midterms to graduation.

Clear Skies turns a pile of syllabi into a 15-week semester weather forecast. Sunny weeks are calm, storms flag heavy deadlines, and blizzards warn you before everything lands at once. The same forecast powers an AI study assistant, club matching, and a prerequisite-aware degree map.

Built for HackED Beta at the University of Alberta.

## What is in the demo

- **Forecast**: Add PDF or `.txt` syllabi (or paste syllabus text), or load four sample U of A courses. Each week gets a weather state, stress score, and due list.
- **Stormy**: Chat with your semester weather assistant, who knows your deadlines, suggests lighter next-term courses, and can add them to your plan.
- **Club Match**: A short vibe quiz ranks real U of A clubs by interests, course overlap, and how well their meeting time fits your calendar.
- **Degree Map**: Finished, available, and locked courses with SVG prerequisite lines. Mark courses complete and watch what unlocks.

There is no login and no database. Everything is stored in `localStorage` under `clear-skies-v1`. The app works offline against realistic fallback responses when no AI key is configured.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm run setup
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:3001`.

To load the full demo instantly, choose **Load demo student** on the empty forecast. The demo is Maya, a second-year Computing Science student with four current syllabi, completed prerequisites, and quiz answers for club matching. The current week is calculated from `client/src/config/term.js`; set `TERM_START_DATE` to the real first day of classes.

## AI setup

Copy the environment template and add an Anthropic key:

```bash
cp server/.env.example server/.env
```

```dotenv
AI_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-5
PORT=3001
```

Restart the server. `GET /api/health` should report `"aiConfigured": true`.

With 1Password CLI:

```bash
op signin
npm run dev:secure
```

The key is only read by the Express server. It is never sent to the browser and `server/.env` is gitignored.

## Demo flow

1. Load the demo student and point out the week 6 storm and the week 9 blizzard.
2. Open **Make my plan** to generate a four-day storm plan.
3. Add a syllabus, load the sample set, and extract deadlines.
4. Ask Stormy why the week is stormy or what to take next term.
5. Open **Club Match**, swipe right, and open the match.
6. Visit **Degree Map**, mark a course finished, and show what unlocks.

## Scripts

```bash
npm run dev          # client + server together
npm run dev:client   # Vite only
npm run dev:server   # Express with --watch
npm run dev:secure   # Express with 1Password-injected secrets
npm run build        # production client build
npm test             # forecast logic checks
```

## API

- `GET /api/health` returns AI configuration status.
- `POST /api/extract` accepts `{ text }` and returns validated deadlines.
- `POST /api/storm-plan` accepts `{ week, deadlines }` and returns a four-day plan.
- `POST /api/chat` accepts `{ message, context }` and returns a reply, course cards, and a warning.
- `POST /api/club-copy` accepts `{ clubs, quiz }` and returns short club bios and match reasons.

Every route falls back to local demo-safe data if the model is missing, errors, or returns invalid JSON.

## Architecture

```text
client/
  src/components/   Shared UI, forecast panels, syllabus modal, club swipe
  src/context/      localStorage-backed app state
  src/data/         Courses, clubs, demo student, sample syllabi
  src/lib/          Forecast, weather, clubs, degree, API, offline fallbacks
  src/pages/        Forecast, Degree Map, Stormy, Clubs, Matches
server/
  index.js          Express routes and input validation
  llm.js            Anthropic Messages API call and JSON parsing
  fallbacks/        Offline extract, plan, chat, and club copy
```

Forecast rules:

| Weather | Rule |
| --- | --- |
| Sunny | Weight below 5 |
| Cloudy | Weight 5 or more |
| Storm | Weight 15 or more, or any midterm |
| Blizzard | Weight 30 or more, or three items worth 10+ |
| Deep freeze | Weeks 14 and 15, especially finals |

Stress is `min(100, round(weight * 2.5))`.

## Accessibility

The app includes a skip link, visible focus rings, 44px touch targets, keyboard-operable dialogs, arrow-key club swiping, weather text labels alongside icons, and reduced-motion support. The layout is responsive from mobile bottom navigation to a wide desktop grid.
