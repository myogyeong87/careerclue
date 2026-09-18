function normalize(s: string): string {
  return s.trim().replace(/\s+/g, "").toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}

export type JudgeVerdict = "correct" | "reviewNeeded" | "wrong";

/** 완전 일치/동의어 → correct, 오타 수준 편집거리 → reviewNeeded, 그 외 → wrong (스펙 8장) */
export function judgeAnswer(
  answer: string,
  job: { title: string; accepted: string[] },
): JudgeVerdict {
  const norm = normalize(answer);
  if (!norm) return "wrong";

  const candidates = [job.title, ...job.accepted].map(normalize).filter(Boolean);
  if (candidates.includes(norm)) return "correct";

  let minDist = Infinity;
  for (const candidate of candidates) {
    const dist = levenshtein(norm, candidate);
    if (dist < minDist) minDist = dist;
  }

  // 오타 한 글자 수준만 검토 대상으로 인정, 두 글자 이상 차이나면 바로 오답 처리
  if (minDist === 1) return "reviewNeeded";
  return "wrong";
}
