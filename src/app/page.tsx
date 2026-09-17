"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_KEY = "jikeop-quiz:role";

export default function RoleSelectPage() {
  const router = useRouter();
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    const savedRole = window.localStorage.getItem(ROLE_KEY);
    if (savedRole === "teacher" || savedRole === "student") {
      router.replace(`/${savedRole}`);
      return;
    }
    setCheckedStorage(true);
  }, [router]);

  const selectRole = (role: "teacher" | "student") => {
    window.localStorage.setItem(ROLE_KEY, role);
    router.push(`/${role}`);
  };

  if (!checkedStorage) {
    return null;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div>
        <h1 className="text-3xl">잡셜록</h1>
        <p className="mt-2 text-sm text-[var(--foreground)]/70">
          단서를 모아 직업을 추리하는 진로 수업 퀴즈
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-4">
        <button
          type="button"
          onClick={() => selectRole("teacher")}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-4 text-lg font-semibold text-white shadow-[var(--shadow-card)] transition hover:opacity-90"
        >
          교사로 시작
        </button>
        <button
          type="button"
          onClick={() => selectRole("student")}
          className="rounded-[var(--radius-card)] bg-[var(--color-surface)] px-6 py-4 text-lg font-semibold text-[var(--color-foreground)] shadow-[var(--shadow-card)] transition hover:opacity-90"
        >
          학생으로 참여
        </button>
      </div>
    </main>
  );
}
