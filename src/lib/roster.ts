import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export type RosterCheckResult =
  | { status: "registered"; studentId: string; name: string }
  | { status: "matched"; studentId: string; name: string }
  | { status: "mismatch"; studentId: string; existingName: string };

/** roster에 없으면 신규 등록, 있으면 이름 대조 (스펙 4.3 / 9장) */
export async function checkOrRegisterStudent(
  studentId: string,
  name: string,
): Promise<RosterCheckResult> {
  const ref = doc(db, "roster", studentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { name });
    return { status: "registered", studentId, name };
  }

  const existingName = snap.data().name as string;
  if (existingName === name) {
    return { status: "matched", studentId, name };
  }
  return { status: "mismatch", studentId, existingName };
}

/** 등록된 학번-이름 매핑을 모두 삭제. 이후 모든 학번을 다시 새 이름으로 등록할 수 있게 됨 */
export async function clearRoster(): Promise<void> {
  const snap = await getDocs(collection(db, "roster"));
  if (snap.empty) return;
  const chunks: (typeof snap.docs)[] = [];
  for (let i = 0; i < snap.docs.length; i += 400) {
    chunks.push(snap.docs.slice(i, i + 400));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
