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
import Confetti from "@/app/_components/Confetti";

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
              className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-white px-4 py-3 text-xl outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
            />
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-3 text-xl font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-card)] disabled:opacity-60"
            >
              {canSubmit ? "제출하기" : "기회를 모두 사용했어요"}
            </button>
          </form>

          <AttemptSlots attempts={mySubmission?.attempts ?? []} />
        </>
      ) : (
        <>
          <ResultCard submission={mySubmission} />
          {footer}
        </>
      )}
    </main>
  );
}

/** 제출 기회 3칸. 낸 답은 번호 배지와 함께 크게, 남은 칸은 점선으로 */
function AttemptSlots({ attempts }: { attempts: Submission["attempts"] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-[var(--color-muted)]">
        남은 기회 {MAX_ATTEMPTS - attempts.length} / {MAX_ATTEMPTS}
      </p>
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const a = attempts[i];
        return a ? (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-[var(--color-surface)] px-3 py-2.5 shadow-[var(--shadow-card)] motion-safe:animate-[rankPop_0.4s_ease-out]"
          >
            <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-3 py-1 font-[family-name:var(--font-accent)] text-lg text-[var(--color-on-primary)]">
              {i + 1}차
            </span>
            <span className="min-w-0 flex-1 break-all text-xl font-semibold">{a.answer}</span>
          </div>
        ) : (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-border)] px-3 py-2.5 text-[var(--color-muted)]"
          >
            <span className="shrink-0 rounded-full border-2 border-[var(--color-border)] px-3 py-0.5 font-[family-name:var(--font-accent)] text-lg">
              {i + 1}차
            </span>
            <span className="text-lg">아직 기회가 있어요</span>
          </div>
        );
      })}
    </div>
  );
}

/** 정답 공개 후 내 결과. 정답·오답·확인 중을 색과 큰 글자로 한눈에 */
function ResultCard({ submission }: { submission: Submission | null }) {
  if (!submission) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center">
        <span className="text-5xl">🙈</span>
        <p className="text-2xl font-semibold">이번 문제는 제출하지 않았어요</p>
      </div>
    );
  }

  const tone = submission.correct
    ? {
        box: "border-[var(--color-success)] bg-[var(--color-success)]/15",
        text: "text-[var(--color-success-ink)]",
        emoji: "🎉",
        title: "정답!",
        sub: null as string | null,
      }
    : submission.reviewNeeded
      ? {
          box: "border-[var(--color-primary)] bg-[var(--color-soft)]",
          text: "text-[var(--color-primary-ink)]",
          emoji: "🔍",
          title: "확인 중이에요",
          sub: "선생님이 답을 확인하고 있어요",
        }
      : {
          box: "border-[var(--color-danger)] bg-[var(--color-danger)]/10",
          text: "text-[var(--color-danger)]",
          emoji: "😢",
          title: "아쉽게도 오답!",
          sub: "다음 문제에서 만회해요",
        };

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-[var(--radius-card)] border-4 px-4 py-6 text-center shadow-[var(--shadow-card)] motion-safe:animate-[rankPop_0.6s_cubic-bezier(0.2,1.4,0.4,1)] ${tone.box}`}
    >
      {submission.correct && <Confetti count={60} />}
      <span className="text-6xl leading-none">{tone.emoji}</span>
      <p className={`font-[family-name:var(--font-accent)] text-5xl leading-tight ${tone.text}`}>
        {tone.title}
      </p>
      {submission.correct && (
        <p className="font-[family-name:var(--font-accent)] text-6xl leading-none text-[var(--foreground)]">
          +{submission.score}점
        </p>
      )}
      {tone.sub && <p className="text-xl font-semibold">{tone.sub}</p>}
      <ul className="mt-2 flex w-full flex-col gap-1 border-t border-[var(--color-border)] pt-3 text-left text-lg">
        {submission.attempts.map((a, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 font-semibold text-[var(--color-muted)]">{i + 1}차</span>
            <span className="break-all">{a.answer}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
