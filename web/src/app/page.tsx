export default function Home() {
  // A relative URL preserves the current base path: / → /en/ locally and
  // /fluentgap/ → /fluentgap/en/ on GitHub Pages.
  return <meta httpEquiv="refresh" content="0; url=en/" />;
}
