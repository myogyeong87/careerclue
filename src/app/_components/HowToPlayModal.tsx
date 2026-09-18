"use client";

import Modal from "./Modal";
import HowToPlay from "./HowToPlay";

export default function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      onClose={onClose}
      className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto"
    >
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--color-primary)]">
        🕵️ 커리어탐정 게임 방법
      </h2>
      <HowToPlay />
      <button
        type="button"
        onClick={onClose}
        className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white"
      >
        확인했어요
      </button>
    </Modal>
  );
}
