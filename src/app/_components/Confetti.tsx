"use client";

import { useState } from "react";

const COLORS = ["#F2A93B", "#6CC3E8", "#E8694F", "#4CB782", "#F7CF6A", "#FFFFFF"];

interface Piece {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotate: number;
  drift: number;
  round: boolean;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.8,
    duration: 2.6 + Math.random() * 2.2,
    size: 8 + Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 30,
    round: Math.random() < 0.3,
  }));
}

/** 화면 위에서 색종이가 쏟아지는 효과 (외부 라이브러리 없이 CSS 애니메이션) */
export default function Confetti({ count = 160 }: { count?: number }) {
  const [pieces] = useState(() => makePieces(count));

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-6 block motion-safe:animate-[confettiFall_linear_infinite]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              backgroundColor: p.color,
              borderRadius: p.round ? "9999px" : "2px",
              boxShadow: p.color === "#FFFFFF" ? "0 0 0 1px #F0E0B9" : undefined,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--rot": `${p.rotate}deg`,
              "--drift": `${p.drift}vw`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
