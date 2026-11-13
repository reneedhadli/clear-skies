import { buildForecast } from "./forecast.js";

const ASSIGNMENT_WEEKS = [
  [2, 5, 9, 12],
  [3, 6, 10, 13],
  [4, 7, 10, 13],
];

const WORKLOAD_WEIGHTS = {
  light: { assignment: 2, midterm: 6, final: 12 },
  medium: { assignment: 4, midterm: 12, final: 22 },
  heavy: { assignment: 7, midterm: 18, final: 30 },
};

const TERM_WORKLOAD_POINTS = { light: 4, medium: 10, heavy: 18 };

export function estimateCourseDeadlines(selectedCourses) {
  return selectedCourses.flatMap((course, index) => {
    const weights = WORKLOAD_WEIGHTS[course.workload] || WORKLOAD_WEIGHTS.medium;
    const assignmentWeeks = ASSIGNMENT_WEEKS[index % ASSIGNMENT_WEEKS.length];
    return [
      ...assignmentWeeks.map((week, assignmentIndex) => ({
        course: course.code,
        title: `Estimated assignment ${assignmentIndex + 1}`,
        type: "assignment",
        week,
        day: "Fri",
        weight: weights.assignment,
      })),
      {
        course: course.code,
        title: "Estimated midterm",
        type: "midterm",
        week: 6 + (index % 3),
        day: "Thu",
        weight: weights.midterm,
      },
      {
        course: course.code,
        title: "Estimated final exam",
        type: "final",
        week: 14 + (index % 2),
        day: "Tue",
        weight: weights.final,
      },
    ];
  });
}

export function forecastForCourses(selectedCourses) {
  return buildForecast(estimateCourseDeadlines(selectedCourses));
}

export function buildGraduationTerms(courses, completedCourses, firstYear = 2027) {
  const completed = new Set(completedCourses);
  const remaining = new Set(courses.filter((course) => !completed.has(course.code)).map((course) => course.code));
  const courseByCode = new Map(courses.map((course) => [course.code, course]));
  const terms = [];

  while (remaining.size && terms.length < courses.length) {
    const ready = [...remaining]
      .map((code) => courseByCode.get(code))
      .filter((course) =>
        (course.prereqs || []).every((prerequisite) => completed.has(prerequisite))
      )
      .sort((a, b) => a.level - b.level || a.code.localeCompare(b.code))
      .slice(0, 5);
    if (!ready.length) break;

    const index = terms.length;
    const year = firstYear + Math.floor(index / 2);
    const term = index % 2 === 0 ? `Winter ${year}` : `Fall ${year}`;
    const totalWorkload = ready.reduce(
      (total, course) => total + (TERM_WORKLOAD_POINTS[course.workload] || 10),
      0
    );
    terms.push({
      term,
      courses: ready,
      weather: buildForecast([
        { week: 1, course: "Term workload", type: "assignment", weight: totalWorkload },
      ])[0].weather,
    });
    ready.forEach((course) => {
      completed.add(course.code);
      remaining.delete(course.code);
    });
  }

  return {
    terms,
    unplanned: [...remaining].map((code) => courseByCode.get(code)).filter(Boolean),
  };
}
