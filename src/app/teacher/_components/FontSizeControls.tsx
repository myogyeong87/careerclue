"use client";

import { useTeacherFontSize } from "@/lib/teacherFontSize";

export default function FontSizeControls() {
  const { size, canDecrease, canIncrease, decrease, increase } = useTeacherFontSize();
  const btn =
    "rounded-lg px-3 py-1.5 font-semibold transition hover:bg-[var(--color-soft)] disabled:opacity-40";

  return (
    <div
      className="flex items-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-base"
      title={`답·이름표·순위표 글자 크기 (${size}px)`}
    >
      <button type="button" onClick={decrease} disabled={!canDecrease} className={btn} aria-label="글자 작게">
        가-
      </button>
      <span className="w-12 text-center text-sm text-[var(--color-muted)]">{size}px</span>
      <button type="button" onClick={increase} disabled={!canIncrease} className={`${btn} text-lg`} aria-label="글자 크게">
        가+
      </button>
    </div>
  );
}
