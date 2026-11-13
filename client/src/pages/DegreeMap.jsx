import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Lock,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Chip from "../components/Chip.jsx";
import SidePanel from "../components/SidePanel.jsx";
import WeatherIcon from "../components/WeatherIcon.jsx";
import { useApp } from "../context/AppContext.jsx";
import DegreePathways from "../components/DegreePathways.jsx";
import { courses } from "../data/courses.js";
import {
  availableCourses,
  courseStatus,
  describeCourse,
  unlocksFor,
} from "../lib/degree.js";
import {
  buildGraduationTerms,
  forecastForCourses,
} from "../lib/degreeForecast.js";
import { TOTAL_WEEKS } from "../config/term.js";
import { weatherMeta } from "../lib/weather.js";

const LEVELS = [100, 200, 300, 400];
const STATUS_LABEL = {
  finished: "Finished",
  available: "Can take now",
  locked: "Locked",
};

function mapEdges(container, cardRefs) {
  if (!container) return { edges: [], size: { width: 0, height: 0 } };
  const bounds = container.getBoundingClientRect();
  const columnElements = container.querySelectorAll(".degree-map-column");
  const size = {
    width: Math.max(container.scrollWidth, bounds.width),
    height: container.scrollHeight,
  };
  const edges = [];

  courses.forEach((course) => {
    (course.prereqs || []).forEach((prerequisite) => {
      const source = cardRefs.current[prerequisite];
      const target = cardRefs.current[course.code];
      if (!source || !target) return;
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const fromColumn = LEVELS.indexOf(
        courses.find((item) => item.code === prerequisite)?.level
      );
      const toColumn = LEVELS.indexOf(course.level);
      const x1 = sourceRect.right - bounds.left;
      const y1 = sourceRect.top - bounds.top + sourceRect.height / 2;
      const x2 = targetRect.left - bounds.left;
      const y2 = targetRect.top - bounds.top + targetRect.height / 2;
      const sourceColumnRect = columnElements[fromColumn]?.getBoundingClientRect();
      const previousTargetColumnRect = columnElements[toColumn - 1]?.getBoundingClientRect();
      const targetColumnRect = columnElements[toColumn]?.getBoundingClientRect();
      const sourceGutter = sourceColumnRect && columnElements[fromColumn + 1]
        ? (sourceColumnRect.right + columnElements[fromColumn + 1].getBoundingClientRect().left) / 2 - bounds.left
        : (x1 + x2) / 2;
      const targetGutter = previousTargetColumnRect && targetColumnRect
        ? (previousTargetColumnRect.right + targetColumnRect.left) / 2 - bounds.left
        : sourceGutter;

      edges.push({
        id: `${prerequisite}->${course.code}`,
        from: prerequisite,
        to: course.code,
        x1,
        y1,
        x2,
        y2,
        d:
          toColumn - fromColumn > 1
          ? `M ${x1} ${y1} H ${sourceGutter} V ${size.height - 6} H ${targetGutter} V ${y2} H ${x2}`
          : `M ${x1} ${y1} H ${sourceGutter} V ${y2} H ${x2}`,
      });
    });
  });

  return { edges, size };
}

function WeekForecast({ forecast }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2"
      role="list"
      aria-label={`Estimated ${TOTAL_WEEKS}-week weather forecast`}
    >
      {forecast.map((week) => (
        <div
          key={week.week}
          role="listitem"
          className="flex min-h-[78px] min-w-[62px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-raised/50 px-2 py-2"
        >
          <WeatherIcon weather={week.weather} size="sm" stacked />
          <span className="text-[10px] font-bold text-muted">Week {week.week}</span>
        </div>
      ))}
    </div>
  );
}

