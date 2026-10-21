"use client";

import { useEffect, useMemo, useState } from "react";
import { finishRankReveal, setRankRevealStep, subscribeGameState } from "@/lib/game";
import { subscribeAllSubmissions } from "@/lib/submissions";
import { buildLeaderboard, topRankGroups } from "@/lib/ranking";
import { playDrumroll, playFanfare, playRankPop, playRevealChime } from "@/lib/sound";
import { tfs } from "@/lib/teacherFontSize";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";
import RankReveal from "./RankReveal";

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

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ResultsTab() {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);
  useEffect(() => subscribeAllSubmissions(setSubmissions), []);

  const leaderboard = useMemo(() => buildLeaderboard(submissions), [submissions]);
  const groups = useMemo(() => topRankGroups(leaderboard), [leaderboard]);
  // 5위 → 1위 순으로 공개
  const revealOrder = useMemo(() => [...groups].reverse(), [groups]);
  const rounds = useMemo(() => buildRounds(game, submissions), [game, submissions]);

  const step = Math.min(game.rankRevealStep, revealOrder.length);

  const handleNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (step < revealOrder.length) {
        if (revealOrder[step].rank === 1) {
          await sleep(playDrumroll() * 1000);
          playFanfare();
        } else {
          playRankPop();
        }
        await setRankRevealStep(step + 1);
      } else {
        playRevealChime();
        await finishRankReveal();
      }
    } finally {
      setBusy(false);
    }
  };

  if (submissions.length === 0) {
    return (
      <p className="text-xl text-[var(--color-muted)]">
        아직 채점된 제출이 없어요. 라운드를 진행하고 정답을 공개하면 이곳에
        결과가 표시돼요.
      </p>
    );
  }

  if (!game.rankRevealDone) {
    return (
      <RankReveal
        revealed={revealOrder.slice(0, step)}
        total={revealOrder.length}
        busy={busy}
        nextLabel={
          step >= revealOrder.length
            ? "전체 순위표 보기"
            : revealOrder[step].rank === 1
              ? "🥁 1위 공개"
              : "다음 순위 ▶"
        }
        onNext={handleNext}
      />
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <section style={{ fontSize: tfs(1.2) }}>
        <h2 className="mb-[0.6em] text-[1.4em]">🏆 전체 순위</h2>
        <ol className="gap-[0.6em] lg:columns-2">
          {leaderboard.map((entry) => (
            <li
              key={entry.studentId}
              className={`mb-[0.4em] flex break-inside-avoid items-center gap-[0.6em] rounded-[var(--radius-card)] border-2 px-[0.8em] py-[0.35em] ${
                entry.rank <= 3
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              <span className="min-w-[2.6em] font-[family-name:var(--font-accent)]">
                {MEDAL[entry.rank] ?? `${entry.rank}위`}
              </span>
              <span className="flex-1 truncate font-semibold">{entry.studentName}</span>
              <span className="font-[family-name:var(--font-accent)]">{entry.score}점</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ fontSize: tfs() }}>
        <h2 className="mb-3 text-[1.4em]">오답노트</h2>
        <div className="flex flex-col gap-3">
          {rounds.map((round) => (
            <div
              key={round.roundId}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
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
                      className="rounded-full bg-[var(--color-soft)] px-2 py-0.5 text-[0.8em] font-semibold"
                    >
                      {TAG_META[tag].emoji} {TAG_META[tag].label}
                    </span>
                  ))}
                </span>
                <span className="ml-auto text-[0.8em] text-[var(--color-muted)]">
                  {expandedRound === round.roundId ? "접기 ▲" : "펼치기 ▼"}
                </span>
              </button>

              {expandedRound === round.roundId && (
                <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-4">
                  <p className="font-[family-name:var(--font-heading)] text-[1.1em]">
                    정답: {round.title}
                  </p>
                  <ol className="flex flex-col gap-1 text-[0.8em]">
                    {round.hints.map((hint, i) => (
                      <li key={i}>
                        <span className="mr-1 text-[var(--color-primary-ink)]">
                          {i + 1}.
                        </span>
                        {hint}
                      </li>
                    ))}
                  </ol>
                  <div>
                    <p className="mb-1 text-[0.8em] font-semibold">반 정답 분포</p>
                    <ul className="flex flex-wrap gap-2 text-[0.8em]">
                      {[1, 2, 3, 4, 5].map((stage) => (
                        <li
                          key={stage}
                          className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-1"
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
