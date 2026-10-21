"use client";

import { useState } from "react";
import {
  PRACTICE_JOB,
  PRACTICE_SCORING,
  endPractice,
  revealPracticeAnswer,
  revealPracticeCharCount,
  revealPracticeHint,
  revealPracticeInitials,
} from "@/lib/practice";
import type { PracticeState } from "@/lib/types";
import RoundStage from "./RoundStage";

export function PracticeBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-secondary)] bg-[var(--color-secondary)]/20 px-5 py-1.5 font-[family-name:var(--font-accent)] text-3xl text-[var(--foreground)] ${className}`}
    >
      🧪 연습
    </span>
  );
}

/** 연습 라운드: 실제 라운드와 같은 화면·채점·보류 처리. 결과는 연습 전용 컬렉션에만 저장됨 */
export default function PracticeStage({ practice }: { practice: PracticeState }) {
  const [ending, setEnding] = useState(false);
  const revealed = practice.phase === "revealed";

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    try {
      await endPractice();
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 px-5 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <PracticeBadge />
          <span className="text-xl text-[var(--color-muted)]">
            연습 결과는 점수·순위·기록에 남지 않아요
          </span>
        </div>
        {!revealed && (
          <button
            type="button"
            disabled={ending}
            onClick={handleEnd}
            className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-white px-6 py-3 text-xl font-semibold disabled:opacity-50"
          >
            연습 종료
          </button>
        )}
      </div>

      <RoundStage
        kind="practice"
        label="연습 문제"
        roundId={practice.roundId}
        job={PRACTICE_JOB}
        scoring={PRACTICE_SCORING}
        hintsOpen={practice.hintsOpen}
        initialsRevealed={practice.initialsRevealed}
        charCountRevealed={practice.charCountRevealed}
        revealed={revealed}
        onNextHint={() => revealPracticeHint(practice)}
        onCharCount={revealPracticeCharCount}
        onInitials={revealPracticeInitials}
        onReveal={() => revealPracticeAnswer(practice)}
        advanceLabel="연습 종료"
        onAdvance={endPractice}
        resultExtra={<StageScores scoring={PRACTICE_SCORING} />}
      />
    </div>
  );
}

/** 정답 공개 때 '몇 번째 단서에서 맞히면 몇 점'인지 크게 보여줌 */
function StageScores({ scoring }: { scoring: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-2xl font-semibold">어느 단서에서 맞히면 몇 점?</p>
      <div className="grid grid-cols-5 gap-3">
        {scoring.map((score, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] py-3 shadow-[var(--shadow-card)]"
          >
            <span className="text-xl text-[var(--color-muted)]">{i + 1}번째 단서</span>
            <span className="font-[family-name:var(--font-accent)] text-6xl text-[var(--color-primary-ink)]">
              {score}점
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
