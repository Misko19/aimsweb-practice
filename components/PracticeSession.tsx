"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Assessment, Grade } from "@/lib/assessments";
import { generatePracticeItems, isCorrectAnswer, oralPassageForGrade } from "@/lib/practice";

type Stage = "intro" | "active" | "result";

type Props = { assessment: Assessment; grade: Grade; childId?: string };

type SavedAttempt = {
  id: string;
  assessment: string;
  grade: Grade;
  correct: number;
  total: number;
  durationSeconds: number;
  completedAt: string;
  kind: "accuracy" | "words-read";
};

export function PracticeSession({ assessment, grade, childId }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [items, setItems] = useState(() => generatePracticeItems(assessment, grade));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [wordsRead, setWordsRead] = useState("");
  const [readingDone, setReadingDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"local" | "saving" | "saved" | "error">("local");
  const startedAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitLocked = useRef(false);
  const feedbackTimeout = useRef<number | undefined>(undefined);
  const passage = useMemo(() => oralPassageForGrade(grade), [grade]);
  const current = items[index];

  useEffect(() => {
    if (stage !== "active") return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage === "active" && assessment.mode !== "oral-reading") inputRef.current?.focus();
  }, [stage, index, assessment.mode]);

  useEffect(() => () => {
    if (feedbackTimeout.current !== undefined) window.clearTimeout(feedbackTimeout.current);
  }, []);

  function begin() {
    if (feedbackTimeout.current !== undefined) window.clearTimeout(feedbackTimeout.current);
    submitLocked.current = false;
    setItems(generatePracticeItems(assessment, grade));
    setIndex(0);
    setAnswer("");
    setCorrect(0);
    setElapsed(0);
    setWordsRead("");
    setReadingDone(false);
    setSaveStatus(childId ? "saving" : "local");
    startedAt.current = Date.now();
    setStage("active");
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function submitAnswer() {
    if (submitLocked.current || !current || !answer.trim()) return;
    submitLocked.current = true;
    const wasCorrect = isCorrectAnswer(answer, current.answer);
    if (wasCorrect) setCorrect((value) => value + 1);
    setShowFeedback(true);
    feedbackTimeout.current = window.setTimeout(() => {
      setShowFeedback(false);
      setAnswer("");
      submitLocked.current = false;
      if (index + 1 >= items.length) finish(correct + (wasCorrect ? 1 : 0));
      else setIndex((value) => value + 1);
    }, 700);
  }

  function finish(finalCorrect = correct) {
    const oralCount = Number(wordsRead);
    if (assessment.mode === "oral-reading" && (!Number.isInteger(oralCount) || oralCount < 0 || oralCount > passage.wordCount)) return;
    const result: SavedAttempt = {
      id: localAttemptId(),
      assessment: assessment.slug,
      grade,
      correct: assessment.mode === "oral-reading" ? oralCount : finalCorrect,
      total: assessment.mode === "oral-reading" ? passage.wordCount : items.length,
      durationSeconds: Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000)),
      completedAt: new Date().toISOString(),
      kind: assessment.mode === "oral-reading" ? "words-read" : "accuracy",
    };
    try {
      const previous = JSON.parse(window.localStorage.getItem("brightpath-attempts") ?? "[]") as unknown[];
      window.localStorage.setItem("brightpath-attempts", JSON.stringify([result, ...previous].slice(0, 100)));
    } catch {
      // Practice still works when storage is unavailable.
    }
    setCorrect(finalCorrect);
    setStage("result");
    if (childId) void syncAttempt(result);
  }

  async function syncAttempt(result: SavedAttempt) {
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientAttemptId: result.id,
          childProfileId: childId,
          assessmentSlug: result.assessment,
          grade: result.grade,
          correct: result.correct,
          total: result.total,
          durationSeconds: result.durationSeconds,
          completedAt: result.completedAt,
          kind: result.kind,
        }),
      });
      setSaveStatus(response.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  }

  if (stage === "intro") {
    return (
      <section className="practice-panel intro-panel">
        <div className="activity-emblem" aria-hidden="true">{assessment.domain === "Reading" ? "Aa" : "1+2"}</div>
        <p className="eyebrow">Ready when you are</p>
        <h1>{assessment.name}</h1>
        <p className="practice-description">{assessment.description}</p>
        <div className="instruction-box">
          <h2>How this practice works</h2>
          <ul>
            <li>{assessment.mode === "oral-reading" ? "Read the original passage aloud for up to one minute." : "Answer a short set of original practice questions."}</li>
            <li>This is practice, so take your time and do your best.</li>
            {assessment.adultHelp && <li>A grown-up helper can sit nearby.</li>}
          </ul>
        </div>
        <button className="button button-primary button-large" onClick={begin}>Let&apos;s go <span aria-hidden="true">→</span></button>
        <p className="fine-print">Results on this device are practice metrics—not official test scores.</p>
      </section>
    );
  }

  if (stage === "result") {
    const percentage = Math.round((correct / Math.max(1, items.length)) * 100);
    return (
      <section className="practice-panel result-panel" aria-live="polite">
        <div className="celebration" aria-hidden="true">✦ ★ ✦</div>
        <p className="eyebrow">Adventure complete</p>
        <h1>Nice, steady work!</h1>
        {assessment.mode === "oral-reading" ? (
          <p className="big-result"><strong>{Number(wordsRead)}</strong><span>words read accurately</span></p>
        ) : (
          <p className="big-result"><strong>{correct} of {items.length}</strong><span>correct · {percentage}% practice accuracy</span></p>
        )}
        <p>You practiced for {Math.max(1, elapsed)} seconds. {childId ? (saveStatus === "saved" ? "Progress saved to this child profile." : saveStatus === "error" ? "Cloud save failed; the result is still on this device." : "Saving progress…") : "Your result is saved only in this browser while you are a guest."}</p>
        <div className="result-actions">
          <button className="button button-primary" onClick={begin}>Practice again</button>
          <Link className="button button-quiet" href={`/?grade=${grade}${childId ? `&child=${encodeURIComponent(childId)}` : ""}`}>Choose another activity</Link>
        </div>
      </section>
    );
  }

  if (assessment.mode === "oral-reading") {
    const oralCount = Number(wordsRead);
    const validOralCount = wordsRead !== "" && Number.isInteger(oralCount) && oralCount >= 0 && oralCount <= passage.wordCount;
    return (
      <section className="practice-panel oral-panel">
        <div className="practice-progress"><span>Read aloud</span><span aria-label={`${elapsed} seconds elapsed`}>{Math.min(elapsed, 60)} sec</span></div>
        <h1>{passage.title}</h1>
        <p className="reading-passage">{passage.text}</p>
        {!readingDone ? (
          <button className="button button-primary" onClick={() => setReadingDone(true)}>I&apos;m done reading</button>
        ) : (
          <div className="self-score">
            <label htmlFor="words-read">With a grown-up, enter how many words were read correctly (up to {passage.wordCount}).</label>
            <input id="words-read" type="number" min="0" max={passage.wordCount} value={wordsRead} onChange={(event) => setWordsRead(event.target.value)} />
            <button className="button button-primary" disabled={!validOralCount} onClick={() => finish()}>See my result</button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="practice-panel question-panel">
      <div className="practice-progress">
        <span>Question {index + 1} of {items.length}</span>
        <span>{Math.round(((index + 1) / items.length) * 100)}%</span>
      </div>
      <div className="progress-track" aria-hidden="true"><span style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
      {current?.speak && <button className="listen-button" onClick={() => speak(current.speak!)} aria-label="Listen to the question">🔊 Listen</button>}
      {current?.context && <p className="question-context">{current.context}</p>}
      <h1 className="question-prompt">{current?.prompt}</h1>
      {current?.choices ? (
        <div className="choice-grid" role="group" aria-label="Answer choices">
          {current.choices.map((choice) => (
            <button key={choice} className={answer === choice ? "choice selected" : "choice"} onClick={() => setAnswer(choice)} aria-pressed={answer === choice}>{choice}</button>
          ))}
        </div>
      ) : (
        <label className="answer-label">Your answer
          <input ref={inputRef} className="answer-input" value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitAnswer()} autoComplete="off" inputMode={assessment.domain === "Math" ? "numeric" : "text"} />
        </label>
      )}
      <button className="button button-primary button-large" disabled={!answer.trim() || showFeedback} onClick={submitAnswer}>Check answer</button>
      {showFeedback && <div className="feedback" role="status">Answer saved. Keep going!</div>}
    </section>
  );
}

function localAttemptId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
