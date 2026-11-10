"use client";

import { useState } from "react";
import QuestionSetsTab from "./QuestionSetsTab";
import ClassForm from "./ClassForm";
import { DEFAULT_LOBBY_CAPACITY, useLobbyCapacity } from "@/lib/lobbyCapacity";
import { updateClassInfo } from "@/lib/classes";
import type { ClassAssignMode, ClassInfo } from "@/lib/types";

const SECTION =
  "flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4";

export default function SettingsPanel({
  classInfo,
  assignMode,
  onClose,
}: {
  /** 선택한 반 (반이 하나도 없으면 null → 반별 설정은 숨김) */
  classInfo: ClassInfo | null;
  assignMode: ClassAssignMode;
  onClose: () => void;
}) {
  const [capacity, setCapacity] = useLobbyCapacity();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">설정</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold"
        >
          게임 화면으로 돌아가기
        </button>
      </div>

      {classInfo && <QuestionSetsTab />}

      {classInfo && <ClassInfoSection classInfo={classInfo} assignMode={assignMode} />}

      <div className={SECTION}>
        <h3 className="text-sm font-semibold">학생 정원</h3>
        <p className="text-sm text-[var(--color-muted)]">
          대기 화면의 &ldquo;입장 N / 정원&rdquo;에 쓰이는 숫자예요. (기본 {DEFAULT_LOBBY_CAPACITY}명, 이 기기에 저장)
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="number"
            min={1}
            max={200}
            value={capacity}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) setCapacity(n);
            }}
            className="w-24 rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-1.5 text-base outline-none focus:border-[var(--color-primary)]"
          />
          명
        </label>
      </div>
    </div>
  );
}

/** 선택한 반의 이름·학번 접두사 고치기 */
function ClassInfoSection({
  classInfo,
  assignMode,
}: {
  classInfo: ClassInfo;
  assignMode: ClassAssignMode;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className={SECTION}>
      <h3 className="text-sm font-semibold">반 정보 · {classInfo.name}</h3>
      {editing ? (
        <ClassForm
          key={classInfo.id}
          initialName={classInfo.name}
          initialPrefix={classInfo.prefix}
          prefixRequired={assignMode === "auto"}
          submitLabel="저장"
          onCancel={() => setEditing(false)}
          onSubmit={async (name, prefix) => {
            const result = await updateClassInfo(
              classInfo.id,
              name,
              prefix,
              assignMode === "auto",
            );
            if (!result.ok) return result.error;
            setEditing(false);
            setSaved(true);
            return null;
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            반 이름 <b>{classInfo.name}</b>
          </span>
          <span>
            학번 접두사 <b>{classInfo.prefix || "없음"}</b>
          </span>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setSaved(false);
            }}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1 font-semibold"
          >
            고치기
          </button>
          {saved && <span className="text-[var(--color-success-ink)]">저장했어요</span>}
        </div>
      )}
    </div>
  );
}
