import type { RunnerCopy } from "@/lib/runner-copy";

// Render the small Markdown subset in the confirmed copy without changing wording
// or interpreting source text as HTML. Links remain HTTPS and open separately.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    return link ? (
      <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">
        {link[1]} ↗
      </a>
    ) : (
      part
    );
  });
}

export function RaceRunnerCopy({ copy }: { copy: RunnerCopy }) {
  const [heading, ...blocks] = copy.markdown.trim().split(/\n\n+/);
  return (
    <section
      id="runner-copy"
      className="race-runner-copy"
      tabIndex={-1}
      aria-labelledby="runner-copy-heading"
    >
      <h2 id="runner-copy-heading">{heading.replace(/^# /, "")}</h2>
      <div className="runner-copy-body">
        {blocks.map((block, index) =>
          block.startsWith("## ") ? (
            <h3 key={index}>{block.slice(3)}</h3>
          ) : (
            <p key={index}>{inline(block)}</p>
          ),
        )}
      </div>
    </section>
  );
}
