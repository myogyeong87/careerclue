"use client";

import { useEffect, useMemo, useState } from "react";
import { finishRankReveal, setRankRevealStep, subscribeGameState } from "@/lib/game";
import { subscribeAllSubmissions } from "@/lib/submissions";
import { buildLeaderboard, topRankGroups } from "@/lib/ranking";
import { playDrumroll, playFanfare, playRankPop, playRevealChime } from "@/lib/sound";
import { tfs } from "@/lib/teacherFontSize";
import { EMPTY_GAME_STATE, type GameState, type Submission } from "@/lib/types";
import { judgeAnswer } from "@/lib/answerJudge";
import { buildAwards } from "@/lib/awards";
import RankReveal from "./RankReveal";
import AwardStage from "./AwardStage";

/** 정답률(정답자 수 / 이번 게임 참여 학생 수)로 나눈 오답노트 분류. 어려운 문제부터 */
type Category = "allWrong" | "under50" | "over50" | "allCorrect";

const CATEGORY_ORDER: Category[] = ["allWrong", "under50", "over50", "allCorrect"];

const CATEGORY_META: Record<Category, { emoji: string; label: string; rule: string }> = {
  allWrong: { emoji: "😱", label: "전원 오답", rule: "아무도 맞히지 못했어요" },
  under50: { emoji: "🤔", label: "정답률 50% 미만", rule: "절반도 못 맞혔어요" },
  over50: { emoji: "🙂", label: "정답률 50% 이상", rule: "절반 넘게 맞혔어요" },
  allCorrect: { emoji: "🎯", label: "전원 정답", rule: "모두 맞혔어요" },
};

function categoryOf(correct: number, total: number): Category {
  if (total === 0 || correct === 0) return "allWrong";
  if (correct >= total) return "allCorrect";
  return correct / total < 0.5 ? "under50" : "over50";
}

interface RoundSummary {
  key: string;
  jobIndex: number;
  title: string;
  hints: string[];
  correctCount: number;
  total: number;
  category: Category;
  distribution: Record<number, number>; // 힌트 단계 -> 정답자 수
  wrongAnswers: { answer: string; count: number }[]; // 많이 나온 순
}

