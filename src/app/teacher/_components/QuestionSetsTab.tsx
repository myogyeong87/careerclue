"use client";

import { useEffect, useState } from "react";
import {
  createQuestionSet,
  deleteQuestionSet,
  duplicateQuestionSet,
  parseQuestionSetJson,
  questionSetToExportJson,
  subscribeQuestionSets,
} from "@/lib/questionSets";
import { applySetToGame, isRoundInProgress, subscribeGameState } from "@/lib/game";
import { DEFAULT_QUESTION_SET } from "@/lib/defaultQuestionSet";
import { DEFAULT_SCORING, type GameState, type QuestionSet } from "@/lib/types";

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function QuestionSetsTab() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubSets = subscribeQuestionSets(setSets, (err) =>
      setLoadError(err.message),
    );
    const unsubGame = subscribeGameState(setGame);
    return () => {
      unsubSets();
      unsubGame();
    };
  }, []);

  const confirmIfRoundInProgress = () => {
    if (game && isRoundInProgress(game)) {
      return window.confirm(
        "진행 중인 라운드가 있어요. 그래도 바꿀까요?",
      );
    }
    return true;
  };

  const handleApply = async (set: QuestionSet) => {
    if (!confirmIfRoundInProgress()) return;
    setBusyId(set.id);
    try {
      await applySetToGame(set);
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (set: QuestionSet) => {
    setBusyId(set.id);
    try {
      await duplicateQuestionSet(set);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (set: QuestionSet) => {
    if (!window.confirm(`"${set.name}" 세트를 삭제할까요?`)) return;
    setBusyId(set.id);
    try {
      await deleteQuestionSet(set.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = (set: QuestionSet) => {
    downloadJson(`${set.name}.json`, questionSetToExportJson(set));
  };

  const handleCreateNew = async () => {
    const name = newName.trim();
    if (!name) return;
    await createQuestionSet({ name, jobs: [], scoring: DEFAULT_SCORING });
    setNewName("");
    setShowNewForm(false);
  };

  const handleImportDefault = async () => {
    await createQuestionSet(DEFAULT_QUESTION_SET);
  };

  const handleImportSubmit = async () => {
    const result = parseQuestionSetJson(importText);
    if (!result.ok) {
      setImportErrors(result.errors);
      return;
    }
    await createQuestionSet(result.data);
    setImportText("");
    setImportErrors([]);
    setShowImport(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          새 세트 만들기
        </button>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          JSON으로 가져오기
        </button>
        <button
          type="button"
          onClick={handleImportDefault}
          className="rounded-[var(--radius-card)] border border-[var(--color-primary)]/30 px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface)]"
        >
          기본 세트 20 가져오기
        </button>
      </div>

      {showNewForm && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="세트 이름"
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            onClick={handleCreateNew}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
          >
            만들기
          </button>
        </div>
      )}

      {showImport && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{ "name": "...", "scoring": [100,80,60,40,20], "jobs": [...] }'
            rows={8}
            className="w-full rounded-lg border border-[var(--color-primary)]/30 bg-white p-3 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
          />
          {importErrors.length > 0 && (
            <ul className="list-inside list-disc text-sm text-red-600">
              {importErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImportSubmit}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
            >
              가져오기
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImport(false);
                setImportErrors([]);
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {sets.map((set) => {
          const isActive = game?.activeSetId === set.id;
          return (
            <div
              key={set.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold">
                  {set.name}
                </h3>
                {isActive && (
                  <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-white">
                    적용됨
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--foreground)]/70">
                문제 {set.jobs.length}개
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleApply(set)}
                  className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 font-semibold text-white disabled:opacity-60"
                >
                  적용하기
                </button>
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleDuplicate(set)}
                  className="rounded-lg bg-white px-3 py-1.5 disabled:opacity-60"
                >
                  복제해서 수정
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(set)}
                  className="rounded-lg bg-white px-3 py-1.5"
                >
                  내보내기
                </button>
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleDelete(set)}
                  className="rounded-lg bg-white px-3 py-1.5 text-red-600 disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sets.length === 0 && !loadError && (
        <p className="text-sm text-[var(--foreground)]/60">
          저장된 문제 세트가 없어요. 위 버튼으로 세트를 만들어보세요.
        </p>
      )}
    </div>
  );
}
