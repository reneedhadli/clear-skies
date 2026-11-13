import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  demoClubCopies,
  demoCompleted,
  demoDeadlines,
  demoProfile,
  demoQuizAnswers,
  demoSyllabi,
} from "../data/demo.js";
import { clubs } from "../data/clubs.js";

const STORAGE_KEY = "clear-skies-v1";

const initialState = {
  profile: {
    name: "friend",
    avatar: "🌙",
    year: "U of A student",
    program: "Undecided",
    term: "Fall term",
    currentWeek: 6,
  },
  syllabi: [],
  deadlines: [],
  completedCourses: [],
  nextTerm: [],
  quizAnswers: null,
  likedClubIds: [],
  clubMatches: {},
  joinedClubIds: [],
  clubCopies: {},
  plans: {},
  demoLoaded: false,
};

const AppContext = createContext(null);

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    const validClubIds = new Set(clubs.map((club) => club.id));
    const likedClubIds = (parsed.likedClubIds || []).filter((id) => validClubIds.has(id));
    return {
      ...initialState,
      ...parsed,
      likedClubIds,
      clubMatches: Object.fromEntries(
        Object.entries(parsed.clubMatches || {}).filter(([id]) => validClubIds.has(id))
      ),
    };
  } catch {
    return initialState;
  }
}

function deadlineKey(item) {
  return `${item.course}|${item.title}|${item.type}|${item.week}`.toLowerCase();
}

export function AppProvider({ children }) {
  const [state, setState] = useState(readStoredState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private mode; the app still works in memory.
    }
  }, [state]);

  const actions = useMemo(
    () => ({
      addDeadlines(deadlines, syllabusMeta = []) {
        setState((prev) => {
          const byKey = new Map(prev.deadlines.map((item) => [deadlineKey(item), item]));
          deadlines.forEach((item) => byKey.set(deadlineKey(item), item));
          const syllabiByCourse = new Map(prev.syllabi.map((item) => [item.course, item]));
          syllabusMeta.forEach((item) => {
            if (item?.course) syllabiByCourse.set(item.course, item);
          });
          deadlines.forEach((item) => {
            if (item?.course && !syllabiByCourse.has(item.course)) {
              syllabiByCourse.set(item.course, { course: item.course, title: "Uploaded syllabus" });
            }
          });
          return {
            ...prev,
            deadlines: [...byKey.values()],
            syllabi: [...syllabiByCourse.values()],
          };
        });
      },
      setQuizAnswers(answers) {
        setState((prev) => ({ ...prev, quizAnswers: answers }));
      },
      toggleCompleted(code) {
        setState((prev) => {
          const has = prev.completedCourses.includes(code);
          return {
            ...prev,
            completedCourses: has
              ? prev.completedCourses.filter((item) => item !== code)
              : [...prev.completedCourses, code],
          };
        });
      },
      addToNextTerm(code) {
        setState((prev) => ({
          ...prev,
          nextTerm: prev.nextTerm.includes(code) ? prev.nextTerm : [...prev.nextTerm, code],
        }));
      },
      savePlan(week, plan) {
        setState((prev) => ({
          ...prev,
          plans: { ...prev.plans, [week]: plan },
        }));
      },
      likeClub(id, match, copy) {
        setState((prev) => ({
          ...prev,
          likedClubIds: prev.likedClubIds.includes(id) ? prev.likedClubIds : [...prev.likedClubIds, id],
          clubMatches: {
            ...prev.clubMatches,
            [id]: {
              match,
              why: copy?.why || "",
            },
          },
          clubCopies: copy ? { ...prev.clubCopies, [id]: copy } : prev.clubCopies,
        }));
      },
      removeMatch(id) {
        setState((prev) => {
          const clubMatches = { ...prev.clubMatches };
          delete clubMatches[id];
          return {
            ...prev,
            likedClubIds: prev.likedClubIds.filter((item) => item !== id),
            joinedClubIds: prev.joinedClubIds.filter((item) => item !== id),
            clubMatches,
          };
        });
      },
      toggleJoin(id) {
        setState((prev) => ({
          ...prev,
          joinedClubIds: prev.joinedClubIds.includes(id)
            ? prev.joinedClubIds.filter((item) => item !== id)
            : [...prev.joinedClubIds, id],
        }));
      },
      mergeClubCopies(copies) {
        setState((prev) => {
          const clubMatches = { ...prev.clubMatches };
          Object.entries(copies).forEach(([id, copy]) => {
            if (prev.likedClubIds.includes(id) && clubMatches[id]) {
              clubMatches[id] = { ...clubMatches[id], why: copy?.why || clubMatches[id].why };
            }
          });
          return {
            ...prev,
            clubCopies: { ...prev.clubCopies, ...copies },
            clubMatches,
          };
        });
      },
      loadDemo() {
        setState({
          ...initialState,
          profile: demoProfile,
          syllabi: demoSyllabi,
          deadlines: demoDeadlines,
          completedCourses: demoCompleted,
          quizAnswers: demoQuizAnswers,
          likedClubIds: [],
          clubMatches: {},
          clubCopies: demoClubCopies,
          demoLoaded: true,
        });
      },
      resetApp() {
        setState(initialState);
      },
    }),
    []
  );

  return <AppContext.Provider value={{ ...state, actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
