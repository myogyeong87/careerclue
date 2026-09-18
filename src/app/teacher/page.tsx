"use client";

import { useEffect, useState } from "react";
import { endGameNow, isRoundInProgress, resetToLobby, subscribeGameState } from "@/lib/game";
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

  const isGameFlow = !showSettings && game.phase !== "finished";

  const heading = showSettings
    ? "설정"
    : game.phase === "finished"
      ? "게임 종료"
      : "커리어탐정";

  const handleReset = async () => {
    if (busy) return;
    if (
      !window.confirm(
        "진행 중인 라운드를 중지하고 대기실로 돌아갈까요? 지금까지의 제출 기록은 초기화돼요.",
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

  const handleEnd = async () => {
    if (busy) return;
    if (!window.confirm("게임을 지금 종료하고 결과 화면으로 이동할까요?")) return;
    setBusy(true);
    try {
      await endGameNow();
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
          {!showSettings && isRoundInProgress(game) && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={handleReset}
                className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]/70 transition hover:text-[var(--foreground)] disabled:opacity-50"
              >
                ⏹ 중지(초기화)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleEnd}
                className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:opacity-80 disabled:opacity-50"
              >
                ■ 게임 종료
              </button>
            </>
          )}
          {!showSettings && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]/70 transition hover:text-[var(--foreground)]"
            >
              📱 학생 접속 QR
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
      ) : game.phase === "finished" ? (
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
