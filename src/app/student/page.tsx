"use client";

import { useState } from "react";
import { checkOrRegisterStudent } from "@/lib/roster";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import GameView from "./_components/GameView";

const STUDENT_ID_KEY = "jikeop-quiz:studentId";

type JoinedStudent = { studentId: string; name: string };

export default function StudentPage() {
  const savedId = useLocalStorageValue(STUDENT_ID_KEY);
  const [studentIdInput, setStudentIdInput] = useState<string | null>(null);
  const studentId = studentIdInput ?? savedId ?? "";
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<JoinedStudent | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = studentId.trim();
    const trimmedName = name.trim();
    if (!trimmedId || !trimmedName) {
      setError("학번과 이름을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await checkOrRegisterStudent(trimmedId, trimmedName);
      if (result.status === "mismatch") {
        setError("등록된 이름과 달라요. 학번과 이름을 다시 확인해주세요.");
        return;
      }
      window.localStorage.setItem(STUDENT_ID_KEY, trimmedId);
      setJoined({ studentId: trimmedId, name: trimmedName });
    } catch {
      setError("접속에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (joined) {
    return <GameView studentId={joined.studentId} studentName={joined.name} />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl">학생 참여</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">
          학번과 이름을 입력해주세요.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
      >
        <label className="flex flex-col gap-1 text-sm">
          학번
          <input
            type="text"
            inputMode="numeric"
            value={studentId}
            onChange={(e) => setStudentIdInput(e.target.value)}
            className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-base outline-none focus:border-[var(--color-primary)]"
            placeholder="예: 10203"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          이름
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-base outline-none focus:border-[var(--color-primary)]"
            placeholder="예: 홍길동"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "확인 중..." : "입장하기"}
        </button>
      </form>
    </main>
  );
}
