"use client";

import { useEffect } from "react";
import { startFirstRound } from "./game";
import type { GameState } from "./types";

/**
 * phase가 countdown인 동안 지켜보다가 countdownEndsAt 시각이 지나면 라운드를 시작.
 * 교사/학생 화면 어디서든 켜둘 수 있어, 특정 클라이언트가 사라져도 다른 클라이언트가 이어서 시작시킬 수 있음.
 */
export function useCountdownAutoStart(game: GameState) {
  useEffect(() => {
    if (game.phase !== "countdown" || !game.countdownEndsAt) return;
    const delay = Math.max(0, game.countdownEndsAt - Date.now());
    const timer = setTimeout(() => {
      startFirstRound();
    }, delay + 50);
    return () => clearTimeout(timer);
  }, [game.phase, game.countdownEndsAt]);
}
