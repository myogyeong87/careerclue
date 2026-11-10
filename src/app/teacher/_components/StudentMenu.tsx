"use client";

import { useState } from "react";
import { kickStudent } from "@/lib/lobby";
import { deleteStudentRecords, renameStudent, unregisterStudent } from "@/lib/students";
import { useClassId } from "@/lib/classContext";
import Modal from "@/app/_components/Modal";

const ROUND_WARNING = "\n\n지금 라운드가 진행 중이라 이 학생의 이번 라운드 제출도 함께 빠져요.";

/** 학생 이름표를 누르면 뜨는 관리 메뉴 (교사 화면, PIN 통과 후에만 보임) */
export default function StudentMenu({
  student,
  present,
  roundInProgress,
  onClose,
}: {
  student: { studentId: string; name: string };
  /** 지금 접속해 있으면 퇴장 메뉴도 보여줌 */
  present: boolean;
  roundInProgress: boolean;
  onClose: () => void;
}) {
  const classId = useClassId();
  const [name, setName] = useState(student.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = `${student.studentId} ${student.name}`;

  const run = async (confirmText: string, action: () => Promise<void>) => {
    if (busy || !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리하지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const trimmed = name.trim();

  return (
    <Modal onClose={onClose} className="flex w-full max-w-md flex-col gap-5">
      <h2 className="text-2xl font-semibold">
        <span className="mr-2 text-lg text-[var(--color-muted)]">{student.studentId}</span>
        {student.name}
      </h2>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed || trimmed === student.name) return;
          run(
            `${label} 학생의 이름을 "${trimmed}"(으)로 바꿀까요? 학번·점수·제출 기록은 그대로 유지돼요.`,
            () => renameStudent(classId, student.studentId, trimmed),
          );
        }}
      >
        <span className="text-sm font-semibold">이름 수정</span>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-lg outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={busy || !trimmed || trimmed === student.name}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
        {present && (
          <MenuButton
            disabled={busy}
            title="퇴장시키기"
            description="접속만 끊어요. 등록·점수는 그대로라 다시 들어오면 이어져요."
            onClick={() =>
              run(`${label} 학생을 퇴장시킬까요?`, () => kickStudent(classId, student.studentId))
            }
          />
        )}
        <MenuButton
          disabled={busy}
          title="등록 해제"
          description="학번·이름 등록만 지워 처음부터 다시 입장하게 해요. 점수·제출 기록은 남아서, 같은 학번으로 들어오면 새 이름으로 이어져요."
          onClick={() =>
            run(
              `${label} 학생의 등록을 해제할까요? 학생 화면은 처음 입장 화면으로 돌아가고, 점수·제출 기록은 남아요.`,
              () => unregisterStudent(classId, student.studentId),
            )
          }
        />
        <MenuButton
          danger
          disabled={busy}
          title="기록까지 삭제"
          description="등록·점수·모든 제출 기록을 완전히 지워요. 되돌릴 수 없어요."
          onClick={() =>
            run(
              `${label} 학생의 등록·점수·모든 제출 기록을 완전히 지울까요? 되돌릴 수 없어요.${
                roundInProgress ? ROUND_WARNING : ""
              }`,
              () => deleteStudentRecords(classId, student.studentId),
            )
          }
        />
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <button
        type="button"
        onClick={onClose}
        className="self-end rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-2 font-semibold"
      >
        닫기
      </button>
    </Modal>
  );
}

function MenuButton({
  title,
  description,
  danger = false,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 rounded-lg border-2 bg-white px-4 py-2 text-left disabled:opacity-50 ${
        danger ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
      }`}
    >
      <span className={`font-semibold ${danger ? "text-[var(--color-danger)]" : ""}`}>{title}</span>
      <span className="text-sm text-[var(--color-muted)]">{description}</span>
    </button>
  );
}
