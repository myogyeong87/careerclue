"use client";

import { useEffect, useMemo, useState } from "react";
import { isRoundInProgress, subscribeGameState } from "@/lib/game";
import { useCountdownAutoStart } from "@/lib/useCountdownAutoStart";
import { subscribeAllSubmissions, subscribeStudentSubmissions } from "@/lib/submissions";
import { buildLeaderboard } from "@/lib/ranking";
import { PRACTICE_JOB, PRACTICE_SCORING } from "@/lib/practice";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";
import HowToPlay from "@/app/_components/HowToPlay";
import Countdown from "@/app/_components/Countdown";
import StudentRound from "./StudentRound";

export default function GameView({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [myAllSubmissions, setMyAllSubmissions] = useState<Submission[]>([]);

  useEffect(() => subscribeGameState(setGame), []);
  useCountdownAutoStart(game);
  useEffect(() => subscribeStudentSubmissions(studentId, setMyAllSubmissions), [studentId]);

  const cumulativeScore = useMemo(
    () => myAllSubmissions.reduce((sum, s) => sum + s.score, 0),
    [myAllSubmissions],
  );

  const sortedMySubmissions = useMemo(
    () => [...myAllSubmissions].sort((a, b) => a.jobIndex - b.jobIndex),
    [myAllSubmissions],
  );

  if (game.phase === "finished" && !game.rankRevealDone) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="탐정 강아지" className="h-28 w-28 motion-safe:animate-bounce" />
        <h1 className="text-3xl">앞 화면을 봐 주세요</h1>
        <p className="text-[var(--color-muted)]">곧 이번 시간 순위가 공개돼요!</p>
      </main>
    );
  }

  if (game.phase === "finished") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl">게임이 끝났어요!</h1>
          <MyRank studentId={studentId} />
          <p className="font-[family-name:var(--font-accent)] text-2xl text-[var(--color-primary-ink)]">
            누적 점수 {cumulativeScore}점
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-muted)]">내 성적표</h2>
          <ul className="flex flex-col gap-1.5">
            {sortedMySubmissions.map((s) => {
              const submittedJob = game.jobs[s.jobIndex];
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm"
                >
                  <span className="font-semibold">
                    {submittedJob?.title ?? `문제 ${s.jobIndex + 1}`}
                  </span>
                  <span
                    className={
                      s.correct
                        ? "font-semibold text-[var(--color-success-ink)]"
                        : "font-semibold text-[var(--color-danger)]"
                    }
                  >
                    {s.correct ? `정답 (+${s.score}점)` : "오답"}
                  </span>
                </li>
              );
            })}
            {sortedMySubmissions.length === 0 && (
              <li className="text-sm text-[var(--color-muted)]">제출한 문제가 없어요.</li>
            )}
          </ul>
        </div>

      </main>
    );
  }

  if (game.phase === "countdown" && game.countdownEndsAt) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="탐정 강아지" className="h-20 w-20" />
        <p className="text-lg text-[var(--foreground)]">곧 시작해요!</p>
        <Countdown endsAt={game.countdownEndsAt} />
      </main>
    );
  }

  if (game.practice && !isRoundInProgress(game)) {
    const practice = game.practice;
    return (
      <StudentRound
        key={practice.roundId}
        kind="practice"
        studentId={studentId}
        studentName={studentName}
        roundId={practice.roundId}
        jobIndex={0}
        job={PRACTICE_JOB}
        scoring={PRACTICE_SCORING}
        hintsOpen={practice.hintsOpen}
        initialsRevealed={practice.initialsRevealed}
        charCountRevealed={practice.charCountRevealed}
        revealed={practice.phase === "revealed"}
        header={
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full border-2 border-[var(--color-secondary)] bg-[var(--color-secondary)]/20 px-4 py-1 font-[family-name:var(--font-accent)] text-xl">
              🧪 연습
            </span>
            <span className="text-sm text-[var(--color-muted)]">점수에 반영되지 않아요</span>
          </div>
        }
      />
    );
  }

  if (game.jobs.length === 0 || game.phase === "idle" || !game.roundId) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="탐정 강아지" className="h-24 w-24" />
        <h1 className="text-2xl">
          {studentName}({studentId})님, 안녕하세요!
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          게임이 곧 시작돼요. 기다리는 동안 게임 방법을 읽어보세요!
        </p>
        <div className="w-full text-left">
          <HowToPlay />
        </div>
      </main>
    );
  }

  return (
    <StudentRound
      key={game.roundId}
      kind="game"
      studentId={studentId}
      studentName={studentName}
      roundId={game.roundId}
      jobIndex={game.currentIndex}
      job={game.jobs[game.currentIndex]}
      scoring={game.scoring}
      hintsOpen={game.hintsOpen}
      initialsRevealed={game.initialsRevealed}
      charCountRevealed={game.charCountRevealed}
      revealed={game.phase === "revealed"}
      header={
        <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
          <span>
            문제 {game.currentIndex + 1} / {game.jobs.length}
          </span>
          <span>누적 점수 {cumulativeScore}점</span>
        </div>
      }
      footer={<p className="text-sm text-[var(--color-muted)]">누적 점수 {cumulativeScore}점</p>}
    />
  );
}

/** 전체 순위표가 공개된 뒤 내 순위만 보여줌 (다른 학생의 이름·점수는 표시하지 않음) */
function MyRank({ studentId }: { studentId: string }) {
  const [all, setAll] = useState<Submission[]>([]);
  useEffect(() => subscribeAllSubmissions(setAll), []);
  const me = useMemo(
    () => buildLeaderboard(all).find((e) => e.studentId === studentId),
    [all, studentId],
  );
  if (!me) return null;
  return (
    <p className="my-2 font-[family-name:var(--font-accent)] text-5xl text-[var(--foreground)]">
      {me.rank === 1 ? "👑 " : ""}
      {me.rank}위
    </p>
  );
}
