import { notFound } from "next/navigation";
import LanguageSelector from "@/components/LanguageSelector";
import Quiz from "@/components/Quiz";
import { getQuizExercises } from "@/lib/quiz-data";

const translations = {
  en: {
    eyebrow: "Word quiz",
    title: "Fill the gap.",
    unavailable: "There are no quiz questions for this language yet.",
  },
  de: {
    eyebrow: "Wortquiz",
    title: "Füll die Lücke.",
    unavailable: "Für diese Sprache gibt es noch keine Quizfragen.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(translations).map((lang) => ({ lang }));
}

export default function QuizPage({ params }: { params: { lang: string } }) {
  if(!(params.lang in translations)) notFound();

  const lang = params.lang as keyof typeof translations;
  const copy = translations[lang];
  const exercises = getQuizExercises(lang);

  return (
    <main className="shell">
      <LanguageSelector lang={params.lang as keyof typeof translations} path="/quiz" />
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1 className="quiz-title">{copy.title}</h1>
      {exercises.length ? <Quiz exercises={exercises} lang={lang} /> : <p className="lead">{copy.unavailable}</p>}
    </main>
  );
}
