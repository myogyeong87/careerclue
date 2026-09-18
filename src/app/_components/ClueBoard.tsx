const CLUE_PALETTE = [
  { bg: "#FEF3C7", border: "#F5D77E" },
  { bg: "#FCE7F3", border: "#F3B4D9" },
  { bg: "#DBEAFE", border: "#A9C8FB" },
  { bg: "#D1FAE5", border: "#86E0B8" },
  { bg: "#EDE9FE", border: "#C7B8FA" },
];

function clueColor(index: number) {
  return CLUE_PALETTE[index % CLUE_PALETTE.length];
}

export default function ClueBoard({
  hints,
  hintsOpen,
  scoring,
  initialsRevealed,
  chosung,
  charCountRevealed,
  charCount,
  revealed,
  answer,
  size = "compact",
}: {
  hints: string[];
  hintsOpen: number;
  scoring: number[];
  initialsRevealed: boolean;
  chosung?: string;
  charCountRevealed?: boolean;
  charCount?: string;
  revealed: boolean;
  answer?: string;
  size?: "large" | "compact";
}) {
  const large = size === "large";

  return (
    <div className={`flex flex-col ${large ? "flex-1 gap-4" : "gap-2"}`}>
      {revealed && answer && (
        <div
          className={`flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-card)] ${
            large ? "flex-1 px-10 py-6" : "px-4 py-3"
          }`}
        >
          <span
            className={`shrink-0 font-[family-name:var(--font-accent)] opacity-80 ${
              large ? "text-3xl" : "text-sm"
            }`}
          >
            정답
          </span>
          <span
            className={`font-[family-name:var(--font-heading)] font-bold ${
              large ? "text-6xl" : "text-xl"
            }`}
          >
            {answer}
          </span>
        </div>
      )}

      {hints.slice(0, hintsOpen).map((hint, i) => {
        const color = clueColor(i);
        return (
          <div
            key={i}
            style={{ backgroundColor: color.bg, borderColor: color.border }}
            className={`flex items-center gap-4 rounded-[var(--radius-card)] border-2 shadow-[var(--shadow-card)] ${
              large ? "flex-1 px-10 py-6" : "px-4 py-3"
            }`}
          >
            <span
              className={`shrink-0 font-[family-name:var(--font-accent)] text-[var(--color-primary)] ${
                large ? "text-3xl" : "text-sm"
              }`}
            >
              {scoring[i]}점
            </span>
            <span
              className={`text-[var(--foreground)] ${
                large ? "text-4xl leading-snug" : "text-sm leading-snug"
              }`}
            >
              {hint}
            </span>
          </div>
        );
      })}

      {charCountRevealed && charCount && (
        <div
          className={`flex items-center gap-4 rounded-[var(--radius-card)] border-4 border-[var(--color-accent)] bg-[var(--color-accent)]/25 shadow-[var(--shadow-card)] ${
            large ? "flex-1 px-10 py-6" : "px-4 py-3"
          }`}
        >
          <span
            className={`shrink-0 rounded-full bg-[var(--color-accent)] font-[family-name:var(--font-accent)] text-[var(--foreground)] ${
              large ? "px-5 py-2 text-xl" : "px-3 py-1 text-sm"
            }`}
          >
            글자수 힌트
          </span>
          <span
            className={`font-[family-name:var(--font-accent)] tracking-[0.4em] text-[var(--foreground)] ${
              large ? "text-6xl" : "text-2xl"
            }`}
          >
            {charCount}
          </span>
        </div>
      )}

      {initialsRevealed && chosung && (
        <div
          className={`flex items-center gap-4 rounded-[var(--radius-card)] border-4 border-[var(--color-primary)] bg-[var(--color-primary)]/15 shadow-[var(--shadow-card)] ${
            large ? "flex-1 px-10 py-6" : "px-4 py-3"
          }`}
        >
          <span
            className={`shrink-0 rounded-full bg-[var(--color-primary)] font-[family-name:var(--font-accent)] text-white ${
              large ? "px-5 py-2 text-xl" : "px-3 py-1 text-sm"
            }`}
          >
            초성 힌트
          </span>
          <span
            className={`font-[family-name:var(--font-accent)] tracking-[0.4em] text-[var(--color-primary)] ${
              large ? "text-6xl" : "text-2xl"
            }`}
          >
            {chosung}
          </span>
        </div>
      )}
    </div>
  );
}
