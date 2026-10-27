"use client";

import { kickStudent, type LobbyStudent } from "@/lib/lobby";
import { useLobbyCapacity } from "@/lib/lobbyCapacity";
import { DEFAULT_TEACHER_FONT_SIZE } from "@/lib/teacherFontSize";
import CaseFileCard from "@/app/_components/CaseFileCard";

const CHIP_GAP_PX = 12;
/** 이름표가 아무리 작아져도 교실에서 읽을 수 있는 최소 글자 크기 */
const MIN_CHIP_FONT_PX = 16;

/** 학생 수가 많아질수록 이름표를 조금씩 줄여 한 칸 안에 모두 들어오게 함 */
function chipScale(count: number): number {
  if (count <= 10) return 1;
  if (count <= 20) return 0.9;
  if (count <= 30) return 0.8;
  return 0.7;
}

export default function LobbyBoard({ students }: { students: LobbyStudent[] }) {
  const capacity = useLobbyCapacity()[0];
  const sorted = [...students].sort((a, b) =>
    a.studentId.localeCompare(b.studentId, undefined, { numeric: true }),
  );
  const perRow = sorted.length > 20 ? 6 : 5;
  const scale = chipScale(sorted.length);
  const chipFont = `max(${MIN_CHIP_FONT_PX}px, calc(var(--tfs, ${DEFAULT_TEACHER_FONT_SIZE}px) * ${scale}))`;
  const chipWidth = `calc((100% - ${(perRow - 1) * CHIP_GAP_PX}px) / ${perRow})`;

  return (
    <CaseFileCard className="flex flex-col items-center gap-8 text-center">
      <h3 className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xl font-semibold">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/detective-story.png" alt="" className="h-8 w-8" />
          학생 대기 현황
        </span>
        <span
          className={`rounded-full px-4 py-1 font-[family-name:var(--font-accent)] text-2xl ${
            sorted.length > capacity
              ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
              : "bg-[var(--color-secondary)]/20 text-[var(--foreground)]"
          }`}
        >
          입장 {sorted.length} / {capacity}
        </span>
      </h3>

      {sorted.length === 0 ? (
        <p className="text-xl text-[var(--color-muted)]">
          아직 접속한 학생이 없어요. QR로 접속을 안내해주세요.
        </p>
      ) : (
        <ul className="flex w-full flex-wrap justify-center" style={{ gap: CHIP_GAP_PX }}>
          {sorted.map((s) => (
            <li
              key={s.studentId}
              className="group relative flex items-center justify-center rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] px-2 py-[0.35em]"
              style={{ width: chipWidth, fontSize: chipFont }}
              title={`${s.studentId} ${s.name}`}
            >
              {/* 말줄임 없이 학번은 윗줄(작게), 이름은 아랫줄. 이름이 길면 줄바꿈 */}
              <span className="flex min-w-0 flex-col items-center leading-tight">
                <span className="text-[0.7em] text-[var(--color-muted)]">{s.studentId}</span>
                <span className="break-keep font-semibold [overflow-wrap:anywhere]">{s.name}</span>
              </span>
              <button
                type="button"
                onClick={() => kickStudent(s.studentId)}
                title="퇴장시키기"
                aria-label={`${s.name} 퇴장시키기`}
                className="absolute -right-2 -top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-[var(--color-danger)] text-sm font-bold text-[var(--foreground)] shadow group-hover:flex group-focus-within:flex"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </CaseFileCard>
  );
}
