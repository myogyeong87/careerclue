"use client";

import { useState } from "react";
import QuestionSetsTab from "./QuestionSetsTab";
import ClassForm from "./ClassForm";
import {
  DeleteAllClassesSection,
  DeleteClassSection,
  StudentRosterSection,
} from "./ClassDataSections";
import { DEFAULT_LOBBY_CAPACITY, useLobbyCapacity } from "@/lib/lobbyCapacity";
import { resetClassScores, setAssignMode, updateClassInfo } from "@/lib/classes";
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

      {classInfo && <StudentRosterSection classInfo={classInfo} />}

      <AssignModeSection assignMode={assignMode} />

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

      {classInfo && <DeleteClassSection key={classInfo.id} classInfo={classInfo} />}

      <DeleteAllClassesSection />
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
      <ScoreResetButton classInfo={classInfo} />
    </div>
  );
}

/** 반별 점수 초기화: 점수(제출 기록)만 지우고 학생 명단은 남김 */
function ScoreResetButton({ classInfo }: { classInfo: ClassInfo }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (busy) return;
    const warning = classInfo.inProgress
      ? "\n\n지금 라운드가 진행 중이라 이번 라운드에 낸 답도 함께 지워져요."
      : "";
    if (
      !window.confirm(
        `${classInfo.name}의 점수와 제출 기록을 모두 지울까요? 학생 명단은 그대로 남아요.${warning}`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await resetClassScores(classInfo.id);
      setMessage(`${classInfo.name}의 점수를 초기화했어요.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "초기화하지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-3 text-sm">
      <button
        type="button"
        disabled={busy}
        onClick={handleReset}
        className="rounded-lg border-2 border-[var(--color-danger)] bg-white px-3 py-1 font-semibold text-[var(--color-danger)] disabled:opacity-50"
      >
        {busy ? "초기화 중..." : "점수 초기화"}
      </button>
      <span className="text-[var(--color-muted)]">
        이 반의 누적 점수와 제출 기록만 지워요. 문제 세트를 바꿔도 점수는 이어지니, 새로 시작할 때만 쓰세요.
      </span>
      {message && <span className="w-full">{message}</span>}
    </div>
  );
}

const ASSIGN_OPTIONS: { mode: ClassAssignMode; label: string; description: string }[] = [
  {
    mode: "auto",
    label: "학번으로 자동 배정 (기본)",
    description: "학번 4자리(학년·반·번호 2자리)의 앞 두 자리와 같은 접두사의 반으로 바로 들어가요.",
  },
  {
    mode: "manual",
    label: "학생이 반을 직접 고르기",
    description: "반 번호가 10 이상이라 4자리 학번 규칙이 맞지 않을 때 쓰세요. 입장 화면에 반 목록이 나와요.",
  },
];

/** 학생 반 배정 방식 (모든 학생 기기에 적용되므로 Firestore에 저장) */
function AssignModeSection({ assignMode }: { assignMode: ClassAssignMode }) {
  return (
    <div className={SECTION}>
      <h3 className="text-sm font-semibold">학생 반 배정 방식</h3>
      {ASSIGN_OPTIONS.map((o) => (
        <label key={o.mode} className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="assignMode"
            checked={assignMode === o.mode}
            onChange={() => setAssignMode(o.mode)}
            className="mt-1"
          />
          <span>
            <b>{o.label}</b>
            <br />
            <span className="text-[var(--color-muted)]">{o.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
