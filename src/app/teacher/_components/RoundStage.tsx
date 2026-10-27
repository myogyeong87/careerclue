"use client";

import { useEffect, useState } from "react";
import { subscribeRoundSubmissions, type SubmissionKind } from "@/lib/submissions";
import { charCountPreview, toChosung } from "@/lib/text";
import type { Job, Submission } from "@/lib/types";
import ClueBoard from "@/app/_components/ClueBoard";
import RoundResultPanel from "./RoundResultPanel";

/**
 * 교사 화면의 한 라운드 진행 UI (단서 공개 → 정답 공개 → 결과/보류 처리).
 * 실제 게임과 연습 라운드가 같은 화면·같은 동작을 쓰도록 상태와 동작을 props로 받는다.
 */
export default function RoundStage({
  kind,
  label,
  roundId,
  job,
  scoring,
  hintsOpen,
  initialsRevealed,
  charCountRevealed,
  revealed,
  onNextHint,
  onCharCount,
  onInitials,
  onReveal,
  advanceLabel,
  onAdvance,
  resultExtra,
  headerActions,
}: {
  kind: SubmissionKind;
  label: React.ReactNode;
  roundId: string;
  job: Job;
  scoring: number[];
  hintsOpen: number;
  initialsRevealed: boolean;
  charCountRevealed: boolean;
  revealed: boolean;
  onNextHint: () => Promise<void>;
  onCharCount: () => Promise<void>;
  onInitials: () => Promise<void>;
  onReveal: () => Promise<void>;
  advanceLabel: string;
  onAdvance: () => Promise<void>;
  resultExtra?: React.ReactNode;
  /** 문제 번호 옆에 둘 버튼 (실제 게임의 중간 점수 등) */
  headerActions?: React.ReactNode;
}) {
  const [submissionsState, setSubmissionsState] = useState<{
    roundId: string | null;
    submissions: Submission[];
  }>({ roundId: null, submissions: [] });
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      subscribeRoundSubmissions(
        roundId,
        (submissions) => setSubmissionsState({ roundId, submissions }),
        kind,
      ),
    [roundId, kind],
  );

  const submissions =
    submissionsState.roundId === roundId ? submissionsState.submissions : [];

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  if (revealed) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-2xl font-semibold text-[var(--color-muted)]">{label}</div>
          {headerActions}
        </div>
        <RoundResultPanel
          key={roundId}
          kind={kind}
          job={job}
          scoring={scoring}
          submissions={submissions}
          advanceLabel={advanceLabel}
          onAdvance={onAdvance}
          extra={resultExtra}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-2xl font-semibold text-[var(--color-muted)]">{label}</div>
        <div className="flex flex-wrap items-center gap-4">
          {headerActions}
          <DetectiveDog hintsOpen={hintsOpen} scoring={scoring} submitted={submissions.length} />
        </div>
      </div>

      <ClueBoard
        hints={job.hints}
        hintsOpen={hintsOpen}
        scoring={scoring}
        initialsRevealed={initialsRevealed}
        chosung={toChosung(job.title)}
        charCountRevealed={charCountRevealed}
        charCount={charCountPreview(job.title)}
        revealed={false}
        size="large"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || hintsOpen >= 5}
          onClick={() => runAction(onNextHint)}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-7 py-4 text-xl font-semibold text-[var(--color-on-primary)] disabled:opacity-50"
        >
          다음 단서 공개
        </button>
        <button
          type="button"
          disabled={busy || charCountRevealed}
          onClick={() => runAction(onCharCount)}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white px-7 py-4 text-xl font-semibold text-[var(--color-primary-ink)] disabled:opacity-50"
        >
          글자수 힌트 공개
        </button>
        <button
          type="button"
          disabled={busy || initialsRevealed}
          onClick={() => runAction(onInitials)}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white px-7 py-4 text-xl font-semibold text-[var(--color-primary-ink)] disabled:opacity-50"
        >
          초성 힌트 공개
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(onReveal)}
          className="rounded-[var(--radius-card)] bg-[var(--foreground)] px-7 py-4 text-xl font-semibold text-white disabled:opacity-50"
        >
          정답 공개
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
          제출 현황 ({submissions.length}명)
        </h3>
        <ul className="flex flex-wrap gap-2">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-lg"
            >
              <span className="font-semibold">{s.studentName}</span>
              <span className="ml-2 text-[var(--color-muted)]">{s.attempts.length}/3</span>
            </li>
          ))}
          {submissions.length === 0 && (
            <li className="text-lg text-[var(--color-muted)]">아직 제출한 학생이 없어요.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** 교사 화면의 탐정 강아지. 공개된 단서 수와 지금 맞히면 받는 점수를 말풍선으로 알려줌 */
function DetectiveDog({
  hintsOpen,
  scoring,
  submitted,
}: {
  hintsOpen: number;
  scoring: number[];
  submitted: number;
}) {
  const points = scoring[hintsOpen - 1] ?? 0;
  const line =
    hintsOpen === 1
      ? `첫 단서예요! 지금 맞히면 ${points}점 🔍`
      : hintsOpen >= 5
        ? `마지막 단서! 지금 맞히면 ${points}점`
        : `단서 ${hintsOpen}개 공개! 지금 맞히면 ${points}점`;
  return (
    <div className="flex items-center gap-2">
      <div
        key={hintsOpen}
        className="relative rounded-2xl border-2 border-[var(--color-primary)] bg-white px-4 py-2 text-xl font-semibold shadow-[var(--shadow-card)] motion-safe:animate-[rankPop_0.4s_ease-out]"
      >
        {line}
        {submitted > 0 && (
          <span className="ml-2 text-lg font-normal text-[var(--color-muted)]">
            {submitted}명 제출
          </span>
        )}
        <span className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-[var(--color-primary)] bg-white" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dog.png" alt="탐정 강아지" className="h-16 w-16 shrink-0" />
    </div>
  );
}
