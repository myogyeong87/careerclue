import {
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { classSubcol } from "./classes";
import { deleteQueryFully } from "./firestoreDelete";
import { judgeAnswer } from "./answerJudge";
import { chunk, DELETE_BATCH_SIZE } from "./classRules";
import type { Job, Submission, SubmissionAttempt } from "./types";

export const MAX_ATTEMPTS = 3;

/** game: 실제 게임 제출 / practice: 연습 라운드 제출. 연습은 반 안의 별도 컬렉션이라 순위표·오답노트·누적 점수에 섞이지 않음 */
export type SubmissionKind = "game" | "practice";

export function submissionsCol(classId: string, kind: SubmissionKind = "game") {
  return classSubcol(classId, kind === "practice" ? "practice_submissions" : "submissions");
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
    runId: (data.runId as string) ?? null,
    jobIndex: data.jobIndex as number,
    jobTitle: (data.jobTitle as string) ?? "",
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
  classId: string;
  runId: string | null;
  jobTitle: string;
  roundId: string;
  studentId: string;
  studentName: string;
  jobIndex: number;
  answer: string;
  hintsOpenAtSubmit: number;
  initialsRevealedAtSubmit: boolean;
  kind?: SubmissionKind;
}): Promise<SubmitResult> {
  const ref = doc(
    submissionsCol(params.classId, params.kind),
    docIdFor(params.roundId, params.studentId),
  );
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
        runId: params.runId,
        jobIndex: params.jobIndex,
        jobTitle: params.jobTitle,
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
  classId: string,
  roundId: string,
  studentId: string,
  onChange: (submission: Submission | null) => void,
  kind: SubmissionKind = "game",
) {
  const ref = doc(submissionsCol(classId, kind), docIdFor(roundId, studentId));
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? fromData(snap.id, snap.data()) : null);
  });
}

export function subscribeRoundSubmissions(
  classId: string,
  roundId: string,
  onChange: (submissions: Submission[]) => void,
  kind: SubmissionKind = "game",
) {
  const q = query(submissionsCol(classId, kind), where("roundId", "==", roundId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => fromData(d.id, d.data())));
  });
}

export function subscribeStudentSubmissions(
  classId: string,
  studentId: string,
  onChange: (submissions: Submission[]) => void,
) {
  const q = query(submissionsCol(classId), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => fromData(d.id, d.data())));
  });
}

/** 반의 실제 게임 제출 전체 (누적 점수·순위표용) */
export function subscribeAllSubmissions(
  classId: string,
  onChange: (submissions: Submission[]) => void,
) {
  return onSnapshot(submissionsCol(classId), (snap) => {
    onChange(snap.docs.map((d) => fromData(d.id, d.data())));
  });
}

/** 학생 이름이 바뀌면 이미 낸 제출(실제·연습)의 이름도 새 이름으로 맞춤 (점수는 학번 기준으로 이어짐) */
export async function renameStudentSubmissions(
  classId: string,
  studentId: string,
  name: string,
): Promise<void> {
  for (const kind of ["game", "practice"] as const) {
    const snap = await getDocs(
      query(submissionsCol(classId, kind), where("studentId", "==", studentId)),
    );
    const stale = snap.docs.filter((d) => d.data().studentName !== name);
    for (const part of chunk(stale, DELETE_BATCH_SIZE)) {
      const batch = writeBatch(db);
      part.forEach((d) => batch.update(d.ref, { studentName: name }));
      await batch.commit();
    }
  }
}

/**
 * 정답 공개 시점에 해당 라운드의 모든 제출을 일괄 채점 (스펙 7장).
 * alsoInBatch로 정답 공개(phase 전환)를 같은 batch에 넣으면, 학생 화면에 채점 전 "오답"이 잠깐 보였다가 바뀌는 일이 없음
 */
export async function gradeRound(
  classId: string,
  roundId: string,
  job: Job,
  scoring: number[],
  kind: SubmissionKind = "game",
  alsoInBatch?: (batch: WriteBatch) => void,
): Promise<void> {
  const q = query(submissionsCol(classId, kind), where("roundId", "==", roundId));
  const snap = await getDocs(q);

  const batch = writeBatch(db);
  alsoInBatch?.(batch);
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
  classId: string,
  submissionId: string,
  verdict: { correct: true; score: number; stage: number } | { correct: false },
  kind: SubmissionKind = "game",
): Promise<void> {
  const ref = doc(submissionsCol(classId, kind), submissionId);
  await updateDoc(
    ref,
    verdict.correct
      ? { correct: true, score: verdict.score, scoredHintStage: verdict.stage, reviewNeeded: false }
      : { correct: false, score: 0, scoredHintStage: 0, reviewNeeded: false },
  );
}

/** 연습 제출 전체 삭제 (연습 시작·종료 시) */
export async function clearPracticeSubmissions(classId: string): Promise<void> {
  await deleteQueryFully(submissionsCol(classId, "practice"));
}

/** 이번 게임(runId)의 제출만 삭제. 이전 게임까지의 누적 점수는 남김 */
export async function clearRunSubmissions(classId: string, runId: string | null): Promise<void> {
  if (!runId) return;
  await deleteQueryFully(query(submissionsCol(classId), where("runId", "==", runId)));
}
