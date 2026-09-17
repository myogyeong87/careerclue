import { doc, getDoc, setDoc } from "firebase/firestore";
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
