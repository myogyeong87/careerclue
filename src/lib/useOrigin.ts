"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return null;
}

/** location.origin을 읽기 전용으로 구독. SSR에서는 항상 null. */
export function useOrigin(): string | null {
  return useSyncExternalStore(subscribe, () => window.location.origin, getServerSnapshot);
}
