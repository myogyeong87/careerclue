import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function lobbyCol() {
  return collection(db, "games", "current", "lobby");
}

export interface LobbyStudent {
  studentId: string;
  name: string;
  joinedAt: number;
}

/** 학생이 대기실/게임에 접속했음을 알림 (재접속 시 upsert) */
export async function joinLobby(studentId: string, name: string): Promise<void> {
  await setDoc(doc(lobbyCol(), studentId), {
    name,
    joinedAt: serverTimestamp(),
  });
}

/** 교사가 잘못 접속한 학생을 퇴장시킴 */
export async function kickStudent(studentId: string): Promise<void> {
  await deleteDoc(doc(lobbyCol(), studentId));
}

export function subscribeLobby(
  onChange: (students: LobbyStudent[]) => void,
): () => void {
  const q = query(lobbyCol(), orderBy("joinedAt", "asc"));
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
  studentId: string,
  onChange: (present: boolean) => void,
): () => void {
  return onSnapshot(doc(lobbyCol(), studentId), (snap) => onChange(snap.exists()));
}

export async function clearLobby(): Promise<void> {
  const snap = await getDocs(lobbyCol());
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
