"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createQuestionSet,
  deleteQuestionSet,
  duplicateQuestionSet,
  parseQuestionSetJson,
  questionSetToExportJson,
  subscribeQuestionSets,
} from "@/lib/questionSets";
import {
  applyRandomPoolToGame,
  applySetToGame,
  buildUniqueJobPool,
  isRoundInProgress,
  subscribeGameState,
} from "@/lib/game";
import { DEFAULT_QUESTION_SET } from "@/lib/defaultQuestionSet";
import { DEFAULT_SCORING, type GameState, type QuestionSet } from "@/lib/types";
import SetEditor from "./SetEditor";

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

  const [editingId, setEditingId] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [randomCounts, setRandomCounts] = useState<Record<string, string>>({});
  const [randomMessages, setRandomMessages] = useState<Record<string, string | null>>({});

  const [poolCount, setPoolCount] = useState("");
  const [poolMessage, setPoolMessage] = useState<string | null>(null);
  const [poolBusy, setPoolBusy] = useState(false);

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

  /** 문제 수 입력을 파싱. 빈 값이면 null(=전체 적용), 유효하지 않으면 undefined 반환 */
  const parseCountInput = (raw: string): number | null | undefined => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.floor(n);
  };

  const handleRandomApply = async (set: QuestionSet) => {
    const count = parseCountInput(randomCounts[set.id] ?? "");
    if (count === undefined) {
      setRandomMessages((m) => ({ ...m, [set.id]: "1 이상의 숫자를 입력해주세요." }));
      return;
    }
    if (!confirmIfRoundInProgress()) return;
    const message =
      count != null && count > set.jobs.length
        ? `문제 수가 최대 ${set.jobs.length}개로 제한됐어요.`
        : null;
    setBusyId(set.id);
    try {
      await applySetToGame(set, count);
      setRandomMessages((m) => ({ ...m, [set.id]: message }));
    } finally {
      setBusyId(null);
    }
  };

  const uniquePool = useMemo(() => buildUniqueJobPool(sets), [sets]);

  const handlePoolApply = async () => {
    const count = parseCountInput(poolCount);
    if (count === undefined) {
      setPoolMessage("1 이상의 숫자를 입력해주세요.");
      return;
    }
    if (uniquePool.length === 0) {
      setPoolMessage("적용할 수 있는 문제가 없어요.");
      return;
    }
    if (!confirmIfRoundInProgress()) return;
    const message =
      count != null && count > uniquePool.length
        ? `문제 수가 최대 ${uniquePool.length}개로 제한됐어요.`
        : null;
    setPoolBusy(true);
    try {
      await applyRandomPoolToGame(uniquePool, count);
      setPoolMessage(message);
    } finally {
      setPoolBusy(false);
    }
  };

  const handleDuplicate = async (set: QuestionSet) => {
    setBusyId(set.id);
    try {
      const newId = await duplicateQuestionSet(set);
      setEditingId(newId);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (set: QuestionSet) => {
    if (!window.confirm(`"${set.name}" 세트를 삭제할까요?`)) return;
    setBusyId(set.id);
    try {
      await deleteQuestionSet(set.id);
      if (editingId === set.id) setEditingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = (set: QuestionSet) => {
    downloadJson(`${set.name}.json`, questionSetToExportJson(set));
  };

  const handleCreateNew = async () => {
    const newId = await createQuestionSet({
      name: "새 세트",
      jobs: [],
      scoring: DEFAULT_SCORING,
    });
    setEditingId(newId);
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

  const handleBackFromEditor = (dirty: boolean) => {
    if (dirty && !window.confirm("저장하지 않은 변경사항이 있어요. 그래도 나갈까요?")) {
      return;
    }
    setEditingId(null);
  };

  const editingSet = editingId ? sets.find((s) => s.id === editingId) ?? null : null;

  if (editingId) {
    return editingSet ? (
      <SetEditor key={editingSet.id} initial={editingSet} onBack={handleBackFromEditor} />
    ) : (
      <p className="text-sm text-[var(--color-muted)]">불러오는 중...</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCreateNew}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] hover:opacity-90"
        >
          새 세트 만들기
        </button>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold hover:opacity-90"
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

      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="font-[family-name:var(--font-heading)] text-sm font-semibold">
          전체 세트 통합 랜덤 적용
        </h3>
        <p className="text-xs text-[var(--color-muted)]">
          모든 세트의 문제를 합쳐(같은 직업은 하나만) 문제 수만큼 무작위로 뽑아 적용해요. 현재
          합친 문제 수: {uniquePool.length}개
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            value={poolCount}
            onChange={(e) => {
              setPoolCount(e.target.value);
              setPoolMessage(null);
            }}
            placeholder="문제 수 (비우면 전체)"
            className="w-40 rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            disabled={poolBusy}
            onClick={handlePoolApply}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            통합 랜덤 적용
          </button>
        </div>
        {poolMessage && <p className="text-sm text-[var(--color-muted)]">{poolMessage}</p>}
      </div>

      {showImport && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{ "name": "...", "scoring": [100,80,60,40,20], "jobs": [...] }'
            rows={8}
            className="w-full rounded-lg border border-[var(--color-primary)]/30 bg-white p-3 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
          />
          {importErrors.length > 0 && (
            <ul className="list-inside list-disc text-sm text-[var(--color-danger)]">
              {importErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImportSubmit}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
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

      {loadError && <p className="text-sm text-[var(--color-danger)]">{loadError}</p>}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {sets.map((set) => {
          const isActive = game?.activeSetId === set.id;
          return (
            <div
              key={set.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold">
                  {set.name}
                </h3>
                {isActive && (
                  <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-[var(--color-on-primary)]">
                    적용됨
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                문제 {set.jobs.length}개
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleApply(set)}
                  className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                >
                  적용하기
                </button>
                <input
                  type="number"
                  min={1}
                  value={randomCounts[set.id] ?? ""}
                  onChange={(e) => {
                    setRandomCounts((m) => ({ ...m, [set.id]: e.target.value }));
                    setRandomMessages((m) => ({ ...m, [set.id]: null }));
                  }}
                  placeholder="문제 수"
                  className="w-20 rounded-lg border border-[var(--color-primary)]/30 bg-white px-2 py-1.5 outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleRandomApply(set)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 font-semibold text-[var(--color-primary-ink)] disabled:opacity-60"
                >
                  세트 내 랜덤 적용
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(set.id)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 font-semibold"
                >
                  편집
                </button>
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleDuplicate(set)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 disabled:opacity-60"
                >
                  복제해서 수정
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(set)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5"
                >
                  내보내기
                </button>
                <button
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => handleDelete(set)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[var(--color-danger)] disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
              {randomMessages[set.id] && (
                <p className="text-sm text-[var(--color-muted)]">{randomMessages[set.id]}</p>
              )}
            </div>
          );
        })}
      </div>

      {sets.length === 0 && !loadError && (
        <p className="text-sm text-[var(--color-muted)]">
          저장된 문제 세트가 없어요. 위 버튼으로 세트를 만들어보세요.
        </p>
      )}
    </div>
  );
}
