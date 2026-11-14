function fallbackPlan(week, deadlines = []) {
  const due = [...deadlines].sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  const first = due[0];
  const second = due[1] || first;
  const last = due[due.length - 1] || first;
  const hasMidterm = due.some((item) => item.type === "midterm" || item.type === "final");
  const label = (item) => (item ? `${item.course} ${item.title}` : "your next deadline");

  const mon = first
    ? [
        `Map out ${label(first)} (due ${first.day}, ${first.weight}%)`,
        `Start a 45-min focus block for ${first.course}`,
      ]
    : ["Pick one small task and start for 25 minutes", "Check eClass for anything new"];

  const tue = second
    ? [
        `Draft or practise ${label(second)}`,
        `Review ${second.course} notes for 30 minutes`,
      ]
    : ["Review notes from this week's lectures", "Ask Stormy for a study plan"];

  const wed = hasMidterm
    ? [
        `Do practice questions for ${first?.course || "your midterm"}`,
        "Teach one hard concept out loud",
      ]
    : [
        last ? `Polish ${label(last)}` : "Finish the task you started Monday",
        "Take a 20-minute walk away from screens",
      ];

  const thu = last
    ? [
        `Submit / finish ${label(last)}`,
        "Pack your bag and get to bed early",
      ]
    : ["Do a light 20-minute review", "Close the laptop and rest"];

  return {
    week,
    plan: [
      { day: "Mon", tasks: mon },
      { day: "Tue", tasks: tue },
      { day: "Wed", tasks: wed },
      { day: "Thu", tasks: thu },
    ],
  };
}

function dayIndex(day = "") {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day);
}

module.exports = { fallbackPlan };
