import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import ClubQuiz from "../components/ClubQuiz.jsx";
import ClubSwipe from "../components/ClubSwipe.jsx";
import { useApp } from "../context/AppContext.jsx";
import { clubs } from "../data/clubs.js";
import { localShortlist } from "../lib/clubShortlist.js";
import { buildForecast } from "../lib/forecast.js";
import { postJSON } from "../lib/api.js";

function initialStep(quizAnswers, clubShortlist) {
  if (clubShortlist.length) return "swipe";
  if (quizAnswers) return "loading";
  return "quiz";
}

export default function Clubs() {
  const {
    profile,
    deadlines,
    quizAnswers,
    clubShortlist,
    shortlistExcludedIds,
    likedClubIds,
    actions,
  } = useApp();
  const [step, setStep] = useState(() => initialStep(quizAnswers, clubShortlist));
  const requestInFlight = useRef(false);
  const forecast = useMemo(() => buildForecast(deadlines), [deadlines]);
  const courses = useMemo(
    () =>
      [
        ...new Set([
          ...(profile.completedCourses || []),
          ...deadlines.map((item) => item.course),
        ]),
      ],
    [profile.completedCourses, deadlines]
  );
  const freeWeeks = useMemo(
    () =>
      forecast
        .filter((week) => week.weather === "sunny")
        .map((week) => week.week),
    [forecast]
  );

  const fetchShortlist = useCallback(
    async (answers, excludeIds = []) => {
      if (requestInFlight.current) return;
      requestInFlight.current = true;
      setStep("loading");
      try {
        let response;
        try {
          response = await postJSON("/api/club-shortlist", {
            quizAnswers: answers,
            profile: {
              program: profile.program,
              year: profile.year,
              courses,
            },
            freeWeeks,
            excludeIds,
          });
        } catch {
          response = {
            clubs: localShortlist(clubs, answers, forecast, courses, excludeIds),
            source: "local",
          };
        }

        const excluded = new Set([...excludeIds, ...likedClubIds]);
        const allowed = new Map(clubs.map((club) => [club.id, club]));
        const shortlist = (Array.isArray(response.clubs) ? response.clubs : [])
          .filter((item) => item && allowed.has(item.id) && !excluded.has(item.id))
          .filter((item, index, list) => list.findIndex((club) => club.id === item.id) === index)
          .map((item) => ({
            ...allowed.get(item.id),
            match: Math.max(0, Math.min(100, Number(item.match) || 0)),
            bio: String(item.bio || allowed.get(item.id).description),
            why: String(item.why || ""),
            wildcard: Boolean(item.wildcard),
          }));

        actions.saveClubShortlist(shortlist);
        setStep("swipe");
      } finally {
        requestInFlight.current = false;
      }
    },
    [actions, courses, freeWeeks, forecast, likedClubIds, profile.program, profile.year]
  );

  useEffect(() => {
    if (step === "loading" && quizAnswers && !clubShortlist.length) {
      fetchShortlist(quizAnswers, shortlistExcludedIds);
    }
  }, [step, quizAnswers, clubShortlist.length, shortlistExcludedIds, fetchShortlist]);

  useEffect(() => {
    if (window.location.hash === "#my-clubs" && step === "swipe") {
      requestAnimationFrame(() =>
        document.getElementById("my-clubs")?.scrollIntoView({ behavior: "smooth" })
      );
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [step]);

  function completeQuiz(answers) {
    actions.setQuizAnswers(answers);
    fetchShortlist(answers, [...shortlistExcludedIds, ...likedClubIds]);
  }

  function retakeQuiz() {
    actions.clearClubRecommendations();
    setStep("quiz");
  }

  function showMore() {
    fetchShortlist(quizAnswers, [
      ...new Set([...shortlistExcludedIds, ...likedClubIds]),
    ]);
  }

  if (step === "loading") {
    return (
      <div className="mx-auto max-w-4xl" aria-live="polite" aria-busy="true">
        <div className="mb-5">
          <p className="text-sm font-extrabold text-muted">Club Match</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Find your people 💚
          </h1>
        </div>
        <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/[0.06] bg-surface/90 p-8 text-center shadow-[0_18px_60px_-30px_rgba(17,20,13,0.3)]">
          <span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-amber/10 text-5xl">
            🐻
          </span>
          <Loader2 className="mb-3 animate-spin text-amber" size={24} aria-hidden="true" />
          <p className="text-lg font-extrabold">Stormy is finding your people...</p>
          <Sparkles className="mt-3 text-amber" size={18} aria-hidden="true" />
        </section>
      </div>
    );
  }

  if (step === "quiz") {
    return <ClubQuiz initialAnswers={quizAnswers} onComplete={completeQuiz} />;
  }

  return (
    <ClubSwipe
      onRetake={retakeQuiz}
      onShowMore={showMore}
      onSeeMyClubs={() => {
        window.location.hash = "my-clubs";
        document.getElementById("my-clubs")?.scrollIntoView({ behavior: "smooth" });
      }}
    />
  );
}
