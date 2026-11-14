import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const reducedMotion = useReducedMotion();
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
    } else if (step === "quiz") {
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

  return (
    <div className={`mx-auto ${step === "quiz" ? "max-w-6xl" : "max-w-4xl"}`}>
      <AnimatePresence mode="wait" initial={false}>
        {step === "loading" ? (
          <motion.section
            key="club-loading"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-[360px] flex-col items-center justify-center text-center"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="mb-3 animate-spin text-[#4d5d2c]" size={24} aria-hidden="true" />
            <p className="text-lg font-extrabold text-[#11140d]">
              Stormy is finding your people...
            </p>
            <Sparkles className="mt-3 text-[#9a6b16]" size={18} aria-hidden="true" />
          </motion.section>
        ) : step === "quiz" ? (
          <motion.div
            key="club-quiz"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ClubQuiz initialAnswers={quizAnswers} onComplete={completeQuiz} />
          </motion.div>
        ) : (
          <motion.div
            key="club-swipe"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ClubSwipe
              onRetake={retakeQuiz}
              onShowMore={showMore}
              onSeeMyClubs={() => {
                window.location.hash = "my-clubs";
                document.getElementById("my-clubs")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
