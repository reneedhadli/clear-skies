import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, CheckCircle2, Radio, Sparkles } from "lucide-react";
import MeadowLandscape from "../components/MeadowLandscape.jsx";
import SyllabusModal from "../components/SyllabusModal.jsx";
import StormPlanPanel from "../components/StormPlanPanel.jsx";
import DailyForecastSection from "../components/DailyForecastSection.jsx";
import ForecastReportPlayer from "../components/ForecastReportPlayer.jsx";
import WeatherFX from "../components/WeatherFX.jsx";
import WeatherIcon from "../components/WeatherIcon.jsx";
import { useApp } from "../context/AppContext.jsx";
import { TOTAL_WEEKS } from "../config/term.js";
import { buildForecast } from "../lib/forecast.js";
import { normalizeDeadline } from "../lib/deadlines.js";
import { clubEventsForForecast } from "../lib/clubs.js";
import { clubs } from "../data/clubs.js";
import { weatherMeta } from "../lib/weather.js";
import { generateForecastReport } from "../lib/forecastReport.js";
import { stopForecastAudio } from "../lib/forecastAudio.js";

const WEATHER_COPY = {
  sunny: "Clear skies. A good week to get ahead, or actually rest.",
  cloudy: "A few things due, nothing dramatic. Keep it steady.",
  storm: "Rough week ahead, let's plan it 🌧️",
  blizzard: "Big week. Many things at once — let's break it down.",
  deepfreeze: "Finals. Warm drink, focused plan, early nights.",
};

const STRESS_COLORS = {
  sunny: "#a97722",
  cloudy: "#6f7668",
  storm: "#6454c7",
  blizzard: "#397ca2",
  deepfreeze: "#4b7f9c",
};

const TYPE_TONES = {
  midterm: "bg-[#6b5bd6]/14 text-[#5946bf]",
  final: "bg-[#3d7fa8]/12 text-[#2f6f97]",
  quiz: "bg-[#b8862e]/14 text-[#7d5a1b]",
  assignment: "bg-[#4d7a45]/14 text-[#3d6237]",
  project: "bg-[#4d7a45]/14 text-[#3d6237]",
  lab: "bg-meadow-ink/[0.06] text-meadow-sub",
};

function MeadowButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-meadow-ground px-7 text-base font-extrabold tracking-tight text-[#f4f4ef] shadow-[0_14px_34px_-18px_rgba(17,20,13,0.85)] transition hover:bg-[#34431f] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-meadow-olive motion-reduce:transform-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StressBar({ value, weather }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-meadow-ink/10"
      role="progressbar"
      aria-label={`Feels like ${clamped}% stressed`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${clamped}%`, backgroundColor: STRESS_COLORS[weather] }}
      />
    </div>
  );
}

function ClubPlans({ events }) {
  if (!events.length) return null;

  return (
    <section className="mt-5 rounded-2xl border border-[#4d7a45]/15 bg-[#4d7a45]/[0.06] px-4 py-3">
      <h3 className="text-xs font-extrabold text-[#3d6237]">Club plans</h3>
      <ul className="mt-1 divide-y divide-[#4d7a45]/10">
        {events.map((event) => (
          <li key={event.clubId} className="py-2">
            <p className="text-sm font-bold leading-relaxed text-meadow-ink">
              <span aria-hidden="true">{event.club.emoji} </span>
              {event.club.name}, {event.title}
              {event.day ? `, ${event.day.slice(0, 3)}` : ""}
              {event.time ? ` ${event.time}` : ""}
              {event.isDemoEvent && (
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-meadow-sub/70">
                  Demo
                </span>
              )}
            </p>
            {!event.isDemoEvent && ["storm", "blizzard"].includes(event.weather) && (
              <p className="mt-0.5 text-xs font-semibold text-meadow-sub">
                Busy week, go if you can 🌧️
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const DAY_RANK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function dayRank(day) {
  const index = DAY_RANK.indexOf(day);
  return index === -1 ? 99 : index;
}

export default function Forecast({ onSelectedWeekChange }) {
  const {
    profile,
    syllabi,
    deadlines,
    plans,
    likedClubIds,
    studySessions,
    actions,
  } = useApp();
  const normalizedDeadlines = useMemo(() => deadlines.map(normalizeDeadline), [deadlines]);
  const forecast = useMemo(
    () => buildForecast(normalizedDeadlines, studySessions),
    [normalizedDeadlines, studySessions]
  );
  const hasForecast = normalizedDeadlines.length > 0;
  const reduceMotion = useReducedMotion();
  const clubEvents = useMemo(
    () => clubEventsForForecast(likedClubIds, clubs, forecast, profile.currentWeek),
    [likedClubIds, forecast, profile.currentWeek]
  );
  const clubEventCounts = useMemo(
    () =>
      clubEvents.reduce((counts, event) => {
        counts[event.week] = (counts[event.week] || 0) + 1;
        return counts;
      }, {}),
    [clubEvents]
  );
  const [selectedWeek, setSelectedWeek] = useState(profile.currentWeek);
  const [modalOpen, setModalOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [animateReveal, setAnimateReveal] = useState(false);
  const [notice, setNotice] = useState("");
  const [forecastReport, setForecastReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportAutoplayToken, setReportAutoplayToken] = useState(0);
  const stripRef = useRef(null);
  const forecastRef = useRef(null);
  const immersiveRef = useRef(null);
  const shouldRevealRef = useRef(false);

  const selected = forecast.find((week) => week.week === selectedWeek) || forecast[0];
  const selectedClubEvents = clubEvents.filter((event) => event.week === selected.week);
  const meta = weatherMeta(selected.weather);

  useEffect(() => {
    onSelectedWeekChange?.(selected.week);
  }, [onSelectedWeekChange, selected.week]);

  useEffect(() => {
    document.title = `${profile.program} — Clear Skies`;
    return () => {
      document.title = "Clear Skies";
    };
  }, [profile.program]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!hasForecast || !shouldRevealRef.current) return;
    shouldRevealRef.current = false;
    setAnimateReveal(!reduceMotion);
    requestAnimationFrame(() => {
      forecastRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [hasForecast, reduceMotion]);

  useEffect(() => {
    const active = stripRef.current?.querySelector(`[data-week="${selectedWeek}"]`);
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedWeek, hasForecast]);

  useEffect(() => {
    stopForecastAudio();
    setForecastReport("");
    setReportAutoplayToken(0);
    setReportLoading(false);
  }, [selected.week]);

  useEffect(() => {
    if (!animateReveal || reduceMotion) return;
    const timer = window.setTimeout(() => setAnimateReveal(false), 850);
    return () => window.clearTimeout(timer);
  }, [animateReveal, reduceMotion]);

  function showDemo() {
    shouldRevealRef.current = true;
    actions.loadDemo();
  }

  function handleAdded(added) {
    shouldRevealRef.current = true;
    setSelectedWeek(profile.currentWeek);
    setNotice(
      `Added ${added.length} deadlines. Week ${profile.currentWeek} just got clearer.`
    );
  }

  function savePlan(plan) {
    actions.savePlan(selected.week, plan);
    setNotice(`Plan saved for week ${selected.week}. One small step at a time.`);
  }

  async function playForecastReport() {
    if (reportLoading) return;
    stopForecastAudio();
    if (!forecastReport) {
      setReportLoading(true);
      const report = await generateForecastReport({
        week: selected,
        weather: selected.weather,
        deadlines: selected.due,
        clubEvents: selectedClubEvents,
        studentName: profile.name,
      });
      setForecastReport(report);
      setReportLoading(false);
    }
    setReportAutoplayToken((token) => token + 1);
  }

  function handleWeekKeyDown(event, week) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const nextWeek =
      event.key === "ArrowRight"
        ? Math.min(TOTAL_WEEKS, week + 1)
        : Math.max(1, week - 1);
    setSelectedWeek(nextWeek);
    stripRef.current?.querySelector(`[data-week="${nextWeek}"]`)?.focus();
  }

  function scrollToDayByDay() {
    immersiveRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function backToWeekOverview() {
    forecastRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className="meadow-home font-meadow text-meadow-ink">
      <section className="relative isolate flex min-h-[calc(100svh-77px)] overflow-hidden">
        <MeadowLandscape seed={21} />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-12 text-center sm:px-6">
          <div className="max-w-3xl">
            <h1 className="animate-meadow-rise text-[clamp(3.5rem,9vw,7.4rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-meadow-ink">
              {profile.name ? (
                <>
                  Hey{" "}
                  <span className="font-meadow-serif font-normal italic tracking-[-0.035em]">
                    {profile.name}
                  </span>{" "}
                  <span className="inline-block text-[0.62em] align-[0.12em]" aria-hidden="true">
                    👋
                  </span>
                </>
              ) : (
                <>
                  Welcome to{" "}
                  <span className="font-meadow-serif font-normal italic tracking-[-0.035em]">
                    Clear Skies
                  </span>
                </>
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-meadow-rise text-base font-medium leading-relaxed text-meadow-sub sm:text-lg">
              Add your syllabus to see your semester forecast.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 animate-meadow-rise">
              <MeadowButton onClick={() => setModalOpen(true)}>
                {hasForecast ? "Add another syllabus" : "Add syllabus"}
              </MeadowButton>
              {!hasForecast ? (
                <button
                  type="button"
                  onClick={showDemo}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-meadow-sub/80 underline decoration-meadow-sub/35 underline-offset-4 transition hover:text-meadow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive"
                >
                  or try a demo student
                </button>
              ) : (
                <a
                  href="#forecast"
                  onClick={(event) => {
                    event.preventDefault();
                    forecastRef.current?.scrollIntoView({
                      behavior: reduceMotion ? "auto" : "smooth",
                      block: "start",
                    });
                  }}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-meadow-sub/80 underline decoration-meadow-sub/35 underline-offset-4 transition hover:text-meadow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive"
                >
                  View my forecast <ArrowDown className="ml-1" size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {hasForecast && (
        <section
          id="forecast"
          ref={forecastRef}
          aria-label="Your semester forecast"
          className={`scroll-mt-24 bg-meadow-ground px-4 pb-20 pt-6 text-[#eef1e6] sm:px-6 sm:pt-8 ${
            animateReveal && !reduceMotion ? "forecast-reveal" : ""
          }`}
        >
          <div className="mx-auto max-w-7xl space-y-5">
            <section
              aria-labelledby="semester-heading"
              className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-7"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 id="semester-heading" className="text-xl font-semibold tracking-[-0.03em]">
                    Your semester
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#a9b49c]">
                    Select a week to explore the forecast
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-[#c7cfba]">
                  {syllabi.length} {syllabi.length === 1 ? "course" : "courses"} · {TOTAL_WEEKS} weeks
                </span>
              </div>
              <div
                ref={stripRef}
                className="mt-5 flex gap-2 overflow-x-auto pb-2"
                role="group"
                aria-label="Choose a forecast week"
              >
                {forecast.map((week) => {
                  const weekMeta = weatherMeta(week.weather);
                  const active = week.week === selectedWeek;
                  return (
                    <button
                      key={week.week}
                      data-week={week.week}
                      onClick={() => setSelectedWeek(week.week)}
                      onKeyDown={(event) => handleWeekKeyDown(event, week.week)}
                      aria-pressed={active}
                      aria-label={`Week ${week.week}: ${weekMeta.label}, ${week.due.length} ${
                        week.due.length === 1 ? "thing" : "things"
                      } due${week.week === profile.currentWeek ? ", this week" : ""}${
                        clubEventCounts[week.week]
                          ? `, ${clubEventCounts[week.week]} club event${clubEventCounts[week.week] === 1 ? "" : "s"}`
                          : ""
                      }`}
                      className={`relative flex min-h-[118px] w-[100px] shrink-0 flex-col items-center justify-center gap-1 rounded-[22px] border px-2 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eef1e6] ${
                        active
                          ? "border-[#eef1e6] bg-[#eef1e6] text-meadow-ink shadow-[0_16px_36px_-20px_rgba(0,0,0,0.8)]"
                          : "border-white/10 bg-white/[0.035] text-[#eef1e6] hover:border-white/25 hover:bg-white/[0.07]"
                      }`}
                    >
                      {week.week === profile.currentWeek && (
                        <span className="absolute right-2 top-2 rounded-full bg-[#b8862e]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#e2bd77]">
                          This week
                        </span>
                      )}
                      <WeatherIcon weather={week.weather} size="sm" stacked />
                      <span className="text-[10px] font-extrabold">
                        {week.due.length} {week.due.length === 1 ? "thing" : "things"} due
                      </span>
                      {clubEventCounts[week.week] > 0 && (
                        <span className="sr-only">
                          {clubEventCounts[week.week]} club events
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid items-start gap-5">
              <article
                key={selected.week}
                className="relative isolate overflow-hidden rounded-[28px] border border-meadow-ink/10 bg-[#fbfbf6]/95 p-5 text-meadow-ink shadow-[0_24px_70px_-35px_rgba(0,0,0,0.55)] sm:p-7"
                aria-label={`Week ${selected.week} details`}
              >
                <WeatherFX weather={selected.weather} className="z-0 opacity-35" />
                <div className="relative z-10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <WeatherIcon weather={selected.weather} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-meadow-ink/[0.06] px-3 py-1.5 text-xs font-extrabold">
                        Week {selected.week} of {TOTAL_WEEKS}
                      </span>
                      {selected.week === profile.currentWeek && (
                        <span className="rounded-full bg-[#b8862e]/15 px-3 py-1.5 text-xs font-extrabold text-[#7d5a1b]">
                          This week
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.045em]">
                    Week {selected.week}: {meta.headline}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-meadow-sub">
                    {WEATHER_COPY[selected.weather]}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-extrabold">
                        Feels like: {selected.stress}% stressed
                      </span>
                      <span className="text-xs font-semibold text-meadow-sub">
                        {selected.due.length}{" "}
                        {selected.due.length === 1 ? "thing due" : "things due"}
                      </span>
                    </div>
                    <StressBar value={selected.stress} weather={selected.weather} />
                  </div>

                  <div className="mt-5 border-t border-meadow-ink/10 pt-4">
                    <h3 className="text-xs font-extrabold text-meadow-sub">What&apos;s due</h3>
                    {selected.due.length ? (
                      <ul className="mt-2 divide-y divide-meadow-ink/[0.07]">
                        {selected.due.map((item, index) => (
                          <li
                            key={`${item.course}-${item.title}-${index}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                          >
                            <p className="min-w-0 flex-1 text-sm font-extrabold leading-snug">
                              {item.course}{" "}
                              <span className="font-semibold">· {item.title}</span>
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold capitalize ${
                                TYPE_TONES[item.type] || TYPE_TONES.lab
                              }`}
                            >
                              {item.type}
                            </span>
                            <span className="text-xs font-bold text-meadow-sub">
                              {item.day} · {item.time || "Time TBA"} · {item.weight}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#3d6237]">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Nothing due this week. Take the win.
                      </p>
                    )}
                  </div>

                  {selected.study.length > 0 && (
                    <div className="mt-5 border-t border-meadow-ink/10 pt-4">
                      <h3 className="text-xs font-extrabold text-meadow-sub">
                        Study plan · {selected.studyHours}h
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {[...selected.study]
                          .sort((a, b) => dayRank(a.day) - dayRank(b.day))
                          .map((item) => (
                            <li key={item.id} className="text-sm font-semibold text-meadow-ink">
                              {item.day} · {item.course} · {item.hours}h
                              {item.by === "stormy" && (
                                <span className="ml-2 rounded-full bg-[#4d7a45]/12 px-2 py-0.5 text-[10px] font-extrabold text-[#3d6237]">
                                  Stormy
                                </span>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <ClubPlans events={selectedClubEvents} />

                  <div className="mt-5 border-t border-meadow-ink/10 pt-4">
                    <p className="mb-3 text-xs font-medium leading-relaxed text-meadow-sub">
                      {selected.due.length
                        ? "Stormy can turn this into a Mon–Thu checklist."
                        : "A calm week. Make a little room for yourself."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <MeadowButton onClick={() => setPlanOpen(true)} className="w-full sm:w-auto">
                        <Sparkles size={17} aria-hidden="true" />
                        Make my plan
                      </MeadowButton>
                      <button
                        type="button"
                        onClick={playForecastReport}
                        disabled={reportLoading}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-meadow-ink/20 bg-white/70 px-6 text-sm font-extrabold text-meadow-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-meadow-olive disabled:cursor-wait disabled:opacity-70"
                      >
                        <Radio size={17} aria-hidden="true" />
                        {reportLoading ? "Preparing Stormy's forecast..." : "Play Stormy's forecast"}
                      </button>
                    </div>
                    {forecastReport && (
                      <ForecastReportPlayer
                        report={forecastReport}
                        week={selected.week}
                        autoPlayToken={reportAutoplayToken}
                      />
                    )}
                  </div>
                </div>
              </article>

              <button
                type="button"
                onClick={scrollToDayByDay}
                className="mx-auto inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-6 text-sm font-extrabold text-[#eef1e6] transition hover:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eef1e6]"
              >
                See week {selected.week} day by day <ArrowDown size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {hasForecast && (
        <div ref={immersiveRef} className="immersive-day-section-wrap">
          <DailyForecastSection
            week={selected}
            clubEvents={selectedClubEvents}
            onBackToWeek={backToWeekOverview}
          />
        </div>
      )}

      <SyllabusModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={handleAdded}
      />
      {hasForecast && (
        <StormPlanPanel
          open={planOpen}
          onClose={() => setPlanOpen(false)}
          week={selected}
          savedPlan={plans[selected.week]}
          onSave={savePlan}
        />
      )}

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
