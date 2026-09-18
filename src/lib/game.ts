import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { clearAllSubmissions, gradeRound } from "./submissions";
import { clearLobby } from "./lobby";
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
        charCountRevealed: data.charCountRevealed ?? false,
        phase: data.phase ?? "idle",
        roundId: data.roundId ?? null,
      });
    },
    (err) => onError?.(err),
  );
}

/** 진행 중인 라운드가 있는지 (한 번이라도 시작된 뒤 아직 끝나지 않은 상태) */
export function isRoundInProgress(game: GameState): boolean {
  return game.currentIndex > -1 && game.phase !== "finished";
}

function newRoundId(): string {
  return crypto.randomUUID();
}

export async function applySetToGame(set: QuestionSet): Promise<void> {
  await clearAllSubmissions();
  await clearLobby();
  await setDoc(GAME_DOC, {
    activeSetId: set.id,
    jobs: set.jobs,
    scoring: set.scoring,
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "idle",
    roundId: null,
  });
}

/** 첫 라운드 시작 (currentIndex -1 -> 0) */
export async function startFirstRound(): Promise<void> {
  await updateDoc(GAME_DOC, {
    currentIndex: 0,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "active",
    roundId: newRoundId(),
  });
}

export async function revealNextHint(hintsOpen: number): Promise<void> {
  if (hintsOpen >= 5) return;
  await updateDoc(GAME_DOC, { hintsOpen: hintsOpen + 1 });
}

export async function revealInitials(): Promise<void> {
  await updateDoc(GAME_DOC, { initialsRevealed: true });
}

export async function revealCharCount(): Promise<void> {
  await updateDoc(GAME_DOC, { charCountRevealed: true });
}

/** 정답 공개: phase 전환 + 현재 라운드 제출 일괄 채점 */
export async function revealAnswer(game: GameState): Promise<void> {
  if (!game.roundId) return;
  const job = game.jobs[game.currentIndex];
  if (!job) return;
  await updateDoc(GAME_DOC, { phase: "revealed" });
  await gradeRound(game.roundId, job, game.scoring);
}

/** 다음 라운드로 진행, 마지막 문제였다면 종료 처리 */
export async function advanceRound(game: GameState): Promise<void> {
  const nextIndex = game.currentIndex + 1;
  if (nextIndex >= game.jobs.length) {
    await updateDoc(GAME_DOC, { phase: "finished" });
    return;
  }
  await updateDoc(GAME_DOC, {
    currentIndex: nextIndex,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "active",
    roundId: newRoundId(),
  });
}

/** 진행 중인 라운드를 중지하고 대기실(라운드 시작 전)로 되돌림. 현재 세트는 유지 */
export async function resetToLobby(): Promise<void> {
  await clearAllSubmissions();
  await clearLobby();
  await updateDoc(GAME_DOC, {
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "idle",
    roundId: null,
  });
}

/** 남은 문제와 상관없이 지금 바로 게임을 종료하고 결과 화면으로 전환 */
export async function endGameNow(): Promise<void> {
  await updateDoc(GAME_DOC, { phase: "finished" });
}
