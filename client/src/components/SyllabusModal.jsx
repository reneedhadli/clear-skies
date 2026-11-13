import { useRef, useState } from "react";
import { FileText, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import Chip from "./Chip.jsx";
import { useApp } from "../context/AppContext.jsx";
import { postJSON } from "../lib/api.js";
import { localExtract } from "../lib/localAI.js";
import { courses } from "../data/courses.js";
import cmput201 from "../data/syllabi/cmput201_syllabus.txt?raw";
import cmput204 from "../data/syllabi/cmput204_syllabus.txt?raw";
import math125 from "../data/syllabi/math125_syllabus.txt?raw";
import engl102 from "../data/syllabi/engl102_syllabus.txt?raw";

const SAMPLES = [
  { code: "CMPUT 201", text: cmput201 },
  { code: "CMPUT 204", text: cmput204 },
  { code: "MATH 125", text: math125 },
  { code: "ENGL 102", text: engl102 },
];

export default function SyllabusModal({ open, onClose, onAdded }) {
  const { actions } = useApp();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  function loadSamples() {
    setText(
      SAMPLES.map(
        (sample) => `===== ${sample.code} syllabus =====\n\n${sample.text.trim()}`
      ).join("\n\n")
    );
    setFileName("");
    setSampleLoaded(true);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file) {
    if (!file) return;
    setText("");
    setFileName("");
    setSampleLoaded(false);
    setError("");
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isText = file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
    if (!isPdf && !isText) {
      setError("Please upload a .pdf or .txt file. You can also paste the syllabus text.");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setError("That file is a little too big. Try a smaller syllabus file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let content;
      if (isPdf) {
        const [pdfjsLib, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
        const document = await pdfjsLib.getDocument({
          data: await file.arrayBuffer(),
        }).promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          const pageText = await page.getTextContent();
          pages.push(pageText.items.map((item) => ("str" in item ? item.str : "")).join(" "));
        }
        content = pages.join("\n").trim();
        if (!content) {
          setText("");
          setFileName("");
          setError("We couldn't read text from this PDF. Try pasting the syllabus text instead.");
          return;
        }
      } else {
        content = await file.text();
      }
      setText(content);
      setFileName(file.name);
      setSampleLoaded(false);
    } catch {
      setFileName("");
      setError(
        isPdf
          ? "We couldn't read text from this PDF. Try pasting the syllabus text instead."
          : "I couldn't read that file. Try pasting the text instead."
      );
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    handleFile(file);
  }

  function onDrop(event) {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function extract() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    let deadlines = [];
    try {
      const data = await postJSON("/api/extract", { text });
      deadlines = Array.isArray(data.deadlines) ? data.deadlines : [];
    } catch {
      deadlines = localExtract(text);
    }

    if (!deadlines.length) {
      setError(
        "I couldn't find dated, graded items in that text. Try the sample syllabi or add dates like \"Week 6 Midterm, Thursday, 20%\"."
      );
      setLoading(false);
      return;
    }

    const uniqueCourses = [...new Set(deadlines.map((item) => item.course))];
    const meta = uniqueCourses.map((code) => {
      const known = courses.find((course) => course.code === code);
      return {
        course: code,
        title: known?.name || "Uploaded syllabus",
        fileName: fileName || (sampleLoaded ? "Sample syllabus" : "Pasted syllabus"),
      };
    });
    actions.addDeadlines(deadlines, meta);
    setLoading(false);
    setText("");
    setFileName("");
    setSampleLoaded(false);
    if (fileRef.current) fileRef.current.value = "";
    onAdded?.(deadlines);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a syllabus"
      subtitle="Paste the text or upload a PDF or .txt. Stormy finds every due date."
      wide
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">AI can make mistakes. Double-check big dates.</p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={extract} disabled={!text.trim() || loading}>
              {loading ? (
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 size={17} aria-hidden="true" />
              )}
              {loading ? "Reading your syllabus..." : "Extract deadlines"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="rounded-2xl border border-dashed border-meadow-ink/20 bg-raised/30 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
        >
          <p className="text-sm font-bold text-text">
            Drop a PDF or .txt syllabus here, or click to choose
          </p>
          <label
            htmlFor="syllabus-file"
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-extrabold transition hover:bg-white/[0.07] focus-within:ring-2 focus-within:ring-amber sm:mt-0"
          >
            <Upload size={17} aria-hidden="true" />
            Choose file
          </label>
          <input
            ref={fileRef}
            id="syllabus-file"
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={onFileChange}
            className="sr-only"
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="soft" onClick={loadSamples} disabled={loading}>
            <Sparkles size={17} className="text-amber" aria-hidden="true" />
            Load sample syllabi
          </Button>
          {(fileName || sampleLoaded) && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sage">
              <FileText size={14} aria-hidden="true" />
              {sampleLoaded ? "4 sample syllabi loaded" : fileName}
            </span>
          )}
        </div>

        {sampleLoaded && (
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((sample) => (
              <Chip key={sample.code} tone="amber">
                {sample.code}
              </Chip>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="syllabus-text" className="text-sm font-extrabold">
            Syllabus text
          </label>
          <textarea
            id="syllabus-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSampleLoaded(false);
              setError("");
            }}
            rows={10}
            placeholder={"Paste your syllabus here...\n\nWeek 6 — Midterm on Thursday, 20%\nWeek 9 — Essay 2 due Friday, 15%"}
            className="mt-2 w-full resize-y rounded-[22px] border border-white/10 bg-raised/70 p-4 text-sm leading-relaxed text-text placeholder:text-muted/60 focus:border-amber/50"
            disabled={loading}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>Text stays in this demo. Nothing is saved on the server.</span>
            <span>{text.length.toLocaleString()} characters</span>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl bg-raised/60 p-4 text-sm text-muted">
            <Loader2 size={18} className="animate-spin text-amber" aria-hidden="true" />
            Reading your syllabus...
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
