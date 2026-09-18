"use client";

import { useEffect, useRef, useState } from "react";
import { judgeAnswer } from "@/lib/answerJudge";
import {
  advanceRound,
  isRoundInProgress,
  revealAnswer,
  revealCharCount,
  revealInitials,
  revealNextHint,
  startFirstRound,
  subscribeGameState,
} from "@/lib/game";
import { kickStudent, subscribeLobby, type LobbyStudent } from "@/lib/lobby";
import {
  overrideSubmissionVerdict,
  subscribeRoundSubmissions,
} from "@/lib/submissions";
import { charCountPreview, toChosung } from "@/lib/text";
import { useOrigin } from "@/lib/useOrigin";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";
import ClueBoard from "@/app/_components/ClueBoard";
import CaseFileCard from "@/app/_components/CaseFileCard";
import QrCode from "@/app/_components/QrCode";
import HowToPlayModal from "@/app/_components/HowToPlayModal";

const START_COUNTDOWN_SECONDS = 3;

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
  const [lobby, setLobby] = useState<LobbyStudent[]>([]);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useOrigin();
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);
  useEffect(() => subscribeLobby(setLobby), []);

  useEffect(() => {
    if (!game.roundId) return;
    const roundId = game.roundId;
    return subscribeRoundSubmissions(roundId, (submissions) =>
      setSubmissionsState({ roundId, submissions }),
    );
  }, [game.roundId]);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
  }, []);

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

  const handleStartWithCountdown = () => {
    if (startCountdown !== null) return;
    let remaining = START_COUNTDOWN_SECONDS;
    setStartCountdown(remaining);
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        startFirstRound().finally(() => setStartCountdown(null));
        return;
      }
      setStartCountdown(remaining);
      countdownTimer.current = setTimeout(tick, 1000);
    };
    countdownTimer.current = setTimeout(tick, 1000);
  };

  if (game.jobs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <CaseFileCard className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dog.png" alt="탐정 강아지" className="h-28 w-28" />
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
        </CaseFileCard>
      </div>
    );
  }

  if (!isRoundInProgress(game)) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dog.png" alt="탐정 강아지" className="h-20 w-20 shrink-0" />
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-3xl text-[var(--color-primary)]">
                커리어탐정
              </h2>
              <p className="text-lg text-[var(--foreground)]">사건 파일 준비 완료!</p>
            </div>
          </div>

          {startCountdown !== null ? (
            <p className="font-[family-name:var(--font-accent)] text-6xl text-[var(--color-primary)]">
              {startCountdown}
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowHowTo(true)}
                className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] px-6 py-4 text-lg font-semibold text-[var(--color-primary)]"
              >
                ❓ 게임 방법
              </button>
              <button
                type="button"
                onClick={handleStartWithCountdown}
                className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-8 py-4 text-xl font-semibold text-white disabled:opacity-60"
              >
                게임 시작
              </button>
            </div>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
          {origin && (
            <CaseFileCard className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <h3 className="text-lg font-semibold text-[var(--foreground)]/80">
                📱 이 QR로 접속하세요
              </h3>
              <QrCode url={`${origin}/student`} />
            </CaseFileCard>
          )}

          <CaseFileCard className="flex flex-1 flex-col gap-3 text-left">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/detective-story.png" alt="" className="h-6 w-6" />
              학생 대기 현황 ({lobby.length}명)
            </h3>
            <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
              {lobby.map((s) => (
                <li
                  key={s.studentId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-background)] px-4 py-3 text-lg"
                >
                  <span>
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-1.5 text-[var(--foreground)]/60">
                      ({s.studentId})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => kickStudent(s.studentId)}
                    title="퇴장시키기"
                    aria-label={`${s.name} 퇴장시키기`}
                    className="rounded-full px-2.5 py-1 text-base font-bold text-red-600 hover:bg-red-100"
                  >
                    ✕
                  </button>
                </li>
              ))}
              {lobby.length === 0 && (
                <li className="text-base text-[var(--foreground)]/50">
                  아직 접속한 학생이 없어요. QR로 접속을 안내해주세요.
                </li>
              )}
            </ul>
          </CaseFileCard>
        </div>

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </div>
    );
  }

  const job = game.jobs[game.currentIndex];
  const isLast = game.currentIndex >= game.jobs.length - 1;
  const revealed = game.phase === "revealed";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-lg font-semibold text-[var(--foreground)]">
        문제 {game.currentIndex + 1} / {game.jobs.length}
      </p>

      <ClueBoard
        hints={job.hints}
        hintsOpen={game.hintsOpen}
        scoring={game.scoring}
        initialsRevealed={game.initialsRevealed}
        chosung={toChosung(job.title)}
        charCountRevealed={game.charCountRevealed}
        charCount={charCountPreview(job.title)}
        revealed={revealed}
        answer={job.title}
        size="large"
      />

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
            disabled={busy || game.charCountRevealed}
            onClick={() => runAction(revealCharCount)}
            className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] px-6 py-3 text-base font-semibold text-[var(--color-primary)] disabled:opacity-50"
          >
            글자수 힌트 공개
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
        <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">
          제출 현황 ({submissions.length}명)
        </h3>
        <ul className="flex flex-col gap-1.5">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-1.5 rounded-lg bg-[var(--color-surface)] px-4 py-2.5 text-base"
            >
              <div className="flex flex-wrap items-center gap-3">
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
                      <span className="ml-auto flex items-center gap-2">
                        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-sm font-semibold text-amber-800">
                          검토 필요
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            runAction(() =>
                              overrideSubmissionVerdict(s, job, true, game.scoring),
                            )
                          }
                          className="rounded bg-[var(--color-primary)] px-2.5 py-1 text-sm font-semibold text-white"
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
                          className="rounded bg-white px-2.5 py-1 text-sm font-semibold"
                        >
                          오답 유지
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>
              {revealed && s.attempts.length > 0 && (
                <p className="text-sm">
                  <span className="mr-1.5 text-[var(--foreground)]/50">제출:</span>
                  {s.attempts.map((a, i) => {
                    const verdict = judgeAnswer(a.answer, job);
                    const color =
                      verdict === "correct"
                        ? "text-[var(--color-primary)] font-semibold"
                        : verdict === "reviewNeeded"
                          ? "text-amber-700 font-semibold"
                          : "text-[var(--foreground)]/60";
                    return (
                      <span key={i}>
                        {i > 0 && <span className="text-[var(--foreground)]/30">, </span>}
                        <span className={color}>{a.answer}</span>
                      </span>
                    );
                  })}
                </p>
              )}
            </li>
          ))}
          {submissions.length === 0 && (
            <li className="text-base text-[var(--foreground)]/60">
              아직 제출한 학생이 없어요.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
