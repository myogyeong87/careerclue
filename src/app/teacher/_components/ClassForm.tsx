"use client";

import { useState } from "react";
import { classInfoErrorMessage, type ClassInfoError } from "@/lib/classes";
import { inferPrefixFromName } from "@/lib/classRules";

/** 반 이름 + 학번 접두사 입력. 접두사는 이름의 숫자에서 추정해 채우되, 직접 고치면 그 값을 유지 */
export default function ClassForm({
  initialName = "",
  initialPrefix = "",
  prefixRequired,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialPrefix?: string;
  prefixRequired: boolean;
  submitLabel: string;
  onSubmit: (name: string, prefix: string) => Promise<ClassInfoError | null>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [prefix, setPrefix] = useState(initialPrefix);
  const [prefixTouched, setPrefixTouched] = useState(initialPrefix !== "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(name.trim(), prefix.trim());
      if (result) setError(classInfoErrorMessage(result));
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-base font-semibold">
        반 이름
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!prefixTouched) setPrefix(inferPrefixFromName(e.target.value));
          }}
          placeholder="1학년 1반"
          className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-lg font-normal outline-none focus:border-[var(--color-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-base font-semibold">
        학번 접두사 {prefixRequired ? "" : "(선택)"}
        <input
          value={prefix}
          inputMode="numeric"
          maxLength={2}
          onChange={(e) => {
            setPrefix(e.target.value.replace(/\D/g, ""));
            setPrefixTouched(true);
          }}
          placeholder="11"
          className="w-28 rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-lg font-normal outline-none focus:border-[var(--color-primary)]"
        />
        <span className="text-sm font-normal text-[var(--color-muted)]">
          학번 앞 두 자리(학년+반)예요. 1학년 1반이면 11 → 학번 1101~1199인 학생이 이 반으로 들어와요.
        </span>
      </label>
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-2 font-semibold"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-card)] bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] disabled:opacity-50"
        >
          {busy ? "저장 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
