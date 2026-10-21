export interface Job {
  title: string;
  accepted: string[];
  hints: string[]; // 5개
}

export interface QuestionSet {
  id: string;
  name: string;
  updatedAt: number; // ms epoch
  jobs: Job[];
  scoring: number[]; // 기본 [100, 80, 60, 40, 20]
}

/** 문제 세트와 별개로 진행하는 연습 라운드 상태 (진행 중이 아니면 null) */
export interface PracticeState {
  roundId: string;
  hintsOpen: number;
  initialsRevealed: boolean;
  charCountRevealed: boolean;
  phase: "active" | "revealed";
}

export type GamePhase = "idle" | "countdown" | "active" | "revealed" | "finished";

export interface GameState {
  activeSetId: string | null;
  jobs: Job[];
  scoring: number[];
  currentIndex: number; // -1 = 시작 전
  hintsOpen: number; // 1~5
  initialsRevealed: boolean;
  charCountRevealed: boolean;
  phase: GamePhase;
  roundId: string | null;
  /** phase가 finished로 바뀌기 직전 단계. 게임 화면으로 되돌아갈 때 복원용 */
  resumePhase: "active" | "revealed" | null;
  /** phase가 countdown일 때 카운트다운이 끝나는 시각(ms epoch). 모든 화면이 동일한 시점을 기준으로 표시 */
  countdownEndsAt: number | null;
  /** 연습 라운드 진행 중이면 그 상태. 실제 게임 진행 상태와 섞이지 않게 별도 필드로 둠 */
  practice: PracticeState | null;
  /** 종료 화면 TOP 5 연출 단계: 0 = 타이틀, n = 아래 순위부터 n개 순위 공개 */
  rankRevealStep: number;
  /** TOP 5 연출이 끝나고 전체 순위표가 공개됐는지 (학생 화면은 이때 내 순위를 보여줌) */
  rankRevealDone: boolean;
}

export interface SubmissionAttempt {
  answer: string;
  hintsOpenAtSubmit: number;
  initialsRevealedAtSubmit: boolean;
  submittedAt: number;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  roundId: string;
  jobIndex: number;
  attempts: SubmissionAttempt[];
  correct: boolean;
  score: number;
  scoredHintStage: number;
  reviewNeeded: boolean;
}

export const DEFAULT_SCORING = [100, 80, 60, 40, 20];

export const EMPTY_GAME_STATE: GameState = {
  activeSetId: null,
  jobs: [],
  scoring: DEFAULT_SCORING,
  currentIndex: -1,
  hintsOpen: 1,
  initialsRevealed: false,
  charCountRevealed: false,
  phase: "idle",
  roundId: null,
  resumePhase: null,
  countdownEndsAt: null,
  practice: null,
  rankRevealStep: 0,
  rankRevealDone: false,
};
