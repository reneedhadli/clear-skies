import assert from "node:assert/strict";
import { buildForecast } from "./forecast.js";
import { clubEventsForForecast } from "./clubs.js";
import {
  buildGraduationTerms,
  estimateCourseDeadlines,
  forecastForCourses,
} from "./degreeForecast.js";
import { courses } from "../data/courses.js";
import { demoCompleted } from "../data/demo.js";
import { getCurrentWeek } from "../config/term.js";

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
assert.equal(
  getCurrentWeek(new Date("2026-09-02T12:00:00")),
  1,
  "the first day of term is week 1"
);
assert.equal(
  getCurrentWeek(new Date("2026-09-01T12:00:00")),
  1,
  "dates before term starts are clamped to week 1"
);
assert.equal(
  getCurrentWeek(new Date("2027-01-01T12:00:00")),
  15,
  "dates beyond the term are clamped to the last week"
);

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

const estimate = estimateCourseDeadlines([
  courses.find((course) => course.code === "CMPUT 201"),
  courses.find((course) => course.code === "ENGL 102"),
]);
assert.equal(estimate.length, 12, "each estimated course has assignments, a midterm, and a final");
assert.equal(
  estimate.find((item) => item.course === "CMPUT 201" && item.type === "assignment").weight,
  7,
  "heavy workload items carry more weight than light workload items"
);
assert.equal(
  estimate.find((item) => item.course === "ENGL 102" && item.type === "assignment").weight,
  2,
  "light workload items use the lighter estimated weight"
);
assert.equal(forecastForCourses([]).length, 15, "next-term forecast always has 15 weeks");

const graduation = buildGraduationTerms(courses, demoCompleted);
assert.ok(graduation.terms.length > 0, "graduation path includes remaining courses");
assert.ok(
  graduation.terms.every((term) => term.courses.length <= 5),
  "graduation path schedules no more than five courses per term"
);
assert.equal(graduation.unplanned.length, 0, "all sample courses can be scheduled");
const scheduled = new Set(demoCompleted);
graduation.terms.forEach((term) => {
  term.courses.forEach((course) => {
    assert.ok(
      course.prereqs.every((prerequisite) => scheduled.has(prerequisite)),
      `${course.code} is scheduled after its prerequisites`
    );
  });
  term.courses.forEach((course) => scheduled.add(course.code));
});

console.log("forecast and club event checks passed");
