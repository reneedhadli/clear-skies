import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Cloud,
  CloudSun,
  GraduationCap,
  Heart,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export const tabs = [
  { to: "/", label: "Forecast", icon: CloudSun, end: true },
  { to: "/degree", label: "Degree Map", icon: GraduationCap },
  { to: "/clubs", label: "Clubs", icon: Heart },
];

function tabClass({ isActive }, meadow) {
  if (meadow) {
    return `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
      isActive
        ? "bg-meadow-ground text-[#f4f4ef] shadow-[0_10px_24px_-14px_rgba(17,20,13,0.75)]"
        : "text-meadow-sub hover:bg-meadow-ink/5 hover:text-meadow-ink"
    }`;
  }
  return `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${
    isActive
      ? "bg-amber/12 text-amber"
      : "text-muted hover:bg-white/5 hover:text-text"
  }`;
}

export default function Nav({ meadow = false }) {
  const { profile, demoLoaded, actions } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function loadDemo() {
    actions.loadDemo();
    setMenuOpen(false);
    navigate("/");
  }

  function reset() {
    if (window.confirm("Start fresh and clear all saved Clear Skies data?")) {
      actions.resetApp();
      setMenuOpen(false);
      navigate("/");
    }
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 px-3 pb-2 pt-3 sm:px-6 sm:pt-4 ${
          meadow ? "font-meadow" : ""
        }`}
      >
        <nav
          aria-label="Main navigation"
          className={`mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-full py-2 pl-2 pr-2 backdrop-blur-2xl sm:gap-4 sm:pl-3 sm:pr-3 ${
            meadow
              ? "border border-meadow-ink/10 bg-[#f4f4ef]/80 shadow-[0_16px_50px_-28px_rgba(17,20,13,0.55)]"
              : "border border-white/[0.07] bg-surface/65 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.85)]"
          }`}
        >
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2.5 rounded-full pr-2"
            aria-label="Clear Skies home"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                meadow ? "bg-meadow-olive/10 text-meadow-olive" : "bg-amber/15 text-amber"
              }`}
            >
              <Cloud size={22} strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span
                className={`text-lg font-black tracking-tight ${
                  meadow ? "text-meadow-ink" : ""
                }`}
              >
                Clear Skies
              </span>
              <span
                className={`mt-1 hidden text-[10px] font-bold lg:block ${
                  meadow ? "text-meadow-sub/70" : "text-muted"
                }`}
              >
                See the storms coming
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={(props) => tabClass(props, meadow)}>
                <Icon size={17} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {demoLoaded && (
              <span
                className={`hidden items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold sm:inline-flex ${
                  meadow
                    ? "bg-meadow-olive/10 text-meadow-olive"
                    : "bg-sage/10 text-sage"
                }`}
              >
                Demo student
              </span>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Open profile menu"
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition ${
                  meadow
                    ? "border-meadow-ink/10 bg-white/50 hover:border-meadow-ink/30"
                    : "border-white/10 bg-raised hover:border-amber/50"
                }`}
              >
                <span aria-hidden="true">{profile.avatar}</span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 top-full mt-3 w-72 origin-top-right rounded-[24px] border p-2 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.95)] animate-fade-up ${
                    meadow ? "border-meadow-ink/10 bg-[#f4f4ef]" : "border-white/10 bg-surface"
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                      meadow ? "bg-meadow-haze" : "bg-raised/60"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {profile.avatar}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`truncate font-extrabold ${
                          meadow ? "text-meadow-ink" : ""
                        }`}
                      >
                        {profile.name || "Your profile"}
                      </p>
                      <p
                        className={`truncate text-xs ${
                          meadow ? "text-meadow-sub" : "text-muted"
                        }`}
                      >
                        {profile.program}
                        {profile.year ? ` · Year ${profile.year}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={loadDemo}
                    className={`mt-2 flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition ${
                      meadow
                        ? "text-meadow-ink hover:bg-meadow-ink/5"
                        : "text-text hover:bg-white/5"
                    }`}
                  >
                    <Sparkles
                      size={17}
                      className={meadow ? "text-[#a97722]" : "text-amber"}
                      aria-hidden="true"
                    />
                    Load demo student
                  </button>
                  <button
                    role="menuitem"
                    onClick={reset}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition ${
                      meadow
                        ? "text-meadow-sub hover:bg-meadow-ink/5 hover:text-meadow-ink"
                        : "text-muted hover:bg-white/5 hover:text-text"
                    }`}
                  >
                    <RotateCcw size={17} aria-hidden="true" />
                    Start fresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <nav
        aria-label="Mobile navigation"
        className={`fixed inset-x-3 bottom-3 z-40 rounded-[24px] border p-1.5 backdrop-blur-2xl md:hidden ${
          meadow
            ? "border-meadow-ink/10 bg-[#f4f4ef]/90 font-meadow shadow-[0_16px_50px_-20px_rgba(17,20,13,0.5)]"
            : "border-white/[0.07] bg-surface/80 shadow-[0_16px_50px_-15px_rgba(0,0,0,0.9)]"
        }`}
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[10px] font-extrabold transition ${
                  meadow
                    ? isActive
                      ? "bg-meadow-ground text-[#f4f4ef]"
                      : "text-meadow-sub"
                    : isActive
                      ? "bg-amber/12 text-amber"
                      : "text-muted"
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
