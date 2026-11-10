"use client";

import { useState } from "react";
import { createClass } from "@/lib/classes";
import { withJosa } from "@/lib/text";
import type { ClassInfo } from "@/lib/types";
import Modal from "@/app/_components/Modal";
import ClassForm from "./ClassForm";

/** 교사 화면 맨 위: 반 선택 + 새 반 만들기. 프로젝터에서도 어느 반인지 보이도록 반 이름을 크게 */
export default function ClassBar({
  classes,
  selected,
  prefixRequired,
  onSelect,
}: {
  classes: ClassInfo[];
  selected: ClassInfo | null;
  prefixRequired: boolean;
  onSelect: (classId: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  const handleSelect = (classId: string) => {
    if (selected?.id === classId) return;
    if (
      selected &&
      selected.inProgress &&
      !window.confirm(`${withJosa(selected.name, "이", "가")} 진행 중이에요. 그대로 두고 전환할까요?`)
    ) {
      return;
    }
    onSelect(classId);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {selected ? (
        <span className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-5 py-1.5 font-[family-name:var(--font-heading)] text-4xl text-[var(--color-on-primary)] shadow-[var(--shadow-card)]">
          🏫 {selected.name}
        </span>
      ) : (
        <span className="text-2xl text-[var(--color-muted)]">아직 만든 반이 없어요</span>
      )}
      {classes.length > 1 && selected && (
        <select
          aria-label="반 선택"
          value={selected.id}
          onChange={(e) => handleSelect(e.target.value)}
          className="rounded-[var(--radius-card)] border-2 border-[var(--color-border)] bg-white px-3 py-2 text-lg font-semibold"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.prefix ? ` (${c.prefix})` : ""}
              {c.inProgress ? " · 진행 중" : ""}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-primary)] bg-white px-4 py-2 text-base font-semibold text-[var(--color-primary-ink)]"
      >
        ＋ 새 반 만들기
      </button>

      {creating && (
        <Modal onClose={() => setCreating(false)} className="w-full max-w-md">
          <h2 className="mb-4 text-2xl font-semibold">새 반 만들기</h2>
          <ClassForm
            prefixRequired={prefixRequired}
            submitLabel="만들기"
            onCancel={() => setCreating(false)}
            onSubmit={async (name, prefix) => {
              const result = await createClass(name, prefix, prefixRequired);
              if (!result.ok) return result.error;
              setCreating(false);
              handleSelect(result.id);
              return null;
            }}
          />
        </Modal>
      )}
    </div>
  );
}
