"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return null;
}

/** localStorage 값을 읽기 전용으로 구독. SSR에서는 항상 null. */
export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    getServerSnapshot,
  );
}
