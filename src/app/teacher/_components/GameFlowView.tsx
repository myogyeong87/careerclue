"use client";

import { useEffect, useState } from "react";
import {
  advanceRound,
  isRoundInProgress,
  revealAnswer,
  revealInitials,
  revealNextHint,
  startFirstRound,
  subscribeGameState,
} from "@/lib/game";
import {
  overrideSubmissionVerdict,
  subscribeRoundSubmissions,
} from "@/lib/submissions";
import { toChosung } from "@/lib/text";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";

export default function GameFlowView({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [submissionsState, setSubmissionsState] = useState<{
    roundId: string | null;
    submissions: Submission[];
  }>({ roundId: null, submissions: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);

  useEffect(() => {
    if (!game.roundId) return;
    const roundId = game.roundId;
    return subscribeRoundSubmissions(roundId, (submissions) =>
      setSubmissionsState({ roundId, submissions }),
    );
  }, [game.roundId]);

  const submissions =
    submissionsState.roundId === game.roundId ? submissionsState.submissions : [];

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  if (game.jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg text-[var(--foreground)]">
          아직 적용된 문제 세트가 없어요.
        </p>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white"
        >
          설정에서 문제 선택하기
        </button>
      </div>
    );
  }

  if (!isRoundInProgress(game)) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg text-[var(--foreground)]">
          총 {game.jobs.length}문제가 준비됐어요.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(startFirstRound)}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-8 py-4 text-xl font-semibold text-white disabled:opacity-60"
        >
          라운드 시작
        </button>
      </div>
    );
  }

  const job = game.jobs[game.currentIndex];
  const isLast = game.currentIndex >= game.jobs.length - 1;
  const revealed = game.phase === "revealed";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-[var(--foreground)]">
          문제 {game.currentIndex + 1} / {game.jobs.length}
        </p>
        {revealed && (
          <p className="font-[family-name:var(--font-heading)] text-3xl">
            정답: {job.title}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        {job.hints.slice(0, game.hintsOpen).map((hint, i) => (
          <p key={i} className="text-xl leading-snug text-[var(--foreground)]">
            <span className="font-[family-name:var(--font-accent)] mr-3 text-[var(--color-primary)]">
              {game.scoring[i]}점
            </span>
            {hint}
          </p>
        ))}
        {game.initialsRevealed && (
          <p className="mt-2 font-[family-name:var(--font-accent)] text-3xl tracking-widest text-[var(--color-primary)]">
            초성 힌트: {toChosung(job.title)}
          </p>
        )}
      </div>

      {!revealed && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || game.hintsOpen >= 5}
            onClick={() => runAction(() => revealNextHint(game.hintsOpen))}
            className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            다음 단서 공개
          </button>
          <button
            type="button"
            disabled={busy || game.initialsRevealed}
            onClick={() => runAction(revealInitials)}
            className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] px-6 py-3 text-base font-semibold text-[var(--color-primary)] disabled:opacity-50"
          >
            초성 힌트 공개
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => revealAnswer(game))}
            className="rounded-[var(--radius-card)] bg-[var(--foreground)] px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            정답 공개
          </button>
        </div>
      )}

      {revealed && (
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(() => advanceRound(game))}
          className="w-fit rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {isLast ? "게임 종료" : "다음 라운드"}
        </button>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
          제출 현황 ({submissions.length}명)
        </h3>
        <ul className="flex flex-col gap-1.5">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              <span className="font-semibold">{s.studentName}</span>
              <span className="text-[var(--foreground)]/70">
                시도 {s.attempts.length}/3
              </span>
              {revealed && (
                <>
                  <span
                    className={
                      s.correct
                        ? "font-semibold text-[var(--color-primary)]"
                        : "font-semibold text-red-600"
                    }
                  >
                    {s.correct ? `정답 (${s.score}점)` : "오답"}
                  </span>
                  {s.reviewNeeded && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        검토 필요
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          runAction(() =>
                            overrideSubmissionVerdict(s, job, true, game.scoring),
                          )
                        }
                        className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-white"
                      >
                        정답 처리
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          runAction(() =>
                            overrideSubmissionVerdict(s, job, false, game.scoring),
                          )
                        }
                        className="rounded bg-white px-2 py-0.5 text-xs font-semibold"
                      >
                        오답 유지
                      </button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
          {submissions.length === 0 && (
            <li className="text-sm text-[var(--foreground)]/60">
              아직 제출한 학생이 없어요.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
