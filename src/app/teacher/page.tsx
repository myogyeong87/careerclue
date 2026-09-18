"use client";

import { useEffect, useState } from "react";
import { endGameNow, resetToLobby, resumeGame, subscribeGameState } from "@/lib/game";
import { useCountdownAutoStart } from "@/lib/useCountdownAutoStart";
import { EMPTY_GAME_STATE, type GameState } from "@/lib/types";
import QrModal from "@/app/_components/QrModal";
import GameFlowView from "./_components/GameFlowView";
import ResultsTab from "./_components/ResultsTab";
import SettingsPanel from "./_components/SettingsPanel";

export default function TeacherPage() {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);
  useCountdownAutoStart(game);

  const isGameFlow = !showSettings && game.phase !== "finished";
  const hasStarted = game.currentIndex > -1;
  const finished = game.phase === "finished";

  const heading = showSettings ? "설정" : finished ? "게임 종료" : "커리어탐정";

  const handleEnd = async () => {
    if (busy) return;
    if (
      !window.confirm(
        "게임을 종료하고 채점 결과 화면으로 이동할까요? 진행 상태는 그대로 남아서 다시 게임 화면으로 돌아올 수 있어요.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await endGameNow(game);
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resumeGame(game);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    if (
      !window.confirm(
        "대기실로 완전히 초기화할까요? 지금까지의 제출 기록과 대기 학생 목록이 모두 사라져요.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await resetToLobby();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 ${
        isGameFlow ? "max-w-none px-8" : "max-w-5xl"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{heading}</h1>
        <div className="flex items-center gap-4">
          {!showSettings && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]/70 transition hover:text-[var(--foreground)]"
            >
              📱 학생 접속 QR
            </button>
          )}
          {!showSettings && hasStarted && !finished && (
            <button
              type="button"
              disabled={busy}
              onClick={handleEnd}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:opacity-80 disabled:opacity-50"
            >
              ■ 게임 종료
            </button>
          )}
          {!showSettings && finished && (
            <button
              type="button"
              disabled={busy}
              onClick={handleResume}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-80 disabled:opacity-50"
            >
              🔙 게임 화면으로
            </button>
          )}
          {!showSettings && hasStarted && (
            <button
              type="button"
              disabled={busy}
              onClick={handleReset}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]/70 transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              🔄 초기화
            </button>
          )}
          {!showSettings && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="text-sm text-[var(--foreground)]/40 transition hover:text-[var(--foreground)]/70"
            >
              ⚙ 설정
            </button>
          )}
        </div>
      </div>

      {showSettings ? (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      ) : finished ? (
        <ResultsTab />
      ) : (
        <GameFlowView onOpenSettings={() => setShowSettings(true)} />
      )}

      {showQr && (
        <QrModal
          url={`${window.location.origin}/student`}
          onClose={() => setShowQr(false)}
        />
      )}
    </main>
  );
}
