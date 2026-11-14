export function courseStatus(course, completed = []) {
  if (completed.includes(course.code)) return "finished";
  const prereqs = course.prereqs || [];
  return prereqs.every((code) => completed.includes(code)) ? "available" : "locked";
}

export function availableCourses(courses, completed = []) {
  return courses.filter((course) => courseStatus(course, completed) === "available");
}

export function buildUnlockMap(courses) {
  const map = new Map();
  courses.forEach((course) => {
    (course.prereqs || []).forEach((prereq) => {
      if (!map.has(prereq)) map.set(prereq, []);
      map.get(prereq).push(course.code);
    });
  });
  return map;
}

export function unlocksFor(code, courses) {
  return courses.filter((course) => (course.prereqs || []).includes(code));
}

export function describeCourse(course) {
  const labels = {
    light: "Light workload",
    medium: "Medium workload",
    heavy: "Heavy workload",
  };
  return labels[course.workload] || "Workload unknown";
}
