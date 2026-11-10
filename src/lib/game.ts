import { onSnapshot, updateDoc } from "firebase/firestore";
import { classRef } from "./classes";
import { clearRunSubmissions, gradeRound } from "./submissions";
import { clearLobby } from "./lobby";
import {
  DEFAULT_SCORING,
  EMPTY_GAME_STATE,
  type GameState,
  type Job,
  type QuestionSet,
} from "./types";

/** 반 문서 데이터에서 게임 진행 상태만 꺼냄 (반 이름·접두사 같은 반 정보 필드는 무시) */
export function gameStateFromData(data: Record<string, unknown>): GameState {
  return {
    runId: (data.runId as string) ?? null,
    activeSetId: (data.activeSetId as string) ?? null,
    jobs: (data.jobs as Job[]) ?? [],
    scoring: (data.scoring as number[]) ?? DEFAULT_SCORING,
    currentIndex: (data.currentIndex as number) ?? -1,
    hintsOpen: (data.hintsOpen as number) ?? 1,
    initialsRevealed: (data.initialsRevealed as boolean) ?? false,
    charCountRevealed: (data.charCountRevealed as boolean) ?? false,
    phase: (data.phase as GameState["phase"]) ?? "idle",
    roundId: (data.roundId as string) ?? null,
    resumePhase: (data.resumePhase as GameState["resumePhase"]) ?? null,
    countdownEndsAt: (data.countdownEndsAt as number) ?? null,
    practice: (data.practice as GameState["practice"]) ?? null,
    rankRevealStep: (data.rankRevealStep as number) ?? 0,
    rankRevealDone: (data.rankRevealDone as boolean) ?? false,
    roundStartTimes: (data.roundStartTimes as Record<string, number>) ?? {},
  };
}

