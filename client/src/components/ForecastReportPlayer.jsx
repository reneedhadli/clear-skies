import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import {
  pauseActiveSpeech,
  playSpeechSentences,
  resumeActiveSpeech,
  speechSupported,
} from "../lib/forecastSpeech.js";
import { stopForecastAudio } from "../lib/forecastAudio.js";
import { spokenReportText, splitReportSentences } from "../lib/forecastReport.js";

export default function ForecastReportPlayer({
  report,
  week,
  autoPlayToken = 0,
  onAutoPlay,
  compact = false,
}) {
  const reducedMotion = useReducedMotion();
  const [playback, setPlayback] = useState({ status: "idle", index: -1 });
  const sentenceRefs = useRef([]);
  const lastAutoPlayToken = useRef(0);
  const runRef = useRef(0);
  const resumeStatusRef = useRef("playing");
  const supported = speechSupported();
  const sentences = splitReportSentences(report);
  const spokenSentences = splitReportSentences(spokenReportText(report));
  const active = playback.status === "playing";

  useEffect(() => {
    const sentence = sentenceRefs.current[playback.index];
    if (["playing", "paused"].includes(playback.status) && sentence) {
      sentence.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest",
      });
    }
  }, [playback.index, playback.status, reducedMotion]);

  useEffect(() => {
    if (!autoPlayToken || lastAutoPlayToken.current === autoPlayToken) return;
    lastAutoPlayToken.current = autoPlayToken;
    void startPlayback();
    onAutoPlay?.();
  }, [autoPlayToken]);

  useEffect(
    () => () => {
      runRef.current += 1;
      stopForecastAudio();
    },
    []
  );

  function startPlayback() {
    if (!supported) return;
    const run = runRef.current + 1;
    runRef.current = run;
    stopForecastAudio();
    setPlayback({ status: "playing", index: 0 });
    playSpeechSentences(spokenSentences, (update) => {
      if (runRef.current !== run) return;
      if (update.status === "finished") {
        setPlayback({ status: "finished", index: update.index });
      } else {
        setPlayback(update);
      }
    }).catch(() => {
      if (runRef.current === run) setPlayback({ status: "stopped", index: -1 });
    });
  }

  function togglePlayback() {
    if (active) {
      resumeStatusRef.current = playback.status;
      pauseActiveSpeech();
      setPlayback((current) => ({ ...current, status: "paused" }));
    } else if (playback.status === "paused") {
      if (resumeStatusRef.current === "playing") resumeActiveSpeech();
      setPlayback((current) => ({
        ...current,
        status: resumeStatusRef.current,
      }));
    } else {
      void startPlayback();
    }
  }

  function stopPlayback() {
    runRef.current += 1;
    stopForecastAudio();
    setPlayback({ status: "stopped", index: playback.index });
  }

  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      {(active || playback.status === "paused") && (
        <div className={`mb-3 flex flex-wrap items-center gap-2 ${compact ? "ml-1" : ""}`}>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#a83232]/10 px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-[#9b2727]">
            <span aria-hidden="true">●</span> ON AIR
          </span>
        </div>
      )}
      <div className={`flex items-start gap-2.5 ${compact ? "" : "rounded-2xl border border-meadow-ink/10 bg-white/70 p-3 sm:p-4"}`}>
        {!compact && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meadow-ground text-amber ${
              playback.status === "playing" && !reducedMotion ? "stormy-talking" : ""
            }`}
            aria-hidden="true"
          >
            <span className="text-xl">☁️</span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          {!compact && (
            <p className="mb-2 rounded-lg bg-[#253019] px-3 py-2 text-[10px] font-extrabold tracking-[0.12em] text-[#f4f4ef]">
              STORMY WEATHER REPORT{week ? ` · WEEK ${week}` : ""}
            </p>
          )}
          <div className={`space-y-1 ${compact ? "rounded-[22px] rounded-tl-md bg-raised/75 px-3 py-2" : ""}`}>
            {sentences.map((sentence, index) => (
              <p
                key={`${index}-${sentence}`}
                ref={(element) => {
                  sentenceRefs.current[index] = element;
                }}
                className={`rounded-md px-1 py-0.5 text-sm leading-relaxed transition-colors ${
                  ["playing", "paused"].includes(playback.status) &&
                  playback.index === index
                    ? compact
                      ? "bg-amber/15 text-text"
                      : "bg-[#b8862e]/15 text-meadow-ink"
                    : compact
                      ? "text-text"
                      : "text-meadow-ink"
                }`}
              >
                {sentence}
              </p>
            ))}
          </div>
          {supported ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (playback.status === "finished" || playback.status === "stopped" || playback.status === "idle") {
                    void startPlayback();
                  } else {
                    togglePlayback();
                  }
                }}
                aria-label={
                  active
                    ? "Pause forecast"
                    : playback.status === "paused"
                      ? "Resume forecast"
                      : "Play forecast"
                }
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive ${
                  compact
                    ? "bg-amber/15 text-text hover:bg-amber/25"
                    : "bg-meadow-ground text-[#f4f4ef] hover:bg-[#34431f]"
                }`}
              >
                {active ? (
                  <Pause size={15} aria-hidden="true" />
                ) : (
                  <Play size={15} aria-hidden="true" />
                )}
                {active
                  ? "Pause"
                  : playback.status === "paused"
                    ? "Resume"
                    : "Play"}
              </button>
              {(active || playback.status === "paused") && (
                <button
                  type="button"
                  onClick={stopPlayback}
                  aria-label="Stop forecast"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive ${
                    compact
                      ? "border-white/10 text-text hover:bg-white/10"
                      : "border-meadow-ink/15 text-meadow-ink hover:bg-meadow-ink/5"
                  }`}
                >
                  <Square size={13} aria-hidden="true" />
                  Stop
                </button>
              )}
              {playback.status === "finished" && (
                <button
                  type="button"
                  onClick={() => void startPlayback()}
                  aria-label="Replay forecast"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-meadow-olive ${
                    compact ? "text-text hover:bg-white/10" : "text-meadow-ink hover:bg-meadow-ink/5"
                  }`}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Replay
                </button>
              )}
            </div>
          ) : (
            <p className={`mt-2 text-xs ${compact ? "text-muted" : "text-meadow-sub"}`}>
              Audio isn&apos;t supported in this browser.
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {playback.status === "playing"
              ? "Playing Stormy's forecast"
              : playback.status === "finished"
                ? "Forecast finished"
                : playback.status === "paused"
                  ? "Forecast paused"
                  : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
