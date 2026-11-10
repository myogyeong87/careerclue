/** 반 배정 규칙 (Firestore와 무관한 순수 함수라 scripts/classRules.test.ts에서 바로 테스트함) */

/** 학번 4자리: 학년 1자리 + 반 1자리 + 번호 2자리 */
export const STUDENT_ID_PATTERN = /^\d{4}$/;
/** 반 접두사: 학년 1자리 + 반 1자리 */
export const CLASS_PREFIX_PATTERN = /^\d{2}$/;

/** 반 이름의 숫자에서 접두사를 추정. "1학년 1반" → "11", "2-3" → "23". 두 자리로 맞출 수 없으면 "" */
export function inferPrefixFromName(name: string): string {
  const [first = "", second = "", ...rest] = name.match(/\d+/g) ?? [];
  if (first.length === 1 && second.length === 1) return first + second;
  if (first.length === 2 && second === "" && rest.length === 0) return first;
  return "";
}

/** 학번에서 반 접두사(앞 두 자리)를 꺼냄. 4자리 숫자가 아니면 null */
export function prefixOfStudentId(studentId: string): string | null {
  return STUDENT_ID_PATTERN.test(studentId) ? studentId.slice(0, 2) : null;
}

/** 학번 목록에서 가장 많이 나온 접두사 (기존 데이터 이전 시 "기본 반" 접두사 추정용) */
export function mostCommonPrefix(studentIds: string[]): string | null {
  const counts = new Map<string, number>();
  studentIds.forEach((id) => {
    const prefix = prefixOfStudentId(id);
    if (prefix) counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  });
  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((count, prefix) => {
    if (count > bestCount || (count === bestCount && best !== null && prefix < best)) {
      best = prefix;
      bestCount = count;
    }
  });
  return best;
}

/** Firestore batch는 한 번에 500건까지라 여유를 두고 나눔 */
export const DELETE_BATCH_SIZE = 450;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
