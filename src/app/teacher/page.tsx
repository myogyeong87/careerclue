"use client";

import { useState } from "react";
import QuestionSetsTab from "./_components/QuestionSetsTab";
import GameTab from "./_components/GameTab";
import EditSetTab from "./_components/EditSetTab";
import ResultsTab from "./_components/ResultsTab";

const TABS = [
  { key: "sets", label: "문제 선택" },
  { key: "game", label: "게임 진행" },
  { key: "edit", label: "세트 편집" },
  { key: "results", label: "종료 화면" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("sets");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl">교사 화면</h1>
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
      <div className="flex-1">
        {activeTab === "sets" && <QuestionSetsTab />}
        {activeTab === "game" && (
          <GameTab onFinished={() => setActiveTab("results")} />
        )}
        {activeTab === "edit" && <EditSetTab />}
        {activeTab === "results" && <ResultsTab />}
      </div>
    </main>
  );
}
