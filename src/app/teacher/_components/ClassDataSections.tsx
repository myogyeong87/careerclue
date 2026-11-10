"use client";

import { useEffect, useState } from "react";
import { deleteAllClasses, deleteClass } from "@/lib/classes";
import { subscribeLobby } from "@/lib/lobby";
import { subscribeStudents } from "@/lib/students";
import { useClassId } from "@/lib/classContext";
import {
  deleteLegacyData,
  getLegacySummary,
  hasLegacyData,
  LEGACY_CLASS_NAME,
  type LegacySummary,
} from "@/lib/migration";
import type { ClassInfo, RegisteredStudent } from "@/lib/types";
import StudentMenu from "./StudentMenu";

const SECTION =
  "flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4";
const DANGER_SECTION =
  "flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-[var(--color-danger)]/60 bg-[var(--color-surface)] p-4";

/** 선택한 반에 등록된 학생 명단. 이름표를 누르면 이름 수정·등록 해제·기록 삭제 메뉴 */
export function StudentRosterSection({ classInfo }: { classInfo: ClassInfo }) {
  const classId = useClassId();
  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<RegisteredStudent | null>(null);

  useEffect(() => subscribeStudents(classId, setStudents), [classId]);
  useEffect(
    () => subscribeLobby(classId, (list) => setPresentIds(new Set(list.map((s) => s.studentId)))),
    [classId],
  );

  return (
    <div className={SECTION}>
      <h3 className="text-sm font-semibold">
        학생 명단 · {classInfo.name} ({students.length}명)
      </h3>
      <p className="text-sm text-[var(--color-muted)]">
        이름표를 누르면 이름 수정, 등록 해제, 기록까지 삭제를 할 수 있어요. 초록 점은 지금 접속 중인 학생이에요.
      </p>
      {students.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">아직 입장한 학생이 없어요.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {students.map((s) => (
            <li key={s.studentId}>
              <button
                type="button"
                onClick={() => setMenuFor(s)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1 text-sm"
              >
                {presentIds.has(s.studentId) && (
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" aria-label="접속 중" />
                )}
                <span className="text-[var(--color-muted)]">{s.studentId}</span>
                <span className="font-semibold">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {menuFor && (
        <StudentMenu
          student={menuFor}
          present={presentIds.has(menuFor.studentId)}
          roundInProgress={classInfo.inProgress}
          onClose={() => setMenuFor(null)}
        />
      )}
    </div>
  );
}

/** 직접 입력해야 버튼이 켜지는 위험 동작 */
function TypeToConfirm({
  expected,
  buttonLabel,
  onConfirm,
}: {
  expected: string;
  buttonLabel: string;
  onConfirm: () => Promise<string>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handle = async () => {
    if (busy || typed.trim() !== expected) return;
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await onConfirm());
      setTyped("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "지우지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={expected}
        aria-label={`확인을 위해 "${expected}" 입력`}
        className="w-48 rounded-lg border border-[var(--color-danger)]/40 bg-white px-3 py-1.5 text-base outline-none focus:border-[var(--color-danger)]"
      />
      <button
        type="button"
        disabled={busy || typed.trim() !== expected}
        onClick={handle}
        className="rounded-lg bg-[var(--color-danger)] px-4 py-1.5 font-semibold text-white disabled:opacity-40"
      >
        {busy ? "지우는 중..." : buttonLabel}
      </button>
      {message && <span className="w-full">{message}</span>}
    </div>
  );
}

/** 반 삭제: 반 이름을 직접 입력해야 실행 */
export function DeleteClassSection({ classInfo }: { classInfo: ClassInfo }) {
  return (
    <div className={DANGER_SECTION}>
      <h3 className="text-sm font-semibold text-[var(--color-danger)]">반 삭제 · {classInfo.name}</h3>
      <p className="text-sm text-[var(--color-muted)]">
        이 반의 학생 명단, 제출 기록, 점수, 게임 진행 상태를 모두 지워요. 되돌릴 수 없어요. 지우려면 반 이름{" "}
        <b>{classInfo.name}</b>을(를) 그대로 입력하세요.
      </p>
      <TypeToConfirm
        expected={classInfo.name}
        buttonLabel="반 삭제"
        onConfirm={async () => {
          await deleteClass(classInfo.id);
          return `${classInfo.name}을(를) 지웠어요.`;
        }}
      />
    </div>
  );
}

const DELETE_ALL_WORD = "전체삭제";

/** 학기 말 정리: 모든 반 데이터 삭제 (문제 세트·PIN은 남음) */
export function DeleteAllClassesSection() {
  return (
    <div className={DANGER_SECTION}>
      <h3 className="text-sm font-semibold text-[var(--color-danger)]">⚠ 위험 구역 · 전체 반 데이터 삭제</h3>
      <p className="text-sm text-[var(--color-muted)]">
        학기 말 정리용이에요. 모든 반과 그 안의 학생 명단, 제출 기록, 점수, 게임 상태를 지워요. 문제 세트와 교사
        PIN은 남아요. 실행하려면 <b>{DELETE_ALL_WORD}</b>를 입력하세요.
      </p>
      <TypeToConfirm
        expected={DELETE_ALL_WORD}
        buttonLabel="전체 반 데이터 삭제"
        onConfirm={async () => {
          const count = await deleteAllClasses();
          return `반 ${count}개를 모두 지웠어요.`;
        }}
      />
    </div>
  );
}

/** 반 구조 이전 후 옛 위치(games/current 등)에 남은 데이터. 기본 반을 확인한 뒤 교사가 직접 지움 */
export function LegacyDataSection() {
  const [summary, setSummary] = useState<LegacySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLegacySummary()
      .then((s) => !cancelled && setSummary(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary || !hasLegacyData(summary)) return message ? <p className="text-sm">{message}</p> : null;

  const handleDelete = async () => {
    if (busy) return;
    if (
      !window.confirm(
        `옛 위치의 데이터를 지울까요?\n\n제출 ${summary.submissions}건, 접속 기록 ${summary.lobby}건, 예전 학생 등록 ${summary.roster}건, 연습 제출 ${summary.practiceSubmissions}건과 옛 게임 문서를 지워요. "${LEGACY_CLASS_NAME}"에 옮겨진 데이터는 그대로 남아요.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteLegacyData();
      setSummary(await getLegacySummary());
      setMessage("옛 위치의 데이터를 모두 지웠어요.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "지우지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={SECTION}>
      <h3 className="text-sm font-semibold">옛 데이터 정리 (반 구조 이전 전 위치)</h3>
      <p className="text-sm text-[var(--color-muted)]">
        {summary.migrated
          ? `예전 게임 데이터를 "${LEGACY_CLASS_NAME}"으로 옮겼어요. 원본은 혹시 몰라 남겨뒀어요. 기본 반의 학생·점수가 맞는지 확인한 뒤 지우세요.`
          : "옛 위치에 데이터가 남아 있어요."}
      </p>
      <p className="text-sm">
        옛 게임 문서 {summary.gameDoc ? "있음" : "없음"} · 제출 {summary.submissions}건 · 접속 기록{" "}
        {summary.lobby}건 · 예전 학생 등록 {summary.roster}건 · 연습 제출 {summary.practiceSubmissions}건
      </p>
      <button
        type="button"
        disabled={busy || !summary.migrated}
        onClick={handleDelete}
        className="self-start rounded-lg border-2 border-[var(--color-danger)] bg-white px-3 py-1 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-40"
      >
        {busy ? "지우는 중..." : "옛 데이터 삭제"}
      </button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
