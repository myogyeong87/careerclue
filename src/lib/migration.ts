import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  writeBatch,
  deleteDoc,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import { classRef, classSubcol, findClassesByPrefix } from "./classes";
import { chunk, DELETE_BATCH_SIZE, mostCommonPrefix } from "./classRules";
import { gameStateFromData } from "./game";
import { assertQueryEmpty, deleteQueryFully, DeleteVerifyError } from "./firestoreDelete";
import type { Job } from "./types";

/**
 * 반 구조 이전 (games/current 한 곳 → classes/{classId}).
 * 옛 위치: games/current(게임 상태), games/current/submissions(제출), games/current/lobby(접속),
 *          roster(예전 학생 등록), games/practice/submissions(연습, 옮기지 않음)
 * 새 위치: classes/default(기본 반) 아래 같은 문서 ID로 복사. 옛 데이터는 교사가 확인 후 직접 지움
 */
const MIGRATION_DOC = doc(db, "config", "classMigration");
export const LEGACY_CLASS_ID = "default";
export const LEGACY_CLASS_NAME = "기본 반";
/** 이전된 옛 게임의 runId. 오답노트·특별상에서 이전된 제출을 "이번 게임"으로 묶기 위함 */
const LEGACY_RUN_ID = "legacy";

const LEGACY_GAME = doc(db, "games", "current");
const LEGACY_PRACTICE = doc(db, "games", "practice");
const legacySubmissions = () => collection(db, "games", "current", "submissions");
const legacyLobby = () => collection(db, "games", "current", "lobby");
const legacyPracticeSubmissions = () => collection(db, "games", "practice", "submissions");
const legacyRoster = () => collection(db, "roster");

export type MigrationResult =
  | { status: "already" }
  | { status: "nothing" }
  | { status: "migrated"; submissions: number; students: number };

async function writeAll(writes: { ref: DocumentReference; data: Record<string, unknown> }[]) {
  for (const part of chunk(writes, DELETE_BATCH_SIZE)) {
    const batch = writeBatch(db);
    part.forEach((w) => batch.set(w.ref, w.data, { merge: true }));
    await batch.commit();
  }
}

/** 교사 화면을 열 때 한 번 실행. 같은 문서 ID로 덮어쓰므로 두 번 실행돼도 중복되지 않음 */
export async function migrateLegacyDataIfNeeded(): Promise<MigrationResult> {
  if ((await getDoc(MIGRATION_DOC)).exists()) return { status: "already" };

  const [gameSnap, subsSnap, lobbySnap, rosterSnap] = await Promise.all([
    getDoc(LEGACY_GAME),
    getDocs(legacySubmissions()),
    getDocs(legacyLobby()),
    getDocs(legacyRoster()),
  ]);

  if (!gameSnap.exists() && subsSnap.empty && lobbySnap.empty && rosterSnap.empty) {
    await setDoc(MIGRATION_DOC, { doneAt: Date.now(), migrated: false });
    return { status: "nothing" };
  }

  const legacyGame = gameSnap.exists() ? gameStateFromData(gameSnap.data()) : null;
  const jobs: Job[] = legacyGame?.jobs ?? [];

  // 학생 명단: 예전 roster → 제출에 남은 이름 → 마지막 접속 이름 순으로 덮어써 가장 최근 이름을 사용
  const names = new Map<string, string>();
  rosterSnap.docs.forEach((d) => names.set(d.id, (d.data().name as string) ?? ""));
  subsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.studentId) names.set(data.studentId as string, (data.studentName as string) ?? "");
  });
  lobbySnap.docs.forEach((d) => names.set(d.id, (d.data().name as string) ?? ""));

  const classSnap = await getDoc(classRef(LEGACY_CLASS_ID));
  if (!classSnap.exists()) {
    const guessed = mostCommonPrefix([...names.keys()]);
    const taken = guessed ? (await findClassesByPrefix(guessed)).length > 0 : true;
    await setDoc(classRef(LEGACY_CLASS_ID), {
      ...(legacyGame ?? gameStateFromData({})),
      runId: LEGACY_RUN_ID,
      // 연습 상태는 임시라 옮기지 않음
      practice: null,
      name: LEGACY_CLASS_NAME,
      prefix: taken ? "" : guessed,
      createdAt: Date.now(),
      migratedFrom: "games/current",
    });
  }

  await writeAll(
    subsSnap.docs.map((d) => {
      const data = d.data();
      return {
        ref: doc(classSubcol(LEGACY_CLASS_ID, "submissions"), d.id),
        data: {
          ...data,
          runId: (data.runId as string) ?? LEGACY_RUN_ID,
          jobTitle: (data.jobTitle as string) ?? jobs[data.jobIndex as number]?.title ?? "",
        },
      };
    }),
  );

  await writeAll(
    [...names].map(([studentId, name]) => ({
      ref: doc(classSubcol(LEGACY_CLASS_ID, "students"), studentId),
      data: { name, registeredAt: serverTimestamp() },
    })),
  );

  await setDoc(MIGRATION_DOC, {
    doneAt: Date.now(),
    migrated: true,
    classId: LEGACY_CLASS_ID,
    submissions: subsSnap.size,
    students: names.size,
  });
  return { status: "migrated", submissions: subsSnap.size, students: names.size };
}

export interface LegacySummary {
  migrated: boolean;
  gameDoc: boolean;
  submissions: number;
  lobby: number;
  roster: number;
  practiceSubmissions: number;
}

export function hasLegacyData(s: LegacySummary): boolean {
  return s.gameDoc || s.submissions + s.lobby + s.roster + s.practiceSubmissions > 0;
}

/** 옛 위치에 남은 데이터 개수 (설정의 "옛 데이터 정리"에서 확인용) */
export async function getLegacySummary(): Promise<LegacySummary> {
  const [migration, game, practice, subs, lobby, roster, practiceSubs] = await Promise.all([
    getDoc(MIGRATION_DOC),
    getDoc(LEGACY_GAME),
    getDoc(LEGACY_PRACTICE),
    getDocs(legacySubmissions()),
    getDocs(legacyLobby()),
    getDocs(legacyRoster()),
    getDocs(legacyPracticeSubmissions()),
  ]);
  return {
    migrated: migration.exists() && migration.data().migrated === true,
    gameDoc: game.exists() || practice.exists(),
    submissions: subs.size,
    lobby: lobby.size,
    roster: roster.size,
    practiceSubmissions: practiceSubs.size,
  };
}

/** 옛 위치 데이터 삭제 (교사가 기본 반 이전을 확인한 뒤 직접 실행). 하위 컬렉션까지 지우고 비었는지 확인 */
export async function deleteLegacyData(): Promise<void> {
  const cols = [legacySubmissions(), legacyLobby(), legacyPracticeSubmissions(), legacyRoster()];
  for (const col of cols) await deleteQueryFully(col);
  for (const col of cols) await assertQueryEmpty(col, "옛 위치의 기록");
  await deleteDoc(LEGACY_GAME);
  await deleteDoc(LEGACY_PRACTICE);
  const [game, practice] = await Promise.all([
    getDocFromServer(LEGACY_GAME),
    getDocFromServer(LEGACY_PRACTICE),
  ]);
  if (game.exists() || practice.exists()) throw new DeleteVerifyError("옛 게임 문서");
}
