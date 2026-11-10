"use client";

import { createContext, useContext } from "react";

const ClassIdContext = createContext<string | null>(null);

/** 지금 화면이 다루는 반. 교사 화면은 선택한 반, 학생 화면은 입장한 반 */
export function ClassIdProvider({
  classId,
  children,
}: {
  classId: string;
  children: React.ReactNode;
}) {
  return <ClassIdContext.Provider value={classId}>{children}</ClassIdContext.Provider>;
}

export function useClassId(): string {
  const classId = useContext(ClassIdContext);
  if (!classId) throw new Error("ClassIdProvider 안에서만 쓸 수 있어요.");
  return classId;
}
