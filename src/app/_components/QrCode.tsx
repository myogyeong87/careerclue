"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({
  url,
  size = "md",
}: {
  url: string;
  size?: "md" | "sm";
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const box = size === "sm" ? "h-40 w-40" : "h-72 w-72";

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
    <div className="flex flex-col items-center gap-2">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="학생 접속 QR 코드" className={box} />
      ) : (
        <div
          className={`flex items-center justify-center text-sm text-[var(--foreground)]/50 ${box}`}
        >
          QR 코드 생성 중...
        </div>
      )}
      <p
        className={`truncate text-center text-xs text-[var(--foreground)]/70 ${
          size === "sm" ? "max-w-32" : "max-w-56"
        }`}
        title={url}
      >
        {url}
      </p>
    </div>
  );
}
