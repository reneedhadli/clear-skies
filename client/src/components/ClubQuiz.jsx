import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const QUESTIONS = [
  {
    id: "interests",
    title: "What sounds fun?",
    helper: "Pick as many as you like. No wrong answers.",
    multi: true,
    options: [
      { value: "gaming", emoji: "🎮", label: "Gaming" },
      { value: "sports", emoji: "⚽", label: "Sports" },
      { value: "music", emoji: "🎵", label: "Music" },
      { value: "tech", emoji: "💻", label: "Tech" },
      { value: "art", emoji: "🎨", label: "Art" },
      { value: "volunteering", emoji: "🤝", label: "Volunteering" },
      { value: "culture", emoji: "🌎", label: "Culture" },
      { value: "career", emoji: "💼", label: "Career" },
      { value: "wellness", emoji: "🌿", label: "Wellness" },
      { value: "outdoors", emoji: "🌲", label: "Outdoors" },
    ],
  },
  {
    id: "vibe",
    title: "What's your club energy?",
    helper: "Be honest — there are no wrong answers.",
    options: [
      { value: "chill", emoji: "😌", label: "Chill hangouts", description: "Low pressure, good chats" },
      { value: "either", emoji: "🌤️", label: "A bit of both", description: "Flexible on the energy" },
      {
        value: "competitive",
        emoji: "🔥",
        label: "Competitive",
        description: "I like a challenge",
      },
    ],
  },
  {
    id: "hours",
    title: "How much time feels right?",
    helper: "A rough weekly guess is perfect.",
    options: [
      { value: 1.5, emoji: "🌱", label: "Under 2 hrs a week", description: "Keep it light" },
      { value: 3, emoji: "🌤️", label: "2 to 4 hrs", description: "A steady hobby" },
      { value: 6, emoji: "⚡", label: "5+ hrs", description: "All in" },
    ],
  },
  {
    id: "extraContext",
    title: "Anything else you're into?",
    helper: "Optional — share a couple of things you enjoy.",
    freeText: true,
  },
];

