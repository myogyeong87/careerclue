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

export type GamePhase = "idle" | "active" | "revealed" | "finished";

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
};
