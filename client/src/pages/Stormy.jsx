import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CloudSun,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Chip from "../components/Chip.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import WeatherIcon from "../components/WeatherIcon.jsx";
import Glow from "../components/Glow.jsx";
import { useApp } from "../context/AppContext.jsx";
import { courses } from "../data/courses.js";
import { buildForecast, calmestWeek } from "../lib/forecast.js";
import { weatherMeta } from "../lib/weather.js";
import { availableCourses } from "../lib/degree.js";
import { postJSON } from "../lib/api.js";
import { localChat } from "../lib/localAI.js";

const QUICK_REPLIES = [
  "What should I take next term?",
  "Why is this week stormy?",
  "Plan my midterms.",
];

function openingMessage(week, deadlines) {
  if (!deadlines.length) {
    return {
      role: "assistant",
      content:
        "Hey, I'm Stormy ☁️ Add a syllabus and I'll read the weather with you. Or ask me what to take next term.",
      courseCodes: [],
      warning: null,
    };
  }
  const first = week.due[0];
  const content = {
    sunny: `Week ${week.week} is sunny — barely anything due. A good week to get ahead, or actually rest.`,
    cloudy: `Week ${week.week} is a little cloudy — ${week.due.length} things due. Nothing we can't handle together.`,
    storm: `Week ${week.week} looks stormy! 🌧️ ${week.due.length} things due${
      first ? `, including ${first.course} ${first.title}` : ""
    }. Want me to help plan it?`,
    blizzard: `Week ${week.week} is a blizzard ❄️ ${week.due.length} big things at once. Let's break it into tiny, cozy steps.`,
    deepfreeze: `Deep freeze week 🧊 Finals are here. Warm drink, focused plan, early nights. Want to map out your study days?`,
  }[week.weather];
  return { role: "assistant", content, courseCodes: [], warning: null };
}

