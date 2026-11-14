# Club data to complete by hand

The app currently contains one confirmed group, so add 29–49 more verified U of A student groups to reach the requested 30–50 total. Confirm every group using the U of A student group directory, the group's own website, or its official Instagram before adding it. Record the source URL for your own verification.

For each group, fill in these fields in `client/src/data/clubs.js`:

- `id`: unique, stable, lowercase identifier.
- `name`: official group name.
- `emoji`: representative emoji.
- `category`: one of tech, engineering, sports, outdoors, arts, music, culture, gaming, volunteering, or academic.
- `tags`: interests used by club matching.
- `vibe`: `chill` or `competitive`.
- `hoursPerWeek`: a verified/club-supplied estimate; use `null` until known.
- `meetingDay`: weekday name, or `null` if unknown.
- `description`: short, friendly summary supported by the group's source.
- `website`: official URL, or `null`.
- `instagram`: official handle, or `null`.
- `nextEvent`: verified event details (`title`, `week`, `day`, `time`), or `null`. If using a made-up demo event, set `isDemoEvent: true` and do not describe it as confirmed.
- `isDemoEvent`: `true` for a made-up event and `false` for a confirmed real event (or no event).

The Computer Engineering Club's event shown in the app is a demo event, not a confirmed upcoming date. Its hours and regular meeting day are unknown and intentionally left blank.
