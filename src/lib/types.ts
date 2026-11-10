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
  /** 문제 세트를 적용할 때마다 새로 만드는 게임 ID. 같은 반에 쌓인 제출 중 "이번 게임" 것만 골라낼 때 사용 */
  runId: string | null;
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
  /** 라운드별 시작 시각(ms epoch). 특별상 "번개 탐정"의 정답까지 걸린 시간 계산용 */
  roundStartTimes: Record<string, number>;
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
  /** 제출 당시 게임 ID (GameState.runId). 문제 세트가 바뀌어도 누적 점수는 반 전체 제출로 계산 */
  runId: string | null;
  jobIndex: number;
  /** 제출 당시 문제 이름. 문제 세트가 바뀐 뒤에도 성적표에 이름을 보여주기 위함 */
  jobTitle: string;
  attempts: SubmissionAttempt[];
  correct: boolean;
  score: number;
  scoredHintStage: number;
  reviewNeeded: boolean;
}

export const DEFAULT_SCORING = [100, 80, 60, 40, 20];

export const EMPTY_GAME_STATE: GameState = {
  runId: null,
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
  roundStartTimes: {},
};

/** 반(세션). 게임 진행 상태는 반 문서에 함께 저장됨 (classes/{classId}) */
export interface ClassInfo {
  id: string;
  name: string;
  /** 학번 앞 두 자리 (예: 1학년 1반 → "11") */
  prefix: string;
  createdAt: number;
  /** 라운드 진행 중인지 (반 선택 전환 시 확인창용) */
  inProgress: boolean;
}

/** 학생 반 배정 방식. auto: 학번 앞 두 자리로 자동 배정, manual: 학생이 입장할 때 반을 직접 고름 */
export type ClassAssignMode = "auto" | "manual";

/** 반에 등록된 학생 (classes/{classId}/students/{studentId}) */
export interface RegisteredStudent {
  studentId: string;
  name: string;
}
