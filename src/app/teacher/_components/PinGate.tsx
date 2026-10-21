"use client";

import { useEffect, useState } from "react";
import {
  PIN_PATTERN,
  createTeacherPin,
  hasTeacherPin,
  isTeacherUnlockRemembered,
  rememberTeacherUnlock,
  verifyTeacherPin,
} from "@/lib/teacherPin";

type GateState = "checking" | "create" | "enter" | "unlocked" | "error";

/** 교사 화면 진입 전 PIN 확인. 처음이면 PIN 만들기, 이후엔 입력. 통과한 기기는 12시간 기억 */
export default function PinGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isTeacherUnlockRemembered()) {
        if (!cancelled) setState("unlocked");
        return;
      }
      try {
        const exists = await hasTeacherPin();
        if (!cancelled) setState(exists ? "enter" : "create");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "unlocked") return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (working) return;
    setError(null);

    if (!PIN_PATTERN.test(pin)) {
      setError("PIN은 숫자 4~6자리로 입력해주세요.");
      return;
    }

    setWorking(true);
    try {
      if (state === "create") {
        if (pin !== confirmPin) {
          setError("두 번 입력한 PIN이 서로 달라요.");
          return;
        }
        const created = await createTeacherPin(pin);
        if (!created) {
          // 다른 기기에서 먼저 만들었으면 입력 모드로 전환
          setState("enter");
          setPin("");
          setConfirmPin("");
          setError("이미 PIN이 설정되어 있어요. 설정된 PIN을 입력해주세요.");
          return;
        }
      } else if (!(await verifyTeacherPin(pin))) {
        setError("PIN이 맞지 않아요.");
        setPin("");
        return;
      }
      rememberTeacherUnlock();
      setState("unlocked");
    } catch {
      setError("확인에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.");
    } finally {
      setWorking(false);
    }
  };

  const pinInputClass =
    "rounded-lg border-2 border-[var(--color-border)] bg-white px-4 py-3 text-center text-3xl tracking-[0.5em] outline-none focus:border-[var(--color-primary)]";
  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dog.png" alt="탐정 강아지" className="h-24 w-24" />
        <h1 className="text-3xl">교사 화면</h1>
      </div>

      {state === "checking" && <p className="text-[var(--color-muted)]">확인 중...</p>}

      {state === "error" && (
        <p className="text-[var(--color-danger)]">
          PIN 정보를 불러오지 못했어요. 새로고침해 주세요.
        </p>
      )}

      {(state === "create" || state === "enter") && (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
        >
          <p className="text-center text-lg font-semibold">
            {state === "create" ? "처음 사용하시네요! 교사 PIN을 만들어 주세요." : "교사 PIN을 입력해 주세요."}
          </p>
          {state === "create" && (
            <p className="text-center text-sm text-[var(--color-muted)]">숫자 4~6자리</p>
          )}
          <input
            type="password"
            inputMode="numeric"
            autoComplete={state === "create" ? "new-password" : "current-password"}
            autoFocus
            aria-label="PIN"
            value={pin}
            onChange={(e) => setPin(onlyDigits(e.target.value))}
            className={pinInputClass}
          />
          {state === "create" && (
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              aria-label="PIN 확인"
              placeholder="한 번 더"
              value={confirmPin}
              onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
              className={`${pinInputClass} placeholder:text-base placeholder:tracking-normal`}
            />
          )}
          {error && <p className="text-center text-sm text-[var(--color-danger)]">{error}</p>}
          <button
            type="submit"
            disabled={working}
            className="mt-1 rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 py-3 text-lg font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {working ? "확인 중..." : state === "create" ? "PIN 만들기" : "들어가기"}
          </button>
          <p className="text-center text-xs text-[var(--color-muted)]">
            이 기기에서는 12시간 동안 다시 묻지 않아요.
          </p>
        </form>
      )}
    </main>
  );
}