function buildRounds(game: GameState, submissions: Submission[]): RoundSummary[] {
  // 분모: 이번 게임에 한 번이라도 제출한 학생 (그 문제를 제출하지 않았으면 못 맞힌 것으로 봄)
  const total = new Set(submissions.map((s) => s.studentId)).size;
  const byJob = new Map<number, Submission[]>();
  submissions.forEach((s) => {
    const list = byJob.get(s.jobIndex) ?? [];
    list.push(s);
    byJob.set(s.jobIndex, list);
  });
  // 진행한 마지막 문제까지는 아무도 제출하지 않은 문제도 포함
  const lastIndex = Math.max(-1, ...submissions.map((s) => s.jobIndex));

  const rounds: RoundSummary[] = [];
  for (let jobIndex = 0; jobIndex <= lastIndex; jobIndex++) {
    const job = game.jobs[jobIndex];
    if (!job) continue;
    const subs = byJob.get(jobIndex) ?? [];
    const correct = subs.filter((s) => s.correct);

    const distribution: Record<number, number> = {};
    correct.forEach((s) => {
      distribution[s.scoredHintStage] = (distribution[s.scoredHintStage] ?? 0) + 1;
    });

    const wrongCounts = new Map<string, number>();
    subs.forEach((s) => {
      s.attempts.forEach((a) => {
        // 정답 처리된 학생은 판정상 오답인 시도만, 나머지 학생은 모든 시도를 오답으로 셈
        if (s.correct && judgeAnswer(a.answer, job) !== "wrong") return;
        const answer = a.answer.trim();
        if (answer) wrongCounts.set(answer, (wrongCounts.get(answer) ?? 0) + 1);
      });
    });
    const wrongAnswers = [...wrongCounts]
      .map(([answer, count]) => ({ answer, count }))
      .sort((x, y) => y.count - x.count || x.answer.localeCompare(y.answer, "ko"));

    rounds.push({
      key: `job-${jobIndex}`,
      jobIndex,
      title: job.title,
      hints: job.hints,
      correctCount: correct.length,
      total,
      category: categoryOf(correct.length, total),
      distribution,
      wrongAnswers,
    });
  }
  return rounds;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ResultsTab() {
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeGameState(setGame), []);
  useEffect(() => subscribeAllSubmissions(setSubmissions), []);

  const leaderboard = useMemo(() => buildLeaderboard(submissions), [submissions]);
  const groups = useMemo(() => topRankGroups(leaderboard), [leaderboard]);
  // 5위 → 1위 순으로 공개
  const revealOrder = useMemo(() => [...groups].reverse(), [groups]);
  const rounds = useMemo(() => buildRounds(game, submissions), [game, submissions]);

  const awards = useMemo(() => buildAwards(game, submissions), [game, submissions]);

  // 단계: 0 = 타이틀, 1..순위 수 = 순위 공개, 그 뒤 1장씩 특별상
  const lastStep = revealOrder.length + awards.length;
  const step = Math.min(game.rankRevealStep, lastStep);
  const awardIndex = step - revealOrder.length - 1;

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
      } else if (step < lastStep) {
        playRevealChime();
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

  if (!game.rankRevealDone && awardIndex >= 0) {
    return (
      <AwardStage
        award={awards[awardIndex]}
        jobs={game.jobs}
        index={awardIndex}
        total={awards.length}
        busy={busy}
        nextLabel={step >= lastStep ? "전체 순위표 보기" : "다음 상 ▶"}
        onNext={handleNext}
      />
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
            ? awards.length > 0
              ? "🏅 특별상 시상식 ▶"
              : "전체 순위표 보기"
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

      <WrongNote rounds={rounds} />
    </div>
  );
}

/** 오답노트: 정답률 분류 카드를 고르면 그 분류의 문제 목록, 문제를 누르면 단서·정답 분포·많이 나온 오답 */
function WrongNote({ rounds }: { rounds: RoundSummary[] }) {
  const [selected, setSelected] = useState<Category | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map: Record<Category, RoundSummary[]> = {
      allWrong: [],
      under50: [],
      over50: [],
      allCorrect: [],
    };
    rounds.forEach((r) => map[r.category].push(r));
    // 같은 분류 안에서는 정답률 낮은 순
    CATEGORY_ORDER.forEach((c) =>
      map[c].sort((a, b) => a.correctCount - b.correctCount || a.jobIndex - b.jobIndex),
    );
    return map;
  }, [rounds]);

  // 따로 고르지 않았으면 가장 어려운 분류부터 보여줌
  const active = selected ?? CATEGORY_ORDER.find((c) => byCategory[c].length > 0) ?? null;
  const list = active ? byCategory[active] : [];

  return (
    <section style={{ fontSize: tfs() }}>
      <h2 className="mb-[0.3em] text-[1.4em]">📒 오답노트</h2>
      <p className="mb-[0.8em] text-[0.8em] text-[var(--color-muted)]">
        정답률 = 맞힌 학생 수 ÷ 이번 게임 참여 학생 수. 어려웠던 문제부터 함께 짚어 보세요.
      </p>

      <div className="mb-[0.8em] grid grid-cols-2 gap-[0.5em] lg:grid-cols-4">
        {CATEGORY_ORDER.map((c) => {
          const meta = CATEGORY_META[c];
          const count = byCategory[c].length;
          const isActive = c === active;
          return (
            <button
              key={c}
              type="button"
              disabled={count === 0}
              onClick={() => {
                setSelected(c);
                setExpanded(null);
              }}
              className={`flex flex-col items-center gap-[0.1em] rounded-[var(--radius-card)] border-4 px-[0.6em] py-[0.6em] text-center shadow-[var(--shadow-card)] transition disabled:opacity-40 ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              <span className="text-[1.6em] leading-none">{meta.emoji}</span>
              <span className="font-semibold">{meta.label}</span>
              <span className="font-[family-name:var(--font-accent)] text-[1.8em] leading-tight text-[var(--color-primary-ink)]">
                {count}문제
              </span>
              <span className="text-[0.7em] text-[var(--color-muted)]">{meta.rule}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-[0.4em]">
        {list.map((round) => {
          const open = expanded === round.key;
          const rate = round.total ? Math.round((round.correctCount / round.total) * 100) : 0;
          return (
            <div
              key={round.key}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : round.key)}
                className="flex w-full flex-wrap items-center gap-[0.6em] px-[0.8em] py-[0.5em] text-left"
              >
                <span className="font-semibold">문제 {round.jobIndex + 1}</span>
                <span className="text-[0.85em] text-[var(--color-muted)]">
                  정답률 {rate}% ({round.correctCount}/{round.total}명)
                </span>
                <span className="ml-auto text-[0.8em] text-[var(--color-muted)]">
                  {open ? "접기 ▲" : "펼치기 ▼"}
                </span>
              </button>

              {open && (
                <div className="flex flex-col gap-[0.6em] border-t border-[var(--color-border)] px-[0.8em] py-[0.8em]">
                  <p className="font-[family-name:var(--font-heading)] text-[1.2em]">
                    정답: {round.title}
                  </p>
                  <ol className="flex flex-col gap-[0.2em] text-[0.85em]">
                    {round.hints.map((hint, i) => (
                      <li key={i}>
                        <span className="mr-1 text-[var(--color-primary-ink)]">{i + 1}.</span>
                        {hint}
                        {(round.distribution[i + 1] ?? 0) > 0 && (
                          <span className="ml-2 rounded-full bg-[var(--color-success)]/20 px-2 text-[0.85em] text-[var(--color-success-ink)]">
                            여기서 {round.distribution[i + 1]}명 정답
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  {round.wrongAnswers.length > 0 && (
                    <div>
                      <p className="mb-[0.3em] text-[0.85em] font-semibold">많이 나온 오답</p>
                      <ul className="flex flex-wrap gap-[0.4em] text-[0.85em]">
                        {round.wrongAnswers.map((w) => (
                          <li
                            key={w.answer}
                            className="rounded-full border border-[var(--color-border)] bg-white px-[0.7em] py-[0.15em]"
                          >
                            {w.answer}
                            {w.count > 1 && (
                              <span className="ml-1 text-[var(--color-danger)]">×{w.count}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
