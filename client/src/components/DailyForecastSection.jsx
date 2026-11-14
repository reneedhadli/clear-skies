import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import WeatherIcon from "./WeatherIcon.jsx";
import { getDateForWeekDay, formatDate } from "../config/term.js";
import { dailyWeather, dateKey, normalizeDay, timeOrder } from "../lib/deadlines.js";
import { weatherMeta } from "../lib/weather.js";

const DAYS = [
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
  { short: "Sun", long: "Sunday" },
];

const STORMY_LINES = {
  sunny: "Clear skies today ☀️ Enjoy it.",
  cloudy: "A little busy, nothing you can't handle ⛅",
  storm: "Storm day ⛈️ Focus up, you've got this.",
  blizzard: "Big day ❄️ One thing at a time.",
  deepfreeze: "Exam day 🧊 Stay warm and breathe.",
};

const TYPE_TONES = {
  midterm: "bg-[#6b5bd6]/14 text-[#5946bf]",
  final: "bg-[#3d7fa8]/12 text-[#2f6f97]",
  quiz: "bg-[#b8862e]/14 text-[#7d5a1b]",
  assignment: "bg-[#4d7a45]/14 text-[#3d6237]",
  project: "bg-[#4d7a45]/14 text-[#3d6237]",
  lab: "bg-meadow-ink/[0.06] text-meadow-sub",
};

