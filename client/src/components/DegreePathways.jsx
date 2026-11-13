import { useState } from "react";
import { Sparkles } from "lucide-react";
import Button from "./Button.jsx";
import Card from "./Card.jsx";
import { planDegree } from "../lib/degreeApi.js";

const SUGGESTED_MAJORS = ["Computing Science", "Chemistry", "Psychology", "Biology", "Fine Arts"];

function parseCodes(text) {
  return String(text)
    .split(/[,\n]/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
}

function CourseRow({ course }) {
  return (
    <li className="rounded-xl bg-raised/60 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm font-extrabold">
          {course.code}
          {course.isGoal && <span className="ml-1.5 text-xs font-bold text-amber">goal</span>}
        </span>
        {!course.prereqKnown && (
          <span className="text-[11px] font-bold text-amber" title="Prerequisites could not be checked">
            check prereqs ⚠
          </span>
        )}
      </div>
      {course.title && <p className="text-xs text-muted">{course.title}</p>}
      {!course.isGoal && course.neededFor.length > 0 && (
        <p className="mt-0.5 text-[11px] font-semibold text-sage">Needed for {course.neededFor.join(", ")}</p>
      )}
    </li>
  );
}

export default function DegreePathways({ completed = [], defaultMajor = "" }) {
  const [major, setMajor] = useState(defaultMajor || "");
  const [targets, setTargets] = useState("");
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  const [active, setActive] = useState(0);

  async function find(event) {
    event.preventDefault();
    const targetList = parseCodes(targets);
    if (!major.trim() && !targetList.length) {
      setState({ status: "error", data: null, error: "Type your major, or the courses you want to reach." });
      return;
    }
    setState({ status: "loading", data: null, error: "" });
    setActive(0);
    try {
      const data = await planDegree({ major: major.trim(), completed, targets: targetList });
      setState({ status: "done", data, error: "" });
    } catch {
      setState({
        status: "error",
        data: null,
        error: "Could not reach the planner. Is the server running?",
      });
    }
  }

  const { status, data, error } = state;
  const pathway = data?.pathways?.[active];

  return (
    <Card className="mt-6 p-5 sm:p-6" aria-labelledby="pathways-title">
      <h2 id="pathways-title" className="text-xl font-black tracking-tight">
        Find my pathways
      </h2>
      <p className="mt-1 text-sm text-muted">
        Any major. Prerequisites come from the official U of A course catalogue.
      </p>

      <form onSubmit={find} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pathway-major" className="text-xs font-extrabold text-muted">
            Your major
          </label>
          <input
            id="pathway-major"
            value={major}
            onChange={(event) => setMajor(event.target.value)}
            placeholder="e.g. Chemistry"
            maxLength={100}
            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-raised/60 px-3 text-sm text-text placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-amber"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_MAJORS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setMajor(name)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-muted hover:bg-white/[0.08] hover:text-text"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="pathway-targets" className="text-xs font-extrabold text-muted">
            Courses you want to reach (optional)
          </label>
          <input
            id="pathway-targets"
            value={targets}
            onChange={(event) => setTargets(event.target.value)}
            placeholder="e.g. CMPUT 304, CMPUT 466"
            className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-raised/60 px-3 text-sm text-text placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-amber"
          />
          <p className="mt-2 text-xs text-muted">
            Using your {completed.length} finished {completed.length === 1 ? "course" : "courses"}. Leave this empty and the AI suggests
            pathways for your major.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={status === "loading"}>
            <Sparkles size={17} aria-hidden="true" />
            {status === "loading" ? "Checking the catalogue…" : "Find my pathways"}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {status === "error" && <p className="mt-4 text-sm font-bold text-red-300">{error}</p>}
        {status === "done" && data.source === "unavailable" && (
          <p className="mt-4 rounded-2xl bg-raised/50 p-4 text-sm text-muted">{data.message}</p>
        )}
      </div>

      {status === "done" && data.pathways?.length > 0 && (
        <div className="mt-5">
          {data.summary && (
            <div className="mb-4 rounded-2xl bg-sage/10 p-4">
              <p className="text-sm font-extrabold text-sage">{data.summary.headline}</p>
              <p className="mt-1 text-sm text-muted">{data.summary.advice}</p>
            </div>
          )}

          <div role="tablist" aria-label="Pathways" className="flex flex-wrap gap-2">
            {data.pathways.map((item, index) => (
              <button
                key={item.name}
                role="tab"
                aria-selected={index === active}
                onClick={() => setActive(index)}
                className={`rounded-full px-4 py-2 text-sm font-extrabold ${
                  index === active ? "bg-amber text-night" : "bg-raised text-muted hover:text-text"
                }`}
              >
                {item.name}
                <span className="ml-1.5 text-xs font-bold opacity-80">
                  {item.totalTerms} {item.totalTerms === 1 ? "term" : "terms"}
                </span>
              </button>
            ))}
          </div>

          {pathway && (
            <div role="tabpanel" className="mt-4">
              {pathway.why && <p className="text-sm text-muted">{pathway.why}</p>}
              {pathway.terms.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-sage">Nothing left to take for these goals. 🎉</p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {pathway.terms.map((term) => (
                    <div key={term.term} className="rounded-2xl border border-white/[0.06] bg-surface/60 p-3">
                      <h3 className="mb-2 text-sm font-black text-amber">{term.term}</h3>
                      <ul className="space-y-2">
                        {term.courses.map((course) => (
                          <CourseRow key={course.code} course={course} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {pathway.choices.length > 0 && (
                <div className="mt-4 rounded-2xl bg-raised/40 p-4">
                  <h3 className="text-sm font-extrabold">Your choices</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted">
                    {pathway.choices.map((choice) => (
                      <li key={`${choice.for}-${choice.oneOf.join()}`}>
                        <span className="font-bold text-text">{choice.for}</span> needs one of{" "}
                        {choice.oneOf.join(", ")}. We picked{" "}
                        <span className="font-bold text-sage">{choice.picked}</span> because it needs the fewest extra
                        courses.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs leading-relaxed text-muted">
                {pathway.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
