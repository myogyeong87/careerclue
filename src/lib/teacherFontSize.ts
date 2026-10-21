"use client";

import { useStoredNumber } from "./useStoredNumber";

const KEY = "careerclue:teacherFontSize";
export const DEFAULT_TEACHER_FONT_SIZE = 24;
const MIN = 16;
const MAX = 48;
const STEP = 2;

/**
 * 교사 화면(프로젝터)용 글자 크기(px). 교사 페이지 최상위에서 CSS 변수 --tfs로 내려주고,
 * 답 텍스트·게임 방법·순위표·대기 이름표가 이 값을 기준으로 크기를 잡는다.
 */
export function useTeacherFontSize() {
  const [size, setSize] = useStoredNumber(KEY, DEFAULT_TEACHER_FONT_SIZE, MIN, MAX);
  return {
    size,
    canDecrease: size > MIN,
    canIncrease: size < MAX,
    decrease: () => setSize(size - STEP),
    increase: () => setSize(size + STEP),
  };
}

/** --tfs(교사 글자 크기)에 배율을 곱한 CSS 길이 */
export function tfs(scale = 1): string {
  return `calc(var(--tfs, ${DEFAULT_TEACHER_FONT_SIZE}px) * ${scale})`;
}
