import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_SCORING, EMPTY_GAME_STATE, type GameState, type QuestionSet } from "./types";

const GAME_DOC = doc(db, "games", "current");

export function subscribeGameState(
  onChange: (game: GameState) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    GAME_DOC,
    (snap) => {
      if (!snap.exists()) {
        onChange(EMPTY_GAME_STATE);
        return;
      }
      const data = snap.data();
      onChange({
        activeSetId: data.activeSetId ?? null,
        jobs: data.jobs ?? [],
        scoring: data.scoring ?? DEFAULT_SCORING,
        currentIndex: data.currentIndex ?? -1,
        hintsOpen: data.hintsOpen ?? 1,
        initialsRevealed: data.initialsRevealed ?? false,
        phase: data.phase ?? "idle",
        roundId: data.roundId ?? null,
      });
    },
    (err) => onError?.(err),
  );
}

/** 진행 중인 라운드가 있는지 (라운드가 한 번이라도 시작된 이후 아직 idle로 리셋되지 않은 상태) */
export function isRoundInProgress(game: GameState): boolean {
  return game.currentIndex > -1;
}

export async function applySetToGame(set: QuestionSet): Promise<void> {
  await setDoc(GAME_DOC, {
    activeSetId: set.id,
    jobs: set.jobs,
    scoring: set.scoring,
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    phase: "idle",
    roundId: null,
  });
}
