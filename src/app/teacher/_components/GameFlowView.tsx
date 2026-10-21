"use client";

import { useEffect, useState } from "react";
import {
  advanceRound,
  beginCountdown,
  isRoundInProgress,
  revealAnswer,
  revealCharCount,
  revealInitials,
  revealNextHint,
  subscribeGameState,
} from "@/lib/game";
import { subscribeLobby, type LobbyStudent } from "@/lib/lobby";
import {

  subscribeRoundSubmissions,
} from "@/lib/submissions";
import { charCountPreview, toChosung } from "@/lib/text";
import { useOrigin } from "@/lib/useOrigin";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";
import ClueBoard from "@/app/_components/ClueBoard";
import CaseFileCard from "@/app/_components/CaseFileCard";
import QrCode from "@/app/_components/QrCode";
import HowToPlayModal from "@/app/_components/HowToPlayModal";
import Countdown from "@/app/_components/Countdown";
import RoundResultPanel from "./RoundResultPanel";
import LobbyBoard from "./LobbyBoard";

const START_COUNTDOWN_MS = 3000;

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
    if (game.phase === "countdown") return;
    beginCountdown(START_COUNTDOWN_MS);
  };

  if (game.jobs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <CaseFileCard className="flex max-w-lg flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dog.png" alt="탐정 강아지" className="h-28 w-28" />
          <p className="text-lg text-[var(--foreground)]">
            아직 적용된 문제 세트가 없어요.
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-[var(--color-on-primary)]"
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
              <h2 className="font-[family-name:var(--font-heading)] text-3xl text-[var(--color-primary-ink)]">
                커리어탐정
              </h2>
              <p className="text-lg text-[var(--foreground)]">사건 파일 준비 완료!</p>
            </div>
          </div>

          {game.phase === "countdown" && game.countdownEndsAt ? (
            <Countdown endsAt={game.countdownEndsAt} />
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowHowTo(true)}
                className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] px-6 py-4 text-lg font-semibold text-[var(--color-primary-ink)]"
              >
                ❓ 게임 방법
              </button>
              <button
                type="button"
                onClick={handleStartWithCountdown}
                className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-8 py-4 text-xl font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
              >
                게임 시작
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-start justify-center">
          <div className="grid w-full max-w-[1600px] grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
            {origin && (
              <CaseFileCard className="flex flex-col items-center justify-center gap-10 text-center">
                <h3 className="text-2xl font-semibold">📱 이 QR로 접속하세요</h3>
                <QrCode url={`${origin}/student`} />
              </CaseFileCard>
            )}

            <LobbyBoard students={lobby} />
          </div>
        </div>

        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      </div>
    );
  }

  const job = game.jobs[game.currentIndex];
  const isLast = game.currentIndex >= game.jobs.length - 1;
  const revealed = game.phase === "revealed";

  if (revealed) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-2xl font-semibold text-[var(--color-muted)]">
          문제 {game.currentIndex + 1} / {game.jobs.length}
        </p>
        <RoundResultPanel
          key={game.roundId}
          job={job}
          scoring={game.scoring}
          submissions={submissions}
          advanceLabel={isLast ? "게임 종료" : "다음 라운드 ▶"}
          onAdvance={() => advanceRound(game)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-2xl font-semibold text-[var(--color-muted)]">
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
        revealed={false}
        size="large"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || game.hintsOpen >= 5}
          onClick={() => runAction(() => revealNextHint(game.hintsOpen))}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-7 py-4 text-xl font-semibold text-[var(--color-on-primary)] disabled:opacity-50"
        >
          다음 단서 공개
        </button>
        <button
          type="button"
          disabled={busy || game.charCountRevealed}
          onClick={() => runAction(revealCharCount)}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white px-7 py-4 text-xl font-semibold text-[var(--color-primary-ink)] disabled:opacity-50"
        >
          글자수 힌트 공개
        </button>
        <button
          type="button"
          disabled={busy || game.initialsRevealed}
          onClick={() => runAction(revealInitials)}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white px-7 py-4 text-xl font-semibold text-[var(--color-primary-ink)] disabled:opacity-50"
        >
          초성 힌트 공개
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(() => revealAnswer(game))}
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
