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

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 기기(localStorage)에 저장되는 문자열 설정. null을 넣으면 지움 */
export function useStoredString(key: string): [string | null, (next: string | null) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);

  const setValue = useCallback(
    (next: string | null) => {
      try {
        if (next == null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        // 저장이 막힌 환경에서는 새로고침하면 첫 번째 반으로 돌아감
      }
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [value, setValue];
}
