import {
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { classSubcol } from "./classes";
import { lobbyCol } from "./lobby";
import { renameStudentSubmissions, submissionsCol } from "./submissions";
import { assertQueryEmpty, deleteQueryFully, DeleteVerifyError } from "./firestoreDelete";
import type { RegisteredStudent } from "./types";

/** 반에 등록된 학생 명단. 점수·제출은 학번 기준이라 등록을 해제해도 기록은 남음 */
function studentsCol(classId: string) {
  return classSubcol(classId, "students");
}

function studentRef(classId: string, studentId: string) {
  return doc(studentsCol(classId), studentId);
}

/**
 * 학생 입장 시 등록. 같은 학번이면 이름이 달라도 그대로 입장하고(기존 규칙),
 * 이름이 바뀌었으면 이미 낸 제출의 이름도 새 이름으로 맞춤
 */
export async function registerStudent(
  classId: string,
  studentId: string,
  name: string,
): Promise<void> {
  const ref = studentRef(classId, studentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { name, registeredAt: serverTimestamp() });
  } else if (snap.data().name !== name) {
    await setDoc(ref, { name }, { merge: true });
  }
  await renameStudentSubmissions(classId, studentId, name);
}

export function subscribeStudents(
  classId: string,
  onChange: (students: RegisteredStudent[]) => void,
) {
  return onSnapshot(studentsCol(classId), (snap) =>
    onChange(
      snap.docs
        .map((d) => ({ studentId: d.id, name: (d.data().name as string) ?? "" }))
        .sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true })),
    ),
  );
}

/** 학생 기기: 내 등록이 살아 있는지 + 선생님이 고친 이름. 등록이 지워지면 null */
export function subscribeMyRegistration(
  classId: string,
  studentId: string,
  onChange: (name: string | null) => void,
) {
  return onSnapshot(studentRef(classId, studentId), (snap) =>
    onChange(snap.exists() ? ((snap.data().name as string) ?? "") : null),
  );
}

/** 이름 수정: 학번은 그대로, 등록·대기실·이미 저장된 제출의 이름을 함께 갱신 (점수·기록 유지) */
export async function renameStudent(
  classId: string,
  studentId: string,
  name: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(studentRef(classId, studentId), { name }, { merge: true });
  const lobbyRef = doc(lobbyCol(classId), studentId);
  if ((await getDoc(lobbyRef)).exists()) batch.update(lobbyRef, { name });
  await batch.commit();
  await renameStudentSubmissions(classId, studentId, name);
}

/** 등록 해제: 학번·이름 등록과 접속만 지움. 점수·제출은 남아서 같은 학번으로 다시 들어오면 이어짐 */
export async function unregisterStudent(classId: string, studentId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(studentRef(classId, studentId));
  batch.delete(doc(lobbyCol(classId), studentId));
  await batch.commit();
}

/** 기록까지 삭제: 등록·접속·실제 제출·연습 제출을 모두 지우고 실제로 비었는지 확인 */
export async function deleteStudentRecords(classId: string, studentId: string): Promise<void> {
  await unregisterStudent(classId, studentId);
  const queries = (["game", "practice"] as const).map((kind) =>
    query(submissionsCol(classId, kind), where("studentId", "==", studentId)),
  );
  for (const q of queries) await deleteQueryFully(q);
  for (const q of queries) await assertQueryEmpty(q, "학생의 제출 기록");
  if ((await getDoc(studentRef(classId, studentId))).exists()) {
    throw new DeleteVerifyError("학생 등록");
  }
}
