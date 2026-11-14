import { memo } from "react";
import { CheckCircle2, Radio, Sparkles } from "lucide-react";
import ForecastReportPlayer from "./ForecastReportPlayer.jsx";
import WeatherFX from "./WeatherFX.jsx";
import WeatherIcon from "./WeatherIcon.jsx";
import { TOTAL_WEEKS } from "../config/term.js";
import { weatherMeta } from "../lib/weather.js";

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
        className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
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

export const ForecastWeekStrip = memo(function ForecastWeekStrip({
  forecast,
  selectedWeek,
  currentWeek,
  clubEventCounts,
  stripRef,
  onSelectWeek,
  onWeekKeyDown,
}) {
  return (
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
          {forecast[0]?.due.length >= 0 ? "" : ""}
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
              onClick={() => onSelectWeek(week.week)}
              onKeyDown={(event) => onWeekKeyDown(event, week.week)}
              aria-pressed={active}
              aria-label={`Week ${week.week}: ${weekMeta.label}, ${week.due.length} ${
                week.due.length === 1 ? "thing" : "things"
              } due${week.week === currentWeek ? ", this week" : ""}${
                clubEventCounts[week.week]
                  ? `, ${clubEventCounts[week.week]} club event${clubEventCounts[week.week] === 1 ? "" : "s"}`
                  : ""
              }`}
              className={`relative flex min-h-[118px] w-[100px] shrink-0 flex-col items-center justify-center gap-1 rounded-[22px] border px-2 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eef1e6] ${
                active
                  ? "border-[#eef1e6] bg-[#eef1e6] text-meadow-ink shadow-[0_8px_24px_-18px_rgba(0,0,0,0.65)]"
                  : "border-white/10 bg-white/[0.035] text-[#eef1e6] hover:border-white/25 hover:bg-white/[0.07]"
              }`}
            >
              {week.week === currentWeek && (
                <span className="absolute right-2 top-2 rounded-full bg-[#b8862e]/20 px-1.5 py-0.5 text-[8px] font-extrabold text-[#e2bd77]">
                  This week
                </span>
              )}
              <WeatherIcon weather={week.weather} size="sm" stacked />
              <span className="text-[10px] font-extrabold">
                {week.due.length} {week.due.length === 1 ? "thing" : "things"} due
              </span>
              {clubEventCounts[week.week] > 0 && (
                <span className="sr-only">{clubEventCounts[week.week]} club events</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});

export const ForecastWeekDetails = memo(function ForecastWeekDetails({
  selected,
  isCurrentWeek,
  selectedClubEvents,
  planOpen,
  onOpenPlan,
  onPlayReport,
  reportLoading,
  report,
  reportAutoplayToken,
}) {
  const meta = weatherMeta(selected.weather);
  return (
    <article
      className="relative isolate overflow-hidden rounded-[28px] border border-meadow-ink/10 bg-[#fbfbf6]/95 p-5 text-meadow-ink shadow-[0_12px_34px_-24px_rgba(0,0,0,0.55)] sm:p-7"
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
            {isCurrentWeek && (
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
            <span className="font-extrabold">Feels like: {selected.stress}% stressed</span>
            <span className="text-xs font-semibold text-meadow-sub">
              {selected.due.length} {selected.due.length === 1 ? "thing due" : "things due"}
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
                    {item.course} <span className="font-semibold">· {item.title}</span>
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

        <ClubPlans events={selectedClubEvents} />

        <div className="mt-5 border-t border-meadow-ink/10 pt-4">
          <p className="mb-3 text-xs font-medium leading-relaxed text-meadow-sub">
            {selected.due.length
              ? "Stormy can turn this into a Mon–Thu checklist."
              : "A calm week. Make a little room for yourself."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenPlan}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-meadow-ground px-7 text-base font-extrabold tracking-tight text-[#f4f4ef] shadow-[0_8px_24px_-18px_rgba(17,20,13,0.75)] transition hover:bg-[#34431f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-meadow-olive sm:w-auto"
            >
              <Sparkles size={17} aria-hidden="true" />
              Make my plan
            </button>
            <button
              type="button"
              onClick={onPlayReport}
              disabled={reportLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-meadow-ink/20 bg-white/70 px-6 text-sm font-extrabold text-meadow-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-meadow-olive disabled:cursor-wait disabled:opacity-70"
            >
              <Radio size={17} aria-hidden="true" />
              {reportLoading ? "Preparing Stormy's forecast..." : "Play Stormy's forecast"}
            </button>
          </div>
          {report && (
            <ForecastReportPlayer
              report={report}
              week={selected.week}
              autoPlayToken={reportAutoplayToken}
            />
          )}
        </div>
      </div>
    </article>
  );
});
