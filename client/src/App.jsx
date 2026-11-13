import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import MeadowLandscape from "./components/MeadowLandscape.jsx";
import Forecast from "./pages/Forecast.jsx";
import DegreeMap from "./pages/DegreeMap.jsx";
import Clubs from "./pages/Clubs.jsx";
import FloatingStormy from "./components/FloatingStormy.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const isHome = pathname === "/";
  const page =
    pathname === "/degree" ? "degree" : pathname === "/clubs" ? "clubs" : "forecast";

  useEffect(() => {
    if (pathname !== "/stormy") return;
    setChatOpen(true);
    navigate("/", { replace: true });
  }, [pathname, navigate]);

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-meadow-sky">
      {!isHome && (
        <div className="pointer-events-none fixed inset-0">
          <MeadowLandscape seed={21} />
        </div>
      )}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-amber focus:px-5 focus:py-3 focus:font-bold focus:text-night"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Nav meadow />
      <main
        id="main"
        className={
          isHome
            ? "relative w-full"
            : "meadow-theme relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-4 font-meadow sm:px-6 sm:pt-6 md:pb-14"
        }
      >
        <Routes>
          <Route path="/" element={<Forecast onOpenChat={() => setChatOpen(true)} />} />
          <Route path="/degree" element={<DegreeMap />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/stormy" element={<Navigate to="/" replace />} />
          <Route path="/clubs/matches" element={<Navigate to="/clubs#my-clubs" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FloatingStormy
        page={page}
        open={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
