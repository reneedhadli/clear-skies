import { useEffect, useState } from "react";
import ClubQuiz from "../components/ClubQuiz.jsx";
import ClubSwipe from "../components/ClubSwipe.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Clubs() {
  const { quizAnswers, actions } = useApp();
  const [step, setStep] = useState(() =>
    quizAnswers || window.location.hash === "#my-clubs" ? "swipe" : "quiz"
  );

  useEffect(() => {
    if (window.location.hash === "#my-clubs") {
      requestAnimationFrame(() =>
        document.getElementById("my-clubs")?.scrollIntoView({ behavior: "smooth" })
      );
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [step]);

  function completeQuiz(answers) {
    actions.setQuizAnswers(answers);
    setStep("swipe");
  }

  return step === "quiz" ? (
    <ClubQuiz initialAnswers={quizAnswers} onComplete={completeQuiz} />
  ) : (
    <ClubSwipe onRetake={() => setStep("quiz")} />
  );
}
