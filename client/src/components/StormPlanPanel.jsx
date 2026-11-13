import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, Sparkles } from "lucide-react";
import SidePanel from "./SidePanel.jsx";
import Button from "./Button.jsx";
import Chip from "./Chip.jsx";
import { postJSON } from "../lib/api.js";
import { localPlan } from "../lib/localAI.js";
import { weatherMeta } from "../lib/weather.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu"];

function normalizePlan(raw) {
  if (!Array.isArray(raw)) return [];
  return DAYS.map((day) => {
    const entry = raw.find((item) => String(item?.day || "").startsWith(day));
    const tasks = Array.isArray(entry?.tasks)
      ? entry.tasks
          .map((task) =>
            typeof task === "string"
              ? { text: task, done: false }
              : { text: String(task?.text || ""), done: Boolean(task?.done) }
          )
          .filter((task) => task.text)
      : [];
    return { day, tasks };
  }).filter((day) => day.tasks.length);
}

export default function StormPlanPanel({ open, onClose, week, savedPlan, onSave }) {
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (Array.isArray(savedPlan) && savedPlan.length) {
      setPlan(normalizePlan(savedPlan));
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await postJSON("/api/storm-plan", {
          week: week.week,
          deadlines: week.due,
        });
        const normalized = normalizePlan(data.plan);
        if (!normalized.length) throw new Error("Empty plan");
        if (!cancelled) setPlan(normalized);
      } catch {
        if (!cancelled) {
          const fallback = localPlan(week.week, week.due);
          setPlan(normalizePlan(fallback));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, week, savedPlan, reloadKey]);

  function toggleTask(dayIndex, taskIndex) {
    setPlan((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              tasks: day.tasks.map((task, taskIdx) =>
                taskIdx === taskIndex ? { ...task, done: !task.done } : task
              ),
            }
          : day
      )
    );
  }

  function save() {
    onSave(plan);
    onClose();
  }

  const meta = weatherMeta(week.weather);

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Your storm plan"
      subtitle={`Week ${week.week} · ${meta.label}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">Check things off as you go.</span>
          <Button onClick={save} disabled={loading || !plan.length}>
            Save plan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-raised/60 p-4">
          <span className="text-2xl" aria-hidden="true">
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{meta.headline}</p>
            <p className="text-xs text-muted">
              {week.due.length} {week.due.length === 1 ? "thing" : "things"} due · {week.stress}% stress
            </p>
          </div>
          <Chip tone="storm">Mon–Thu</Chip>
        </div>

        {loading ? (
          <div aria-live="polite">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted">
              <Loader2 size={17} className="animate-spin text-amber" aria-hidden="true" />
              Stormy is mapping out your week...
            </div>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day} className="rounded-[22px] border border-white/5 bg-raised/40 p-4">
                  <div className="h-4 w-16 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-3 h-3 w-4/5 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-3/5 animate-pulse rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-200">
            {error}
            <Button variant="soft" className="mt-3" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Sparkles size={15} className="text-amber" aria-hidden="true" />
              Small steps, Monday to Thursday. Tap a task when it's done.
            </p>
            <div className="space-y-3">
              {plan.map((day, dayIndex) => (
                <div key={day.day} className="rounded-[22px] border border-white/5 bg-raised/45 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold">
                    <CalendarDays size={16} className="text-amber" aria-hidden="true" />
                    {day.day}
                  </h3>
                  <ul className="mt-2">
                    {day.tasks.map((task, taskIndex) => (
                      <li key={`${task.text}-${taskIndex}`}>
                        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl py-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => toggleTask(dayIndex, taskIndex)}
                            className="peer sr-only"
                          />
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber ${
                              task.done
                                ? "border-sage bg-sage text-night"
                                : "border-white/20 bg-surface"
                            }`}
                          >
                            {task.done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                          </span>
                          <span className={task.done ? "text-muted line-through" : "text-text"}>
                            {task.text}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SidePanel>
  );
}
