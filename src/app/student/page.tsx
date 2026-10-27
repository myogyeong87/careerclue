"use client";

import { useEffect, useState } from "react";
import { joinLobby, subscribeLobbyPresence } from "@/lib/lobby";
import { renameStudentSubmissions } from "@/lib/submissions";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import GameView from "./_components/GameView";
import MadeBy from "@/app/_components/MadeBy";

const STUDENT_ID_KEY = "jikeop-quiz:studentId";
const STUDENT_NAME_KEY = "jikeop-quiz:studentName";

type JoinedStudent = { studentId: string; name: string };

export default function StudentPage() {
  const savedId = useLocalStorageValue(STUDENT_ID_KEY);
  const savedName = useLocalStorageValue(STUDENT_NAME_KEY);
  const [studentIdInput, setStudentIdInput] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const studentId = studentIdInput ?? savedId ?? "";
  const name = nameInput ?? savedName ?? "";
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
      // 학번이 같으면 이름이 바뀌어도 그대로 입장. 이미 낸 답·점수는 학번 기준으로 이어지고 이름만 새로 고침
      await renameStudentSubmissions(trimmedId, trimmedName);
      window.localStorage.setItem(STUDENT_ID_KEY, trimmedId);
      window.localStorage.setItem(STUDENT_NAME_KEY, trimmedName);
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
        <p className="text-sm text-[var(--color-muted)]">
          학번과 이름을 확인하고 다시 들어와 주세요.
          <br />
          같은 학번으로 들어오면 지금까지의 점수가 그대로 이어져요.
        </p>
        <button
          type="button"
          onClick={() => {
            setKicked(false);
            setJoined(null);
          }}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)]"
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
    <main className="flex flex-1 flex-col items-center gap-5 px-4 pb-4 pt-8">
      <div className="flex flex-col items-center gap-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="탐정 강아지" className="h-16 w-16" />
        <h1 className="text-2xl">커리어탐정</h1>
        <p className="text-sm text-[var(--color-muted)]">
          학번과 이름을 입력해주세요.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
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
            onChange={(e) => setNameInput(e.target.value)}
            className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-base outline-none focus:border-[var(--color-primary)]"
            placeholder="홍길동"
          />
        </label>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-3 font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "확인 중..." : "입장하기"}
        </button>
        <p className="text-center text-xs text-[var(--color-muted)]">
          중간에 튕겨도 같은 학번으로 들어오면 점수가 이어져요.
        </p>
      </form>
      <div className="flex-1" />
      <MadeBy />
    </main>
  );
}
