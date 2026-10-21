"use client";

import { useEffect, useState } from "react";
import {
  MAX_ATTEMPTS,
  submitAttempt,
  subscribeMySubmission,
  type SubmissionKind,
} from "@/lib/submissions";
import { charCountPreview, toChosung } from "@/lib/text";
import type { Job, Submission } from "@/lib/types";
import ClueBoard from "@/app/_components/ClueBoard";

/** 학생 화면의 한 라운드 (사건 파일 + 제출 폼 + 정답 공개 후 내 결과). 실제 게임과 연습이 함께 사용 */
export default function StudentRound({
  kind,
  studentId,
  studentName,
  roundId,
  jobIndex,
  job,
  scoring,
  hintsOpen,
  initialsRevealed,
  charCountRevealed,
  revealed,
  header,
  footer,
}: {
  kind: SubmissionKind;
  studentId: string;
  studentName: string;
  roundId: string;
  jobIndex: number;
  job: Job;
  scoring: number[];
  hintsOpen: number;
  initialsRevealed: boolean;
  charCountRevealed: boolean;
  revealed: boolean;
  header: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [submissionState, setSubmissionState] = useState<{
    roundId: string | null;
    submission: Submission | null;
  }>({ roundId: null, submission: null });
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(
    () =>
      subscribeMySubmission(
        roundId,
        studentId,
        (submission) => setSubmissionState({ roundId, submission }),
        kind,
      ),
    [roundId, studentId, kind],
  );

  const mySubmission = submissionState.roundId === roundId ? submissionState.submission : null;
  const attemptsUsed = mySubmission?.attempts.length ?? 0;
  const canSubmit = !revealed && attemptsUsed < MAX_ATTEMPTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitAttempt({
        roundId,
        studentId,
        studentName,
        jobIndex,
        answer: trimmed,
        hintsOpenAtSubmit: hintsOpen,
        initialsRevealedAtSubmit: initialsRevealed,
        kind,
      });
      if (!result.ok) {
        setError("이미 3번 모두 제출했어요.");
      } else {
        setAnswer("");
      }
    } catch {
      setError("제출에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      {header}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-[var(--color-muted)]">사건 파일</p>
        <ClueBoard
          hints={job.hints}
          hintsOpen={hintsOpen}
          scoring={scoring}
          initialsRevealed={initialsRevealed}
          chosung={toChosung(job.title)}
          charCountRevealed={charCountRevealed}
          charCount={charCountPreview(job.title)}
          revealed={revealed}
          answer={job.title}
        />
      </div>

      {!revealed ? (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!canSubmit || submitting}
              placeholder="정답을 입력하세요"
              className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-3 text-base outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
            />
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-3 font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {canSubmit ? "제출하기" : "기회를 모두 사용했어요"}
            </button>
            <p className="text-center text-sm text-[var(--color-muted)]">
              남은 기회 {MAX_ATTEMPTS - attemptsUsed}/{MAX_ATTEMPTS}
            </p>
          </form>

          {attemptsUsed > 0 && (
            <div className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
              {mySubmission?.attempts.map((a, i) => (
                <p key={i}>
                  {i + 1}차 제출: {a.answer}
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          {mySubmission ? (
            <>
              <div className="flex flex-col gap-1 text-sm">
                {mySubmission.attempts.map((a, i) => (
                  <p key={i}>
                    {i + 1}차 제출: {a.answer}
                  </p>
                ))}
              </div>
              <p
                className={
                  mySubmission.correct
                    ? "font-semibold text-[var(--color-success-ink)]"
                    : mySubmission.reviewNeeded
                      ? "font-semibold text-[var(--color-primary-ink)]"
                      : "font-semibold text-[var(--color-danger)]"
                }
              >
                {mySubmission.correct
                  ? `정답! +${mySubmission.score}점`
                  : mySubmission.reviewNeeded
                    ? "선생님이 답을 확인하고 있어요"
                    : "오답이에요"}
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">이번 라운드는 제출하지 않았어요.</p>
          )}
          {footer}
        </div>
      )}
    </main>
  );
}
