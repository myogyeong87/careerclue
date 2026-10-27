"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeAllSubmissions } from "@/lib/submissions";
import { buildLeaderboard } from "@/lib/ranking";
import { tfs } from "@/lib/teacherFontSize";
import type { Submission } from "@/lib/types";
import Modal from "@/app/_components/Modal";

/** 게임 진행 중 교사가 지금까지의 누적 점수 순위를 확인하는 버튼 + 모달 */
export default function ScoreboardButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-white px-5 py-2.5 text-xl font-semibold text-[var(--color-primary-ink)]"
      >
        📊 중간 점수
      </button>
      {open && <ScoreboardModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ScoreboardModal({ onClose }: { onClose: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useEffect(() => subscribeAllSubmissions(setSubmissions), []);
  const leaderboard = useMemo(() => buildLeaderboard(submissions), [submissions]);

  return (
    <Modal
      onClose={onClose}
      className="flex max-h-[85vh] w-full max-w-5xl flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold">📊 지금까지 누적 점수</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-white px-5 py-2 text-xl font-semibold"
        >
          닫기
        </button>
      </div>
      {leaderboard.length === 0 ? (
        <p className="text-xl text-[var(--color-muted)]">아직 점수가 없어요.</p>
      ) : (
        <ol
          className="grid grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
          style={{ fontSize: tfs(0.9) }}
        >
          {leaderboard.map((e) => (
            <li
              key={e.studentId}
              className="flex items-center gap-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
            >
              <span className="w-[2.5em] shrink-0 font-[family-name:var(--font-accent)] text-[var(--color-primary-ink)]">
                {e.rank === 1 ? "👑" : `${e.rank}위`}
              </span>
              <span className="min-w-0 flex-1 font-semibold">
                <span className="mr-[0.4em] text-[0.75em] font-normal text-[var(--color-muted)]">
                  {e.studentId}
                </span>
                {e.studentName}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-accent)]">{e.score}점</span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
