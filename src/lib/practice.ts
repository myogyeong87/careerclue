import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { clearAllSubmissions, gradeRound } from "./submissions";
import { DEFAULT_SCORING, type Job, type PracticeState } from "./types";

const GAME_DOC = doc(db, "games", "current");

/** 문제 세트와 별개로 앱에 내장된 연습 문제 */
export const PRACTICE_JOB: Job = {
  title: "사서",
  accepted: ["사서", "사서 선생님", "사서교사", "도서관 사서"],
  hints: [
    "저는 사람들이 찾는 것을 대신 찾아주는 일을 해요.",
    "저는 수만 개의 물건을 정해진 번호와 규칙으로 분류해요.",
    "제 일터에서는 목소리를 낮추는 게 기본 예절이에요.",
    "저는 빌려주고, 돌려받고, 새로 들어온 책을 채워 넣어요.",
    "\"이 책 어디 있어요?\"라는 질문에, 저는 번호 하나만 보고 서가 사이로 걸어가요.",
  ],
};

export const PRACTICE_SCORING = DEFAULT_SCORING;

/** 연습 라운드 시작. 문제 세트가 적용되지 않아 게임 문서가 없어도 동작하도록 merge로 기록 */
export async function startPractice(): Promise<void> {
  await clearAllSubmissions("practice");
  const practice: PracticeState = {
    roundId: crypto.randomUUID(),
    hintsOpen: 1,
    initialsRevealed: false,
    charCountRevealed: false,
    phase: "active",
  };
  await setDoc(GAME_DOC, { practice }, { merge: true });
}

/** 연습 종료: 연습 상태와 연습 제출을 모두 지우고 대기 화면으로 */
export async function endPractice(): Promise<void> {
  await updateDoc(GAME_DOC, { practice: null });
  await clearAllSubmissions("practice");
}

export async function revealPracticeHint(practice: PracticeState): Promise<void> {
  if (practice.hintsOpen >= 5) return;
  await updateDoc(GAME_DOC, { "practice.hintsOpen": practice.hintsOpen + 1 });
}

export async function revealPracticeCharCount(): Promise<void> {
  await updateDoc(GAME_DOC, { "practice.charCountRevealed": true });
}

export async function revealPracticeInitials(): Promise<void> {
  await updateDoc(GAME_DOC, { "practice.initialsRevealed": true });
}

/** 실제 게임과 같은 채점 로직으로 연습 제출을 채점 (연습 전용 컬렉션) */
export async function revealPracticeAnswer(practice: PracticeState): Promise<void> {
  await gradeRound(practice.roundId, PRACTICE_JOB, PRACTICE_SCORING, "practice", (batch) =>
    batch.update(GAME_DOC, { "practice.phase": "revealed" }),
  );
}