function OptionTile({ option, selected, multi, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${option.label}${option.description ? `: ${option.description}` : ""}`}
      className={`quiz-option-tile flex min-h-[68px] w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#253019] ${
        selected
          ? "scale-[1.02] border-[#9a6b16] bg-[#fff4d8] shadow-[0_3px_12px_rgba(37,48,25,0.12)]"
          : "border-[#253019]/20 bg-[#fbfbf6]/95 hover:border-[#253019]/40 hover:bg-white"
      }`}
    >
      <span className="text-2xl" aria-hidden="true">
        {option.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-base font-semibold leading-tight sm:text-lg ${
            selected ? "text-[#7d5a1b]" : "text-[#11140d]"
          }`}
        >
          {option.label}
        </span>
        {option.description && (
          <span className="mt-0.5 block text-xs text-[#3b4234]">
            {option.description}
          </span>
        )}
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center border ${
          multi ? "rounded-md" : "rounded-full"
        } ${
          selected
            ? "border-[#9a6b16] bg-[#9a6b16] text-white"
            : "border-[#253019]/30 text-transparent"
        }`}
        aria-hidden="true"
      >
        <Check size={14} strokeWidth={3} />
      </span>
    </button>
  );
}

export default function ClubQuiz({ initialAnswers, onComplete }) {
  const reducedMotion = useReducedMotion();
  const headingRef = useRef(null);
  const [answers, setAnswers] = useState(() => ({
    interests: initialAnswers?.interests ? [...initialAnswers.interests] : [],
    vibe: initialAnswers?.vibe || null,
    hours: initialAnswers?.hours || null,
    extraContext: initialAnswers?.extraContext || "",
  }));
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const question = QUESTIONS[index];
  const current = answers[question.id];
  const answered = question.multi
    ? current.length > 0
    : question.freeText
      ? true
      : current !== null && current !== "";

  function choose(value) {
    setAnswers((prev) => {
      if (question.multi) {
        const list = prev[question.id];
        return {
          ...prev,
          [question.id]: list.includes(value)
            ? list.filter((item) => item !== value)
            : [...list, value],
        };
      }
      return { ...prev, [question.id]: value };
    });
  }

  function next() {
    if (!answered || transitioning) return;
    if (index < QUESTIONS.length - 1) {
      setTransitioning(true);
      setDirection(1);
      setIndex((value) => value + 1);
    } else {
      onComplete({ ...answers, extraContext: answers.extraContext.trim() });
    }
  }

  function back() {
    if (transitioning || index === 0) return;
    setTransitioning(true);
    setDirection(-1);
    setIndex((value) => Math.max(0, value - 1));
  }

  const duration = reducedMotion ? 0.12 : 0.3;

  return (
    <section className="mx-auto flex min-h-[calc(100svh-105px)] w-full max-w-[1100px] flex-col justify-center px-2 py-6 text-[#11140d] sm:px-4 sm:py-8">
      <div className="w-full">
        <div className="mb-12 w-full sm:mb-14">
          <p className="text-sm font-bold text-[#3b4234]">
            Question {index + 1} of {QUESTIONS.length}
          </p>
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#253019]/15"
            role="progressbar"
            aria-label={`Question ${index + 1} of ${QUESTIONS.length}`}
            aria-valuemin={0}
            aria-valuemax={QUESTIONS.length}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-full bg-[#4d5d2c] transition-[width] duration-300 ease-out"
              style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="w-full">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={question.id}
              custom={direction}
              initial={{
                opacity: 0,
                y: reducedMotion ? 0 : direction > 0 ? 8 : -8,
              }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: reducedMotion ? 0 : direction > 0 ? -8 : 8,
              }}
              transition={{
                duration,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => {
                if (!transitioning) return;
                setTransitioning(false);
                headingRef.current?.focus();
              }}
              className="w-full"
            >
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mx-auto max-w-5xl text-center text-[clamp(2.75rem,5.5vw,5rem)] font-black leading-[1.05] tracking-[-0.045em] text-[#11140d] [text-shadow:0_1px_2px_rgba(255,255,255,0.5)]"
              >
                {question.title}
              </h1>
              <p className="mt-3 text-center text-[clamp(1rem,1.4vw,1.25rem)] font-medium text-[#3b4234] [text-shadow:0_1px_2px_rgba(255,255,255,0.6)]">
                {question.helper}
              </p>

              {question.freeText ? (
                <div className="mx-auto mt-12 max-w-[640px]">
                  <label htmlFor="club-extra-context" className="sr-only">
                    Anything else you&apos;re into?
                  </label>
                  <input
                    id="club-extra-context"
                    type="text"
                    value={current}
                    maxLength={100}
                    onChange={(event) =>
                      setAnswers((prev) => ({ ...prev, extraContext: event.target.value }))
                    }
                    placeholder="e.g. anime, rock climbing, startups"
                    className="min-h-16 w-full rounded-2xl border border-[#253019]/25 bg-[#fbfbf6]/95 px-5 text-xl text-[#11140d] placeholder:text-[#5b6452] focus:border-[#4d5d2c] focus:outline-2 focus:outline-offset-2 focus:outline-[#4d5d2c]"
                  />
                  <p className="mt-2 text-right text-xs font-medium text-[#3b4234]">
                    {current.length}/100
                  </p>
                </div>
              ) : (
                <div
                  className={`quiz-option-grid mt-12 grid gap-3 sm:gap-4 ${
                    question.multi
                      ? "quiz-interest-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                      : "quiz-short-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  }`}
                  role="group"
                  aria-label={question.title}
                >
                  {question.options.map((option, optionIndex) => (
                    <motion.div
                      key={option.value}
                      initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: reducedMotion ? 0.12 : 0.22,
                        delay: reducedMotion ? 0 : Math.min(optionIndex * 0.02, 0.12),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <OptionTile
                        option={option}
                        selected={
                          question.multi
                            ? current.includes(option.value)
                            : current === option.value
                        }
                        multi={question.multi}
                        onClick={() => choose(option.value)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex min-h-12 w-full items-center justify-between gap-3">
          {index > 0 ? (
            <button
              type="button"
              onClick={back}
              disabled={transitioning}
              className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-extrabold text-[#253019] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#253019] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {!answered && (
              <span className="text-xs font-semibold text-[#3b4234]">
                Pick at least one to continue
              </span>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!answered || transitioning}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#253019] px-6 text-sm font-extrabold text-[#f4f4ef] shadow-[0_8px_24px_-16px_rgba(17,20,13,0.7)] transition hover:bg-[#34431f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#253019] disabled:cursor-not-allowed disabled:bg-[#70796a] disabled:text-white"
            >
              {index === QUESTIONS.length - 1 ? "See my clubs" : "Next"}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
