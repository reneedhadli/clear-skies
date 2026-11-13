import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import Card from "./Card.jsx";
import Button from "./Button.jsx";
import Chip from "./Chip.jsx";
import ProgressBar from "./ProgressBar.jsx";
import Glow from "./Glow.jsx";

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
    ],
  },
  {
    id: "vibe",
    title: "What's your club energy?",
    helper: "Be honest — both are good.",
    options: [
      { value: "chill", emoji: "😌", label: "Chill", description: "Low pressure, good chats" },
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
      { value: 2, emoji: "🌱", label: "1–2 hours", description: "Keep it light" },
      { value: 4, emoji: "🌤️", label: "3–5 hours", description: "A steady hobby" },
      { value: 6, emoji: "⚡", label: "6+ hours", description: "All in" },
    ],
  },
  {
    id: "meetingDay",
    title: "When do you like to meet?",
    helper: "We'll line it up with your calmer weeks.",
    options: [
      { value: "Weeknights", emoji: "🌙", label: "Weeknights", description: "After class" },
      { value: "Weekends", emoji: "☀️", label: "Weekends", description: "Saturday energy" },
      { value: "Any", emoji: "🗓️", label: "Any time", description: "Surprise me" },
    ],
  },
];

function OptionTile({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[76px] w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
        selected
          ? "border-amber/60 bg-amber/10 shadow-[0_0_28px_-14px_var(--color-amber)]"
          : "border-white/10 bg-raised/50 hover:border-white/20 hover:bg-raised"
      }`}
    >
      <span className="text-2xl" aria-hidden="true">
        {option.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-extrabold ${selected ? "text-amber" : "text-text"}`}
        >
          {option.label}
        </span>
        {option.description && (
          <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
        )}
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-amber bg-amber text-night" : "border-white/15 text-transparent"
        }`}
        aria-hidden="true"
      >
        <Check size={14} strokeWidth={3} />
      </span>
    </button>
  );
}

export default function ClubQuiz({ initialAnswers, onComplete }) {
  const [answers, setAnswers] = useState(() => ({
    interests: initialAnswers?.interests ? [...initialAnswers.interests] : [],
    vibe: initialAnswers?.vibe || null,
    hours: initialAnswers?.hours || null,
    meetingDay: initialAnswers?.meetingDay || null,
  }));
  const [index, setIndex] = useState(0);
  const question = QUESTIONS[index];
  const current = answers[question.id];
  const answered = question.multi ? current.length > 0 : current !== null && current !== "";

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
    if (!answered) return;
    if (index < QUESTIONS.length - 1) {
      setIndex((value) => value + 1);
    } else {
      onComplete(answers);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-muted">Club Match</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Find your people 💚
          </h1>
        </div>
        <Chip tone="sage">
          <Sparkles size={13} aria-hidden="true" />
          2 min vibe check
        </Chip>
      </div>

      <Card className="relative overflow-hidden p-5 sm:p-8">
        <Glow color="#FFB547" className="-right-12 -top-20 h-64 w-64" opacity={0.2} />
        <Glow color="#6B5BD6" className="-bottom-24 -left-16 h-64 w-64" opacity={0.22} />
        <div className="relative grid gap-6 md:grid-cols-[150px_1fr] md:gap-8">
          <div className="flex items-center gap-4 md:flex-col md:items-center md:gap-2">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber md:h-32 md:w-32">
              <Sparkles size={52} strokeWidth={1.4} aria-hidden="true" />
            </span>
            <div className="rounded-2xl bg-raised/70 px-4 py-3 text-sm font-bold md:text-center">
              Quick vibe check! What sounds fun?
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted">
              <span>
                Question {index + 1} of {QUESTIONS.length}
              </span>
              <span>{Math.round(((index + 1) / QUESTIONS.length) * 100)}%</span>
            </div>
            <ProgressBar
              className="mt-2"
              value={((index + 1) / QUESTIONS.length) * 100}
              color="var(--color-amber)"
              label={`Question ${index + 1} of ${QUESTIONS.length}`}
            />

            <div key={question.id} className="mt-5 animate-fade-up">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{question.title}</h2>
              <p className="mt-1 text-sm text-muted">{question.helper}</p>
              <div
                className={`mt-5 grid gap-2 ${
                  question.id === "interests" ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
                role="group"
                aria-label={question.title}
              >
                {question.options.map((option) => (
                  <OptionTile
                    key={option.value}
                    option={option}
                    selected={
                      question.multi
                        ? current.includes(option.value)
                        : current === option.value
                    }
                    onClick={() => choose(option.value)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                disabled={index === 0}
              >
                <ArrowLeft size={17} aria-hidden="true" />
                Back
              </Button>
              <Button onClick={next} disabled={!answered}>
                {index === QUESTIONS.length - 1 ? "See my clubs" : "Next"}
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
