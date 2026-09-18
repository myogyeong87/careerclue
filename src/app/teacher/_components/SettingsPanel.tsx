"use client";

import QuestionSetsTab from "./QuestionSetsTab";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
