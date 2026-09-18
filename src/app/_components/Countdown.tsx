"use client";

import { useEffect, useState } from "react";

export default function Countdown({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <p className="font-[family-name:var(--font-accent)] text-7xl text-[var(--color-primary)]">
      {remaining > 0 ? remaining : "시작!"}
    </p>
  );
}
