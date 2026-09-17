"use client";

import { useEffect, useState } from "react";
import { subscribeQuestionSets, updateQuestionSet } from "@/lib/questionSets";
import { charCountPreview } from "@/lib/text";
import type { Job, QuestionSet } from "@/lib/types";

function emptyJob(): Job {
  return { title: "", accepted: [], hints: ["", "", "", "", ""] };
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export default function EditSetTab() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => subscribeQuestionSets(setSets), []);

  const selected = sets.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <select
        value={selectedId ?? ""}
        onChange={(e) => setSelectedId(e.target.value || null)}
        className="w-full max-w-xs rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-sm"
      >
        <option value="">세트 선택...</option>
        {sets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {selected ? (
        <SetEditor key={selected.id} initial={selected} />
      ) : (
        <p className="text-sm text-[var(--foreground)]/60">
          편집할 세트를 선택하세요.
        </p>
      )}
    </div>
  );
}

function SetEditor({ initial }: { initial: QuestionSet }) {
  const [draft, setDraft] = useState<QuestionSet>(() => structuredClone(initial));
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [dragJobIndex, setDragJobIndex] = useState<number | null>(null);
  const [dragHintIndex, setDragHintIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateJob = (index: number, patch: Partial<Job>) => {
    setDraft((d) => ({
      ...d,
      jobs: d.jobs.map((j, i) => (i === index ? { ...j, ...patch } : j)),
    }));
    setDirty(true);
  };

  const updateHint = (jobIndex: number, hintIndex: number, value: string) => {
    setDraft((d) => ({
      ...d,
      jobs: d.jobs.map((j, i) => {
        if (i !== jobIndex) return j;
        return { ...j, hints: j.hints.map((h, hi) => (hi === hintIndex ? value : h)) };
      }),
    }));
    setDirty(true);
  };

  const addJob = () => {
    setDraft((d) => ({ ...d, jobs: [...d.jobs, emptyJob()] }));
    setDirty(true);
  };

  const removeJob = (index: number) => {
    setDraft((d) => ({ ...d, jobs: d.jobs.filter((_, i) => i !== index) }));
    setDirty(true);
    setExpandedJob(null);
  };

  const moveJob = (from: number, to: number) => {
    if (from === to) return;
    setDraft((d) => ({ ...d, jobs: reorder(d.jobs, from, to) }));
    setDirty(true);
  };

  const moveHint = (jobIndex: number, from: number, to: number) => {
    if (from === to) return;
    setDraft((d) => ({
      ...d,
      jobs: d.jobs.map((j, i) => (i === jobIndex ? { ...j, hints: reorder(j.hints, from, to) } : j)),
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateQuestionSet(draft.id, {
        name: draft.name,
        jobs: draft.jobs,
        scoring: draft.scoring,
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => {
            setDraft((d) => ({ ...d, name: e.target.value }));
            setDirty(true);
          }}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-sm"
          placeholder="세트 이름"
        />
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={handleSave}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : dirty ? "저장하기" : "저장됨"}
        </button>
        <button
          type="button"
          onClick={addJob}
          className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold"
        >
          문제 추가
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {draft.jobs.map((job, jobIndex) => {
          const isExpanded = expandedJob === jobIndex;
          return (
            <div
              key={jobIndex}
              draggable
              onDragStart={() => setDragJobIndex(jobIndex)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragJobIndex !== null) moveJob(dragJobIndex, jobIndex);
                setDragJobIndex(null);
              }}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
            >
              <div className="flex cursor-move items-center gap-2 px-4 py-3">
                <span className="text-[var(--foreground)]/40" title="드래그로 순서 변경">
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedJob(isExpanded ? null : jobIndex)}
                  className="flex flex-1 flex-wrap items-center gap-3 text-left"
                >
                  <span className="font-semibold">
                    {jobIndex + 1}. {job.title || "(제목 없음)"}
                  </span>
                  <span className="font-mono text-sm tracking-widest text-[var(--foreground)]/50">
                    {charCountPreview(job.title)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeJob(jobIndex)}
                  className="text-sm text-red-600"
                >
                  삭제
                </button>
                <span className="text-sm text-[var(--foreground)]/50">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-3 border-t border-white px-4 py-4">
                  <label className="flex flex-col gap-1 text-sm">
                    직업명
                    <input
                      type="text"
                      value={job.title}
                      onChange={(e) => updateJob(jobIndex, { title: e.target.value })}
                      className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    정답으로 인정할 동의어 (쉼표로 구분)
                    <input
                      type="text"
                      value={job.accepted.join(", ")}
                      onChange={(e) =>
                        updateJob(jobIndex, {
                          accepted: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold">힌트 (드래그로 순서 변경)</p>
                    {job.hints.map((hint, hintIndex) => (
                      <div
                        key={hintIndex}
                        draggable
                        onDragStart={() => setDragHintIndex(hintIndex)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragHintIndex !== null) moveHint(jobIndex, dragHintIndex, hintIndex);
                          setDragHintIndex(null);
                        }}
                        className="flex cursor-move items-start gap-2"
                      >
                        <span className="mt-2 text-[var(--foreground)]/40">⠿</span>
                        <span className="mt-2 text-sm text-[var(--color-primary)]">
                          {hintIndex + 1}
                        </span>
                        <textarea
                          value={hint}
                          onChange={(e) => updateHint(jobIndex, hintIndex, e.target.value)}
                          rows={2}
                          className="flex-1 rounded-lg border border-[var(--color-primary)]/30 bg-white p-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
