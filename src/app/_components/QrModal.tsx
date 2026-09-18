"use client";

import Modal from "./Modal";
import QrCode from "./QrCode";

export default function QrModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} className="flex flex-col items-center gap-4">
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold">
        학생 접속 QR
      </h2>
      <QrCode url={url} />
      <button
        type="button"
        onClick={onClose}
        className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white"
      >
        닫기
      </button>
    </Modal>
  );
}
