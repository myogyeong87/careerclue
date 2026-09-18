"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeGameState } from "@/lib/game";
import {
  MAX_ATTEMPTS,
  submitAttempt,
  subscribeMySubmission,
  subscribeStudentSubmissions,
} from "@/lib/submissions";
import { charCountPreview, toChosung } from "@/lib/text";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";
import ClueBoard from "@/app/_components/ClueBoard";

export default function GameView({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [submissionState, setSubmissionState] = useState<{
    roundId: string | null;
    submission: Submission | null;
  }>({ roundId: null, submission: null });
  const [myAllSubmissions, setMyAllSubmissions] = useState<Submission[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);
  useEffect(() => subscribeStudentSubmissions(studentId, setMyAllSubmissions), [studentId]);

  useEffect(() => {
    if (!game.roundId) return;
    const roundId = game.roundId;
    return subscribeMySubmission(roundId, studentId, (submission) =>
      setSubmissionState({ roundId, submission }),
    );
  }, [game.roundId, studentId]);

  const mySubmission =
    submissionState.roundId === game.roundId ? submissionState.submission : null;

  const cumulativeScore = useMemo(
    () => myAllSubmissions.reduce((sum, s) => sum + s.score, 0),
    [myAllSubmissions],
  );

  if (game.phase === "finished") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-2xl">게임이 끝났어요!</h1>
        <p className="font-[family-name:var(--font-accent)] text-2xl text-[var(--color-primary)]">
          누적 점수 {cumulativeScore}점
        </p>
        <p className="text-sm text-[var(--foreground)]/70">
          교사 화면에서 전체 결과를 확인해주세요.
        </p>
      </main>
    );
  }

  if (game.jobs.length === 0 || game.phase === "idle") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-2xl">
          {studentName}({studentId})님, 안녕하세요!
        </h1>
        <p className="text-sm text-[var(--foreground)]/70">
          게임이 곧 시작돼요. 잠시만 기다려주세요.
        </p>
      </main>
    );
  }

  const job = game.jobs[game.currentIndex];
  const revealed = game.phase === "revealed";
  const attemptsUsed = mySubmission?.attempts.length ?? 0;
  const canSubmit = !revealed && attemptsUsed < MAX_ATTEMPTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || !game.roundId) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitAttempt({
        roundId: game.roundId,
        studentId,
        studentName,
        jobIndex: game.currentIndex,
        answer: trimmed,
        hintsOpenAtSubmit: game.hintsOpen,
        initialsRevealedAtSubmit: game.initialsRevealed,
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
      <div className="flex items-center justify-between text-sm text-[var(--foreground)]/70">
        <span>
          문제 {game.currentIndex + 1} / {game.jobs.length}
        </span>
        <span>누적 점수 {cumulativeScore}점</span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]/60">사건 파일</p>
        <ClueBoard
          hints={job.hints}
          hintsOpen={game.hintsOpen}
          scoring={game.scoring}
          initialsRevealed={game.initialsRevealed}
          chosung={toChosung(job.title)}
          revealed={revealed}
          answer={job.title}
        />
        {!revealed && (
          <p className="mt-1 font-mono text-lg tracking-widest text-[var(--foreground)]/70">
            {charCountPreview(job.title)}
          </p>
        )}
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {canSubmit ? "제출하기" : "기회를 모두 사용했어요"}
            </button>
            <p className="text-center text-sm text-[var(--foreground)]/60">
              남은 기회 {MAX_ATTEMPTS - attemptsUsed}/{MAX_ATTEMPTS}
            </p>
          </form>

          {attemptsUsed > 0 && (
            <div className="flex flex-col gap-1 text-sm text-[var(--foreground)]/70">
              {mySubmission?.attempts.map((a, i) => (
                <p key={i}>
                  {i + 1}차 제출: {a.answer}
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
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
                    ? "font-semibold text-[var(--color-primary)]"
                    : "font-semibold text-red-600"
                }
              >
                {mySubmission.correct
                  ? `정답! +${mySubmission.score}점`
                  : "오답이에요"}
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--foreground)]/60">
              이번 라운드는 제출하지 않았어요.
            </p>
          )}
          <p className="text-sm text-[var(--foreground)]/70">
            누적 점수 {cumulativeScore}점
          </p>
        </div>
      )}
    </main>
  );
}
