import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  CloudSun,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import MeadowLandscape from "../components/MeadowLandscape.jsx";
import SyllabusModal from "../components/SyllabusModal.jsx";
import StormPlanPanel from "../components/StormPlanPanel.jsx";
import { useApp } from "../context/AppContext.jsx";
import { buildForecast } from "../lib/forecast.js";
import { clubEventsForForecast } from "../lib/clubs.js";
import { clubs } from "../data/clubs.js";
import { weatherMeta } from "../lib/weather.js";

const TYPE_TONES = {
  midterm: "storm",
  final: "blue",
  quiz: "amber",
  assignment: "sage",
  project: "sage",
  lab: "default",
};

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

const CHIP_TONES = {
  default: "bg-meadow-ink/[0.06] text-meadow-sub",
  olive: "bg-meadow-olive/10 text-meadow-olive",
  amber: "bg-[#b8862e]/14 text-[#7d5a1b]",
  sage: "bg-[#4d7a45]/14 text-[#3d6237]",
  storm: "bg-[#6b5bd6]/14 text-[#5946bf]",
  blue: "bg-[#3d7fa8]/12 text-[#2f6f97]",
};

const FOOTER_LINKS = [
  {
    title: "Forecast",
    links: [
      { label: "This week", to: "/" },
      { label: "Degree Map", to: "/degree" },
      { label: "Stormy", to: "/stormy" },
    ],
  },
  {
    title: "Clubs",
    links: [
      { label: "Club Match", to: "/clubs" },
      { label: "My clubs", to: "/clubs#my-clubs" },
    ],
  },
  {
    title: "The demo",
    links: [
      { label: "No account needed" },
      { label: "Works offline" },
      { label: "Built for HackED Beta" },
    ],
  },
];

function SunMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="6.2" />
      <path d="M16 2.4v4.6M16 25v4.6M2.4 16H7M25 16h4.6M6.4 6.4l3.2 3.2M22.4 22.4l3.2 3.2M25.6 6.4l-3.2 3.2M9.6 22.4l-3.2 3.2" />
      <circle cx="16" cy="16" r="1.8" />
    </svg>
  );
}

