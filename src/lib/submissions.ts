import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { judgeAnswer } from "./answerJudge";
import type { Job, Submission, SubmissionAttempt } from "./types";

export const MAX_ATTEMPTS = 3;

function submissionsCol() {
  return collection(db, "games", "current", "submissions");
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
}): Promise<SubmitResult> {
  const ref = doc(submissionsCol(), docIdFor(params.roundId, params.studentId));
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
) {
  const ref = doc(submissionsCol(), docIdFor(roundId, studentId));
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? fromData(snap.id, snap.data()) : null);
  });
}

export function subscribeRoundSubmissions(
  roundId: string,
  onChange: (submissions: Submission[]) => void,
) {
  const q = query(submissionsCol(), where("roundId", "==", roundId));
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
): Promise<void> {
  const q = query(submissionsCol(), where("roundId", "==", roundId));
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

/** 교사가 "검토 필요" 제출을 수동으로 정답/오답 전환 (스펙 8장) */
export async function overrideSubmissionVerdict(
  submission: Submission,
  job: Job,
  correct: boolean,
  scoring: number[],
): Promise<void> {
  const ref = doc(submissionsCol(), submission.id);
  if (!correct) {
    await runTransaction(db, async (tx) => {
      tx.update(ref, { correct: false, score: 0, scoredHintStage: 0, reviewNeeded: false });
    });
    return;
  }
  // 애매 판정(편집거리 오타 수준)을 유발한 시도 기준으로 점수 재계산
  const ambiguousAttempt =
    submission.attempts.find((a) => judgeAnswer(a.answer, job) === "reviewNeeded") ??
    submission.attempts[0];
  const stage = ambiguousAttempt?.hintsOpenAtSubmit ?? 1;
  await runTransaction(db, async (tx) => {
    tx.update(ref, {
      correct: true,
      score: scoring[stage - 1] ?? 0,
      scoredHintStage: stage,
      reviewNeeded: false,
    });
  });
}

export async function clearAllSubmissions(): Promise<void> {
  const snap = await getDocs(submissionsCol());
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
