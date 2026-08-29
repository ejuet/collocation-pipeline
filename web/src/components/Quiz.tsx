"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import type { QuizExercise } from "@/lib/quiz-data";

type Stats = {
  points: number;
  reachablePoints: number;
};

const STORAGE_KEY = "fluentgap-quiz-points-v2";
const ASKED_KEY = "fluentgap-asked-exercises";
const MAX_POINTS = 100;
const MAX_SUGGESTION_POINTS = 75;
const emptyStats: Stats = { points: 0, reachablePoints: 0 };

const copy = {
  en: {
    placeholder: "Your answer",
    check: "Check answer",
    correct: "Correct — 100 points.",
    incorrect: "Not the accepted answer.",
    answer: "Accepted answer",
    ai: "AI suggestions",
    points: "points",
    earned: "You earned",
    matched: "Your answer",
    next: "Next question",
    stats: "Score so far",
    reachable: "reachable",
    reset: "Reset statistics",
  },
  de: {
    placeholder: "Deine Antwort",
    check: "Antwort prüfen",
    correct: "Richtig — 100 Punkte.",
    incorrect: "Nicht die akzeptierte Antwort.",
    answer: "Akzeptierte Antwort",
    ai: "KI-Vorschläge",
    points: "Punkte",
    earned: "Du hast",
    matched: "Deine Antwort",
    next: "Nächste Frage",
    stats: "Dein Spielstand",
    reachable: "erreichbar",
    reset: "Statistik zurücksetzen",
  },
} as const;

function normalise(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isAcceptedAnswer(exercise: QuizExercise, value: string) {
  return exercise.gap.accepted.some((accepted) => normalise(accepted) === normalise(value));
}

function pointsForPrediction(exercise: QuizExercise, prediction: QuizExercise["predictions"][number]) {
  if(isAcceptedAnswer(exercise, prediction.word)) return MAX_POINTS;

  const strongestScore = Math.max(...exercise.predictions.map((item) => item.score), 0);
  if(strongestScore === 0) return 0;

  // Suggested alternatives remain worthwhile, but the accepted answer always
  // has the highest value. Scores are scaled to the AI's strongest suggestion.
  return Math.max(1, Math.round((prediction.score / strongestScore) * MAX_SUGGESTION_POINTS));
}

function pointsForAnswer(exercise: QuizExercise, value: string) {
  if(isAcceptedAnswer(exercise, value)) return MAX_POINTS;

  const matchingPrediction = exercise.predictions.find(
    (prediction) => normalise(prediction.word) === normalise(value),
  );
  return matchingPrediction ? pointsForPrediction(exercise, matchingPrediction) : 0;
}

export default function Quiz({ exercises, lang }: { exercises: QuizExercise[]; lang: "en" | "de" }) {
  const [index, setIndex] = useState(0);
  const askedIds = useRef<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
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

    const userCorrect = isAcceptedAnswer(exercise, answer);
    const answerPoints = pointsForAnswer(exercise, answer);
    const nextStats = {
      points: stats.points + answerPoints,
      reachablePoints: stats.reachablePoints + MAX_POINTS,
    };

    setResult(userCorrect);
    setEarnedPoints(answerPoints);
    setStats(nextStats);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  }

  function nextQuestion() {
    selectQuestion();
    setAnswer("");
    setResult(null);
    setEarnedPoints(0);
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
        <div className={`quiz-result ${result ? "is-correct" : earnedPoints ? "is-points" : "is-incorrect"}`}>
          <p>
            {result
              ? text.correct
              : <>{text.incorrect} {text.earned} <strong>{earnedPoints} {text.points}</strong>. {text.answer}: <strong>{exercise.gap.accepted.join(" / ")}</strong></>}
          </p>
          <p className="collocation-detail">“{exercise.collocation.phrase}” - {exercise.collocation.meaning}</p>
          <div className="responses">
            <p className="response-title">{text.ai}</p>
            <ul>
              {exercise.predictions.map((prediction) => (
                <li key={prediction.word}>
                  <span>
                    {prediction.word}
                    {normalise(prediction.word) === normalise(answer) && <strong className="answer-match">✓ {text.matched}</strong>}
                  </span>
                  <span>{pointsForPrediction(exercise, prediction)} {text.points}</span>
                </li>
              ))}
            </ul>
          </div>
          <button className="text-button" onClick={nextQuestion} type="button">{text.next} →</button>
        </div>
      )}

      <div className="stats-row">
        <p className="quiz-stats">
          {text.stats}: {stats.points} {text.points} · {stats.reachablePoints} {text.reachable}
        </p>
        <button className="reset-button" onClick={resetStats} type="button">{text.reset}</button>
      </div>
    </section>
  );
}
