"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeGameState } from "@/lib/game";
import { subscribeAllSubmissions } from "@/lib/submissions";
import { playRevealChime } from "@/lib/sound";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";

type RoundTag = "speed" | "allCorrect" | "struggle" | "comeback";

const TAG_META: Record<RoundTag, { emoji: string; label: string }> = {
  speed: { emoji: "⚡", label: "순발력 상" },
  allCorrect: { emoji: "🎯", label: "전원 정답" },
  struggle: { emoji: "🤔", label: "다 함께 고민" },
  comeback: { emoji: "🔥", label: "막판 뒤집기" },
};

interface RoundSummary {
  roundId: string;
  jobIndex: number;
  title: string;
  hints: string[];
  submissions: Submission[];
  tags: RoundTag[];
  distribution: Record<number, number>; // 힌트 단계 -> 정답자 수
}

function buildRounds(game: GameState, submissions: Submission[]): RoundSummary[] {
  const byRound = new Map<string, Submission[]>();
  submissions.forEach((s) => {
    const list = byRound.get(s.roundId) ?? [];
    list.push(s);
    byRound.set(s.roundId, list);
  });

  const rounds: RoundSummary[] = [];
  byRound.forEach((subs, roundId) => {
    const jobIndex = subs[0]?.jobIndex ?? 0;
    const job = game.jobs[jobIndex];
    if (!job) return;

    const total = subs.length;
    const correct = subs.filter((s) => s.correct);
    const tags: RoundTag[] = [];

    if (correct.some((s) => s.score === game.scoring[0])) tags.push("speed");
    if (total > 0 && correct.length === total) tags.push("allCorrect");
    if (total === 0 || correct.length / total < 0.3) tags.push("struggle");
    if (
      correct.some((s) =>
        s.attempts.some(
          (a) => a.hintsOpenAtSubmit === s.scoredHintStage && a.initialsRevealedAtSubmit,
        ),
      )
    ) {
      tags.push("comeback");
    }

    const distribution: Record<number, number> = {};
    correct.forEach((s) => {
      distribution[s.scoredHintStage] = (distribution[s.scoredHintStage] ?? 0) + 1;
    });

    rounds.push({
      roundId,
      jobIndex,
      title: job.title,
      hints: job.hints,
      submissions: subs,
      tags,
      distribution,
    });
  });

  return rounds.sort((a, b) => a.jobIndex - b.jobIndex);
}

export default function ResultsTab() {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const chimePlayed = useRef(false);

  useEffect(() => subscribeGameState(setGame), []);
  useEffect(() => subscribeAllSubmissions(setSubmissions), []);

  useEffect(() => {
    if (!chimePlayed.current && submissions.length > 0) {
      chimePlayed.current = true;
      playRevealChime();
    }
  }, [submissions.length]);

  const leaderboard = useMemo(() => {
    const totals = new Map<string, { studentName: string; score: number }>();
    submissions.forEach((s) => {
      const entry = totals.get(s.studentId) ?? { studentName: s.studentName, score: 0 };
      entry.score += s.score;
      entry.studentName = s.studentName;
      totals.set(s.studentId, entry);
    });
    return Array.from(totals.entries())
      .map(([studentId, v]) => ({ studentId, ...v }))
      .sort((a, b) => b.score - a.score);
  }, [submissions]);

  const rounds = useMemo(() => buildRounds(game, submissions), [game, submissions]);

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-[var(--foreground)]/60">
        아직 채점된 제출이 없어요. 라운드를 진행하고 정답을 공개하면 이곳에
        결과가 표시돼요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-3 text-xl">순위표</h2>
        <ol className="flex flex-col gap-2">
          {leaderboard.map((entry, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            return (
              <li
                key={entry.studentId}
                className={`flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3 ${
                  isTop3
                    ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-card)] animate-pulse"
                    : "bg-[var(--color-surface)]"
                }`}
              >
                <span className="font-[family-name:var(--font-accent)] w-8 text-lg">
                  {rank}
                </span>
                <span className="flex-1 font-semibold">{entry.studentName}</span>
                <span className="font-[family-name:var(--font-accent)] text-lg">
                  {entry.score}점
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-xl">오답노트</h2>
        <div className="flex flex-col gap-3">
          {rounds.map((round) => (
            <div
              key={round.roundId}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedRound((cur) => (cur === round.roundId ? null : round.roundId))
                }
                className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left"
              >
                <span className="font-semibold">문제 {round.jobIndex + 1}</span>
                <span className="flex flex-wrap gap-1.5">
                  {round.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold"
                    >
                      {TAG_META[tag].emoji} {TAG_META[tag].label}
                    </span>
                  ))}
                </span>
                <span className="ml-auto text-sm text-[var(--foreground)]/60">
                  {expandedRound === round.roundId ? "접기 ▲" : "펼치기 ▼"}
                </span>
              </button>

              {expandedRound === round.roundId && (
                <div className="flex flex-col gap-3 border-t border-white px-4 py-4">
                  <p className="font-[family-name:var(--font-heading)] text-lg">
                    정답: {round.title}
                  </p>
                  <ol className="flex flex-col gap-1 text-sm">
                    {round.hints.map((hint, i) => (
                      <li key={i}>
                        <span className="mr-1 text-[var(--color-primary)]">
                          {i + 1}.
                        </span>
                        {hint}
                      </li>
                    ))}
                  </ol>
                  <div>
                    <p className="mb-1 text-sm font-semibold">반 정답 분포</p>
                    <ul className="flex flex-wrap gap-2 text-sm">
                      {[1, 2, 3, 4, 5].map((stage) => (
                        <li
                          key={stage}
                          className="rounded-lg bg-white px-2 py-1"
                        >
                          {stage}번째 힌트: {round.distribution[stage] ?? 0}명
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
