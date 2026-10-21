"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** 기기(localStorage)에 저장되는 숫자 설정. 같은 key를 쓰는 모든 컴포넌트가 함께 갱신됨 */
export function useStoredNumber(
  key: string,
  fallback: number,
  min: number,
  max: number,
): [number, (next: number) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => Math.min(max, Math.max(min, readNumber(key, fallback))),
    () => fallback,
  );

  const setValue = useCallback(
    (next: number) => {
      const clamped = Math.min(max, Math.max(min, Math.round(next)));
      try {
        window.localStorage.setItem(key, String(clamped));
      } catch {
        // 저장이 막힌 환경(시크릿 모드 등)에서는 이번 화면에서만 유지되지 않아도 무방
      }
      listeners.forEach((l) => l());
    },
    [key, min, max],
  );

  return [value, setValue];
}
