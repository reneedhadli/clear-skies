import assert from "node:assert/strict";
import { buildForecast } from "./forecast.js";
import { clubEventsForForecast } from "./clubs.js";

const d = (week, weight, type = "assignment", day = "Mon") => ({
  course: "CMPUT 201",
  title: "Test item",
  type,
  week,
  day,
  weight,
});

const forecast = buildForecast([
  d(1, 4, "quiz"),
  d(2, 5, "quiz"),
  d(3, 15),
  d(4, 30),
  d(5, 1, "midterm"),
  d(6, 10),
  d(6, 10),
  d(6, 10),
  d(14, 5, "final"),
  d(15, 100, "final"),
]);

assert.equal(forecast[0].weather, "sunny", "weight 4 stays sunny");
assert.equal(forecast[1].weather, "cloudy", "weight 5 to 14 is cloudy");
assert.equal(forecast[2].weather, "storm", "weight 15 is storm");
assert.equal(forecast[3].weather, "blizzard", "weight 30 is blizzard");
assert.equal(forecast[4].weather, "storm", "any midterm makes it storm");
assert.equal(forecast[5].weather, "blizzard", "three 10-weight items is blizzard");
assert.equal(forecast[13].weather, "deepfreeze", "week 14 final freezes over");
assert.equal(forecast[14].weather, "deepfreeze", "week 15 final freezes over");
assert.equal(forecast[1].stress, 13, "stress is weight x 2.5");
assert.equal(forecast[14].stress, 100, "stress is capped at 100");
assert.equal(forecast[0].due.length, 1, "due items are attached to their week");
assert.equal(buildForecast().length, 15, "forecast always has 15 weeks");

const eventForecast = buildForecast([d(3, 20, "midterm"), d(4, 30)]);
const likedClubs = [
  {
    id: "event-club",
    name: "Event Club",
    emoji: "🌦️",
    nextEvent: { title: "Club night", week: 3, day: "Thursday", time: "7pm" },
    isDemoEvent: false,
  },
  { id: "meeting-club", meetingDay: "Tuesday", nextEvent: null },
  { id: "no-event-club", meetingDay: null, nextEvent: null },
];
const clubEvents = clubEventsForForecast(
  ["event-club", "meeting-club", "no-event-club"],
  likedClubs,
  eventForecast,
  1
);
assert.equal(clubEvents.length, 2, "clubs without events or meeting days do not add forecast items");
assert.equal(clubEvents[0].week, 3, "a club event stays on its listed week");
assert.equal(clubEvents[0].weather, "storm", "a club event inherits the event week's weather");
assert.equal(clubEvents[1].week, 1, "meetups use the next sunny week from the current week");
assert.equal(clubEvents[1].title, "Club meetup", "regular meetings use a generic event title");
assert.equal(
  eventForecast[2].weather,
  "storm",
  "club events do not change the workload forecast"
);
assert.equal(
  clubEventsForForecast(["meeting-club"], likedClubs, eventForecast, 3)[0].week,
  5,
  "regular meetings skip storm weeks and use the next sunny week"
);

console.log("forecast and club event checks passed");
