"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import type { QuizExercise } from "@/lib/quiz-data";

type Stats = {
  userCorrect: number;
  userTotal: number;
  aiCorrect: number;
  aiTotal: number;
};

const STORAGE_KEY = "fluentgap-quiz-stats";
const ASKED_KEY = "fluentgap-asked-exercises";
const emptyStats: Stats = { userCorrect: 0, userTotal: 0, aiCorrect: 0, aiTotal: 0 };

const copy = {
  en: {
    placeholder: "Your answer",
    check: "Check answer",
    correct: "Correct.",
    incorrect: "Not quite.",
    answer: "Accepted answer",
    ai: "AI responses",
    score: "score",
    next: "Next question",
    stats: "Score so far",
    you: "You",
    model: "AI",
    reset: "Reset statistics",
  },
  de: {
    placeholder: "Deine Antwort",
    check: "Antwort prüfen",
    correct: "Richtig.",
    incorrect: "Leider nicht.",
    answer: "Akzeptierte Antwort",
    ai: "KI-Antworten",
    score: "Punktzahl",
    next: "Nächste Frage",
    stats: "Dein Spielstand",
    you: "Du",
    model: "KI",
    reset: "Statistik zurücksetzen",
  },
} as const;

function normalise(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function Quiz({ exercises, lang }: { exercises: QuizExercise[]; lang: "en" | "de" }) {
  const [index, setIndex] = useState(0);
  const askedIds = useRef<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const answerInput = useRef<HTMLInputElement>(null);
  const text = copy[lang];
  const exercise = exercises[index];
  const breakpoints = [...new Set([
    0,
    exercise.sentence.length,
    exercise.gap.start,
    exercise.gap.end,
    ...exercise.collocation_ranges.flatMap((range) => [range.start, range.end]),
  ])].sort((a, b) => a - b);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if(!saved) return;

    try {
      setStats({ ...emptyStats, ...JSON.parse(saved) });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(ASKED_KEY);
    let previousIds: string[] = [];

    try {
      previousIds = saved ? JSON.parse(saved) : [];
    } catch {
      window.localStorage.removeItem(ASKED_KEY);
    }

    askedIds.current = previousIds;
    selectQuestion();
    // Select the first random question once browser storage is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectQuestion() {
    const used = new Set(askedIds.current);
    const available = exercises.filter((item) => !used.has(item.id));
    const pool = available.length ? available : exercises;
    const next = pool[Math.floor(Math.random() * pool.length)];
    const nextIds = available.length ? [...used, next.id] : [next.id];

    // Keep this in a ref as well as storage. State updates are asynchronous, so
    // a second selection before React renders must still see this question.
    askedIds.current = nextIds;
    setIndex(exercises.indexOf(next));
    window.localStorage.setItem(ASKED_KEY, JSON.stringify(nextIds));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!answer.trim() || result !== null) return;

    const userCorrect = exercise.gap.accepted.some(
      (accepted) => normalise(accepted) === normalise(answer),
    );
    const aiCorrect = exercise.gap.accepted.some(
      (accepted) => normalise(accepted) === normalise(exercise.predictions[0]?.word ?? ""),
    );
    const nextStats = {
      userCorrect: stats.userCorrect + Number(userCorrect),
      userTotal: stats.userTotal + 1,
      aiCorrect: stats.aiCorrect + Number(aiCorrect),
      aiTotal: stats.aiTotal + 1,
    };

    setResult(userCorrect);
    setStats(nextStats);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  }

  function nextQuestion() {
    selectQuestion();
    setAnswer("");
    setResult(null);
    window.requestAnimationFrame(() => answerInput.current?.focus());
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if(event.key === "Enter" && result !== null) {
        event.preventDefault();
        nextQuestion();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // `nextQuestion` is recreated on render; the values it uses are included here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function resetStats() {
    setStats(emptyStats);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section className="quiz" aria-live="polite">
      <form className="answer-form" onSubmit={submit}>
        <p className="gap-text">
          {breakpoints.slice(0, -1).map((start, partIndex) => {
            const end = breakpoints[partIndex + 1];
            const isGap = start === exercise.gap.start;
            const isCollocationPart = exercise.collocation_ranges.some(
              (range) => range.start <= start && range.end >= end,
            );

            if(isGap) {
              return <Fragment key={`gap-${start}`}><label className="sr-only" htmlFor="answer">{text.placeholder}</label><input
                aria-label={text.placeholder}
                autoComplete="off"
                autoFocus
                className={`gap-input${isCollocationPart ? " collocation-part" : ""}`}
                disabled={result !== null}
                id="answer"
                onChange={(event) => setAnswer(event.target.value)}
                ref={answerInput}
                size={Math.max(2, answer.length)}
                value={answer}
              /></Fragment>;
            }

            const content = exercise.sentence.slice(start, end);
            return isCollocationPart
              ? <strong key={start}>{content}</strong>
              : <span key={start}>{content}</span>;
          })}
        </p>
        <button className="button" disabled={result !== null || !answer.trim()} type="submit">
          {text.check}
        </button>
      </form>

      {result !== null && (
        <div className={`quiz-result ${result ? "is-correct" : "is-incorrect"}`}>
          <p>
            {result ? text.correct : <>{text.incorrect} {text.answer}: <strong>{exercise.gap.accepted.join(" / ")}</strong></>}
          </p>
          <p className="collocation-detail">“{exercise.collocation.phrase}” - {exercise.collocation.meaning}</p>
          <div className="responses">
            <p className="response-title">{text.ai}</p>
            <ul>
              {exercise.predictions.map((prediction) => (
                <li key={prediction.word}>
                  <span>{prediction.word}</span><span>{text.score} {prediction.score.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </div>
          <button className="text-button" onClick={nextQuestion} type="button">{text.next} →</button>
        </div>
      )}

      <div className="stats-row">
        <p className="quiz-stats">
          {text.stats}: {text.you} {stats.userCorrect}/{stats.userTotal} · {text.model} {stats.aiCorrect}/{stats.aiTotal}
        </p>
        <button className="reset-button" onClick={resetStats} type="button">{text.reset}</button>
      </div>
    </section>
  );
}
