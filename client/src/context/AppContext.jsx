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
import { getCurrentWeek, TERM_NAME } from "../config/term.js";
import { normalizeDeadline } from "../lib/deadlines.js";

const STORAGE_KEY = "clear-skies-v1";

const initialState = {
  profile: {
    name: "",
    avatar: "🌙",
    year: null,
    program: "Computing Science",
    term: TERM_NAME,
    currentWeek: getCurrentWeek(),
    completedCourses: [],
    nextTermCourses: [],
  },
  syllabi: [],
  deadlines: [],
  quizAnswers: null,
  clubShortlist: [],
  shortlistSeenIds: [],
  shortlistExcludedIds: [],
  likedClubIds: [],
  clubMatches: {},
  joinedClubIds: [],
  clubCopies: {},
  chatMessages: [],
  plans: {},
  demoLoaded: false,
};

const AppContext = createContext(null);

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    const stored = { ...parsed };
    delete stored.weatherMusic;
    const validClubIds = new Set(clubs.map((club) => club.id));
    const likedClubIds = (stored.likedClubIds || []).filter((id) => validClubIds.has(id));
    const storedProfile = stored.profile || {};
    const validClubIdSet = new Set(clubs.map((club) => club.id));
    const {
      completedCourses: legacyCompleted = [],
      nextTerm: legacyNextTerm = [],
      ...storedState
    } = stored;
    const demoLoaded = Boolean(stored.demoLoaded);
    return {
      ...initialState,
      ...storedState,
      demoLoaded,
      profile: {
        ...initialState.profile,
        ...storedProfile,
        name: demoLoaded ? storedProfile.name || "Maya" : "",
        program: demoLoaded ? storedProfile.program || "Computing Science" : "Computing Science",
        year: demoLoaded ? Number(storedProfile.year) || 2 : null,
        term: TERM_NAME,
        currentWeek: getCurrentWeek(),
        completedCourses: Array.isArray(storedProfile.completedCourses)
          ? storedProfile.completedCourses
          : Array.isArray(legacyCompleted)
            ? legacyCompleted
            : [],
        nextTermCourses: Array.isArray(storedProfile.nextTermCourses)
          ? storedProfile.nextTermCourses.slice(0, 5)
          : Array.isArray(legacyNextTerm)
            ? legacyNextTerm.slice(0, 5)
            : [],
      },
      likedClubIds,
      clubShortlist: Array.isArray(stored.clubShortlist)
        ? stored.clubShortlist.filter((item) => validClubIdSet.has(item?.id))
        : [],
      shortlistSeenIds: Array.isArray(stored.shortlistSeenIds)
        ? stored.shortlistSeenIds.filter((id) => validClubIdSet.has(id))
        : [],
      shortlistExcludedIds: Array.isArray(stored.shortlistExcludedIds)
        ? stored.shortlistExcludedIds.filter((id) => validClubIdSet.has(id))
        : [],
      chatMessages: Array.isArray(stored.chatMessages) ? stored.chatMessages : [],
      clubMatches: Object.fromEntries(
        Object.entries(stored.clubMatches || {}).filter(([id]) => validClubIds.has(id))
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
          deadlines.map(normalizeDeadline).forEach((item) => byKey.set(deadlineKey(item), item));
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
        setState((prev) => ({
          ...prev,
          quizAnswers: answers,
          clubShortlist: [],
          shortlistSeenIds: [],
          shortlistExcludedIds: [],
        }));
      },
      saveClubShortlist(shortlist) {
        setState((prev) => {
          const currentById = new Map(prev.clubShortlist.map((club) => [club.id, club]));
          const addedIds = [];
          shortlist.forEach((club) => {
            if (!clubs.some((item) => item.id === club.id)) return;
            if (!currentById.has(club.id)) addedIds.push(club.id);
            currentById.set(club.id, club);
          });
          return {
            ...prev,
            clubShortlist: [...currentById.values()],
            shortlistExcludedIds: [...new Set([...prev.shortlistExcludedIds, ...addedIds])],
          };
        });
      },
      markClubSeen(id) {
        setState((prev) => ({
          ...prev,
          shortlistSeenIds: prev.shortlistSeenIds.includes(id)
            ? prev.shortlistSeenIds
            : [...prev.shortlistSeenIds, id],
          shortlistExcludedIds: prev.shortlistExcludedIds.includes(id)
            ? prev.shortlistExcludedIds
            : [...prev.shortlistExcludedIds, id],
        }));
      },
      clearClubRecommendations() {
        setState((prev) => ({
          ...prev,
          quizAnswers: null,
          clubShortlist: [],
          shortlistSeenIds: [],
          shortlistExcludedIds: [],
        }));
      },
      toggleCompleted(code) {
        setState((prev) => {
          const completedCourses = prev.profile.completedCourses;
          const has = completedCourses.includes(code);
          return {
            ...prev,
            profile: {
              ...prev.profile,
              completedCourses: has
                ? completedCourses.filter((item) => item !== code)
                : [...completedCourses, code],
            },
          };
        });
      },
      addToNextTerm(code) {
        setState((prev) => {
          const nextTermCourses = prev.profile.nextTermCourses;
          if (nextTermCourses.includes(code) || nextTermCourses.length >= 5) return prev;
          return {
            ...prev,
            profile: { ...prev.profile, nextTermCourses: [...nextTermCourses, code] },
          };
        });
      },
      removeFromNextTerm(code) {
        setState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            nextTermCourses: prev.profile.nextTermCourses.filter((item) => item !== code),
          },
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
      addChatMessage(message) {
        setState((prev) => ({
          ...prev,
          chatMessages: [...prev.chatMessages, message],
        }));
      },
      clearChat() {
        setState((prev) => ({ ...prev, chatMessages: [] }));
      },
      loadDemo() {
        setState((prev) => ({
          ...initialState,
          profile: {
            ...demoProfile,
            term: TERM_NAME,
            currentWeek: getCurrentWeek(),
            completedCourses: demoCompleted,
            nextTermCourses: [],
          },
          syllabi: demoSyllabi,
          deadlines: demoDeadlines,
          quizAnswers: demoQuizAnswers,
          likedClubIds: [],
          clubMatches: {},
          clubCopies: demoClubCopies,
          clubShortlist: [],
          shortlistSeenIds: [],
          shortlistExcludedIds: [],
          demoLoaded: true,
        }));
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
