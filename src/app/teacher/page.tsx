"use client";

import { useEffect, useState } from "react";
import { subscribeGameState } from "@/lib/game";
import { EMPTY_GAME_STATE, type GameState } from "@/lib/types";
import QrModal from "@/app/_components/QrModal";
import GameFlowView from "./_components/GameFlowView";
import ResultsTab from "./_components/ResultsTab";
import SettingsPanel from "./_components/SettingsPanel";

export default function TeacherPage() {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);

  const isGameFlow = !showSettings && game.phase !== "finished";

  const heading = showSettings
    ? "설정"
    : game.phase === "finished"
      ? "게임 종료"
      : "커리어탐정";

  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 ${
        isGameFlow ? "max-w-none px-8" : "max-w-5xl"
      }`}
    >
      <div className="flex items-center justify-between">
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
