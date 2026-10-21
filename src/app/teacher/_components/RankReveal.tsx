"use client";

import { useEffect, useState } from "react";
import type { RankGroup } from "@/lib/ranking";
import { tfs } from "@/lib/teacherFontSize";
import Confetti from "@/app/_components/Confetti";

/**
 * 종료 화면 TOP 5 연출. revealed는 공개된 순서(5위 → 1위)대로 들어오며,
 * 가장 최근에 공개된 순위가 맨 위에 크게 등장하고 이전 카드들은 그 아래로 쌓인다.
 */
export default function RankReveal({
  revealed,
  total,
  busy,
  nextLabel,
  onNext,
}: {
  revealed: RankGroup[];
  total: number;
  busy: boolean;
  nextLabel: string;
  onNext: () => void;
}) {
  const newest = revealed[revealed.length - 1];
  const stack = [...revealed].sort((a, b) => a.rank - b.rank);
  const firstPlaceShown = newest?.rank === 1;

  return (
    <div className="flex min-h-[78vh] flex-1 flex-col items-center justify-center gap-[0.6em] pb-6" style={{ fontSize: tfs() }}>
      {firstPlaceShown && <Confetti />}

      {revealed.length === 0 ? (
        <div className="flex flex-col items-center gap-[0.4em] text-center motion-safe:animate-[rankPop_0.7s_ease-out]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dog.png" alt="" className="h-[6em] w-[6em]" />
          <p className="text-[1.4em] text-[var(--color-muted)]">두구두구…</p>
          <h2 className="font-[family-name:var(--font-accent)] text-[4.5em] leading-none text-[var(--color-primary-ink)]">
            이번 시간 TOP 5
          </h2>
        </div>
      ) : (
        <div className="flex w-full max-w-5xl flex-col items-center gap-[0.5em]">
          {stack.map((group) => (
            <RankCard key={group.rank} group={group} isNewest={group === newest} />
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onNext}
        className="relative z-50 mt-[0.6em] rounded-[var(--radius-card)] bg-[var(--color-primary)] px-[1.4em] py-[0.5em] text-[1.3em] font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-card)] disabled:opacity-50"
      >
        {nextLabel}
      </button>
      {total > 0 && (
        <p className="text-[0.8em] text-[var(--color-muted)]">
          {revealed.length} / {total}
        </p>
      )}
    </div>
  );
}

function RankCard({ group, isNewest }: { group: RankGroup; isNewest: boolean }) {
  const isFirst = group.rank === 1;
  const names = group.entries.map((e) => e.studentName);
  const label = `${group.entries.length > 1 ? "공동 " : ""}${group.rank}위`;

  if (isNewest) {
    return (
      <div
        className={`flex w-full flex-col items-center gap-[0.2em] rounded-[calc(var(--radius-card)*1.5)] border-4 px-[1em] py-[0.6em] text-center shadow-[0_12px_40px_rgba(242,169,59,0.35)] motion-safe:animate-[rankPop_0.7s_cubic-bezier(0.2,1.4,0.4,1)] ${
          isFirst
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
            : "border-[var(--color-primary)] bg-[var(--color-surface)]"
        }`}
        style={{ fontSize: isFirst ? "1.5em" : "1.1em" }}
      >
        {isFirst && (
          <span className="text-[2.6em] leading-none motion-safe:animate-[crownDrop_0.9s_ease-out]">
            👑
          </span>
        )}
        <span
          className={`font-[family-name:var(--font-accent)] text-[1.6em] leading-none ${
            isFirst ? "" : "text-[var(--color-primary-ink)]"
          }`}
        >
          {label}
        </span>
        <span className="flex flex-wrap justify-center gap-x-[0.6em] font-[family-name:var(--font-heading)] text-[2.4em] font-bold leading-tight">
          {names.map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </span>
        <span className="font-[family-name:var(--font-accent)] text-[2em] leading-none">
          {isFirst ? <CountUp value={group.score} /> : group.score}점
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full max-w-3xl items-center gap-[0.8em] rounded-[var(--radius-card)] border-2 px-[1em] py-[0.35em] ${
        isFirst
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/20"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <span className="min-w-[3.5em] font-[family-name:var(--font-accent)] text-[1.2em] text-[var(--color-primary-ink)]">
        {label}
      </span>
      <span className="flex-1 truncate font-semibold">{names.join(" · ")}</span>
      <span className="font-[family-name:var(--font-accent)] text-[1.1em]">{group.score}점</span>
    </div>
  );
}

/** 0에서 목표 점수까지 올라가는 카운트업 */
function CountUp({ value, durationMs = 1800 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{shown}</>;
}
