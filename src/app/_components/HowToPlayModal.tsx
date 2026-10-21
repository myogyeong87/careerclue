"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { HOW_TO_STEPS } from "./HowToPlay";
import { tfs } from "@/lib/teacherFontSize";

/** 교사 화면용 게임 방법: 한 화면에 규칙 하나씩, 이전/다음 + 진행 점. 마지막 장에서 연습 라운드로 이어짐 */
export default function HowToPlayModal({
  onClose,
  onPractice,
}: {
  onClose: () => void;
  onPractice?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const total = HOW_TO_STEPS.length;
  const step = HOW_TO_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  const navBtn =
    "rounded-[var(--radius-card)] px-[1.2em] py-[0.5em] font-semibold disabled:invisible";

  return (
    <Modal
      onClose={onClose}
      className="relative flex h-[88vh] w-[92vw] max-w-[1600px] flex-col"
      style={{ fontSize: tfs(1.25) }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-heading)] text-[1.1em] font-semibold text-[var(--color-primary-ink)]">
          🕵️ 커리어탐정 게임 방법
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded-full px-[0.5em] text-[1.2em] text-[var(--color-muted)] hover:bg-[var(--color-soft)]"
        >
          ✕
        </button>
      </div>

      <div
        key={index}
        className="flex flex-1 flex-col items-center justify-center gap-[0.6em] px-[1em] text-center motion-safe:animate-[slideIn_0.35s_ease-out]"
      >
        <span className="text-[3.5em] leading-none">{step.icon}</span>
        <p className="text-[0.8em] font-semibold text-[var(--color-muted)]">
          규칙 {index + 1}
        </p>
        <p className="font-[family-name:var(--font-heading)] text-[2em] font-bold leading-tight">
          {step.title}
        </p>
        <p className="max-w-[28em] text-[1.25em] leading-relaxed text-[var(--foreground)]">
          {step.desc}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => setIndex((i) => i - 1)}
          className={`${navBtn} border-2 border-[var(--color-border)] bg-white`}
        >
          ◀ 이전
        </button>

        <div className="flex items-center gap-[0.5em]" aria-label={`${index + 1} / ${total}`}>
          {HOW_TO_STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`규칙 ${i + 1}`}
              className={`h-[0.6em] rounded-full transition-all ${
                i === index
                  ? "w-[1.8em] bg-[var(--color-primary)]"
                  : "w-[0.6em] bg-[var(--color-border)]"
              }`}
            />
          ))}
        </div>

        {isLast ? (
          onPractice ? (
            <button
              type="button"
              onClick={onPractice}
              className={`${navBtn} bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-card)]`}
            >
              연습해 보기 ▶
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`${navBtn} bg-[var(--color-primary)] text-[var(--color-on-primary)]`}
            >
              확인했어요
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className={`${navBtn} bg-[var(--color-primary)] text-[var(--color-on-primary)]`}
          >
            다음 ▶
          </button>
        )}
      </div>
    </Modal>
  );
}