/** 반의 게임 진행 상태 구독. 반 문서가 사라졌으면(반 삭제) onMissing 호출 */
export function subscribeGameState(
  classId: string,
  onChange: (game: GameState) => void,
  onMissing?: () => void,
) {
  return onSnapshot(classRef(classId), (snap) => {
    if (!snap.exists()) {
      onChange(EMPTY_GAME_STATE);
      onMissing?.();
      return;
    }
    onChange(gameStateFromData(snap.data()));
  });
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

/** 새 게임(문제 목록) 적용. 반의 누적 점수(이전 게임 제출)는 지우지 않고, 새 runId로 이번 게임을 구분 */
async function applyJobs(
  classId: string,
  activeSetId: string | null,
  jobs: Job[],
  scoring: number[],
): Promise<void> {
  await updateDoc(classRef(classId), {
    runId: crypto.randomUUID(),
    activeSetId,
    jobs,
    scoring,
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "idle",
    roundId: null,
    resumePhase: null,
    countdownEndsAt: null,
    rankRevealStep: 0,
    rankRevealDone: false,
    roundStartTimes: {},
  });
}

/** count가 주어지면 set.jobs에서 무작위로 count개(순서 섞임)만 뽑아 적용, 비워두면 세트 전체를 순서 그대로 적용 */
export async function applySetToGame(
  classId: string,
  set: QuestionSet,
  count: number | null = null,
): Promise<void> {
  await applyJobs(classId, set.id, pickRandomJobs(set.jobs, count), set.scoring);
}

/** 여러 세트를 합친 문제 풀(pool)에서 count개를 무작위로 뽑아 적용, 비워두면 풀 전체를 순서 그대로 적용. 특정 세트에 속한 게 아니므로 activeSetId는 null, scoring은 기본값 사용 */
export async function applyRandomPoolToGame(
  classId: string,
  pool: Job[],
  count: number | null,
): Promise<void> {
  await applyJobs(classId, null, pickRandomJobs(pool, count), DEFAULT_SCORING);
}

/** 학생 화면까지 동기화되는 카운트다운 시작. durationMs 뒤 startFirstRound가 호출돼야 함 */
export async function beginCountdown(classId: string, durationMs: number): Promise<void> {
  await updateDoc(classRef(classId), {
    phase: "countdown",
    countdownEndsAt: Date.now() + durationMs,
  });
}

/** 첫 라운드 시작 (currentIndex -1 -> 0) */
export async function startFirstRound(classId: string): Promise<void> {
  const roundId = newRoundId();
  await updateDoc(classRef(classId), {
    currentIndex: 0,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "active",
    roundId,
    countdownEndsAt: null,
    roundStartTimes: { [roundId]: Date.now() },
  });
}

export async function revealNextHint(classId: string, hintsOpen: number): Promise<void> {
  if (hintsOpen >= 5) return;
  await updateDoc(classRef(classId), { hintsOpen: hintsOpen + 1 });
}

export async function revealInitials(classId: string): Promise<void> {
  await updateDoc(classRef(classId), { initialsRevealed: true });
}

export async function revealCharCount(classId: string): Promise<void> {
  await updateDoc(classRef(classId), { charCountRevealed: true });
}

/** 정답 공개: phase 전환 + 현재 라운드 제출 일괄 채점 */
export async function revealAnswer(classId: string, game: GameState): Promise<void> {
  if (!game.roundId) return;
  const job = game.jobs[game.currentIndex];
  if (!job) return;
  await gradeRound(classId, game.roundId, job, game.scoring, "game", (batch) =>
    batch.update(classRef(classId), { phase: "revealed" }),
  );
}

/** 다음 라운드로 진행, 마지막 문제였다면 종료 처리 */
export async function advanceRound(classId: string, game: GameState): Promise<void> {
  const nextIndex = game.currentIndex + 1;
  if (nextIndex >= game.jobs.length) {
    await updateDoc(classRef(classId), {
      phase: "finished",
      resumePhase: "revealed",
      rankRevealStep: 0,
      rankRevealDone: false,
    });
    return;
  }
  const roundId = newRoundId();
  await updateDoc(classRef(classId), {
    currentIndex: nextIndex,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "active",
    roundId,
    [`roundStartTimes.${roundId}`]: Date.now(),
  });
}

/**
 * 진행 중인 게임을 완전히 중지하고 대기실(라운드 시작 전)로 되돌림. 현재 세트는 유지.
 * 이번 게임의 제출과 대기 인원만 초기화하고, 이전 게임까지의 누적 점수와 학생 명단은 남김
 */
export async function resetToLobby(classId: string, game: GameState): Promise<void> {
  await clearRunSubmissions(classId, game.runId);
  await clearLobby(classId);
  await updateDoc(classRef(classId), {
    currentIndex: -1,
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "idle",
    roundId: null,
    resumePhase: null,
    countdownEndsAt: null,
    rankRevealStep: 0,
    rankRevealDone: false,
    roundStartTimes: {},
  });
}

/** 남은 문제와 상관없이 지금 바로 채점 화면(결과)으로 전환. 진행 상태는 그대로 보존해 나중에 되돌아갈 수 있음 */
export async function endGameNow(classId: string, game: GameState): Promise<void> {
  const resumePhase = game.phase === "revealed" ? "revealed" : "active";
  await updateDoc(classRef(classId), {
    phase: "finished",
    resumePhase,
    rankRevealStep: 0,
    rankRevealDone: false,
  });
}

/** 종료 화면 TOP 5 연출을 한 단계 진행 (학생 화면과 동기화) */
export async function setRankRevealStep(classId: string, step: number): Promise<void> {
  await updateDoc(classRef(classId), { rankRevealStep: step });
}

/** TOP 5 연출 종료 → 전체 순위표 공개 */
export async function finishRankReveal(classId: string): Promise<void> {
  await updateDoc(classRef(classId), { rankRevealDone: true });
}

/** 결과 화면에서 진행하던 게임 화면으로 복귀 (초기화 없이) */
export async function resumeGame(classId: string, game: GameState): Promise<void> {
  await updateDoc(classRef(classId), {
    phase: game.resumePhase ?? "active",
    resumePhase: null,
  });
}