function localDateKey(date) {
  return dateKey(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
}

function clubDayMatches(eventDay, day) {
  return normalizeDay(eventDay) === day;
}

function ImmersiveBackground({ weather, animate }) {
  const [layers, setLayers] = useState({ current: weather, previous: null });
  const [lightning, setLightning] = useState(false);
  const timeoutRef = useRef(0);

  useEffect(() => {
    if (weather === layers.current) return undefined;
    setLayers({ current: weather, previous: layers.current });
    const timer = window.setTimeout(
      () => setLayers((value) => ({ ...value, previous: null })),
      720
    );
    return () => window.clearTimeout(timer);
  }, [weather, layers.current]);

  useEffect(() => {
    window.clearTimeout(timeoutRef.current);
    setLightning(false);
    if (!animate || weather !== "storm") return undefined;

    let active = true;
    const schedule = () => {
      timeoutRef.current = window.setTimeout(() => {
        if (!active) return;
        setLightning(true);
        window.setTimeout(() => setLightning(false), 140);
        schedule();
      }, 6000 + Math.random() * 4000);
    };
    schedule();
    return () => {
      active = false;
      window.clearTimeout(timeoutRef.current);
      setLightning(false);
    };
  }, [animate, weather]);

  function layer(weatherKey, current) {
    const count =
      weatherKey === "storm" ? 24 : weatherKey === "blizzard" ? 20 : weatherKey === "deepfreeze" ? 14 : 0;
    const particle = (index) => ({
      left: `${(index * 47 + 11) % 100}%`,
      delay: `${((index * 0.73) % 9).toFixed(2)}s`,
      duration: `${weatherKey === "storm" ? 1.15 + (index % 5) * 0.18 : 6 + (index % 5) * 0.9}s`,
      size: weatherKey === "storm" ? 2 : 3 + (index % 3) * 2,
    });

    return (
      <div
        key={weatherKey}
        className={`immersive-weather-layer immersive-weather-${weatherKey} ${
          current ? "is-current" : "is-leaving"
        }`}
        aria-hidden="true"
      >
        {(weatherKey === "sunny" || weatherKey === "cloudy") && (
          <div className="weather-clouds">
            <span className="weather-cloud cloud-one" />
            <span className="weather-cloud cloud-two" />
            <span className="weather-cloud cloud-three" />
          </div>
        )}
        {weatherKey === "sunny" && <span className="weather-sun" />}
        {weatherKey === "storm" && (
          <>
            <div className="weather-storm-clouds">
              <span className="storm-cloud storm-cloud-one" />
              <span className="storm-cloud storm-cloud-two" />
            </div>
            <span className={`weather-lightning ${lightning && current ? "is-flashing" : ""}`} />
          </>
        )}
        {(weatherKey === "storm" || weatherKey === "blizzard" || weatherKey === "deepfreeze") && (
          <div className={`weather-particles ${weatherKey === "storm" ? "rain-particles" : "snow-particles"}`}>
            {Array.from({ length: count }, (_, index) => {
              const style = particle(index);
              return (
                <span
                  key={index}
                  style={{
                    left: style.left,
                    animationDelay: style.delay,
                    animationDuration: style.duration,
                    width: weatherKey === "storm" ? style.size : undefined,
                    height: weatherKey === "storm" ? 20 + (index % 4) * 5 : undefined,
                    fontSize: weatherKey === "storm" ? undefined : style.size,
                  }}
                >
                  {weatherKey === "storm" ? "" : weatherKey === "deepfreeze" ? "✦" : "❄"}
                </span>
              );
            })}
          </div>
        )}
        {weatherKey === "blizzard" && <span className="weather-fog" />}
        {weatherKey === "deepfreeze" && <span className="weather-frost" />}
      </div>
    );
  }

  return (
    <div className={`immersive-weather-backdrop ${animate ? "effects-running" : ""}`}>
      {layers.previous && layer(layers.previous, false)}
      {layer(layers.current, true)}
    </div>
  );
}

const DailyForecastPanel = memo(function DailyForecastPanel({
  day,
  weekNumber,
  index,
  panelRef,
  onBackToWeek,
}) {
  return (
    <article
      ref={panelRef}
      data-day-index={index}
      data-day-weather={day.weather}
      className="immersive-day-panel"
      aria-labelledby={`immersive-day-${weekNumber}-${day.short}`}
    >
      <div className="immersive-day-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-meadow-sub">
              Week {weekNumber}, day by day · {day.meta.label}
            </p>
            <h2
              id={`immersive-day-${weekNumber}-${day.short}`}
              className="mt-2 text-4xl font-black tracking-tight text-meadow-ink sm:text-6xl"
            >
              {day.long}
            </h2>
            <p className="mt-1 text-lg font-semibold text-meadow-sub">
              {formatDate(day.date)}
            </p>
          </div>
          {day.isToday && (
            <span className="rounded-full bg-[#b8862e]/15 px-3 py-1.5 text-xs font-extrabold text-[#7d5a1b]">
              Today
            </span>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <WeatherIcon weather={day.weather} size="lg" />
          <p className="text-lg font-bold leading-relaxed text-meadow-ink">
            {STORMY_LINES[day.weather]}
          </p>
        </div>

        <div className="mt-7 border-t border-meadow-ink/10 pt-5">
          <h3 className="text-sm font-extrabold text-meadow-ink">What&apos;s due</h3>
          {day.due.length ? (
            <ul className="mt-3 space-y-2">
              {day.due.map((item, dueIndex) => (
                <li
                  key={`${item.course}-${item.title}-${dueIndex}`}
                  className="rounded-2xl bg-white/70 px-4 py-3"
                >
                  <p className="text-sm font-extrabold text-meadow-ink">
                    {item.course} <span className="font-semibold">· {item.title}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-meadow-sub">
                    <span>{item.time || "Time TBA"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.weight}%</span>
                    <span
                      className={`rounded-full px-2 py-0.5 capitalize ${
                        TYPE_TONES[item.type] || TYPE_TONES.lab
                      }`}
                    >
                      {item.type}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#315637]">
              <CheckCircle2 size={16} aria-hidden="true" />
              Nothing due. Clear skies ☀️
            </p>
          )}
        </div>

        {day.study?.length > 0 && (
          <div className="mt-5 rounded-2xl border border-meadow-ink/10 bg-white/55 px-4 py-3">
            <h3 className="text-xs font-extrabold text-meadow-ink">Study time · {day.studyHours}h</h3>
            <ul className="mt-2 space-y-1.5">
              {day.study.map((item) => (
                <li key={item.id} className="text-sm font-semibold text-meadow-ink">
                  {item.course} · {item.hours}h
                  {item.title ? <span className="font-medium text-meadow-sub"> · {item.title}</span> : null}
                  {item.by === "stormy" && (
                    <span className="ml-2 text-[10px] font-extrabold uppercase text-[#3d6237]">Stormy</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {day.events.length > 0 && (
          <div className="mt-5 rounded-2xl border border-[#4d7a45]/15 bg-[#4d7a45]/[0.07] px-4 py-3">
            <h3 className="text-xs font-extrabold text-[#315637]">Club plans</h3>
            <ul className="mt-2 space-y-1.5">
              {day.events.map((event) => (
                <li key={event.clubId} className="text-sm font-semibold text-[#344f2e]">
                  <span aria-hidden="true">{event.club.emoji} </span>
                  {event.club.name} · {event.title}
                  {event.time ? ` · ${event.time}` : ""}
                  {event.isDemoEvent && (
                    <span className="ml-1 text-[10px] font-bold uppercase">Demo</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {index === DAYS.length - 1 && (
          <button
            type="button"
            onClick={onBackToWeek}
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-meadow-ink/20 bg-white/75 px-5 text-sm font-extrabold text-meadow-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive"
          >
            <ArrowUp size={16} aria-hidden="true" />
            Back to week overview
          </button>
        )}
      </div>
    </article>
  );
});

function DailyForecastSection({ week, clubEvents, onBackToWeek }) {
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef(null);
  const dayRefs = useRef([]);
  const dayRefCallbacks = useMemo(
    () =>
      DAYS.map(
        (_, index) =>
          (element) => {
            dayRefs.current[index] = element;
          }
      ),
    []
  );
  const [activeDay, setActiveDay] = useState(0);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(
    () => document.visibilityState === "visible"
  );
  const todayKey = localDateKey(new Date());

  const dayForecasts = useMemo(
    () =>
      DAYS.map((day) => {
        const date = getDateForWeekDay(week.week, day.short);
        const due = week.due
          .filter((item) => item.day === day.short)
          .sort((a, b) => timeOrder(a.time) - timeOrder(b.time));
        const study = (week.study || []).filter((item) => item.day === day.short);
        const studyHours = study.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
        const weather = dailyWeather(due, studyHours);
        return {
          study,
          studyHours,
          ...day,
          date,
          dateKey: dateKey(date),
          due,
          weather,
          meta: weatherMeta(weather),
          isToday: dateKey(date) === todayKey,
          events: clubEvents.filter((event) => clubDayMatches(event.day, day.short)),
        };
      }),
    [week, clubEvents, todayKey]
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible && mostVisible.intersectionRatio >= 0.45) {
          const index = Number(mostVisible.target.dataset.dayIndex);
          if (Number.isInteger(index)) setActiveDay(index);
        }
      },
      { root, threshold: [0.25, 0.45, 0.6, 0.8] }
    );
    dayRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [week.week]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    setActiveDay(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [week.week]);

  const animate = sectionVisible && documentVisible && !reducedMotion;
  const activeWeather = dayForecasts[activeDay]?.weather || "sunny";

  function goToDay(index) {
    dayRefs.current[index]?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <section
      ref={scrollRef}
      className="immersive-day-scroll"
      aria-label={`Week ${week.week}, day by day`}
      tabIndex={0}
    >
      <div className="immersive-weather-sticky" aria-hidden="true">
        <ImmersiveBackground weather={activeWeather} animate={animate} />
      </div>

      <nav className="immersive-day-nav" aria-label="Jump to a day">
        {dayForecasts.map((day, index) => (
          <button
            key={day.short}
            type="button"
            onClick={() => goToDay(index)}
            aria-label={`${day.long}, ${day.meta.label}`}
            aria-current={index === activeDay ? "step" : undefined}
            className={`immersive-day-nav-button ${
              index === activeDay ? "is-active" : ""
            }`}
          >
            <span className="text-[10px] font-extrabold">{day.short}</span>
            <span className="text-sm" aria-hidden="true">{day.meta.emoji}</span>
          </button>
        ))}
      </nav>

      {dayForecasts.map((day, index) => (
        <DailyForecastPanel
          key={`${week.week}-${day.short}`}
          day={day}
          weekNumber={week.week}
          index={index}
          panelRef={dayRefCallbacks[index]}
          onBackToWeek={onBackToWeek}
        />
      ))}
    </section>
  );
}

export default memo(DailyForecastSection);
