let generation = 0;
let activeReport = null;

export function speechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

function loadVoices() {
  const synthesis = window.speechSynthesis;
  const existing = synthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      synthesis.removeEventListener("voiceschanged", finish);
      resolve(synthesis.getVoices());
    };
    const timer = window.setTimeout(finish, 1800);
    synthesis.addEventListener("voiceschanged", finish, { once: true });
  });
}

function chooseVoice(voices) {
  const english = voices.filter((voice) => /^en(?:-|_)/i.test(voice.lang));
  const preferredVoiceName =
    /samantha|ava|allison|susan|victoria|karen|moira|tessa|fiona|veena|aria|jenny|jane|sara|zira|libby|sonia|amy|emma|natasha/i;
  const naturalVoice = /natural|neural|premium|enhanced/i;
  const localeRank = (voice) => {
    const locale = voice.lang.toLowerCase().replace("_", "-");
    if (locale.startsWith("en-ca")) return 0;
    if (locale.startsWith("en-us")) return 1;
    if (locale.startsWith("en-gb")) return 2;
    return 3;
  };
  return english.sort((a, b) => {
    const quality = (voice) =>
      (preferredVoiceName.test(voice.name) ? 0 : 2) +
      (naturalVoice.test(`${voice.name} ${voice.voiceURI}`) ? 0 : 1) +
      (/google.*english/i.test(voice.name) ? 0.5 : 0);
    return quality(a) - quality(b) || localeRank(a) - localeRank(b);
  })[0];
}

export function stopActiveSpeech() {
  generation += 1;
  const current = activeReport;
  activeReport = null;
  if (speechSupported()) window.speechSynthesis.cancel();
  current?.onUpdate({ status: "stopped", index: current.index });
}

export async function playSpeechSentences(sentences, onUpdate) {
  if (!speechSupported()) return false;
  stopActiveSpeech();

  const token = generation;
  const report = { token, sentences, index: 0, onUpdate };
  activeReport = report;
  const voices = await loadVoices();
  if (generation !== token || activeReport !== report) return false;
  const voice = chooseVoice(voices);

  function speak(index) {
    if (generation !== token || activeReport !== report) return;
    if (index >= sentences.length) {
      activeReport = null;
      onUpdate({ status: "finished", index: sentences.length - 1 });
      return;
    }

    report.index = index;
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.96;
    utterance.pitch = 1.08;
    utterance.onstart = () => onUpdate({ status: "playing", index });
    utterance.onend = () => speak(index + 1);
    utterance.onerror = () => {
      if (generation !== token || activeReport !== report) return;
      activeReport = null;
      onUpdate({ status: "stopped", index });
    };
    window.speechSynthesis.speak(utterance);
  }

  onUpdate({ status: "playing", index: 0 });
  speak(0);
  return true;
}

export function pauseActiveSpeech() {
  if (!speechSupported() || !activeReport) return;
  window.speechSynthesis.pause();
  activeReport.onUpdate({ status: "paused", index: activeReport.index });
}

export function resumeActiveSpeech() {
  if (!speechSupported() || !activeReport) return;
  window.speechSynthesis.resume();
  activeReport.onUpdate({ status: "playing", index: activeReport.index });
}
