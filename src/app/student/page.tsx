"use client";

import { useCallback, useEffect, useState } from "react";
import { joinLobby, subscribeLobbyPresence } from "@/lib/lobby";
import { findClassesByPrefix, subscribeAssignMode, subscribeClasses } from "@/lib/classes";
import { prefixOfStudentId, STUDENT_ID_PATTERN } from "@/lib/classRules";
import { registerStudent, subscribeMyRegistration } from "@/lib/students";
import { ClassIdProvider } from "@/lib/classContext";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import type { ClassAssignMode, ClassInfo } from "@/lib/types";
import GameView from "./_components/GameView";
import MadeBy from "@/app/_components/MadeBy";

const STUDENT_ID_KEY = "jikeop-quiz:studentId";
const STUDENT_NAME_KEY = "jikeop-quiz:studentName";
const STUDENT_CLASS_KEY = "jikeop-quiz:classId";

type JoinedStudent = { classId: string; studentId: string; name: string };

const ID_FORMAT_HINT = "학번은 숫자 4자리예요. (예: 1학년 1반 1번 → 1101)";

export default function StudentPage() {
  const savedId = useLocalStorageValue(STUDENT_ID_KEY);
  const savedName = useLocalStorageValue(STUDENT_NAME_KEY);
  const savedClassId = useLocalStorageValue(STUDENT_CLASS_KEY);
  const [studentIdInput, setStudentIdInput] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [classInput, setClassInput] = useState<string | null>(null);
  const studentId = studentIdInput ?? savedId ?? "";
  const name = nameInput ?? savedName ?? "";
  const [assignMode, setAssignMode] = useState<ClassAssignMode | null>(null);
  // 반을 직접 고르는 방식일 때만 반 목록을 불러옴 (자동 배정이면 내 반 외의 정보는 받지 않음)
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<JoinedStudent | null>(null);
  const [liveName, setLiveName] = useState<string | null>(null);
  const [kicked, setKicked] = useState<"kicked" | "classGone" | null>(null);

  useEffect(() => subscribeAssignMode(setAssignMode), []);
  useEffect(() => {
    if (assignMode !== "manual") return;
    return subscribeClasses(setClasses);
  }, [assignMode]);

  const manual = assignMode === "manual";
  const classId = classInput ?? (classes.some((c) => c.id === savedClassId) ? savedClassId : "") ?? "";
  const trimmedId = studentId.trim();
  const showIdHint = !manual && trimmedId !== "" && !STUDENT_ID_PATTERN.test(trimmedId);

  useEffect(() => {
    if (!joined) return;
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    (async () => {
      await joinLobby(joined.classId, joined.studentId, joined.name);
      if (cancelled) return;
      unsubs.push(
        subscribeLobbyPresence(joined.classId, joined.studentId, (present) => {
          if (!present) setKicked("kicked");
        }),
        // 선생님이 등록을 해제하면 처음부터 다시 입장, 이름을 고치면 새 이름으로 이어서 제출
        subscribeMyRegistration(joined.classId, joined.studentId, (registeredName) => {
          if (registeredName == null) {
            setKicked("kicked");
            return;
          }
          setLiveName(registeredName);
          try {
            window.localStorage.setItem(STUDENT_NAME_KEY, registeredName);
          } catch {
            // 저장이 막힌 환경이면 다음 입장 때 이름을 다시 입력
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [joined]);

  const handleClassMissing = useCallback(() => setKicked("classGone"), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedId || !trimmedName) {
      setError("학번과 이름을 모두 입력해주세요.");
      return;
    }
    if (manual ? !/^\d+$/.test(trimmedId) : !STUDENT_ID_PATTERN.test(trimmedId)) {
      setError(manual ? "학번은 숫자로만 입력해주세요." : ID_FORMAT_HINT);
      return;
    }
    if (manual && !classId) {
      setError("우리 반을 골라주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let targetClassId = classId;
      if (!manual) {
        const matches = await findClassesByPrefix(prefixOfStudentId(trimmedId)!);
        if (matches.length === 0) {
          setError("아직 열리지 않은 반이에요. 선생님께 물어보세요.");
          return;
        }
        targetClassId = matches[0].id;
      }
      // 학번이 같으면 이름이 바뀌어도 그대로 입장. 이미 낸 답·점수는 학번 기준으로 이어지고 이름만 새로 고침
      await registerStudent(targetClassId, trimmedId, trimmedName);
      window.localStorage.setItem(STUDENT_ID_KEY, trimmedId);
      window.localStorage.setItem(STUDENT_NAME_KEY, trimmedName);
      window.localStorage.setItem(STUDENT_CLASS_KEY, targetClassId);
      setLiveName(trimmedName);
      setJoined({ classId: targetClassId, studentId: trimmedId, name: trimmedName });
    } catch {
      setError("접속에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (kicked) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl">
          {kicked === "classGone" ? "반 정보가 없어졌어요" : "접속이 초기화됐어요"}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {kicked === "classGone" ? (
            "선생님께 확인한 뒤 다시 들어와 주세요."
          ) : (
            <>
              학번과 이름을 확인하고 다시 들어와 주세요.
              <br />
              같은 학번으로 들어오면 지금까지의 점수가 그대로 이어져요.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setKicked(null);
            setJoined(null);
            setNameInput(null);
          }}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)]"
        >
          다시 접속하기
        </button>
      </main>
    );
  }

  if (joined) {
    return (
      <ClassIdProvider classId={joined.classId}>
        <GameView
          studentId={joined.studentId}
          studentName={liveName ?? joined.name}
          onClassMissing={handleClassMissing}
        />
      </ClassIdProvider>
    );
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
        {manual && (
          <label className="flex flex-col gap-1 text-sm">
            우리 반
            <select
              value={classId}
              onChange={(e) => setClassInput(e.target.value)}
              className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-base outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">반을 골라주세요</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
          {showIdHint && (
            <span className="text-xs text-[var(--color-danger)]">{ID_FORMAT_HINT}</span>
          )}
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
          disabled={submitting || assignMode === null}
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
