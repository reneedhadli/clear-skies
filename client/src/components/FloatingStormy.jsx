import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CloudSun,
  Maximize2,
  Minus,
  MoreVertical,
  Plus,
  Radio,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Button from "./Button.jsx";
import { useApp } from "../context/AppContext.jsx";
import { courses } from "../data/courses.js";
import { availableCourses } from "../lib/degree.js";
import { buildForecast } from "../lib/forecast.js";
import { weatherMeta } from "../lib/weather.js";
import { postJSON } from "../lib/api.js";
import { localChat } from "../lib/localAI.js";
import ForecastReportPlayer from "./ForecastReportPlayer.jsx";
import { clubs } from "../data/clubs.js";
import { clubEventsForForecast } from "../lib/clubs.js";
import { generateForecastReport } from "../lib/forecastReport.js";
import { stopForecastAudio } from "../lib/forecastAudio.js";
import stormyMascot from "../assets/stormy.png";

const QUICK_REPLIES = {
  forecast: [
    "Why is this week stormy?",
    "Plan my week",
    "When's my next sunny week?",
  ],
  degree: [
    "What should I take next term?",
    "What does this course unlock?",
  ],
  clubs: [
    "Which club suits me?",
    "When can I go to club events?",
  ],
};

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

function welcomeMessage() {
  return {
    role: "assistant",
    content: "Hey! I'm Stormy 🐻 Ask me about your week, your courses, or clubs.",
    courseCodes: [],
    warning: null,
  };
}

function requestsForecastReport(message) {
  return (
    /\b(read|play|say|tell me)\b.*\b(forecast|weather report)\b/i.test(message) ||
    /\bweather report\b|\bforecast report\b/i.test(message)
  );
}