function CourseCard({ code, onAdd, added }) {
  const course = courses.find((item) => item.code === code);
  if (!course) return null;
  return (
    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/90 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber">
        <BookOpen size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{course.code}</p>
        <p className="truncate text-xs text-muted">{course.name}</p>
        <p className="mt-0.5 text-[11px] font-bold text-muted">
          {course.workload} workload · level {course.level}
        </p>
      </div>
      <Button
        size="sm"
        variant={added ? "soft" : "sage"}
        onClick={onAdd}
        disabled={added}
        aria-label={added ? `${code} added to next term` : `Add ${code} to next term`}
        className="shrink-0 px-3"
      >
        {added ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
        {added ? "Added" : "Add"}
      </Button>
    </div>
  );
}

export default function Stormy() {
  const { profile, deadlines, completedCourses, nextTerm, actions } = useApp();
  const forecast = useMemo(() => buildForecast(deadlines), [deadlines]);
  const current = forecast.find((week) => week.week === profile.currentWeek) || forecast[0];
  const displayWeather = deadlines.length ? current.weather : "cloudy";
  const meta = weatherMeta(displayWeather);
  const nextCalm = deadlines.length ? calmestWeek(forecast, profile.currentWeek) : null;
  const eligible = useMemo(
    () => availableCourses(courses, completedCourses),
    [completedCourses]
  );

  const [messages, setMessages] = useState(() => [
    openingMessage(current, deadlines),
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, typing, reduce]);

  const context = useMemo(
    () => ({
      profile,
      currentWeek: profile.currentWeek,
      forecast: forecast.map(({ week, weather, stress }) => ({ week, weather, stress })),
      deadlines,
      courses: courses.map(({ code, name, workload, prereqs, level }) => ({
        code,
        name,
        workload,
        prereqs,
        level,
      })),
      eligibleCourses: eligible.map((course) => course.code),
    }),
    [profile, forecast, deadlines, eligible]
  );

  async function send(raw) {
    const message = String(raw ?? input).trim();
    if (!message || typing) return;
    const history = messages.map((item) => ({ role: item.role, content: item.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setTyping(true);

    let reply;
    try {
      reply = await postJSON("/api/chat", { message, history, context });
    } catch {
      reply = localChat(message, context);
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: reply.reply || "Hmm, my weather radar blinked. Ask me again?",
        courseCodes: reply.courseCodes || [],
        warning: reply.warning || null,
      },
    ]);
    setTyping(false);
    inputRef.current?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <Glow color={meta.glow} className="-top-10 left-1/2 h-52 w-52 -translate-x-1/2" opacity={0.3} />
          <div className="relative flex flex-col items-center text-center">
            <span className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-raised/50 text-amber">
              <CloudSun size={64} strokeWidth={1.4} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">Stormy</h1>
            <p className="text-sm text-muted">Your semester weather assistant</p>

            <div className="mt-5 w-full rounded-2xl border border-white/5 bg-raised/60 p-4 text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-muted">This week</p>
                <Chip tone={deadlines.length ? "storm" : "default"}>
                  Week {profile.currentWeek}
                </Chip>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <WeatherIcon weather={displayWeather} size="sm" />
                <span className="text-xl font-black">{deadlines.length ? `${current.stress}%` : "—"}</span>
              </div>
              <ProgressBar
                className="mt-2"
                value={deadlines.length ? current.stress : 0}
                color={meta.glow}
                label="This week's stress"
              />
              <p className="mt-3 text-sm text-muted">
                {deadlines.length
                  ? `${current.due.length} things due. Want help planning?`
                  : "Add a syllabus and I'll read the weather for you."}
              </p>
            </div>

            {nextCalm && (
              <div className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl bg-sage/10 px-4 py-3 text-left">
                <div>
                  <p className="text-[11px] font-extrabold text-sage">Next calm week</p>
                  <p className="text-sm font-bold">Week {nextCalm.week}</p>
                </div>
                <WeatherIcon weather={nextCalm.weather} size="sm" />
              </div>
            )}
          </div>
        </Card>
      </aside>

      <Card className="flex h-[calc(100dvh-170px)] min-h-[580px] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-black tracking-tight">Chat with Stormy</h2>
            <p className="text-xs text-muted">Course advice, storm plans, and calm reassurance.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/10 px-3 py-1.5 text-[11px] font-extrabold text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />
            Here for you
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[86%] rounded-[22px] rounded-br-md border border-amber/20 bg-amber/15 px-4 py-3 text-sm leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-amber"
                      aria-hidden="true"
                    >
                      <CloudSun size={18} />
                    </span>
                    <div className="max-w-[88%]">
                      <div className="rounded-[22px] rounded-tl-md bg-raised/75 px-4 py-3 text-sm leading-relaxed">
                        {message.content}
                      </div>
                      {message.warning && (
                        <div className="mt-2 flex items-start gap-2 rounded-2xl border border-amber/25 bg-amber/10 p-3 text-sm text-amber">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                          <p>{message.warning}</p>
                        </div>
                      )}
                      {message.courseCodes?.length > 0 && (
                        <div>
                          {message.courseCodes.map((code) => (
                            <CourseCard
                              key={code}
                              code={code}
                              added={nextTerm.includes(code)}
                              onAdd={() => actions.addToNextTerm(code)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="flex items-start gap-2.5" role="status" aria-label="Stormy is typing">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-amber"
                  aria-hidden="true"
                >
                  <CloudSun size={18} />
                </span>
                <div className="flex items-center gap-1.5 rounded-[22px] rounded-tl-md bg-raised/75 px-4 py-4">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                  <span className="sr-only">Stormy is typing...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-white/[0.06] bg-surface/95 px-4 pb-4 pt-3 sm:px-6">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((reply) => (
              <Button
                key={reply}
                variant="outline"
                size="sm"
                onClick={() => send(reply)}
                disabled={typing}
                className="text-xs"
              >
                <Sparkles size={14} className="text-amber" aria-hidden="true" />
                {reply}
              </Button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label htmlFor="stormy-message" className="sr-only">
              Message Stormy
            </label>
            <input
              ref={inputRef}
              id="stormy-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message..."
              maxLength={600}
              autoComplete="off"
              className="min-h-12 flex-1 rounded-full border border-white/10 bg-raised/70 px-5 text-sm text-text placeholder:text-muted/60 focus:border-amber/50"
            />
            <Button type="submit" disabled={!input.trim() || typing} className="shrink-0">
              <Send size={17} aria-hidden="true" />
              <span className="hidden sm:inline">Send</span>
              <span className="sr-only sm:hidden">Send message</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
