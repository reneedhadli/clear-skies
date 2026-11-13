import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { CalendarDays, Clock, Heart, RotateCcw, Sparkles, X } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { clubs } from "../data/clubs.js";
import { buildForecast } from "../lib/forecast.js";
import {
  clubEventsForForecast,
  computeMatch,
  nextEventWeather,
} from "../lib/clubs.js";
import { weatherMeta } from "../lib/weather.js";

function scrollToMyClubs() {
  document.getElementById("my-clubs")?.scrollIntoView({ behavior: "smooth" });
}

function shortDay(day) {
  return day ? day.slice(0, 3) : "";
}

function SwipeCard({ club, bio, why, eventWeather, reduce, exitDirection, onSwipe }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-9, 0, 9]);
  const likeOpacity = useTransform(x, [30, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0]);
  const meta = weatherMeta(eventWeather);

  return (
    <motion.article
      drag={reduce ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      dragSnapToOrigin
      onDragEnd={(_event, info) => {
        if (info.offset.x > 120) onSwipe(1);
        else if (info.offset.x < -120) onSwipe(-1);
      }}
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      custom={exitDirection}
      variants={{
        exit: (direction) => ({
          x: direction > 0 ? 620 : -620,
          opacity: 0,
          transition: { duration: reduce ? 0 : 0.28, ease: "easeIn" },
        }),
      }}
      exit="exit"
      style={{ rotate }}
      className="absolute inset-0 z-10 flex cursor-grab touch-pan-y flex-col overflow-hidden rounded-[28px] border border-meadow-ink/10 bg-[#fbfbf6] text-meadow-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)] active:cursor-grabbing"
      aria-label={`${club.name}, ${club.match}% match. Drag, or use the left and right arrow keys.`}
    >
      <motion.span
        aria-hidden="true"
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute left-5 top-5 z-20 -rotate-6 rounded-xl border-[3px] border-[#3d6b43] bg-[#fbfbf6]/90 px-3 py-1 text-2xl font-black text-[#3d6b43]"
      >
        LIKE
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute right-5 top-5 z-20 rotate-6 rounded-xl border-[3px] border-red-700 bg-[#fbfbf6]/90 px-3 py-1 text-2xl font-black text-red-700"
      >
        SKIP
      </motion.span>

      <div
        className="relative flex h-[126px] shrink-0 items-center justify-center"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${club.color}70 0%, ${club.color}26 52%, #fbfbf6 100%)`,
        }}
      >
        <span className="text-[68px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.2)]" aria-hidden="true">
          {club.emoji}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-[#11140d]/80 px-3 py-1.5 text-sm font-black text-white">
          {club.match}% match
        </span>
        <span className="absolute left-4 top-4 rounded-full bg-[#fbfbf6]/85 px-3 py-1 text-[11px] font-extrabold capitalize text-meadow-ink">
          {club.category}
        </span>
        {club.wildcard && (
          <span className="absolute bottom-3 right-4 rounded-full bg-[#fbfbf6]/90 px-2.5 py-1 text-[10px] font-extrabold text-[#7d5a1b]">
            Wildcard ✨
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black leading-tight tracking-tight sm:text-2xl">
            {club.name}
          </h2>
          <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-bold text-meadow-sub">
            <Clock size={14} aria-hidden="true" />
            {club.hoursPerWeek == null ? "Hours vary" : `${club.hoursPerWeek} hrs/wk`}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-meadow-sub">{bio}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {club.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-meadow-ink/[0.06] px-2.5 py-1 text-[11px] font-bold text-meadow-sub"
            >
              #{tag}
            </span>
          ))}
        </div>

        <p className="mt-2 line-clamp-2 rounded-xl bg-[#4d7a45]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#344f2e]">
          {why}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-bold text-meadow-sub">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" />
            {club.meetingDay ? `Meets ${club.meetingDay}s` : "Meeting day varies"}
          </span>
          {club.nextEvent && (
            <span className="flex items-center gap-1.5">
              <span>{club.nextEvent.title}</span>
              <span aria-hidden="true">·</span>
              <span>Week {club.nextEvent.week}</span>
              <span aria-hidden="true">{meta.emoji}</span>
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function MyClubs({
  ranked,
  forecast,
  profile,
  likedClubIds,
  clubMatches,
  clubCopies,
  onRemove,
}) {
  const saved = useMemo(() => {
    const rankedById = new Map(ranked.map((club) => [club.id, club]));
    const events = clubEventsForForecast(likedClubIds, clubs, forecast, profile.currentWeek);
    const eventsByClub = new Map(events.map((event) => [event.clubId, event]));

    return [...likedClubIds].reverse().flatMap((id) => {
      const club = clubs.find((item) => item.id === id);
      if (!club) return [];
      const computed = rankedById.get(id) || computeMatch(club, {}, forecast);
      const match = clubMatches[id] || {};
      return [{
        club,
        match: match.match ?? computed.match ?? computed.score,
        why: match.why || clubCopies[id]?.why || computed.why,
        event: eventsByClub.get(id),
      }];
    });
  }, [ranked, forecast, profile.currentWeek, likedClubIds, clubMatches, clubCopies]);

  return (
    <section id="my-clubs" className="scroll-mt-28 border-t border-meadow-ink/10 pt-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black tracking-tight">My clubs 💚</h2>
        <p className="mt-1 text-sm font-medium text-meadow-sub">
          Clubs you liked. Their events show up on your forecast.
        </p>
      </div>

      {saved.length === 0 ? (
        <p className="rounded-2xl border border-meadow-ink/10 bg-white/55 px-4 py-5 text-sm font-semibold text-meadow-sub">
          Swipe right on a club to save it here ✨
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {saved.map(({ club, match, why, event }) => {
            const visitUrl =
              club.website ||
              (club.instagram
                ? `https://www.instagram.com/${club.instagram.replace(/^@/, "")}/`
                : null);
            const eventWeather = event && weatherMeta(event.weather);
            const eventSummary = event
              ? `${event.title}, ${shortDay(event.day)}${event.time ? ` ${event.time}` : ""}, Week ${event.week} ${eventWeather.emoji} ${eventWeather.label}`
              : null;

            return (
              <article
                key={club.id}
                className="rounded-2xl border border-meadow-ink/10 bg-white/65 p-4 shadow-[0_12px_30px_-24px_rgba(17,20,13,0.45)]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">{club.emoji}</span>
                  <h3 className="min-w-0 flex-1 text-base font-extrabold leading-snug text-meadow-ink">
                    {club.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#4d7a45]/12 px-2.5 py-1 text-xs font-extrabold text-[#3d6237]">
                    {match}% match
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-meadow-sub">
                  {why}
                </p>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-meadow-sub">
                  {eventSummary ? (
                    <>
                      {club.nextEvent ? "" : `Meets ${club.meetingDay}s · `}
                      {eventSummary}
                      {event.isDemoEvent && (
                        <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-meadow-sub/70">
                          Demo event
                        </span>
                      )}
                    </>
                  ) : club.meetingDay ? (
                    `Meets ${club.meetingDay}s`
                  ) : (
                    "No upcoming event listed"
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visitUrl && (
                    <a
                      href={visitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center rounded-full bg-[#3d6b43] px-4 text-xs font-extrabold text-white transition hover:bg-[#315637] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6b43]"
                    >
                      Visit club
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(club.id)}
                    className="inline-flex min-h-9 items-center rounded-full border border-meadow-ink/15 bg-white/60 px-4 text-xs font-extrabold text-meadow-ink transition hover:bg-meadow-ink/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive"
                    aria-label={`Remove ${club.name} from My clubs`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ClubSwipe({ onRetake, onShowMore, onSeeMyClubs }) {
  const {
    profile,
    deadlines,
    clubShortlist,
    shortlistSeenIds,
    likedClubIds,
    clubMatches,
    clubCopies,
    actions,
  } = useApp();
  const forecast = useMemo(() => buildForecast(deadlines), [deadlines]);
  const defaultEventWeather = nextEventWeather(forecast, profile.currentWeek);
  const [skipped, setSkipped] = useState([]);
  const [exitDirection, setExitDirection] = useState(1);
  const swipeLockRef = useRef(false);
  const reduce = useReducedMotion();

  const ranked = clubShortlist;
  const deck = useMemo(
    () =>
      ranked.filter(
        (club) =>
          !likedClubIds.includes(club.id) &&
          !shortlistSeenIds.includes(club.id) &&
          !skipped.includes(club.id)
      ),
    [ranked, likedClubIds, shortlistSeenIds, skipped]
  );
  const top = deck[0];
  const next = deck[1];

  useEffect(() => {
    swipeLockRef.current = false;
  }, [top?.id]);

  function finishSwipe(club, direction) {
    if (!club || swipeLockRef.current) return;
    swipeLockRef.current = true;
    setExitDirection(direction);
    if (direction > 0) {
      actions.likeClub(club.id, club.match, { bio: club.bio, why: club.why });
      actions.markClubSeen(club.id);
    } else {
      setSkipped((current) => [...current, club.id]);
      actions.markClubSeen(club.id);
    }
  }

  function removeClub(id) {
    actions.removeMatch(id);
    actions.markClubSeen(id);
    setSkipped((current) => (current.includes(id) ? current : [...current, id]));
  }

  useEffect(() => {
    if (!top) return;
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        finishSwipe(top, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        finishSwipe(top, 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [top, clubCopies]);

  const topBio = top ? top.bio || top.description : "";
  const topWhy = top ? top.why || "A good fit for your interests and schedule." : "";
  const eventWeek = top?.nextEvent?.week;
  const cardWeather =
    forecast.find((week) => week.week === eventWeek)?.weather || defaultEventWeather;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-meadow-sub">Club Match</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Find your people 💚
          </h1>
          <p className="mt-1 text-sm font-medium text-meadow-sub">
            Based on your vibe, courses, and sunny weeks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={scrollToMyClubs}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#3d6b43] px-4 text-sm font-extrabold text-white transition hover:bg-[#315637] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6b43]"
          >
            <Heart size={16} aria-hidden="true" />
            My clubs (
            <motion.span
              key={likedClubIds.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              {likedClubIds.length}
            </motion.span>
            )
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold text-meadow-sub transition hover:bg-meadow-ink/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Retake quiz
          </button>
        </div>
      </div>

      <div className="mx-auto mb-6 max-w-lg">
        <div className="relative h-[410px]">
          {next && (
            <div
              aria-hidden="true"
              className="absolute inset-x-3 top-3 bottom-0 rotate-[2deg] overflow-hidden rounded-[28px] border border-meadow-ink/10 bg-white/65"
            />
          )}
          <AnimatePresence initial={false} custom={exitDirection}>
            {top && (
              <SwipeCard
                key={top.id}
                club={top}
                bio={topBio}
                why={topWhy}
                eventWeather={cardWeather}
                reduce={reduce}
                exitDirection={exitDirection}
                onSwipe={(direction) => finishSwipe(top, direction)}
              />
            )}
          </AnimatePresence>
          {!top && (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center rounded-[28px] border border-meadow-ink/10 bg-white/65 p-6 text-center shadow-[0_20px_60px_-36px_rgba(17,20,13,0.5)]">
              <h2 className="text-2xl font-black tracking-tight">That's your shortlist ✨</h2>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={onSeeMyClubs || scrollToMyClubs}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#3d6b43] px-5 text-sm font-extrabold text-white transition hover:bg-[#315637] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6b43]"
                >
                  <Heart size={16} aria-hidden="true" />
                  See my clubs
                </button>
                <button
                  type="button"
                  onClick={onShowMore}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-meadow-ink/20 bg-white/70 px-5 text-sm font-extrabold text-meadow-ink transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  Show me more
                </button>
              </div>
            </div>
          )}
        </div>
        {top && (
          <>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => finishSwipe(top, -1)}
                className="inline-flex min-h-12 min-w-[132px] items-center justify-center gap-2 rounded-full border-2 border-[#9d3434] bg-white px-5 text-sm font-extrabold text-[#842b2b] shadow-sm transition hover:bg-[#fff1f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#842b2b]"
                aria-label={`Skip ${top.name}`}
              >
                <X size={18} aria-hidden="true" />
                Skip
              </button>
              <button
                type="button"
                onClick={() => finishSwipe(top, 1)}
                className="inline-flex min-h-14 min-w-[152px] items-center justify-center gap-2 rounded-full bg-[#3d6b43] px-6 text-base font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(17,20,13,0.7)] transition hover:bg-[#315637] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#254b2b]"
                aria-label={`Like ${top.name}`}
              >
                <Heart size={19} aria-hidden="true" />
                Like
              </button>
            </div>
            <p className="mx-auto mt-2 w-fit rounded-full border border-meadow-ink/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-meadow-sub">
              Drag the card, or use ← → keys to swipe.
            </p>
          </>
        )}
      </div>

      <MyClubs
        ranked={ranked}
        forecast={forecast}
        profile={profile}
        likedClubIds={likedClubIds}
        clubMatches={clubMatches}
        clubCopies={clubCopies}
        onRemove={removeClub}
      />
    </div>
  );
}
