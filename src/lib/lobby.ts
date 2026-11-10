import {
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { classSubcol } from "./classes";
import { deleteQueryFully } from "./firestoreDelete";

/** 지금 접속해 있는 학생 (반별). 학생 명단(등록)은 students.ts */
export function lobbyCol(classId: string) {
  return classSubcol(classId, "lobby");
}

export interface LobbyStudent {
  studentId: string;
  name: string;
  joinedAt: number;
}

/** 학생이 대기실/게임에 접속했음을 알림 (재접속 시 upsert) */
export async function joinLobby(classId: string, studentId: string, name: string): Promise<void> {
  await setDoc(doc(lobbyCol(classId), studentId), {
    name,
    joinedAt: serverTimestamp(),
  });
}

/** 교사가 잘못 접속한 학생을 퇴장시킴 */
export async function kickStudent(classId: string, studentId: string): Promise<void> {
  await deleteDoc(doc(lobbyCol(classId), studentId));
}

export function subscribeLobby(
  classId: string,
  onChange: (students: LobbyStudent[]) => void,
): () => void {
  const q = query(lobbyCol(classId), orderBy("joinedAt", "asc"));
  return onSnapshot(q, (snap) =>
    onChange(
      snap.docs.map((d) => {
        const data = d.data();
        const joinedAt = data.joinedAt as Timestamp | undefined;
        return {
          studentId: d.id,
          name: (data.name as string) ?? "",
          joinedAt: joinedAt ? joinedAt.toMillis() : 0,
        };
      }),
    ),
  );
}

/** 특정 학생이 대기실에서 퇴장당했는지(문서가 사라졌는지) 구독 */
export function subscribeLobbyPresence(
  classId: string,
  studentId: string,
  onChange: (present: boolean) => void,
): () => void {
  return onSnapshot(doc(lobbyCol(classId), studentId), (snap) => onChange(snap.exists()));
}

export async function clearLobby(classId: string): Promise<void> {
  await deleteQueryFully(lobbyCol(classId));
}
