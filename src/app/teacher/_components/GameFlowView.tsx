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
import { startPractice } from "@/lib/practice";
import { useOrigin } from "@/lib/useOrigin";
import { EMPTY_GAME_STATE, type GameState } from "@/lib/types";
import CaseFileCard from "@/app/_components/CaseFileCard";
import QrCode from "@/app/_components/QrCode";
import HowToPlayModal from "@/app/_components/HowToPlayModal";
import Countdown from "@/app/_components/Countdown";
import LobbyBoard from "./LobbyBoard";
import RoundStage from "./RoundStage";
import PracticeStage from "./PracticeStage";

const START_COUNTDOWN_MS = 3000;

export default function GameFlowView({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [lobby, setLobby] = useState<LobbyStudent[]>([]);
  const origin = useOrigin();
  const [showHowTo, setShowHowTo] = useState(false);
  const [startingPractice, setStartingPractice] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);
  useEffect(() => subscribeLobby(setLobby), []);

  const handleStartWithCountdown = () => {
    if (game.phase === "countdown") return;
    beginCountdown(START_COUNTDOWN_MS);
  };

  const handleStartPractice = async () => {
    if (startingPractice) return;
    setStartingPractice(true);
    try {
      await startPractice();
      setShowHowTo(false);
    } finally {
      setStartingPractice(false);
    }
  };

  // 연습은 실제 라운드 시작 전(대기 화면)에서만 열 수 있으므로 가장 먼저 확인
  if (game.practice && !isRoundInProgress(game)) {
    return <PracticeStage practice={game.practice} />;
  }

  const howToModal = showHowTo && (
    <HowToPlayModal onClose={() => setShowHowTo(false)} onPractice={handleStartPractice} />
  );

  const howToButtons = (
    <>
      <button
        type="button"
        onClick={() => setShowHowTo(true)}
        className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white px-6 py-4 text-xl font-semibold text-[var(--color-primary-ink)]"
      >
        ❓ 게임 방법
      </button>
      <button
        type="button"
        disabled={startingPractice}
        onClick={handleStartPractice}
        className="rounded-[var(--radius-card)] border-2 border-[var(--color-secondary)] bg-white px-6 py-4 text-xl font-semibold disabled:opacity-50"
      >
        🧪 연습 라운드
      </button>
    </>
  );

  if (game.jobs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <CaseFileCard className="flex max-w-xl flex-col items-center gap-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dog.png" alt="탐정 강아지" className="h-28 w-28" />
          <p className="text-xl text-[var(--foreground)]">아직 적용된 문제 세트가 없어요.</p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 text-lg font-semibold text-[var(--color-on-primary)]"
          >
            설정에서 문제 선택하기
          </button>
          <div className="flex flex-wrap justify-center gap-3">{howToButtons}</div>
        </CaseFileCard>
        {howToModal}
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
            <div className="flex flex-wrap items-center gap-3">
              {howToButtons}
              <button
                type="button"
                onClick={handleStartWithCountdown}
                className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-8 py-4 text-2xl font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-card)]"
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

        {howToModal}
      </div>
    );
  }

  const job = game.jobs[game.currentIndex];
  const isLast = game.currentIndex >= game.jobs.length - 1;

  return (
    <RoundStage
      kind="game"
      label={`문제 ${game.currentIndex + 1} / ${game.jobs.length}`}
      roundId={game.roundId ?? ""}
      job={job}
      scoring={game.scoring}
      hintsOpen={game.hintsOpen}
      initialsRevealed={game.initialsRevealed}
      charCountRevealed={game.charCountRevealed}
      revealed={game.phase === "revealed"}
      onNextHint={() => revealNextHint(game.hintsOpen)}
      onCharCount={revealCharCount}
      onInitials={revealInitials}
      onReveal={() => revealAnswer(game)}
      advanceLabel={isLast ? "게임 종료" : "다음 라운드 ▶"}
      onAdvance={() => advanceRound(game)}
    />
  );
}