function MeadowButton({ variant = "solid", className = "", children, ...props }) {
  const styles =
    variant === "outline"
      ? "border border-meadow-ink/20 bg-white/45 text-meadow-ink hover:border-meadow-ink/35 hover:bg-white/70"
      : "bg-meadow-ground text-[#f4f4ef] shadow-[0_14px_34px_-18px_rgba(17,20,13,0.85)] hover:bg-[#34431f]";
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold tracking-tight transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function MeadowChip({ tone = "default", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${CHIP_TONES[tone] || CHIP_TONES.default} ${className}`}
    >
      {children}
    </span>
  );
}

function StressBar({ value, weather, label }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-meadow-ink/10"
      role="progressbar"
      aria-label={label}
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
    <section className="mt-4 rounded-2xl border border-[#4d7a45]/15 bg-[#4d7a45]/[0.06] px-4 py-3">
      <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#3d6237]">
        Club plans
      </h3>
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

export default function Forecast() {
  const { profile, syllabi, deadlines, plans, likedClubIds, actions } = useApp();
  const forecast = useMemo(() => buildForecast(deadlines), [deadlines]);
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
  const [notice, setNotice] = useState("");
  const stripRef = useRef(null);

  const selected = forecast.find((week) => week.week === selectedWeek) || forecast[0];
  const selectedClubEvents = clubEvents.filter((event) => event.week === selected.week);
  const meta = weatherMeta(selected.weather);
  const hasDeadlines = deadlines.length > 0;
  const hasClubEvents = clubEvents.length > 0;

  useEffect(() => {
    document.title = `${profile.year} · ${profile.program} — Clear Skies`;
    return () => {
      document.title = "Clear Skies";
    };
  }, [profile.year, profile.program]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const active = stripRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  function selectWeek(week) {
    setSelectedWeek(week);
    setPlanOpen(false);
  }

  function handleAdded(added) {
    setSelectedWeek(profile.currentWeek);
    setNotice(
      `Added ${added.length} deadlines. Week ${profile.currentWeek} just got clearer.`
    );
  }

  function savePlan(plan) {
    actions.savePlan(selected.week, plan);
    setNotice(`Plan saved for week ${selected.week}. One small step at a time.`);
  }

  return (
    <div className="meadow-home font-meadow text-meadow-ink">
      <section className="relative isolate overflow-hidden">
        <MeadowLandscape seed={21} />
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-77px)] w-full max-w-7xl flex-col px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:pt-14">
          <header className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,30rem)] lg:items-start lg:gap-16">
            <div className="max-w-2xl">
              <p
                className="inline-flex animate-meadow-rise items-center gap-2 rounded-full border border-meadow-ink/10 bg-white/35 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.12em] text-meadow-sub backdrop-blur-md"
                style={{ animationDelay: "40ms" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-meadow-olive" aria-hidden="true" />
                {profile.year} · {profile.program}
              </p>

              <h1
                className="mt-5 animate-meadow-rise text-[clamp(3.7rem,8.5vw,7.4rem)] font-semibold leading-[0.86] tracking-[-0.06em] text-meadow-ink"
                style={{ animationDelay: "110ms" }}
              >
                Hey{" "}
                <span className="font-meadow-serif font-normal italic tracking-[-0.035em]">
                  {profile.name}
                </span>{" "}
                <span className="text-[0.62em] align-[0.12em]" aria-hidden="true">
                  👋
                </span>
              </h1>

              <p
                className="mt-6 max-w-lg animate-meadow-rise text-base font-medium leading-relaxed text-meadow-sub sm:text-lg"
                style={{ animationDelay: "180ms" }}
              >
                Week {profile.currentWeek} of {profile.term}.
                {hasDeadlines
                  ? ` Tracking ${syllabi.length} ${
                      syllabi.length === 1 ? "course" : "courses"
                    } and ${deadlines.length} deadlines.`
                  : " Let's get your semester on the radar."}
              </p>

              <div
                className="mt-7 flex animate-meadow-rise flex-wrap items-center gap-3"
                style={{ animationDelay: "250ms" }}
              >
                <MeadowButton onClick={() => setModalOpen(true)}>
                  <Plus size={18} aria-hidden="true" />
                  Add syllabus
                </MeadowButton>
                <span className="text-xs font-bold tracking-wide text-meadow-sub/75">
                  No account needed
                </span>
              </div>
            </div>

            <div
              className="animate-meadow-rise lg:pt-2"
              style={{ animationDelay: "160ms" }}
            >
              {!hasDeadlines ? (
                <div className="relative overflow-hidden rounded-[32px] border border-meadow-ink/10 bg-[#fbfbf6]/80 p-6 shadow-[0_30px_90px_-36px_rgba(17,20,13,0.65)] backdrop-blur-xl sm:p-8">
                  <div
                    className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#fffbef] blur-2xl"
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-4">
                      <MeadowChip tone="olive">Your forecast is waiting</MeadowChip>
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-meadow-olive/10 text-meadow-olive">
                        <CloudSun size={25} strokeWidth={1.6} aria-hidden="true" />
                      </span>
                    </div>

                    <h2 className="mt-6 text-3xl font-semibold leading-[1.02] tracking-[-0.04em] text-meadow-ink sm:text-[2.1rem]">
                      No syllabus, no weather yet
                    </h2>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-meadow-sub sm:text-base">
                      Stormy says: “Add your first syllabus to see your forecast ☁️”
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2.5">
                      <MeadowButton onClick={() => setModalOpen(true)}>
                        <Plus size={17} aria-hidden="true" />
                        Add syllabus
                      </MeadowButton>
                      <MeadowButton variant="outline" onClick={actions.loadDemo}>
                        <Sparkles size={17} className="text-[#a97722]" aria-hidden="true" />
                        Load demo student
                      </MeadowButton>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold leading-relaxed text-meadow-sub/70">
                      No AI key? The full demo still works with offline fallbacks.
                    </p>
                    <ClubPlans events={selectedClubEvents} />
                  </div>
                </div>
              ) : (
                <article
                  key={selected.week}
                  className="relative overflow-hidden rounded-[32px] border border-meadow-ink/10 bg-[#fbfbf6]/85 p-5 shadow-[0_30px_90px_-36px_rgba(17,20,13,0.65)] backdrop-blur-xl sm:p-7"
                  aria-label={`Week ${selected.week} forecast`}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#a97722] via-[#8fa16b] to-[#4d5d2c]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-meadow-ink/[0.055] text-2xl">
                        {meta.emoji}
                      </span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-meadow-sub/70">
                          Feels like
                        </p>
                        <p className="text-sm font-extrabold text-meadow-ink">{meta.label}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MeadowChip>Week {selected.week} of 15</MeadowChip>
                      {selected.week === profile.currentWeek && (
                        <MeadowChip tone="amber">This week</MeadowChip>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold leading-[1] tracking-[-0.045em] text-meadow-ink">
                    {meta.headline}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-meadow-sub">
                    {WEATHER_COPY[selected.weather]}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-extrabold text-meadow-ink">
                        {selected.stress}%{" "}
                        <span className="font-semibold text-meadow-sub">stressed</span>
                      </span>
                      <span className="text-xs font-semibold text-meadow-sub">
                        {selected.due.length}{" "}
                        {selected.due.length === 1 ? "thing due" : "things due"}
                      </span>
                    </div>
                    <StressBar
                      value={selected.stress}
                      weather={selected.weather}
                      label={`Stress for week ${selected.week}: ${selected.stress}%`}
                    />
                  </div>

                  <div className="mt-5 border-t border-meadow-ink/10 pt-4">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-meadow-sub/70">
                      On the radar
                    </h3>
                    {selected.due.length ? (
                      <ul className="mt-1 divide-y divide-meadow-ink/[0.07]">
                        {selected.due.slice(0, 4).map((item, index) => {
                          const itemWeather =
                            item.type === "midterm" || item.type === "final"
                              ? "storm"
                              : item.weight >= 10
                                ? "blizzard"
                                : "cloudy";
                          return (
                            <li
                              key={`${item.course}-${item.title}-${index}`}
                              className="flex items-center gap-3 py-2.5"
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: STRESS_COLORS[itemWeather] }}
                                aria-hidden="true"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-meadow-ink">
                                  {item.course}{" "}
                                  <span className="font-semibold text-meadow-sub">
                                    · {item.title}
                                  </span>
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <MeadowChip tone={TYPE_TONES[item.type] || "default"}>
                                  {item.type}
                                </MeadowChip>
                                <span className="w-14 text-right text-[11px] font-bold text-meadow-sub">
                                  {item.day} · {item.weight}%
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#3d6237]">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Nothing due. Genuinely. Take the win.
                      </p>
                    )}
                    {selected.due.length > 4 && (
                      <p className="mt-1 text-[11px] font-semibold text-meadow-sub/75">
                        + {selected.due.length - 4} more this week
                      </p>
                    )}
                  </div>

                  <ClubPlans events={selectedClubEvents} />

                  <div className="mt-5 flex flex-col gap-3 border-t border-meadow-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium leading-relaxed text-meadow-sub">
                      {selected.due.length
                        ? "Stormy can turn this into a Mon–Thu checklist."
                        : "A calm week. Make a little room for yourself."}
                    </p>
                    {selected.due.length ? (
                      <MeadowButton onClick={() => setPlanOpen(true)} className="shrink-0">
                        <Sparkles size={17} aria-hidden="true" />
                        Make my plan
                      </MeadowButton>
                    ) : (
                      <MeadowChip tone="sage" className="shrink-0">
                        <CheckCircle2 size={13} aria-hidden="true" />
                        Nothing to plan
                      </MeadowChip>
                    )}
                  </div>
                </article>
              )}
            </div>
          </header>

          <div className="mt-auto flex items-end justify-between gap-4 pt-14 text-[10px] font-bold uppercase tracking-[0.2em] text-[#eef1e6]/70">
            <span className="flex items-center gap-2">
              <ArrowDown size={14} aria-hidden="true" />
              {hasDeadlines ? "Scroll for your semester" : "Your forecast is waiting"}
            </span>
            <span className="hidden sm:inline">
              {profile.term} · Week {profile.currentWeek}
            </span>
          </div>
        </div>
      </section>

      {(hasDeadlines || hasClubEvents) && (
        <section
          className="relative bg-meadow-ground px-4 pb-16 pt-4 text-[#eef1e6] sm:px-6"
          aria-label={hasDeadlines ? "Your semester" : "Club plans by week"}
        >
          <div className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em]">
                  {hasDeadlines ? "Your semester" : "Club plans"}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#a9b49c]">
                  Tap a week to preview it
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-[#c7cfba]">
                15 weeks · {profile.term}
              </span>
            </div>

            <div
              ref={stripRef}
              className="mt-5 flex gap-2 overflow-x-auto pb-2"
              role="group"
              aria-label="Choose a week"
            >
              {forecast.map((week) => {
                const weekMeta = weatherMeta(week.weather);
                const active = week.week === selectedWeek;
                return (
                  <button
                    key={week.week}
                    data-active={active}
                    onClick={() => selectWeek(week.week)}
                    aria-pressed={active}
                    aria-label={`Week ${week.week}: ${weekMeta.label}, ${week.stress}% stress${
                      week.week === profile.currentWeek ? ", current week" : ""
                    }${clubEventCounts[week.week] ? `, ${clubEventCounts[week.week]} club event${clubEventCounts[week.week] === 1 ? "" : "s"}` : ""}`}
                    className={`relative flex min-h-[92px] w-[88px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[22px] border px-2 py-3 transition ${
                      active
                        ? "border-[#eef1e6] bg-[#eef1e6] text-meadow-ink shadow-[0_16px_36px_-20px_rgba(0,0,0,0.8)]"
                        : "border-white/10 bg-white/[0.035] text-[#eef1e6] hover:border-white/25 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {weekMeta.emoji}
                    </span>
                    <span className="text-xs font-extrabold">Wk {week.week}</span>
                    <span
                      className={`text-[10px] font-bold ${
                        active ? "text-[#67705f]" : "text-[#a9b49c]"
                      }`}
                    >
                      {weekMeta.label}
                    </span>
                    {week.week === profile.currentWeek && (
                      <span
                        className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#b8862e]"
                        aria-hidden="true"
                      />
                    )}
                    {clubEventCounts[week.week] > 0 && (
                      <span className="absolute bottom-1.5 right-2 text-[10px]" aria-hidden="true">
                        💚
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="bg-meadow-ground px-4 pb-28 text-[#eef1e6] sm:px-6 md:pb-10">
        <div className="mx-auto max-w-7xl border-t border-white/10 pt-10">
          <div className="grid gap-10 md:grid-cols-[1.15fr_2fr] md:gap-16">
            <div>
              <Link to="/" className="inline-flex items-center gap-3" aria-label="Clear Skies home">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-[#eef1e6]">
                  <SunMark className="h-6 w-6" />
                </span>
                <span className="text-xl font-semibold tracking-[-0.035em]">Clear Skies</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-[#a9b49c]">
                A calmer semester starts with seeing what&apos;s ahead.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {FOOTER_LINKS.map((column) => (
                <div key={column.title}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f9b84]">
                    {column.title}
                  </h3>
                  <ul className="mt-4 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        {link.to ? (
                          <Link
                            to={link.to}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#d8ddcf] transition hover:text-white"
                          >
                            {link.label}
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-[#8f9b84]">
                            {link.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-[11px] font-semibold text-[#8f9b84] sm:flex-row sm:items-center sm:justify-between">
            <span>Built for HackED Beta. Your data stays in your browser.</span>
            <span>
              © {new Date().getFullYear()} Clear Skies · University of Alberta
            </span>
          </div>
        </div>
      </footer>

      <SyllabusModal open={modalOpen} onClose={() => setModalOpen(false)} onAdded={handleAdded} />
      {hasDeadlines && (
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
