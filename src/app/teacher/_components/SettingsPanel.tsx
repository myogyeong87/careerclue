"use client";

import { useState } from "react";
import { clearRoster } from "@/lib/roster";
import QuestionSetsTab from "./QuestionSetsTab";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);

  const handleClearRoster = async () => {
    if (busy) return;
    if (
      !window.confirm(
        "등록된 모든 학번-이름 정보를 지울까요? 이후 모든 학번을 다시 새 이름으로 등록할 수 있어요. (기존 점수 기록에는 영향 없어요)",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await clearRoster();
      window.alert("학생 등록 정보를 초기화했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">설정</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold"
        >
          게임 화면으로 돌아가기
        </button>
      </div>

      <QuestionSetsTab />

      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
        <h3 className="text-sm font-semibold">학생 등록 정보</h3>
        <p className="text-sm text-[var(--foreground)]/70">
          한 번 사용한 학번은 처음 등록한 이름으로 고정돼요(다른 이름으로는 재접속 불가).
          학번을 다시 자유롭게 쓸 수 있게 하려면 등록 정보를 초기화하세요.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleClearRoster}
          className="w-fit rounded-[var(--radius-card)] bg-white px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
        >
          학생 등록 정보 초기화
        </button>
      </div>
    </div>
  );
}
