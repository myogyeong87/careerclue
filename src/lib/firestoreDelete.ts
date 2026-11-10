import { getDocs, getDocsFromServer, limit, query, writeBatch, type Query } from "firebase/firestore";
import { db } from "./firebase";
import { DELETE_BATCH_SIZE } from "./classRules";

/** 삭제 후에도 문서가 남아 있으면 던지는 오류. 화면에서 "다시 시도" 안내에 사용 */
export class DeleteVerifyError extends Error {
  constructor(what: string) {
    super(`${what}이(가) 다 지워지지 않았어요. 다시 시도해주세요.`);
    this.name = "DeleteVerifyError";
  }
}

/**
 * 쿼리에 걸리는 문서를 모두 삭제. batch 한도(500건)를 넘지 않게 450건씩 나눠 지우고,
 * 그사이 새로 생긴 문서도 지우도록 빈 결과가 나올 때까지 반복. 반환값은 지운 문서 수
 */
export async function deleteQueryFully(q: Query): Promise<number> {
  let deleted = 0;
  // 무한 반복 방지: 학급 규모에서 현실적으로 닿지 않는 상한
  for (let round = 0; round < 1000; round++) {
    const snap = await getDocs(query(q, limit(DELETE_BATCH_SIZE)));
    if (snap.empty) return deleted;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

/** 쿼리 결과가 실제로 비었는지 서버에서 다시 확인 (삭제 검증용) */
export async function assertQueryEmpty(q: Query, what: string): Promise<void> {
  const snap = await getDocsFromServer(query(q, limit(1)));
  if (!snap.empty) throw new DeleteVerifyError(what);
}
