import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { judgeAnswer } from "./answerJudge";
import type { Job, Submission, SubmissionAttempt } from "./types";

export const MAX_ATTEMPTS = 3;

/** game: 실제 게임 제출 / practice: 연습 라운드 제출. 연습은 별도 컬렉션이라 순위표·오답노트·누적 점수에 섞이지 않음 */
export type SubmissionKind = "game" | "practice";

function submissionsCol(kind: SubmissionKind = "game") {
  return collection(db, "games", kind === "practice" ? "practice" : "current", "submissions");
}

function docIdFor(roundId: string, studentId: string) {
  return `${roundId}__${studentId}`;
}

function fromData(id: string, data: Record<string, unknown>): Submission {
  return {
    id,
    studentId: data.studentId as string,
    studentName: data.studentName as string,
    roundId: data.roundId as string,
    jobIndex: data.jobIndex as number,
    attempts: (data.attempts ?? []) as SubmissionAttempt[],
    correct: Boolean(data.correct),
    score: (data.score as number) ?? 0,
    scoredHintStage: (data.scoredHintStage as number) ?? 0,
    reviewNeeded: Boolean(data.reviewNeeded),
  };
}

export type SubmitResult =
  | { ok: true; attemptsUsed: number }
  | { ok: false; reason: "max-attempts" };

export async function submitAttempt(params: {
  roundId: string;
  studentId: string;
  studentName: string;
  jobIndex: number;
  answer: string;
  hintsOpenAtSubmit: number;
  initialsRevealedAtSubmit: boolean;
  kind?: SubmissionKind;
}): Promise<SubmitResult> {
  const ref = doc(submissionsCol(params.kind), docIdFor(params.roundId, params.studentId));
  const attempt: SubmissionAttempt = {
    answer: params.answer,
    hintsOpenAtSubmit: params.hintsOpenAtSubmit,
    initialsRevealedAtSubmit: params.initialsRevealedAtSubmit,
    submittedAt: Date.now(),
  };

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        studentId: params.studentId,
        studentName: params.studentName,
        roundId: params.roundId,
        jobIndex: params.jobIndex,
        attempts: [attempt],
        correct: false,
        score: 0,
        scoredHintStage: 0,
        reviewNeeded: false,
      });
      return { ok: true, attemptsUsed: 1 } as const;
    }

    const attempts = (snap.data().attempts ?? []) as SubmissionAttempt[];
    if (attempts.length >= MAX_ATTEMPTS) {
      return { ok: false, reason: "max-attempts" } as const;
    }
    tx.update(ref, { attempts: [...attempts, attempt] });
    return { ok: true, attemptsUsed: attempts.length + 1 } as const;
  });
}

export function subscribeMySubmission(
  roundId: string,
  studentId: string,
  onChange: (submission: Submission | null) => void,
  kind: SubmissionKind = "game",
) {
  const ref = doc(submissionsCol(kind), docIdFor(roundId, studentId));
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? fromData(snap.id, snap.data()) : null);
  });
}

export function subscribeRoundSubmissions(
  roundId: string,
  onChange: (submissions: Submission[]) => void,
  kind: SubmissionKind = "game",
) {
  const q = query(submissionsCol(kind), where("roundId", "==", roundId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => fromData(d.id, d.data())));
  });
}

export function subscribeStudentSubmissions(
  studentId: string,
  onChange: (submissions: Submission[]) => void,
) {
  const q = query(submissionsCol(), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => fromData(d.id, d.data())));
  });
}

export function subscribeAllSubmissions(
  onChange: (submissions: Submission[]) => void,
) {
  return onSnapshot(submissionsCol(), (snap) => {
    onChange(snap.docs.map((d) => fromData(d.id, d.data())));
  });
}

/** 정답 공개 시점에 해당 라운드의 모든 제출을 일괄 채점 (스펙 7장) */
export async function gradeRound(
  roundId: string,
  job: Job,
  scoring: number[],
  kind: SubmissionKind = "game",
): Promise<void> {
  const q = query(submissionsCol(kind), where("roundId", "==", roundId));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const attempts = (d.data().attempts ?? []) as SubmissionAttempt[];
    let reviewNeeded = false;
    let graded: { correct: boolean; score: number; scoredHintStage: number } | null = null;

    for (const attempt of attempts) {
      const verdict = judgeAnswer(attempt.answer, job);
      if (verdict === "correct") {
        const stage = attempt.hintsOpenAtSubmit;
        graded = { correct: true, score: scoring[stage - 1] ?? 0, scoredHintStage: stage };
        break;
      }
      if (verdict === "reviewNeeded") {
        reviewNeeded = true;
      }
    }

    batch.update(d.ref, {
      correct: graded?.correct ?? false,
      score: graded?.score ?? 0,
      scoredHintStage: graded?.scoredHintStage ?? 0,
      reviewNeeded,
    });
  });
  await batch.commit();
}

/** 정답 처리됐으면 정답 우선, 아니면 보류 여부 → 결과 화면 분류 */
export type RoundOutcome = "correct" | "pending" | "wrong";

export function outcomeOf(submission: Submission): RoundOutcome {
  if (submission.correct) return "correct";
  if (submission.reviewNeeded) return "pending";
  return "wrong";
}

/** 보류로 분류된 시도(가장 먼저 보류 판정된 답)와 그 시점의 힌트 단계 */
export function pendingAttemptOf(
  submission: Submission,
  job: Job,
): { answer: string; stage: number } {
  const attempt =
    submission.attempts.find((a) => judgeAnswer(a.answer, job) === "reviewNeeded") ??
    submission.attempts[0];
  return { answer: attempt?.answer ?? "", stage: attempt?.hintsOpenAtSubmit ?? 1 };
}

/** 교사가 보류 항목을 처리: 정답이면 입력한 점수로, 오답이면 0점으로 저장 */
export async function resolvePendingSubmission(
  submissionId: string,
  verdict: { correct: true; score: number; stage: number } | { correct: false },
  kind: SubmissionKind = "game",
): Promise<void> {
  const ref = doc(submissionsCol(kind), submissionId);
  await updateDoc(
    ref,
    verdict.correct
      ? { correct: true, score: verdict.score, scoredHintStage: verdict.stage, reviewNeeded: false }
      : { correct: false, score: 0, scoredHintStage: 0, reviewNeeded: false },
  );
}

export async function clearAllSubmissions(kind: SubmissionKind = "game"): Promise<void> {
  const snap = await getDocs(submissionsCol(kind));
  const chunks: (typeof snap.docs)[] = [];
  for (let i = 0; i < snap.docs.length; i += 400) {
    chunks.push(snap.docs.slice(i, i + 400));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
