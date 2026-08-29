import { readFileSync } from "node:fs";
import path from "node:path";

export type Exercise = {
  id: string;
  collocation_id: string;
  difficulty: number;
  sentence: string;
  gap: { accepted: string[]; start: number; end: number };
  collocation_ranges: Array<{ start: number; end: number }>;
};

export type Prediction = {
  word: string;
  score: number;
};

export type QuizExercise = Exercise & {
  predictions: Prediction[];
  collocation: { phrase: string; meaning: string };
};

type ScoreRecord = {
  exercise_id: string;
  scoring: { predictions: Prediction[] };
};

type Collocation = {
  id: string;
  language: string;
  phrase: string;
  meaning: string;
};

function readJsonLines<T>(fileName: string): T[] {
  const filePath = path.join(process.cwd(), "..", "data-quiz", fileName);

  return readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as T);
}

export function getQuizExercises(language: string): QuizExercise[] {
  const suffix = language === "de" ? "_de" : "";
  const scores = new Map(
    readJsonLines<ScoreRecord>(`scores${suffix}.jsonl`).map((score) => [
      score.exercise_id,
      score.scoring.predictions,
    ]),
  );
  const collocations = new Map(
    readJsonLines<Collocation>(`collocations${suffix}.jsonl`).map((collocation) => [
      collocation.id,
      {
        language: collocation.language,
        phrase: collocation.phrase,
        meaning: collocation.meaning,
      },
    ]),
  );

  return readJsonLines<Exercise>(`exercises${suffix}.jsonl`).flatMap((exercise) => {
    const predictions = scores.get(exercise.id);
    const collocation = collocations.get(exercise.collocation_id);
    return predictions && collocation?.language === language
      ? [{ ...exercise, predictions, collocation }]
      : [];
  });
}
