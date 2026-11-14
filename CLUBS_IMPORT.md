# Importing UASU student groups

The app's club roster is generated from `client/src/data/clubs_source.csv`. The current file contains only the existing Computer Engineering Club entry; add verified public directory data before treating it as a comprehensive directory or using the matching results as exhaustive.

## Fill the CSV

1. Open the public UASU Student Groups Directory and review its public group listings. Do not copy information that requires a login or is hidden behind access controls.
2. Add one row per group. Use the group's public name and a short description in your own words. Do not infer missing meeting schedules, hours, contact details, or links.
3. Keep the header row and quote CSV fields containing commas. Use `;` between tags.
4. Leave unknown optional fields blank.

| Column | Meaning |
| --- | --- |
| `name` | Public group name; required |
| `category` | One supported category from the list below |
| `description` | Short, accurate description based only on its public listing; required |
| `website` | Public website URL, if listed; must begin with `https://` |
| `instagram` | Public Instagram URL, if listed; must begin with `https://` |
| `email` | Public email address, if listed |
| `meetingDay` | Publicly stated regular meeting day; otherwise leave blank |
| `hoursPerWeek` | Estimated commitment only if the public listing states one; otherwise leave blank |
| `vibe` | `chill`, `competitive`, or another public, clearly-supported characterization; defaults to `chill` |
| `tags` | Relevant lower-case keywords separated by semicolons |

Supported categories: Academic, Tech & Engineering, Sports & Recreation, Arts & Performance, Music, Cultural, Faith & Spirituality, Volunteering & Advocacy, Gaming, Professional & Career, Health & Wellness, Hobbies & Interests, Faculty Associations.

## Generate the app data

Run from the repository root:

```sh
npm run import:clubs
```

The importer reports invalid rows, validates required text, categories, numeric hours, and HTTPS URLs, makes stable IDs from names, and writes `client/src/data/clubs.json`. It warns if fewer than ten valid clubs are present and retains the existing Computer Engineering Club entry.

Demo event data on that retained entry is intentionally marked `isDemoEvent: true`. Do not replace it with a real event unless its details are verified from a public source.
