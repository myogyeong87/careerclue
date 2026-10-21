"use client";

import { useState } from "react";
import type { Award } from "@/lib/awards";
import { playRankPop } from "@/lib/sound";
import { tfs } from "@/lib/teacherFontSize";
import type { Job } from "@/lib/types";
import Confetti from "@/app/_components/Confetti";

const META: Record<Award["kind"], { emoji: string; title: string; desc: string }> = {
  lightning: { emoji: "⚡", title: "번개 탐정", desc: "가장 먼저 정답을 맞힌 탐정" },
  persistence: { emoji: "💪", title: "끈기상", desc: "포기하지 않고 2~3번째 도전에서 맞힌 탐정" },
  hardest: { emoji: "🏔️", title: "최고 난도 문제", desc: "우리 반이 가장 어려워한 사건" },
  telepathy: { emoji: "👯", title: "텔레파시 오답", desc: "여러 명이 똑같이 쓴 오답" },
  creative: { emoji: "🤣", title: "기발한 오답", desc: "선생님이 고른 오늘의 오답 (이름은 비밀!)" },
};

/** 종료 화면 특별상 한 장. TOP 5 공개 뒤 [다음 상]으로 한 장씩 넘김 */
export default function AwardStage({
  award,
  jobs,
  index,
  total,
  busy,
  nextLabel,
  onNext,
}: {
  award: Award;
  jobs: Job[];
  index: number;
  total: number;
  busy: boolean;
  nextLabel: string;
  onNext: () => void;
}) {
  const meta = META[award.kind];
  return (
    <div
      className="flex min-h-[78vh] flex-1 flex-col items-center justify-center gap-[0.6em] pb-6 text-center"
      style={{ fontSize: tfs() }}
    >
      {(award.kind === "lightning" || award.kind === "persistence") && <Confetti count={90} />}

      <div key={award.kind} className="flex w-full flex-col items-center gap-[0.5em] motion-safe:animate-[rankPop_0.7s_cubic-bezier(0.2,1.4,0.4,1)]">
        <p className="text-[0.9em] font-semibold text-[var(--color-muted)]">
          🏅 특별상 {index + 1} / {total}
        </p>
        <span className="text-[4em] leading-none">{meta.emoji}</span>
        <h2 className="font-[family-name:var(--font-accent)] text-[3.2em] leading-none text-[var(--color-primary-ink)]">
          {meta.title}
        </h2>
        <p className="text-[1.1em] text-[var(--color-muted)]">{meta.desc}</p>
        <AwardBody award={award} jobs={jobs} />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onNext}
        className="relative z-50 mt-[0.6em] rounded-[var(--radius-card)] bg-[var(--color-primary)] px-[1.4em] py-[0.5em] text-[1.3em] font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-card)] disabled:opacity-50"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Names({ names }: { names: string[] }) {
  return (
    <p className="flex flex-wrap justify-center gap-x-[0.6em] font-[family-name:var(--font-heading)] text-[3em] font-bold leading-tight">
      {names.map((n, i) => (
        <span key={i}>{n}</span>
      ))}
    </p>
  );
}

function AwardBody({ award, jobs }: { award: Award; jobs: Job[] }) {
  switch (award.kind) {
    case "lightning":
      return (
        <>
          <Names names={award.winners} />
          <p className="text-[1.3em] font-semibold">{award.count}문제에서 가장 먼저 정답!</p>
          <ul className="mt-[0.3em] flex max-w-6xl flex-wrap justify-center gap-[0.4em] text-[0.85em]">
            {award.rows.map((r) => (
              <li
                key={r.jobIndex}
                className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-[0.7em] py-[0.25em]"
              >
                <span className="text-[var(--color-muted)]">문제 {r.jobIndex + 1}</span>{" "}
                <span className="font-semibold">{r.studentName}</span>{" "}
                <span className="text-[var(--color-primary-ink)]">
                  {r.seconds != null ? `${r.seconds}초` : `${r.hintStage}번 단서`}
                </span>
              </li>
            ))}
          </ul>
        </>
      );
    case "persistence":
      return (
        <>
          <Names names={award.winners} />
          <p className="text-[1.3em] font-semibold">
            다시 도전해서 {award.count}문제를 맞혔어요!
          </p>
        </>
      );
    case "hardest": {
      const job = jobs[award.jobIndex];
      const rate = Math.round((award.correct / award.total) * 100);
      return (
        <div className="flex w-full max-w-4xl flex-col items-center gap-[0.4em] rounded-[calc(var(--radius-card)*1.5)] border-4 border-[var(--color-primary)] bg-[var(--color-surface)] px-[1em] py-[0.8em] shadow-[var(--shadow-card)]">
          <p className="text-[1.1em] text-[var(--color-muted)]">문제 {award.jobIndex + 1}</p>
          <p className="font-[family-name:var(--font-heading)] text-[2.8em] font-bold leading-tight">
            {award.title}
          </p>
          <p className="font-[family-name:var(--font-accent)] text-[2em] text-[var(--color-danger)]">
            정답률 {rate}%
          </p>
          <p className="text-[1em] text-[var(--color-muted)]">
            {award.total}명 중 {award.correct}명 정답
          </p>
          {job && (
            <ol className="mt-[0.2em] flex flex-col gap-[0.15em] text-left text-[0.8em]">
              {job.hints.map((h, i) => (
                <li key={i}>
                  <span className="mr-1 text-[var(--color-primary-ink)]">{i + 1}.</span>
                  {h}
                </li>
              ))}
            </ol>
          )}
        </div>
      );
    }
    case "telepathy":
      return (
        <div className="flex w-full max-w-5xl flex-col items-center gap-[0.5em]">
          {award.items.map((item, i) => (
            <div
              key={i}
              className={`flex w-full flex-col items-center rounded-[calc(var(--radius-card)*1.5)] border-4 bg-[var(--color-surface)] px-[1em] py-[0.5em] shadow-[var(--shadow-card)] ${
                i === 0 ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
              }`}
              style={{ fontSize: i === 0 ? "1.2em" : "0.9em" }}
            >
              <p className="text-[0.9em] text-[var(--color-muted)]">
                문제 {item.jobIndex + 1} · 정답은 {jobs[item.jobIndex]?.title}
              </p>
              <p className="text-[1.3em]">
                <span className="font-[family-name:var(--font-accent)] text-[1.4em] text-[var(--color-danger)]">
                  {item.count}명
                </span>
                이 똑같이{" "}
                <span className="font-[family-name:var(--font-heading)] text-[1.5em] font-bold">
                  &lsquo;{item.answer}&rsquo;
                </span>
                라고 썼어요!
              </p>
            </div>
          ))}
        </div>
      );
    case "creative":
      return <CreativeWall items={award.items} jobs={jobs} />;
  }
}

/** 한 명만 쓴 오답을 벽처럼 깔고, 선생님이 누른 답을 크게 띄움 */
function CreativeWall({
  items,
  jobs,
}: {
  items: { jobIndex: number; answer: string }[];
  jobs: Job[];
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const item = picked != null ? items[picked] : null;

  if (item) {
    return (
      <div className="flex w-full max-w-5xl flex-col items-center gap-[0.4em]">
        <div
          key={picked}
          className="flex w-full flex-col items-center gap-[0.3em] rounded-[calc(var(--radius-card)*1.5)] border-4 border-[var(--color-primary)] bg-[var(--color-surface)] px-[1em] py-[0.8em] shadow-[0_12px_40px_rgba(242,169,59,0.35)] motion-safe:animate-[rankPop_0.6s_cubic-bezier(0.2,1.4,0.4,1)]"
        >
          <p className="text-[1em] text-[var(--color-muted)]">
            문제 {item.jobIndex + 1} · 정답은 {jobs[item.jobIndex]?.title}
          </p>
          <p className="break-all font-[family-name:var(--font-heading)] text-[4em] font-bold leading-tight">
            &lsquo;{item.answer}&rsquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-white px-[1em] py-[0.3em] text-[0.9em] font-semibold"
        >
          ← 다른 오답 고르기
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-[0.4em]">
      <p className="text-[0.9em] font-semibold">마음에 드는 오답을 눌러 크게 보여 주세요</p>
      <ul className="flex max-h-[45vh] flex-wrap justify-center gap-[0.4em] overflow-y-auto p-[0.2em]">
        {items.map((it, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                playRankPop();
                setPicked(i);
              }}
              className="rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-[0.8em] py-[0.2em] shadow-[var(--shadow-card)] hover:border-[var(--color-primary)]"
            >
              <span className="mr-[0.4em] text-[0.7em] text-[var(--color-muted)]">
                {it.jobIndex + 1}
              </span>
              {it.answer}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
