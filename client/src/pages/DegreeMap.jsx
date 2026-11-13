import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Info,
  Lock,
  Plus,
  Sparkles,
} from "lucide-react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Chip from "../components/Chip.jsx";
import SidePanel from "../components/SidePanel.jsx";
import { useApp } from "../context/AppContext.jsx";
import { courses } from "../data/courses.js";
import {
  availableCourses,
  courseStatus,
  describeCourse,
  unlocksFor,
} from "../lib/degree.js";

const LEVELS = [100, 200, 300, 400];
const STATUS_LABEL = {
  finished: "Finished",
  available: "Can take now",
  locked: "Locked",
};

export default function DegreeMap() {
  const { completedCourses, nextTerm, actions } = useApp();
  const [hovered, setHovered] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [notice, setNotice] = useState("");
  const containerRef = useRef(null);
  const chipRefs = useRef({});
  const [edges, setEdges] = useState([]);
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });

  const available = useMemo(
    () => availableCourses(courses, completedCourses),
    [completedCourses]
  );
  const selected = courses.find((course) => course.code === selectedCode) || null;
  const selectedUnlocks = selected ? unlocksFor(selected.code, courses) : [];
  const highlight = hovered || selectedCode;

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const nextEdges = [];
    courses.forEach((course) => {
      (course.prereqs || []).forEach((prereq) => {
        const source = chipRefs.current[prereq];
        const target = chipRefs.current[course.code];
        if (!source || !target) return;
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        nextEdges.push({
          id: `${prereq}->${course.code}`,
          from: prereq,
          to: course.code,
          x1: sourceRect.right - bounds.left,
          y1: sourceRect.top - bounds.top + sourceRect.height / 2,
          x2: targetRect.left - bounds.left,
          y2: targetRect.top - bounds.top + targetRect.height / 2,
        });
      });
    });
    setEdges(nextEdges);
    setGraphSize({ width: container.scrollWidth, height: container.scrollHeight });
  }, []);

  useLayoutEffect(() => {
    recompute();
    const raf = requestAnimationFrame(recompute);
    const observer = new ResizeObserver(recompute);
    if (containerRef.current) observer.observe(containerRef.current);
    Object.values(chipRefs.current).forEach((element) => observer.observe(element));
    window.addEventListener("resize", recompute);
    document.fonts?.ready?.then(recompute).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
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
    actions.addToNextTerm(course.code);
    setNotice(`${course.code} added to your next term.`);
  }

  return (
    <div>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-extrabold text-muted">Degree map · Computing Science</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            You can take{" "}
            <span className="text-amber">
              {available.length} new {available.length === 1 ? "course" : "courses"}
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tap a course to mark it finished. Hover to trace what it unlocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {nextTerm.length > 0 && (
            <Chip tone="amber">
              <Sparkles size={13} aria-hidden="true" />
              {nextTerm.length} in next term
            </Chip>
          )}
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

      <Card className="mt-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted">
          <span>Prerequisite paths</span>
          <span className="text-muted/70">
            {completedCourses.length} finished · {courses.length} courses in this sample map
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div ref={containerRef} className="relative min-w-[980px]">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 overflow-visible"
              width={graphSize.width}
              height={graphSize.height}
            >
              <defs>
                <marker
                  id="arrow-base"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L8 4L0 8Z" fill="rgba(17,20,13,0.3)" />
                </marker>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L8 4L0 8Z" fill="#9a6b16" />
                </marker>
                <marker
                  id="arrow-sage"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L8 4L0 8Z" fill="#3d6b43" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const outgoing = highlight === edge.from;
                const incoming = highlight === edge.to;
                const color = outgoing
                  ? "#9a6b16"
                  : incoming
                    ? "#3d6b43"
                    : "rgba(17,20,13,0.16)";
                const width = outgoing ? 2.2 : incoming ? 1.7 : 1;
                const handle = Math.max(26, Math.min(86, (edge.x2 - edge.x1) * 0.38));
                return (
                  <path
                    key={edge.id}
                    d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + handle} ${edge.y1}, ${
                      edge.x2 - handle
                    } ${edge.y2}, ${edge.x2} ${edge.y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                    markerEnd={
                      outgoing
                        ? "url(#arrow-amber)"
                        : incoming
                          ? "url(#arrow-sage)"
                          : "url(#arrow-base)"
                    }
                    style={{
                      opacity: highlight && !outgoing && !incoming ? 0.55 : 1,
                      transition: "stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease",
                    }}
                  />
                );
              })}
            </svg>

            <div className="relative z-10 grid grid-cols-4 gap-4 lg:gap-6">
              {LEVELS.map((level) => {
                const column = courses
                  .filter((course) => course.level === level)
                  .sort((a, b) => a.code.localeCompare(b.code));
                return (
                  <div key={level}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="text-sm font-extrabold">{level} level</h2>
                      <span className="text-xs font-bold text-muted">{column.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {column.map((course) => {
                        const status = courseStatus(course, completedCourses);
                        const StatusIcon =
                          status === "finished" ? Check : status === "available" ? Sparkles : Lock;
                        const isHot = highlight === course.code;
                        return (
                          <div
                            key={course.code}
                            ref={(element) => {
                              if (element) chipRefs.current[course.code] = element;
                              else delete chipRefs.current[course.code];
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
                                  ? "border-amber/35 bg-amber/[0.07] shadow-[0_0_28px_-16px_rgba(255,181,71,0.85)]"
                                  : "border-white/[0.06] bg-surface/70"
                            } ${isHot ? "border-meadow-ink/30" : "hover:border-meadow-ink/25"}`}
                          >
                            <button
                              type="button"
                              onClick={() => actions.toggleCompleted(course.code)}
                              className="flex min-h-[62px] w-full items-center gap-2.5 rounded-2xl px-3 py-2 pr-11 text-left"
                              aria-label={`${course.code}, ${STATUS_LABEL[status]}. Toggle finished.`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                  status === "finished"
                                    ? "bg-sage/15 text-sage"
                                    : status === "available"
                                      ? "bg-amber/15 text-amber"
                                      : "bg-white/5 text-muted"
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
                              </span>
                              <span className="sr-only">{STATUS_LABEL[status]}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCode(course.code)}
                              aria-label={`Details for ${course.code}`}
                              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted opacity-100 transition hover:bg-meadow-ink/10 hover:text-text sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            >
                              <Info size={15} aria-hidden="true" />
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

      <SidePanel
        open={Boolean(selected)}
        onClose={() => setSelectedCode(null)}
        title={selected?.code || "Course"}
        subtitle={selected?.name}
        footer={
          selected && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => addToNextTerm(selected)}
                disabled={nextTerm.includes(selected.code)}
                className="flex-1"
              >
                {nextTerm.includes(selected.code) ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <Plus size={17} aria-hidden="true" />
                )}
                {nextTerm.includes(selected.code) ? "In next term" : "Add to next term"}
              </Button>
              <Button
                variant="outline"
                onClick={() => actions.toggleCompleted(selected.code)}
              >
                {completedCourses.includes(selected.code) ? "Unmark" : "Mark finished"}
              </Button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Chip tone={selected.workload === "heavy" ? "storm" : "amber"}>
                {describeCourse(selected)}
              </Chip>
              <Chip>{selected.level} level</Chip>
              <Chip
                tone={
                  courseStatus(selected, completedCourses) === "finished"
                    ? "sage"
                    : courseStatus(selected, completedCourses) === "available"
                      ? "amber"
                      : "default"
                }
              >
                {STATUS_LABEL[courseStatus(selected, completedCourses)]}
              </Chip>
            </div>

            <p className="text-sm leading-relaxed text-muted">{selected.description}</p>

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
                    <Chip key={course.code} tone="blue">
                      {course.code}
                    </Chip>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Final stretch — this one doesn't unlock anything else in this map.
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted">
              Sample data. Verify prerequisites against the official U of A course catalogue.
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
