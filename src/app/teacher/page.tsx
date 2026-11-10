"use client";

import { useEffect, useState } from "react";
import { endGameNow, resetToLobby, resumeGame, subscribeGameState } from "@/lib/game";
import { subscribeAssignMode, subscribeClasses } from "@/lib/classes";
import { ClassIdProvider, useClassId } from "@/lib/classContext";
import { useCountdownAutoStart } from "@/lib/useCountdownAutoStart";
import { useStoredString } from "@/lib/useStoredString";
import {
  EMPTY_GAME_STATE,
  type ClassAssignMode,
  type ClassInfo,
  type GameState,
} from "@/lib/types";
import QrModal from "@/app/_components/QrModal";
import GameFlowView from "./_components/GameFlowView";
import ResultsTab from "./_components/ResultsTab";
import SettingsPanel from "./_components/SettingsPanel";
import FontSizeControls from "./_components/FontSizeControls";
import PinGate from "./_components/PinGate";
import ClassBar from "./_components/ClassBar";
import { useTeacherFontSize } from "@/lib/teacherFontSize";

/** 이 기기에서 마지막으로 고른 반 */
const SELECTED_CLASS_KEY = "careerclue:selectedClassId";

export default function TeacherPage() {
  return (
    <PinGate>
      <TeacherHome />
    </PinGate>
  );
}

function TeacherHome() {
  const [classes, setClasses] = useState<ClassInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<ClassAssignMode>("auto");
  const [storedClassId, setStoredClassId] = useStoredString(SELECTED_CLASS_KEY);
  const [showSettings, setShowSettings] = useState(false);
  const { size: fontSize } = useTeacherFontSize();

  useEffect(() => subscribeClasses(setClasses, (err) => setLoadError(err.message)), []);
  useEffect(() => subscribeAssignMode(setAssignMode), []);

  // 기억한 반이 없거나 지워졌으면 첫 번째 반
  const selected = classes?.find((c) => c.id === storedClassId) ?? classes?.[0] ?? null;

  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 ${
        showSettings ? "max-w-5xl" : "max-w-none px-8"
      }`}
      style={{ "--tfs": `${fontSize}px` } as React.CSSProperties}
    >
      {classes === null ? (
        <p className="text-xl text-[var(--color-muted)]">
          {loadError ? `반 목록을 불러오지 못했어요: ${loadError}` : "반 목록을 불러오는 중..."}
        </p>
      ) : (
        <>
          <ClassBar
            classes={classes}
            selected={selected}
            prefixRequired={assignMode === "auto"}
            onSelect={setStoredClassId}
          />
          {selected ? (
            <ClassIdProvider key={selected.id} classId={selected.id}>
              <ClassScreen
                classInfo={selected}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                assignMode={assignMode}
              />
            </ClassIdProvider>
          ) : showSettings ? (
            <SettingsPanel
              classInfo={null}
              assignMode={assignMode}
              onClose={() => setShowSettings(false)}
            />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-xl">
                위의 <b>＋ 새 반 만들기</b>로 수업할 반을 먼저 만들어주세요.
              </p>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="text-sm text-[var(--color-muted)] underline"
              >
                ⚙ 설정
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** 선택한 반의 게임 화면 (반을 바꾸면 key가 바뀌어 구독이 새로 연결됨) */
function ClassScreen({
  classInfo,
  showSettings,
  setShowSettings,
  assignMode,
}: {
  classInfo: ClassInfo;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  assignMode: ClassAssignMode;
}) {
  const classId = useClassId();
  const [game, setGame] = useState<GameState>(EMPTY_GAME_STATE);
  const [showQr, setShowQr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeGameState(classId, setGame), [classId]);
  useCountdownAutoStart(classId, game);

  const hasStarted = game.currentIndex > -1;
  const finished = game.phase === "finished";

  const heading = showSettings ? "설정" : finished ? "게임 종료" : "커리어탐정";

  const handleEnd = async () => {
    if (busy) return;
    if (
      !window.confirm(
        "게임을 종료하고 채점 결과 화면으로 이동할까요? 진행 상태는 그대로 남아서 다시 게임 화면으로 돌아올 수 있어요.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await endGameNow(classId, game);
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resumeGame(classId, game);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    if (
      !window.confirm(
        "대기실로 초기화할까요? 이번 게임의 제출 기록과 대기 학생 목록이 사라져요. (이전 게임까지의 누적 점수와 학생 명단은 남아요)",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await resetToLobby(classId, game);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{heading}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <FontSizeControls />
          {!showSettings && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-base font-semibold text-[var(--color-muted)] transition hover:text-[var(--foreground)]"
            >
              📱 학생 접속 QR
            </button>
          )}
          {!showSettings && hasStarted && !finished && (
            <button
              type="button"
              disabled={busy}
              onClick={handleEnd}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-base font-semibold text-[var(--color-danger)] transition hover:opacity-80 disabled:opacity-50"
            >
              ■ 게임 종료
            </button>
          )}
          {!showSettings && finished && (
            <button
              type="button"
              disabled={busy}
              onClick={handleResume}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-base font-semibold text-[var(--color-primary-ink)] transition hover:opacity-80 disabled:opacity-50"
            >
              🔙 게임 화면으로
            </button>
          )}
          {!showSettings && hasStarted && (
            <button
              type="button"
              disabled={busy}
              onClick={handleReset}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-base font-semibold text-[var(--color-muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              🔄 초기화
            </button>
          )}
          {!showSettings && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="text-sm text-[var(--foreground)]/40 transition hover:text-[var(--color-muted)]"
            >
              ⚙ 설정
            </button>
          )}
        </div>
      </div>

      {showSettings ? (
        <SettingsPanel
          classInfo={classInfo}
          assignMode={assignMode}
          onClose={() => setShowSettings(false)}
        />
      ) : finished ? (
        <ResultsTab />
      ) : (
        <GameFlowView onOpenSettings={() => setShowSettings(true)} />
      )}

      {showQr && (
        <QrModal
          url={`${window.location.origin}/student`}
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  );
}
