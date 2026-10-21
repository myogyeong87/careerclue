"use client";

import { useStoredNumber } from "./useStoredNumber";

export const DEFAULT_LOBBY_CAPACITY = 30;

/** 학생 대기 현황의 정원(입장 N / 정원). 교사 기기에 저장 */
export function useLobbyCapacity() {
  return useStoredNumber("careerclue:lobbyCapacity", DEFAULT_LOBBY_CAPACITY, 1, 200);
}
