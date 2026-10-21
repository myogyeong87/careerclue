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
        <div className="text-2xl font-semibold text-[var(--color-muted)]">{label}</div>
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
      <div className="text-2xl font-semibold text-[var(--color-muted)]">{label}</div>

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
