import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { CLASS_PREFIX_PATTERN } from "./classRules";
import { assertQueryEmpty, deleteQueryFully, DeleteVerifyError } from "./firestoreDelete";
import { EMPTY_GAME_STATE, type ClassAssignMode, type ClassInfo } from "./types";

/**
 * 반 하나 = classes/{classId} 문서 (반 정보 + 게임 진행 상태) 와 아래 하위 컬렉션.
 * Firestore는 문서를 지워도 하위 컬렉션이 남으므로, 반/학생/점수 삭제는 이 목록을 모두 돌며 지움
 */
export const CLASS_SUBCOLLECTIONS = ["students", "lobby", "submissions", "practice_submissions"] as const;
export type ClassSubcollection = (typeof CLASS_SUBCOLLECTIONS)[number];

const CLASSES = collection(db, "classes");
const ASSIGN_DOC = doc(db, "config", "classAssign");

export function classRef(classId: string) {
  return doc(db, "classes", classId);
}

export function classSubcol(classId: string, sub: ClassSubcollection) {
  return collection(db, "classes", classId, sub);
}

function classFromData(id: string, data: Record<string, unknown>): ClassInfo {
  const currentIndex = (data.currentIndex as number) ?? -1;
  return {
    id,
    name: (data.name as string) ?? "",
    prefix: (data.prefix as string) ?? "",
    createdAt: (data.createdAt as number) ?? 0,
    inProgress: currentIndex > -1 && data.phase !== "finished",
  };
}

/** 반 이름 순(숫자는 크기 순: 1반, 2반, 10반) */
export function sortClasses(classes: ClassInfo[]): ClassInfo[] {
  return [...classes].sort((a, b) =>
    a.name.localeCompare(b.name, "ko", { numeric: true }) || a.createdAt - b.createdAt,
  );
}

export function subscribeClasses(
  onChange: (classes: ClassInfo[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    CLASSES,
    (snap) => onChange(sortClasses(snap.docs.map((d) => classFromData(d.id, d.data())))),
    (err) => onError?.(err),
  );
}

/** 학생 입장용: 접두사가 같은 반만 조회 (다른 반 정보는 학생 기기로 내려가지 않음) */
export async function findClassesByPrefix(prefix: string): Promise<ClassInfo[]> {
  const snap = await getDocs(query(CLASSES, where("prefix", "==", prefix)));
  return snap.docs.map((d) => classFromData(d.id, d.data()));
}

export async function getClassInfo(classId: string): Promise<ClassInfo | null> {
  const snap = await getDoc(classRef(classId));
  return snap.exists() ? classFromData(snap.id, snap.data()) : null;
}

export type ClassInfoError = "name-empty" | "prefix-format" | "prefix-taken";

export function classInfoErrorMessage(error: ClassInfoError): string {
  switch (error) {
    case "name-empty":
      return "반 이름을 입력해주세요.";
    case "prefix-format":
      return "학번 접두사는 숫자 두 자리예요. (예: 1학년 1반 → 11)";
    case "prefix-taken":
      return "이미 다른 반이 쓰고 있는 학번 접두사예요.";
  }
}

/** 접두사는 자동 배정에 필요. 반을 직접 고르는 방식(manual)이면 비워둘 수 있음 */
async function validateClassInfo(
  name: string,
  prefix: string,
  selfId: string | null,
  prefixRequired: boolean,
): Promise<ClassInfoError | null> {
  if (!name.trim()) return "name-empty";
  if (prefix === "" && !prefixRequired) return null;
  if (!CLASS_PREFIX_PATTERN.test(prefix)) return "prefix-format";
  const same = await findClassesByPrefix(prefix);
  if (same.some((c) => c.id !== selfId)) return "prefix-taken";
  return null;
}

/** 새 반 만들기. 게임 상태는 빈 상태로 시작 */
export async function createClass(
  name: string,
  prefix: string,
  prefixRequired = true,
): Promise<{ ok: true; id: string } | { ok: false; error: ClassInfoError }> {
  const error = await validateClassInfo(name, prefix, null, prefixRequired);
  if (error) return { ok: false, error };
  const ref = doc(CLASSES);
  await setDoc(ref, {
    ...EMPTY_GAME_STATE,
    name: name.trim(),
    prefix,
    createdAt: Date.now(),
  });
  return { ok: true, id: ref.id };
}

export async function updateClassInfo(
  classId: string,
  name: string,
  prefix: string,
  prefixRequired = true,
): Promise<{ ok: true } | { ok: false; error: ClassInfoError }> {
  const error = await validateClassInfo(name, prefix, classId, prefixRequired);
  if (error) return { ok: false, error };
  await updateDoc(classRef(classId), { name: name.trim(), prefix });
  return { ok: true };
}

/** 반 안의 하위 컬렉션 문서를 모두 지우고 실제로 비었는지 확인 */
async function deleteClassSubcollections(
  classId: string,
  subs: readonly ClassSubcollection[],
): Promise<void> {
  for (const sub of subs) {
    await deleteQueryFully(classSubcol(classId, sub));
  }
  for (const sub of subs) {
    await assertQueryEmpty(classSubcol(classId, sub), `반의 ${sub} 기록`);
  }
}

/** 반 삭제: 학생·대기실·제출·연습 제출(하위 컬렉션)을 먼저 모두 지운 뒤 반 문서(게임 상태)를 지움 */
export async function deleteClass(classId: string): Promise<void> {
  await deleteClassSubcollections(classId, CLASS_SUBCOLLECTIONS);
  await deleteDoc(classRef(classId));
  const snap = await getDocFromServer(classRef(classId));
  if (snap.exists()) throw new DeleteVerifyError("반 문서");
}

/** 학기 말 정리: 모든 반을 하위 컬렉션까지 삭제 */
export async function deleteAllClasses(): Promise<number> {
  const snap = await getDocs(CLASSES);
  for (const d of snap.docs) {
    await deleteClass(d.id);
  }
  await assertQueryEmpty(CLASSES, "반 목록");
  return snap.size;
}

/** 점수 초기화: 제출(점수) 기록만 지우고 학생 명단·게임 진행 상태는 남김 */
export async function resetClassScores(classId: string): Promise<void> {
  await deleteClassSubcollections(classId, ["submissions", "practice_submissions"]);
}

export function subscribeAssignMode(onChange: (mode: ClassAssignMode) => void) {
  return onSnapshot(ASSIGN_DOC, (snap) =>
    onChange(snap.exists() && snap.data().mode === "manual" ? "manual" : "auto"),
  );
}

export async function setAssignMode(mode: ClassAssignMode): Promise<void> {
  await setDoc(ASSIGN_DOC, { mode }, { merge: true });
}
