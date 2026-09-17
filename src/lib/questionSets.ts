import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_SCORING, type Job, type QuestionSet } from "./types";

const COLLECTION = "question_sets";

function fromDoc(snap: QueryDocumentSnapshot<DocumentData>): QuestionSet {
  const data = snap.data();
  const updatedAt = data.updatedAt as Timestamp | undefined;
  return {
    id: snap.id,
    name: data.name ?? "이름 없는 세트",
    updatedAt: updatedAt ? updatedAt.toMillis() : 0,
    jobs: (data.jobs ?? []) as Job[],
    scoring: (data.scoring ?? DEFAULT_SCORING) as number[],
  };
}

export function subscribeQuestionSets(
  onChange: (sets: QuestionSet[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(collection(db, COLLECTION), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(fromDoc)),
    (err) => onError?.(err),
  );
}

export async function fetchQuestionSets(): Promise<QuestionSet[]> {
  const q = query(collection(db, COLLECTION), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(fromDoc);
}

export interface QuestionSetInput {
  name: string;
  jobs: Job[];
  scoring: number[];
}

export async function createQuestionSet(input: QuestionSetInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    name: input.name,
    jobs: input.jobs,
    scoring: input.scoring,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateQuestionSet(
  id: string,
  input: Partial<QuestionSetInput>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuestionSet(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function duplicateQuestionSet(set: QuestionSet): Promise<string> {
  return createQuestionSet({
    name: `${set.name} (복사본)`,
    jobs: set.jobs,
    scoring: set.scoring,
  });
}

export function questionSetToExportJson(set: QuestionSet): string {
  return JSON.stringify(
    { name: set.name, scoring: set.scoring, jobs: set.jobs },
    null,
    2,
  );
}

export interface ParsedQuestionSetJson {
  name: string;
  scoring: number[];
  jobs: Job[];
}

/** 부록 JSON 형식({ name, scoring, jobs }) 파싱 + 검증. 실패 시 에러 메시지 목록 반환. */
export function parseQuestionSetJson(
  raw: string,
): { ok: true; data: ParsedQuestionSetJson } | { ok: false; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["JSON 형식이 올바르지 않아요."] };
  }

  const errors: string[] = [];
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["최상위는 객체({ })여야 해요."] };
  }
  const obj = parsed as Record<string, unknown>;

  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name : null;
  if (!name) errors.push("name(문자열)이 필요해요.");

  const scoring = Array.isArray(obj.scoring) && obj.scoring.every((n) => typeof n === "number")
    ? (obj.scoring as number[])
    : null;
  if (!scoring || scoring.length !== 5) errors.push("scoring은 숫자 5개 배열이어야 해요.");

  const jobsRaw = Array.isArray(obj.jobs) ? obj.jobs : null;
  if (!jobsRaw || jobsRaw.length === 0) {
    errors.push("jobs는 최소 1개 이상의 배열이어야 해요.");
  } else {
    jobsRaw.forEach((job, i) => {
      if (typeof job !== "object" || job === null) {
        errors.push(`jobs[${i}]는 객체여야 해요.`);
        return;
      }
      const j = job as Record<string, unknown>;
      if (typeof j.title !== "string" || !j.title.trim()) {
        errors.push(`jobs[${i}].title이 필요해요.`);
      }
      if (!Array.isArray(j.accepted) || !j.accepted.every((a) => typeof a === "string")) {
        errors.push(`jobs[${i}].accepted는 문자열 배열이어야 해요.`);
      }
      if (!Array.isArray(j.hints) || j.hints.length !== 5 || !j.hints.every((h) => typeof h === "string")) {
        errors.push(`jobs[${i}].hints는 문자열 5개 배열이어야 해요.`);
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: name!,
      scoring: scoring!,
      jobs: jobsRaw as Job[],
    },
  };
}
