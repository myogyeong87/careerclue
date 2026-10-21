import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { clearAllSubmissions, gradeRound } from "./submissions";
import { clearLobby } from "./lobby";
import {
  DEFAULT_SCORING,
  EMPTY_GAME_STATE,
  type GameState,
  type Job,
  type QuestionSet,
} from "./types";

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
        resumePhase: data.resumePhase ?? null,
        countdownEndsAt: data.countdownEndsAt ?? null,
        practice: data.practice ?? null,
        rankRevealStep: data.rankRevealStep ?? 0,
        rankRevealDone: data.rankRevealDone ?? false,
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

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** count가 null이면 원본 그대로, 아니면 중복 없이 무작위로 count개를 뽑아 순서도 섞어 반환 (count는 jobs.length로 자동 제한) */
function pickRandomJobs(jobs: Job[], count: number | null): Job[] {
  if (count == null) return jobs;
  const clamped = Math.min(Math.max(0, Math.floor(count)), jobs.length);
  return shuffle(jobs).slice(0, clamped);
}

/** 여러 세트의 jobs를 하나의 풀로 합치되, title이 같은 문제는 처음 나온 것만 남김 */
export function buildUniqueJobPool(sets: QuestionSet[]): Job[] {
  const seenTitles = new Set<string>();
  const pool: Job[] = [];
  for (const set of sets) {
    for (const job of set.jobs) {
      if (seenTitles.has(job.title)) continue;
      seenTitles.add(job.title);
      pool.push(job);
    }
  }
  return pool;
}

/** count가 주어지면 set.jobs에서 무작위로 count개(순서 섞임)만 뽑아 적용, 비워두면 세트 전체를 순서 그대로 적용 */
export async function applySetToGame(set: QuestionSet, count: number | null = null): Promise<void> {
  const jobs = pickRandomJobs(set.jobs, count);
  await clearAllSubmissions();
  await clearLobby();
  await setDoc(GAME_DOC, {
    activeSetId: set.id,
    jobs,
    scoring: set.scoring,
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "idle",
    roundId: null,
    resumePhase: null,
    countdownEndsAt: null,
  });
}

/** 여러 세트를 합친 문제 풀(pool)에서 count개를 무작위로 뽑아 적용, 비워두면 풀 전체를 순서 그대로 적용. 특정 세트에 속한 게 아니므로 activeSetId는 null, scoring은 기본값 사용 */
export async function applyRandomPoolToGame(pool: Job[], count: number | null): Promise<void> {
  const jobs = pickRandomJobs(pool, count);
  await clearAllSubmissions();
  await clearLobby();
  await setDoc(GAME_DOC, {
    activeSetId: null,
    jobs,
    scoring: DEFAULT_SCORING,
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "idle",
    roundId: null,
    resumePhase: null,
    countdownEndsAt: null,
  });
}

/** 학생 화면까지 동기화되는 카운트다운 시작. durationMs 뒤 startFirstRound가 호출돼야 함 */
export async function beginCountdown(durationMs: number): Promise<void> {
  await updateDoc(GAME_DOC, {
    phase: "countdown",
    countdownEndsAt: Date.now() + durationMs,
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
    countdownEndsAt: null,
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
    await updateDoc(GAME_DOC, {
      phase: "finished",
      resumePhase: "revealed",
      rankRevealStep: 0,
      rankRevealDone: false,
    });
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

/** 진행 중인 라운드를 완전히 중지하고 대기실(라운드 시작 전)로 되돌림. 현재 세트는 유지, 제출/대기 인원은 초기화 */
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
    resumePhase: null,
    countdownEndsAt: null,
  });
}

/** 남은 문제와 상관없이 지금 바로 채점 화면(결과)으로 전환. 진행 상태는 그대로 보존해 나중에 되돌아갈 수 있음 */
export async function endGameNow(game: GameState): Promise<void> {
  const resumePhase = game.phase === "revealed" ? "revealed" : "active";
  await updateDoc(GAME_DOC, {
    phase: "finished",
    resumePhase,
    rankRevealStep: 0,
    rankRevealDone: false,
  });
}

/** 종료 화면 TOP 5 연출을 한 단계 진행 (학생 화면과 동기화) */
export async function setRankRevealStep(step: number): Promise<void> {
  await updateDoc(GAME_DOC, { rankRevealStep: step });
}

/** TOP 5 연출 종료 → 전체 순위표 공개 */
export async function finishRankReveal(): Promise<void> {
  await updateDoc(GAME_DOC, { rankRevealDone: true });
}

/** 결과 화면에서 진행하던 게임 화면으로 복귀 (초기화 없이) */
export async function resumeGame(game: GameState): Promise<void> {
  await updateDoc(GAME_DOC, {
    phase: game.resumePhase ?? "active",
    resumePhase: null,
  });
}
