import Link from "next/link";
import { notFound } from "next/navigation";
import LanguageSelector from "@/components/LanguageSelector";

const translations = {
  en: {
    eyebrow: "Word quiz",
    title: "Coming soon.",
    description:
      "This is where you’ll practise choosing the words that naturally belong together.",
    back: "← Back to the start",
  },
  de: {
    eyebrow: "Wortquiz",
    title: "Demnächst verfügbar.",
    description:
      "Hier übst du, die Wörter zu wählen, die ganz natürlich zusammengehören.",
    back: "← Zurück zum Anfang",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(translations).map((lang) => ({ lang }));
}

export default function QuizPage({ params }: { params: { lang: string } }) {
  if (!(params.lang in translations)) notFound();

  const copy = translations[params.lang as keyof typeof translations];

  return (
    <main className="shell">
      <LanguageSelector lang={params.lang as keyof typeof translations} path="/quiz" />
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="lead">{copy.description}</p>
      <Link className="text-link" href={`/${params.lang}`}>
        {copy.back}
      </Link>
    </main>
  );
}
