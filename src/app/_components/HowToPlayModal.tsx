"use client";

import Modal from "./Modal";
import HowToPlay from "./HowToPlay";
import { tfs } from "@/lib/teacherFontSize";

export default function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      onClose={onClose}
      className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-[0.75em] overflow-y-auto"
      style={{ fontSize: tfs() }}
    >
      <h2 className="font-[family-name:var(--font-heading)] text-[1.5em] font-semibold text-[var(--color-primary-ink)]">
        🕵️ 커리어탐정 게임 방법
      </h2>
      <HowToPlay scaled />
      <button
        type="button"
        onClick={onClose}
        className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-[0.4em] font-semibold text-[var(--color-on-primary)]"
      >
        확인했어요
      </button>
    </Modal>
  );
}
