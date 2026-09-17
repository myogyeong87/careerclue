"use client";

import { useEffect, useState } from "react";
import { subscribeGameState } from "@/lib/game";
import { EMPTY_GAME_STATE, type GameState } from "@/lib/types";
import GameFlowView from "./_components/GameFlowView";
import ResultsTab from "./_components/ResultsTab";
import SettingsPanel from "./_components/SettingsPanel";

export default function TeacherPage() {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);

  const heading = showSettings
    ? "설정"
    : game.phase === "finished"
      ? "게임 종료"
      : "잡셜록";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{heading}</h1>
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

      {showSettings ? (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      ) : game.phase === "finished" ? (
        <ResultsTab />
      ) : (
        <GameFlowView onOpenSettings={() => setShowSettings(true)} />
      )}
    </main>
  );
}
