"use client";

import { useState } from "react";
import {
  outcomeOf,
  pendingAttemptOf,
  resolvePendingSubmission,
  type SubmissionKind,
} from "@/lib/submissions";
import { tfs } from "@/lib/teacherFontSize";
import type { Job, Submission } from "@/lib/types";
import Modal from "@/app/_components/Modal";

/**
 * 정답 공개 후 교사 화면 결과 영역.
 * 정답/오답/보류 인원 카드 + 보류 처리 목록 + 다음 진행 버튼.
 * 정답 카드를 누르면 점수별 정답자, 오답 카드를 누르면 오답 목록(이름은 따로 눌러야 보임)을 펼친다.
 */
export default function RoundResultPanel({
  kind,
  job,
  scoring,
  submissions,
  advanceLabel,
  onAdvance,
  extra,
}: {
  kind: SubmissionKind;
  job: Job;
  scoring: number[];
  submissions: Submission[];
  advanceLabel: string;
  onAdvance: () => Promise<void>;
  /** 정답 문구 아래에 추가로 보여줄 내용 (연습 라운드의 단계별 점수 등) */
  extra?: React.ReactNode;
}) {
  const [correctOpen, setCorrectOpen] = useState(false);
  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongNamesShown, setWrongNamesShown] = useState(false);
  const [shownNames, setShownNames] = useState<Set<string>>(new Set());
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const correct = submissions.filter((s) => outcomeOf(s) === "correct");
  const wrong = submissions.filter((s) => outcomeOf(s) === "wrong");
  const pending = submissions
    .filter((s) => outcomeOf(s) === "pending" && !processing.has(s.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  // 점수가 높은 순으로 정답자를 묶음 (같은 점수 안에서는 학번 순)
  const correctGroups = Array.from(
    correct.reduce((map, s) => {
      const list = map.get(s.score) ?? [];
      list.push(s);
      return map.set(s.score, list);
    }, new Map<number, Submission[]>()),
  )
    .sort(([a], [b]) => b - a)
    .map(([score, list]) => ({
      score,
      list: list.sort((a, b) =>
        a.studentId.localeCompare(b.studentId, undefined, { numeric: true }),
      ),
    }));

  // 오답 목록은 이름을 숨긴 상태에서 학생 순서를 짐작할 수 없게 답 텍스트 기준으로 정렬
  const wrongAnswers = wrong
    .map((s) => ({
      id: s.id,
      name: s.studentName,
      answer: s.attempts.map((a) => a.answer).join(" · "),
    }))
    .sort((a, b) => a.answer.localeCompare(b.answer, "ko"));

  const resolve = async (s: Submission, isCorrect: boolean) => {
    const { stage } = pendingAttemptOf(s, job);
    const defaultScore = scoring[stage - 1] ?? 0;
    const raw = scoreInputs[s.id];
    const parsed = raw == null || raw.trim() === "" ? defaultScore : Number(raw);
    const score = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : defaultScore;

    setProcessing((cur) => new Set(cur).add(s.id));
    try {
      await resolvePendingSubmission(
        s.id,
        isCorrect ? { correct: true, score, stage } : { correct: false },
        kind,
      );
    } catch {
      setProcessing((cur) => {
        const next = new Set(cur);
        next.delete(s.id);
        return next;
      });
      window.alert("저장에 실패했어요. 다시 눌러주세요.");
    }
  };

  const advance = async (skipPending: boolean) => {
    if (advancing) return;
    if (!skipPending && pending.length > 0) {
      setConfirmSkip(true);
      return;
    }
    setAdvancing(true);
    try {
      if (skipPending) {
        await Promise.all(
          pending.map((s) => resolvePendingSubmission(s.id, { correct: false }, kind)),
        );
      }
      setConfirmSkip(false);
      await onAdvance();
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-[var(--radius-card)] bg-[var(--color-primary)] px-10 py-6 text-[var(--color-on-primary)] shadow-[var(--shadow-card)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="" className="h-24 w-24 shrink-0 motion-safe:animate-[rankPop_0.6s_cubic-bezier(0.2,1.4,0.4,1)]" />
        <span className="font-[family-name:var(--font-accent)] text-4xl opacity-80">정답</span>
        <span className="font-[family-name:var(--font-heading)] text-7xl font-bold leading-tight">
          {job.title}
        </span>
      </div>

      {extra}

      <div className="grid grid-cols-3 gap-4">
        <CountCard
          label="정답"
          count={correct.length}
          tone="success"
          onClick={correct.length > 0 ? () => setCorrectOpen((v) => !v) : undefined}
          hint={correct.length > 0 ? (correctOpen ? "접기 ▲" : "눌러서 정답자 보기 ▼") : undefined}
        />
        <CountCard
          label="오답"
          count={wrong.length}
          tone="danger"
          onClick={wrong.length > 0 ? () => setWrongOpen((v) => !v) : undefined}
          hint={wrong.length > 0 ? (wrongOpen ? "답 접기 ▲" : "눌러서 답 보기 ▼") : undefined}
        />
        <CountCard label="보류" count={pending.length} tone="primary" />
      </div>

      {correctOpen && correctGroups.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-[var(--color-success)]/50 bg-[var(--color-surface)] p-4"
          style={{ fontSize: tfs() }}
        >
          {correctGroups.map(({ score, list }) => (
            <div key={score} className="flex flex-wrap items-center gap-3">
              <span className="shrink-0 rounded-full bg-[var(--color-success)] px-[0.7em] py-[0.15em] font-[family-name:var(--font-accent)] text-[var(--foreground)]">
                {score === scoring[0] ? "🏆 " : ""}
                {score}점 · {list.length}명
              </span>
              {list.map((s) => (
                <span
                  key={s.id}
                  className="rounded-lg bg-[var(--color-success)]/12 px-[0.6em] py-[0.2em] font-semibold"
                >
                  {s.studentName}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {wrongOpen && wrongAnswers.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-[var(--color-danger)]/40 bg-[var(--color-surface)] p-4">
          <button
            type="button"
            onClick={() => setWrongNamesShown((v) => !v)}
            className="w-fit self-end rounded-lg border-2 border-[var(--color-border)] bg-white px-4 py-1.5 text-lg font-semibold"
          >
            {wrongNamesShown ? "이름 숨기기" : "누가 썼는지 보기 👀"}
          </button>
          <ul className="flex flex-wrap gap-3" style={{ fontSize: tfs() }}>
            {wrongAnswers.map((w) => (
              <li
                key={w.id}
                className="rounded-lg bg-[var(--color-danger)]/10 px-[0.6em] py-[0.2em] text-[var(--foreground)]"
              >
                {w.answer}
                {wrongNamesShown && (
                  <span className="ml-[0.5em] text-[0.75em] text-[var(--color-muted)]">{w.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-2xl font-semibold">
            보류 처리 <span className="text-[var(--color-muted)]">({pending.length})</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {pending.map((s) => {
              const { answer, stage } = pendingAttemptOf(s, job);
              const nameShown = shownNames.has(s.id);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border-2 border-[var(--color-primary)]/50 bg-[var(--color-surface)] px-5 py-3"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShownNames((cur) => {
                        const next = new Set(cur);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })
                    }
                    className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1 text-left"
                    title="눌러서 이름 보기/숨기기"
                  >
                    <span className="font-semibold" style={{ fontSize: tfs() }}>
                      {answer}
                    </span>
                    <span className="text-lg text-[var(--color-muted)]">
                      {nameShown ? s.studentName : "이름 보기 ▸"}
                    </span>
                  </button>
                  <label className="flex items-center gap-2 text-lg text-[var(--color-muted)]">
                    {stage}단계
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={scoreInputs[s.id] ?? String(scoring[stage - 1] ?? 0)}
                      onChange={(e) =>
                        setScoreInputs((cur) => ({ ...cur, [s.id]: e.target.value }))
                      }
                      className="w-24 rounded-lg border-2 border-[var(--color-border)] bg-white px-3 py-2 text-xl text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]"
                    />
                    점
                  </label>
                  <button
                    type="button"
                    onClick={() => resolve(s, true)}
                    className="rounded-[var(--radius-card)] bg-[var(--color-success)] px-5 py-3 text-xl font-semibold text-[var(--foreground)]"
                  >
                    정답 처리
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(s, false)}
                    className="rounded-[var(--radius-card)] bg-[var(--color-danger)] px-5 py-3 text-xl font-semibold text-[var(--foreground)]"
                  >
                    오답 처리
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={advancing}
        onClick={() => advance(false)}
        className="w-fit self-center rounded-[var(--radius-card)] bg-[var(--color-primary)] px-12 py-5 text-3xl font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-card)] disabled:opacity-50"
      >
        {advanceLabel}
      </button>

      {confirmSkip && (
        <Modal onClose={() => setConfirmSkip(false)} className="flex max-w-xl flex-col gap-6 text-center">
          <p className="text-3xl font-semibold">
            처리하지 않은 보류가 {pending.length}개 있어요
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmSkip(false)}
              className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-4 text-xl font-semibold text-[var(--color-on-primary)]"
            >
              돌아가서 처리하기
            </button>
            <button
              type="button"
              disabled={advancing}
              onClick={() => advance(true)}
              className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-white px-6 py-4 text-xl font-semibold disabled:opacity-50"
            >
              그대로 넘어가기
              <span className="block text-base font-normal text-[var(--color-muted)]">
                남은 보류는 0점 처리
              </span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const TONES = {
  success: { border: "border-[var(--color-success)]", bg: "bg-[var(--color-success)]/12", text: "text-[var(--color-success-ink)]" },
  danger: { border: "border-[var(--color-danger)]", bg: "bg-[var(--color-danger)]/10", text: "text-[var(--color-danger)]" },
  primary: { border: "border-[var(--color-primary)]", bg: "bg-[var(--color-primary)]/15", text: "text-[var(--color-primary-ink)]" },
} as const;

function CountCard({
  label,
  count,
  tone,
  onClick,
  hint,
}: {
  label: string;
  count: number;
  tone: keyof typeof TONES;
  onClick?: () => void;
  hint?: string;
}) {
  const t = TONES[tone];
  const content = (
    <>
      <span className="text-3xl font-semibold text-[var(--foreground)]">{label}</span>
      <span className={`font-[family-name:var(--font-accent)] text-8xl leading-none ${t.text}`}>
        {count}
        <span className="ml-1 text-4xl">명</span>
      </span>
      {hint && <span className="text-lg text-[var(--color-muted)]">{hint}</span>}
    </>
  );
  const cls = `flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-4 ${t.border} ${t.bg} px-4 py-6 shadow-[var(--shadow-card)]`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition hover:brightness-95`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}