export default function DegreeMap() {
  const { profile, actions } = useApp();
  const completedCourses = profile.completedCourses;
  const nextTerm = profile.nextTermCourses;
  const [hovered, setHovered] = useState(null);
  const [panel, setPanel] = useState(null);
  const [notice, setNotice] = useState("");
  const containerRef = useRef(null);
  const cardRefs = useRef({});
  const [edges, setEdges] = useState([]);
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });

  const available = useMemo(
    () => availableCourses(courses, completedCourses),
    [completedCourses]
  );
  const selected =
    panel?.type === "course"
      ? courses.find((course) => course.code === panel.code) || null
      : null;
  const selectedStatus = selected ? courseStatus(selected, completedCourses) : null;
  const selectedUnlocks = selected ? unlocksFor(selected.code, courses) : [];
  const missingPrerequisites = selected
    ? (selected.prereqs || []).filter((code) => !completedCourses.includes(code))
    : [];
  const highlight = hovered || (panel?.type === "course" ? panel.code : null);
  const relatedCodes = new Set(
    highlight
      ? [
          highlight,
          ...(courses.find((course) => course.code === highlight)?.prereqs || []),
          ...unlocksFor(highlight, courses).map((course) => course.code),
        ]
      : []
  );

  const plannedCourses = useMemo(
    () => nextTerm.map((code) => courses.find((course) => course.code === code)).filter(Boolean),
    [nextTerm]
  );
  const nextForecast = useMemo(
    () => forecastForCourses(plannedCourses),
    [plannedCourses]
  );
  const blizzardWeek = nextForecast.find((week) => week.weather === "blizzard");
  const lighterCourses = available.filter(
    (course) => course.workload !== "heavy" && !nextTerm.includes(course.code)
  );
  const heavyCourses = plannedCourses.filter((course) => course.workload === "heavy");
  const graduationPlan = useMemo(
    () => buildGraduationTerms(courses, completedCourses),
    [completedCourses]
  );

  const recompute = useCallback(() => {
    const result = mapEdges(containerRef.current, cardRefs);
    setEdges(result.edges);
    setGraphSize(result.size);
  }, []);

  useLayoutEffect(() => {
    recompute();
    const frame = requestAnimationFrame(recompute);
    const observer = new ResizeObserver(recompute);
    if (containerRef.current) observer.observe(containerRef.current);
    Object.values(cardRefs.current).forEach((element) => observer.observe(element));
    window.addEventListener("resize", recompute);
    document.fonts?.ready?.then(recompute).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, completedCourses, nextTerm.length]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function addToNextTerm(course) {
    if (nextTerm.includes(course.code)) return;
    if (nextTerm.length >= 5) {
      setNotice("Your next term is full. Remove a course before adding another.");
      return;
    }
    actions.addToNextTerm(course.code);
    setNotice(`${course.code} added to your next term.`);
  }

  function swapCourse(removeCode, addCode) {
    actions.removeFromNextTerm(removeCode);
    actions.addToNextTerm(addCode);
    setNotice(`${addCode} replaced ${removeCode} in your next-term plan.`);
  }

  function openCourse(course) {
    setPanel({ type: "course", code: course.code });
  }

  const isCoursePanel = panel?.type === "course" && selected;
  const panelTitle =
    panel?.type === "forecast"
      ? "Next term's forecast"
      : panel?.type === "path"
        ? "Your path to graduation"
        : selected?.code || "Course";
  const panelSubtitle =
    panel?.type === "forecast"
      ? "Estimated forecast, based on typical course workloads"
      : panel?.type === "path"
        ? "Long-range forecast"
        : selected?.name;

  return (
    <div className="min-w-0 max-w-full pt-4">
      <header className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-extrabold text-muted">
            Degree map · {profile.program}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            You can take{" "}
            <span className="text-amber">
              {available.length} new {available.length === 1 ? "course" : "courses"}
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tab to a course for details, or hover to trace its prerequisite paths.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="sage" onClick={() => setPanel({ type: "path" })}>
            <Sparkles size={17} aria-hidden="true" />
            Show my path to graduation
          </Button>
          <div
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface/70 px-4 py-2.5 text-xs font-bold text-muted"
            aria-label="Course status legend"
          >
            <span className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/15 text-sage">
                <Check size={12} aria-hidden="true" />
              </span>
              Finished
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_10px_var(--color-amber)]" aria-hidden="true" />
              Can take now
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={13} aria-hidden="true" />
              Locked
            </span>
          </div>
        </div>
      </header>

      <DegreePathways completed={completedCourses} defaultMajor={profile.program} />

      <Card className="mt-6 overflow-hidden p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted">
          <span>Prerequisite paths</span>
          <span>{completedCourses.length} finished · {courses.length} courses</span>
        </div>

        <div className="mt-4 max-w-full overflow-x-auto overscroll-x-contain pb-2">
          <div ref={containerRef} className="relative min-w-[980px]">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              width={graphSize.width}
              height={graphSize.height}
            >
              <defs>
                <marker
                  id="degree-arrow-base"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L8 4L0 8Z" fill="rgba(17,20,13,0.28)" />
                </marker>
                <marker
                  id="degree-arrow-active"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L8 4L0 8Z" fill="#9a6b16" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const active = highlight && (edge.from === highlight || edge.to === highlight);
                return (
                  <path
                    key={edge.id}
                    d={edge.d}
                    fill="none"
                    stroke={active ? "#9a6b16" : "rgba(17,20,13,0.18)"}
                    strokeWidth={active ? 2.2 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd={active ? "url(#degree-arrow-active)" : "url(#degree-arrow-base)"}
                    style={{
                      opacity: highlight ? (active ? 1 : 0.14) : 0.75,
                      transition: "stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease",
                    }}
                  />
                );
              })}
            </svg>

            <div className="relative z-10 grid grid-cols-4 gap-4 pb-8 lg:gap-6">
              {LEVELS.map((level) => {
                const column = courses
                  .filter((course) => course.level === level)
                  .sort((a, b) => a.code.localeCompare(b.code));
                return (
                  <div key={level} className="degree-map-column">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="text-sm font-extrabold">{level} level</h2>
                      <span className="text-xs font-bold text-muted">{column.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {column.map((course) => {
                        const status = courseStatus(course, completedCourses);
                        const StatusIcon =
                          status === "finished" ? Check : status === "available" ? Sparkles : Lock;
                        const isHot = relatedCodes.has(course.code);
                        const isPlanned = nextTerm.includes(course.code);
                        return (
                          <div
                            key={course.code}
                            ref={(element) => {
                              if (element) cardRefs.current[course.code] = element;
                              else delete cardRefs.current[course.code];
                            }}
                            onMouseEnter={() => setHovered(course.code)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(course.code)}
                            onBlur={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget)) {
                                setHovered(null);
                              }
                            }}
                            className={`group relative rounded-2xl border transition ${
                              status === "finished"
                                ? "border-sage/25 bg-sage/[0.08]"
                                : status === "available"
                                  ? "border-amber/35 bg-amber/[0.07]"
                                  : "border-meadow-ink/[0.08] bg-surface/70"
                            } ${
                              isHot
                                ? "border-[#9a6b16] shadow-[0_0_24px_-15px_rgba(154,107,22,0.65)]"
                                : "hover:border-meadow-ink/25"
                            }`}
                          >
                            <button
                              type="button"
                              title={course.name}
                              onClick={() => openCourse(course)}
                              aria-haspopup="dialog"
                              aria-label={`${course.code}: ${course.name}. ${STATUS_LABEL[status]}. Open course details.`}
                              className="flex min-h-[72px] w-full items-center gap-2.5 rounded-2xl px-3 py-2 pr-12 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                  status === "finished"
                                    ? "bg-sage/15 text-sage"
                                    : status === "available"
                                      ? "bg-amber/15 text-amber"
                                      : "bg-meadow-ink/[0.06] text-muted"
                                }`}
                                aria-hidden="true"
                              >
                                <StatusIcon size={13} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block text-sm font-extrabold ${
                                    status === "finished"
                                      ? "text-sage"
                                      : status === "locked"
                                        ? "text-muted"
                                        : "text-text"
                                  }`}
                                >
                                  {course.code}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted">
                                  {course.name}
                                </span>
                                {isPlanned && (
                                  <span className="mt-1 inline-flex rounded-full bg-amber/15 px-2 py-0.5 text-[9px] font-extrabold text-amber">
                                    Next term
                                  </span>
                                )}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => actions.toggleCompleted(course.code)}
                              title={status === "finished" ? "Mark as not finished" : "Mark as finished"}
                              aria-label={`${status === "finished" ? "Mark as not finished" : "Mark as finished"}: ${course.code}`}
                              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-meadow-ink/10 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                              {status === "finished" ? (
                                <Check size={16} aria-hidden="true" />
                              ) : (
                                <Plus size={15} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <section
          aria-label="Next term course plan"
          className="fixed inset-x-0 bottom-[5.5rem] z-30 mx-auto w-full max-w-7xl rounded-none border border-meadow-ink/15 bg-[#fbfbf6]/95 p-3 shadow-[0_18px_50px_-25px_rgba(17,20,13,0.75)] backdrop-blur-xl sm:inset-x-3 sm:w-auto sm:rounded-[24px] md:bottom-24 md:inset-x-6 md:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-meadow-ink">
                  Next term <span className="text-meadow-sub">· {nextTerm.length}/5 courses</span>
                </h2>
                <span className="text-xs font-bold text-meadow-sub sm:hidden">
                  Tap × to remove
                </span>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {plannedCourses.length ? plannedCourses.map((course) => (
                  <span
                    key={course.code}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-meadow-olive/10 px-3 text-xs font-extrabold text-meadow-olive"
                  >
                    {course.code}
                    <button
                      type="button"
                      onClick={() => actions.removeFromNextTerm(course.code)}
                      aria-label={`Remove ${course.code} from next term`}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-meadow-olive/15 focus-visible:outline-2 focus-visible:outline-offset-1"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                )) : (
                  <span className="inline-flex min-h-11 items-center text-xs font-semibold text-meadow-sub">
                    Choose up to 5 courses to plan your next term.
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={() => setPanel({ type: "forecast" })}
              disabled={!plannedCourses.length}
              className="w-full shrink-0 sm:w-auto"
            >
              Preview next term&apos;s forecast
            </Button>
          </div>
        </section>

      <SidePanel
        open={Boolean(panel)}
        onClose={() => setPanel(null)}
        title={panelTitle}
        subtitle={panelSubtitle}
        footer={
          isCoursePanel &&
          (selectedStatus === "available" ? (
            <Button
              onClick={() => addToNextTerm(selected)}
              disabled={nextTerm.includes(selected.code)}
              className="w-full"
            >
              {nextTerm.includes(selected.code) ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Plus size={17} aria-hidden="true" />
              )}
              {nextTerm.includes(selected.code) ? "In next term" : "Add to next term"}
            </Button>
          ) : selectedStatus === "finished" ? (
            <Button
              variant="outline"
              onClick={() => actions.toggleCompleted(selected.code)}
              className="w-full"
            >
              Mark as not finished
            </Button>
          ) : null)
        }
      >
        {isCoursePanel && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Chip tone={selected.workload === "heavy" ? "storm" : "amber"}>
                {describeCourse(selected)}
              </Chip>
              <Chip>{selected.level} level</Chip>
              <Chip
                tone={
                  selectedStatus === "finished"
                    ? "sage"
                    : selectedStatus === "available"
                      ? "amber"
                      : "default"
                }
              >
                {STATUS_LABEL[selectedStatus]}
              </Chip>
            </div>

            <p className="text-sm leading-relaxed text-text">{selected.name}</p>
            <p className="text-sm leading-relaxed text-muted">{selected.description}</p>

            {selectedStatus === "locked" && (
              <p className="rounded-2xl border border-amber/20 bg-amber/10 p-4 text-sm font-extrabold text-text">
                You need: {missingPrerequisites.join(", ")}
              </p>
            )}

            <div className="rounded-2xl bg-raised/50 p-4">
              <h3 className="text-xs font-extrabold text-muted">Prerequisites</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.prereqs.length ? (
                  selected.prereqs.map((code) => (
                    <Chip
                      key={code}
                      tone={completedCourses.includes(code) ? "sage" : "default"}
                    >
                      {code}
                      {completedCourses.includes(code) ? " ✓" : ""}
                    </Chip>
                  ))
                ) : (
                  <p className="text-sm font-bold text-sage">None — open to everyone.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-raised/50 p-4">
              <h3 className="text-xs font-extrabold text-muted">
                Unlocks {selectedUnlocks.length}{" "}
                {selectedUnlocks.length === 1 ? "course" : "courses"}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedUnlocks.length ? (
                  selectedUnlocks.map((course) => (
                    <Chip key={course.code} tone="blue" title={course.name}>
                      {course.code}
                    </Chip>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    This course doesn&apos;t unlock another course in this map.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {panel?.type === "forecast" && (
          <div className="space-y-5">
            {!plannedCourses.length ? (
              <p className="rounded-2xl bg-raised/50 p-4 text-sm text-muted">
                Add courses to your next-term plan to see its estimated weather.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {plannedCourses.map((course) => (
                    <Chip key={course.code} tone="amber" title={course.name}>
                      {course.code}
                    </Chip>
                  ))}
                </div>
                <WeekForecast forecast={nextForecast} />
                {blizzardWeek && (
                  <section
                    className="rounded-2xl border border-weather-blizzard/20 bg-weather-blizzard/[0.08] p-4"
                    aria-label={`Blizzard warning for week ${blizzardWeek.week}`}
                  >
                    <p className="text-sm font-extrabold leading-relaxed">
                      Heads up ⚠️ week {blizzardWeek.week} could be a blizzard. Want to swap a
                      heavy course for a lighter one?
                    </p>
                    <div className="mt-3 space-y-2">
                      {lighterCourses.length ? (
                        lighterCourses.slice(0, 4).map((course) => (
                          <div
                            key={course.code}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/60 p-2"
                          >
                            <span className="text-xs font-extrabold">
                              {course.code} · {course.name}
                            </span>
                            {heavyCourses[0] && (
                              <Button
                                size="sm"
                                variant="sage"
                                onClick={() => swapCourse(heavyCourses[0].code, course.code)}
                              >
                                Swap with {heavyCourses[0].code}
                              </Button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">
                          There are no lighter courses available to take now.
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {panel?.type === "path" && (
          <div className="space-y-4">
            {graduationPlan.terms.map((term) => {
              const meta = weatherMeta(term.weather);
              return (
                <section
                  key={term.term}
                  className="rounded-2xl border border-white/10 bg-raised/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-extrabold">{term.term}</h3>
                    <WeatherIcon weather={term.weather} size="sm" />
                  </div>
                  <p className={`mt-1 text-xs font-bold ${meta.text}`}>
                    Estimated term weather: {meta.label}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {term.courses.map((course) => (
                      <li
                        key={course.code}
                        className="rounded-xl bg-surface/55 px-3 py-2"
                        title={course.name}
                      >
                        <p className="text-sm font-extrabold">{course.code}</p>
                        <p className="truncate text-xs text-muted">{course.name}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {!graduationPlan.terms.length && (
              <p className="rounded-2xl bg-raised/50 p-4 text-sm text-muted">
                No remaining courses can be scheduled with the prerequisites currently marked
                complete.
              </p>
            )}
            {graduationPlan.unplanned.length > 0 && (
              <p className="rounded-2xl bg-raised/50 p-4 text-sm text-muted">
                Some courses could not be placed because their prerequisites are not represented
                as completed in this map.
              </p>
            )}
            <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-muted">
              A rough plan based on prerequisites. Check with an academic advisor before
              registering.
            </p>
          </div>
        )}
      </SidePanel>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 animate-fade-up rounded-2xl border border-sage/25 bg-surface/95 px-4 py-3 text-center text-sm font-bold text-sage shadow-[0_16px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl md:bottom-8"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
