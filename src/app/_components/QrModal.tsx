"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 480, margin: 1 }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold">
          학생 접속 QR
        </h2>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="학생 접속 QR 코드" className="h-72 w-72" />
        ) : (
          <div className="flex h-72 w-72 items-center justify-center text-sm text-[var(--foreground)]/50">
            QR 코드 생성 중...
          </div>
        )}
        <p className="max-w-64 break-all text-center text-xs text-[var(--foreground)]/70">
          {url}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
