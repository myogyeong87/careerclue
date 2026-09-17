"use client";

import { useState } from "react";
import QuestionSetsTab from "./QuestionSetsTab";
import EditSetTab from "./EditSetTab";

const TABS = [
  { key: "sets", label: "문제 선택" },
  { key: "edit", label: "세트 편집" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("sets");

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

      <div className="flex gap-2 border-b border-[var(--color-primary)]/20">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sets" && <QuestionSetsTab />}
      {activeTab === "edit" && <EditSetTab />}
    </div>
  );
}
