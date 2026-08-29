type LanguageSelectorProps = {
  lang: "en" | "de";
  path?: string;
};

const languages = {
  en: "English",
  de: "Deutsch",
} as const;

export default function LanguageSelector({
  lang,
  path = "",
}: LanguageSelectorProps) {
  return (
    <details className="language-selector">
      <summary>{languages[lang]}</summary>
      <ul>
        {Object.entries(languages).map(([language, label]) => (
          <li key={language}>
            <a href={`/${language}${path}`}>{label}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}