export default function FloatingStormy({
  page,
  open,
  onOpen,
  onClose,
  selectedForecastWeek,
}) {
  const {
    profile,
    deadlines,
    quizAnswers,
    likedClubIds,
    chatMessages,
    actions,
  } = useApp();
  const forecast = useMemo(() => buildForecast(deadlines), [deadlines]);
  const current =
    forecast.find((week) => week.week === (selectedForecastWeek || profile.currentWeek)) ||
    forecast[0];
  const weather = deadlines.length ? current.weather : "cloudy";
  const weatherMetaForWeek = weatherMeta(weather);
  const eligible = useMemo(
    () => availableCourses(courses, profile.completedCourses),
    [profile.completedCourses]
  );

  function addSuggestedCourse(code) {
    if (profile.nextTermCourses.length >= 5) {
      actions.addChatMessage({
        role: "assistant",
        content: "Your next term is full. Remove a course from the Degree Map tray before adding another.",
        courseCodes: [],
        warning: null,
      });
      return;
    }
    actions.addToNextTerm(code);
  }
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const openerRef = useRef(null);
  const previousOpenRef = useRef(false);
  const attentionTimersRef = useRef(new Set());
  const attentionStoppedRef = useRef(false);
  const attentionCountRef = useRef(0);
  const reduce = useReducedMotion();
  const attentionControls = useAnimationControls();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoPlayMessageId, setAutoPlayMessageId] = useState(null);
  const [attentionCycle, setAttentionCycle] = useState(0);
  const [initialAttentionBounce, setInitialAttentionBounce] = useState(true);
  const [showAttentionBubble, setShowAttentionBubble] = useState(false);
  const openRef = useRef(open);
  const pageRef = useRef(page);
  openRef.current = open;
  pageRef.current = page;

  function scheduleAttention(callback, delay) {
    const timer = window.setTimeout(() => {
      attentionTimersRef.current.delete(timer);
      callback();
    }, delay);
    attentionTimersRef.current.add(timer);
  }

  function stopAttention() {
    if (attentionStoppedRef.current) return;
    attentionStoppedRef.current = true;
    sessionStorage.setItem("stormy-attention-stopped", "true");
    attentionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    attentionTimersRef.current.clear();
    setShowAttentionBubble(false);
  }

  useEffect(() => {
    if (open) {
      stopAttention();
      return;
    }
    if (
      attentionStoppedRef.current ||
      sessionStorage.getItem("stormy-attention-stopped") === "true"
    ) {
      attentionStoppedRef.current = true;
      return;
    }

    let bubbleWasShown =
      sessionStorage.getItem("stormy-attention-bubble-shown") === "true";
    function bounceAndScheduleNext() {
      if (attentionStoppedRef.current) return;
      setInitialAttentionBounce(attentionCountRef.current === 0);
      attentionCountRef.current += 1;
      setAttentionCycle((cycle) => cycle + 1);
      if (!bubbleWasShown) {
        bubbleWasShown = true;
        sessionStorage.setItem("stormy-attention-bubble-shown", "true");
        setShowAttentionBubble(true);
        scheduleAttention(() => setShowAttentionBubble(false), 5000);
      }
      scheduleAttention(bounceAndScheduleNext, 30000);
    }

    scheduleAttention(bounceAndScheduleNext, 1500);
    return () => {
      attentionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      attentionTimersRef.current.clear();
    };
  }, [open]);

  useEffect(() => {
    if (reduce || attentionCycle === 0) return;
    attentionControls.start(
      initialAttentionBounce
        ? {
            y: [0, -12, 0, -10, 0, -8, 0],
            scaleX: [1, 1, 1.04, 1, 1.03, 1, 1.02],
            scaleY: [1, 1.04, 0.96, 1.03, 0.97, 1.02, 1],
            transition: { duration: 1.2, ease: "easeInOut" },
          }
        : {
            y: [0, -10, 0],
            scaleX: [1, 1.02, 1],
            scaleY: [1, 0.98, 1],
            transition: { duration: 0.45, ease: "easeInOut" },
          }
    );
  }, [attentionControls, attentionCycle, initialAttentionBounce, reduce]);

  useEffect(() => {
    if (chatMessages.length === 0) actions.addChatMessage(welcomeMessage());
  }, [chatMessages.length, actions]);

  useEffect(() => {
    if (open && !minimized) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (!open && previousOpenRef.current) {
      openerRef.current?.focus();
    }
    previousOpenRef.current = open;
  }, [open, minimized]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        stopForecastAudio();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || minimized) return;
    endRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [chatMessages, typing, open, minimized, reduce]);

  const context = useMemo(
    () => ({
      profile,
      page,
      currentWeek: current.week,
      forecast: forecast.map(({ week, weather: weekWeather, stress }) => ({
        week,
        weather: weekWeather,
        stress,
      })),
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
    [profile, page, forecast, deadlines, eligible, current]
  );

  async function send(raw) {
    const message = String(raw ?? input).trim();
    if (!message || typing) return;
    const history = chatMessages.map((item) => ({ role: item.role, content: item.content }));
    actions.addChatMessage({ role: "user", content: message });
    setInput("");
    setTyping(true);

    if (requestsForecastReport(message)) {
      stopForecastAudio();
      const week = current;
      const clubEvents = clubEventsForForecast(
        likedClubIds,
        clubs,
        forecast,
        current.week
      ).filter((event) => event.week === week.week);
      const report = await generateForecastReport({
        week,
        weather: week.weather,
        deadlines: week.due,
        clubEvents,
        studentName: profile.name,
      });
      const shouldStartReport = openRef.current && pageRef.current === page;
      const id = `forecast-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      actions.addChatMessage({
        role: "assistant",
        content: report,
        isForecastReport: true,
        reportWeek: week.week,
        id,
      });
      setAutoPlayMessageId(shouldStartReport ? id : null);
      setTyping(false);
      inputRef.current?.focus();
      return;
    }

    let reply;
    try {
      reply = await postJSON("/api/chat", { message, history, context });
    } catch {
      reply = localChat(message, context);
    }

    actions.addChatMessage({
      role: "assistant",
      content: reply.reply || "Hmm, my weather radar blinked. Ask me again?",
      courseCodes: reply.courseCodes || [],
      warning: reply.warning || null,
    });
    setTyping(false);
    inputRef.current?.focus();
  }

  function closePanel() {
    stopForecastAudio();
    setMenuOpen(false);
    setMinimized(false);
    onClose();
  }

  function openPanel() {
    stopAttention();
    setMinimized(false);
    onOpen();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="font-meadow">
      <AnimatePresence>
        {open && (
          <motion.section
            key="stormy-panel"
            role="dialog"
            aria-label="Chat with Stormy"
            aria-modal="false"
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 12, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
            className={`meadow-theme fixed z-[80] flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-surface/95 text-text shadow-[0_24px_80px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
              minimized
                ? "bottom-24 right-6 h-[72px] w-[min(400px,calc(100vw-32px))] sm:bottom-24 sm:right-6"
                : "bottom-24 right-4 h-[min(600px,80vh)] w-[min(400px,calc(100vw-32px))] sm:bottom-24 sm:right-6"
            } max-sm:bottom-[164px] max-sm:right-0 max-sm:w-full max-sm:rounded-b-none ${
              minimized ? "" : "max-sm:h-[min(85dvh,calc(100dvh-180px))]"
            }`}
          >
            {minimized ? (
              <div className="flex h-full items-center gap-3 px-4">
                <img
                  src={stormyMascot}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">Stormy</p>
                  <p className="truncate text-xs text-muted">
                    Week {current.week} looks {weatherMetaForWeek.label.toLowerCase()}{" "}
                    {weatherMetaForWeek.emoji}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMinimized(false)}
                  aria-label="Restore chat with Stormy"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  <Maximize2 size={18} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                  <img
                    src={stormyMascot}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black tracking-tight">Stormy</h2>
                    <p className="truncate text-[11px] font-semibold text-muted">
                      Week {current.week} looks {weatherMetaForWeek.label.toLowerCase()}{" "}
                      {weatherMetaForWeek.emoji}
                    </p>
                  </div>
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((value) => !value)}
                      aria-label="Chat options"
                      aria-expanded={menuOpen}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full z-10 mt-2 rounded-xl border border-white/10 bg-surface p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            actions.clearChat();
                            setMenuOpen(false);
                          }}
                          className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-text transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber"
                        >
                          Clear chat
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMinimized(true)}
                    aria-label="Minimize chat"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    aria-label="Close chat"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <div key={`${message.role}-${index}`}>
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
                              {message.isForecastReport ? (
                                <>
                                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber">
                                    Week {message.reportWeek} · Stormy&apos;s weather report
                                  </p>
                                  <ForecastReportPlayer
                                    report={message.content}
                                    week={message.reportWeek}
                                    compact
                                    autoPlayToken={autoPlayMessageId === message.id ? 1 : 0}
                                    onAutoPlay={() => setAutoPlayMessageId(null)}
                                  />
                                </>
                              ) : (
                                <div className="rounded-[22px] rounded-tl-md bg-raised/75 px-4 py-3 text-sm leading-relaxed">
                                  {message.content}
                                </div>
                              )}
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
                                      added={profile.nextTermCourses.includes(code)}
                                      onAdd={() => addSuggestedCourse(code)}
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

                <footer className="border-t border-white/[0.06] bg-surface/95 px-3 pb-3 pt-2">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[...(QUICK_REPLIES[page] || QUICK_REPLIES.forecast), "🎙️ Play my forecast"].map((reply) => (
                      <Button
                        key={reply}
                        variant="outline"
                        size="sm"
                        onClick={() => send(reply)}
                        disabled={typing}
                        className="min-h-9 px-3 text-[11px]"
                      >
                        {reply === "🎙️ Play my forecast" ? (
                          <Radio size={13} className="text-amber" aria-hidden="true" />
                        ) : (
                          <Sparkles size={13} className="text-amber" aria-hidden="true" />
                        )}
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
                      className="min-h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-raised/70 px-4 text-sm text-text placeholder:text-muted/60 focus:border-amber/50"
                    />
                    <Button type="submit" disabled={!input.trim() || typing} className="min-h-11 shrink-0 px-4">
                      <Send size={17} aria-hidden="true" />
                      <span className="hidden sm:inline">Send</span>
                      <span className="sr-only sm:hidden">Send message</span>
                    </Button>
                  </form>
                </footer>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[90] max-sm:bottom-4 max-sm:right-4">
        <AnimatePresence>
          {showAttentionBubble && !open && (
            <motion.div
              key="stormy-attention"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: page === "clubs" ? 6 : 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: reduce ? 0.12 : 0.2, ease: "easeOut" }}
              className={`absolute z-10 flex w-[190px] items-center gap-1 rounded-2xl bg-[#fff9e8] p-3 text-sm font-bold text-[#23341e] shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${
                page === "clubs"
                  ? "bottom-full right-0 mb-3"
                  : "right-full top-1/2 mr-3 -translate-y-1/2"
              }`}
            >
              <span
                className={`absolute h-3 w-3 rotate-45 bg-[#fff9e8] ${
                  page === "clubs"
                    ? "bottom-[-5px] right-7"
                    : "right-[-5px] top-1/2 -translate-y-1/2"
                }`}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={openPanel}
                className="relative min-h-8 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6b43]"
              >
                Hey! Use me 👋
              </button>
              <button
                type="button"
                onClick={stopAttention}
                aria-label="Dismiss"
                className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#45533d] transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3d6b43]"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          ref={openerRef}
          type="button"
          onClick={() => (open ? closePanel() : openPanel())}
          aria-label="Open chat with Stormy"
          aria-expanded={open}
          animate={attentionControls}
          whileHover={reduce ? undefined : { scale: 1.06, y: -3 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          className="group relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-white/60 bg-[#2F4A2B] text-white shadow-[0_10px_28px_rgba(0,0,0,0.25)] transition-shadow duration-200 hover:shadow-[0_14px_34px_rgba(0,0,0,0.3)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3d6b43] max-sm:h-[68px] max-sm:w-[68px]"
        >
          {open ? (
            <X size={25} aria-hidden="true" />
          ) : (
            <img
              src={stormyMascot}
              alt=""
              className="absolute inset-0 h-full w-full rounded-full object-cover"
            />
          )}
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Chat with Stormy
          </span>
        </motion.button>
      </div>
    </div>,
    document.body
  );
}
