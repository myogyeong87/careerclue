"use client";

import { useEffect, useState } from "react";
import { checkOrRegisterStudent } from "@/lib/roster";
import { joinLobby, subscribeLobbyPresence } from "@/lib/lobby";
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
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    if (!joined) return;
    let cancelled = false;
    let unsubscribe = () => {};
    (async () => {
      await joinLobby(joined.studentId, joined.name);
      if (cancelled) return;
      unsubscribe = subscribeLobbyPresence(joined.studentId, (present) => {
        if (!present) setKicked(true);
      });
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [joined]);

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

  if (kicked) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl">접속이 초기화됐어요</h1>
        <p className="text-sm text-[var(--foreground)]/70">
          선생님이 접속을 초기화했어요. 학번과 이름을 다시 확인하고 접속해주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            setKicked(false);
            setJoined(null);
          }}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-white"
        >
          다시 접속하기
        </button>
      </main>
    );
  }

  if (joined) {
    return <GameView studentId={joined.studentId} studentName={joined.name} />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="탐정 강아지" className="h-24 w-24" />
        <h1 className="text-2xl">커리어탐정</h1>
        <p className="text-sm text-[var(--foreground)]/70">
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
            placeholder="1101"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          이름
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-base outline-none focus:border-[var(--color-primary)]"
            placeholder="홍길동"
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
