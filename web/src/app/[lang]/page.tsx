import Link from "next/link";
import { notFound } from "next/navigation";
import LanguageSelector from "@/components/LanguageSelector";


const translations = {
  en: {
    eyebrow: "Improve your language skills by learning collocations.",
    title: "FluentGap",
    description: (
      <>
        Learn common collocations and make your English or German sound more natural and precise. <b>Beat the AI</b> by choosing the word that fits best instead of one that is simply good enough.
      </>
    ),
    quiz: "Start the quiz",
  },

  de: {
    eyebrow: "Verbessere dein Sprachgefühl mit Kollokationen.",
    title: "FluentGap",
    description: (
      <>
        Lerne häufige Kollokationen und drücke dich auf Englisch oder Deutsch natürlicher und genauer aus. <b>Schlag die KI</b>, indem du das Wort wählst, das wirklich passt, statt eines, das nur ungefähr stimmt.
      </>
    ),
    quiz: "Quiz starten",
  },
} as const;


const supportedLanguages = Object.keys(translations) as Array<keyof typeof translations>;

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ lang }));
}

export default function LandingPage({ params }: { params: { lang: string } }) {
  if(!(params.lang in translations)) notFound();

  const copy = translations[params.lang as keyof typeof translations];

  return (
    <main className="shell">
      <LanguageSelector lang={params.lang as keyof typeof translations} />
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="lead">{copy.description}</p>
      <Link className="button" href={`/${params.lang}/quiz`}>
        {copy.quiz} <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
