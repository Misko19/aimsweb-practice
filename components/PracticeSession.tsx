"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Assessment, Grade } from "@/lib/assessments";
import { generatePracticeItems, isCorrectAnswer, oralPassageForGrade, writingPromptForGrade } from "@/lib/practice";

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
  kind: "accuracy" | "words-read" | "word-count";
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
  const [writing, setWriting] = useState("");
  const [writingPrompt, setWritingPrompt] = useState(() => writingPromptForGrade(grade));
  const [readingDone, setReadingDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"local" | "saving" | "saved" | "consent" | "rate-limit" | "error">("local");
  const startedAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitLocked = useRef(false);
  const feedbackTimeout = useRef<number | undefined>(undefined);
  const passage = useMemo(() => oralPassageForGrade(grade), [grade]);
  const current = items[index];

  useEffect(() => {
    if (stage !== "active") return;
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(seconds);
      if (assessment.mode === "oral-reading" && seconds >= 60) setReadingDone(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, assessment.mode]);

  useEffect(() => {
    if (stage === "active" && assessment.mode !== "oral-reading") inputRef.current?.focus();
  }, [stage, index, assessment.mode]);

  useEffect(() => () => {
    if (feedbackTimeout.current !== undefined) window.clearTimeout(feedbackTimeout.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function begin() {
    if (feedbackTimeout.current !== undefined) window.clearTimeout(feedbackTimeout.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    submitLocked.current = false;
    setItems(generatePracticeItems(assessment, grade));
    setIndex(0);
    setAnswer("");
    setCorrect(0);
    setElapsed(0);
    setWordsRead("");
    setWriting("");
    setWritingPrompt((current) => {
      let next = writingPromptForGrade(grade);
      for (let attempt = 0; attempt < 5 && next === current; attempt += 1) next = writingPromptForGrade(grade);
      return next;
    });
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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const oralCount = Number(wordsRead);
    const writtenWords = wordCount(writing);
    if (assessment.mode === "oral-reading" && (!Number.isInteger(oralCount) || oralCount < 0 || oralCount > passage.wordCount)) return;
    if (assessment.mode === "writing" && writtenWords === 0) return;
    const resultCorrect = assessment.mode === "oral-reading" ? oralCount : assessment.mode === "writing" ? writtenWords : finalCorrect;
    const resultTotal = assessment.mode === "oral-reading" ? passage.wordCount : assessment.mode === "writing" ? writtenWords : items.length;
    const kind = assessment.mode === "oral-reading" ? "words-read" : assessment.mode === "writing" ? "word-count" : "accuracy";
    const result: SavedAttempt = {
      id: localAttemptId(),
      assessment: assessment.slug,
      grade,
      correct: resultCorrect,
      total: resultTotal,
      durationSeconds: Math.min(3_600, Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000))),
      completedAt: new Date().toISOString(),
      kind,
    };
    try {
      const previous = JSON.parse(window.localStorage.getItem("brightpath-attempts") ?? "[]") as unknown[];
      window.localStorage.setItem("brightpath-attempts", JSON.stringify([result, ...previous].slice(0, 100)));
    } catch {
      // Practice still works when storage is unavailable.
    }
    setCorrect(resultCorrect);
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
      if (response.ok) setSaveStatus("saved");
      else if (response.status === 403) setSaveStatus("consent");
      else if (response.status === 429) setSaveStatus("rate-limit");
      else setSaveStatus("error");
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
            <li>{assessment.mode === "oral-reading" ? "Read the original passage aloud for up to one minute." : assessment.mode === "writing" ? "Plan your idea, then write for up to three minutes." : "Answer a short set of original practice questions."}</li>
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
        ) : assessment.mode === "writing" ? (
          <p className="big-result"><strong>{wordCount(writing)}</strong><span>words written in an original response</span></p>
        ) : (
          <p className="big-result"><strong>{correct} of {items.length}</strong><span>correct · {percentage}% practice accuracy</span></p>
        )}
        <p>You practiced for {Math.max(1, elapsed)} seconds. {childId ? trackedSaveNotice(saveStatus) : "Your result is saved only in this browser while you are a guest."}</p>
        <div className="result-actions">
          <button className="button button-primary" onClick={begin}>Practice again</button>
          <Link className="button button-quiet" href={`/?grade=${grade}${childId ? `&child=${encodeURIComponent(childId)}` : ""}`}>Choose another activity</Link>
        </div>
      </section>
    );
  }

  if (assessment.mode === "writing") {
    const words = wordCount(writing);
    return (
      <section className="practice-panel writing-panel">
        <div className="practice-progress"><span>Write your response</span><span role="timer" aria-label={elapsed + " seconds elapsed"}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span></div>
        <p className="eyebrow">Original writing prompt</p>
        <h1>{writingPrompt}</h1>
        <label className="answer-label" htmlFor="writing-response">Your response</label>
        <textarea id="writing-response" className="writing-input" aria-describedby="writing-count" value={writing} onChange={(event) => setWriting(event.target.value)} rows={10} />
        <p id="writing-count">{words} {words === 1 ? "word" : "words"} written</p>
        <button className="button button-primary button-large" disabled={words === 0} onClick={() => finish()}>Finish writing</button>
      </section>
    );
  }

  if (assessment.mode === "oral-reading") {
    const oralCount = Number(wordsRead);
    const validOralCount = wordsRead !== "" && Number.isInteger(oralCount) && oralCount >= 0 && oralCount <= passage.wordCount;
    return (
      <section className="practice-panel oral-panel">
        <div className="practice-progress"><span>Read aloud</span><span role="timer" aria-label={elapsed + " seconds elapsed"}>{Math.min(elapsed, 60)} sec</span></div>
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

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function trackedSaveNotice(status: "local" | "saving" | "saved" | "consent" | "rate-limit" | "error") {
  if (status === "saved") return "Progress saved to this child profile.";
  if (status === "consent") return <>A parent needs to accept the updated privacy notice. <Link href="/parent/consent">Review the notice.</Link></>;
  if (status === "rate-limit") return "Cloud saving is paused briefly; the result is still on this device.";
  if (status === "error") return "Cloud save failed; the result is still on this device.";
  return "Saving progress…";
}

function localAttemptId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
