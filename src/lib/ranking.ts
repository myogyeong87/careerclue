import type { Submission } from "./types";

export interface RankedEntry {
  studentId: string;
  studentName: string;
  score: number;
  /** 동점자는 같은 순위 (예: 1, 2, 2, 4) */
  rank: number;
}

export interface RankGroup {
  rank: number;
  score: number;
  entries: RankedEntry[];
}

/** 실제 게임 제출만으로 학생별 누적 점수 순위를 계산 */
export function buildLeaderboard(submissions: Submission[]): RankedEntry[] {
  const totals = new Map<string, { studentName: string; score: number }>();
  submissions.forEach((s) => {
    const entry = totals.get(s.studentId) ?? { studentName: s.studentName, score: 0 };
    entry.score += s.score;
    entry.studentName = s.studentName;
    totals.set(s.studentId, entry);
  });

  const sorted = Array.from(totals.entries())
    .map(([studentId, v]) => ({ studentId, ...v }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.studentId.localeCompare(b.studentId, undefined, { numeric: true }),
    );

  return sorted.map((entry, i) => {
    const firstSameScore = sorted.findIndex((e) => e.score === entry.score);
    return { ...entry, rank: firstSameScore === -1 ? i + 1 : firstSameScore + 1 };
  });
}

/** 순위 maxRank 이내를 순위별로 묶음 (동점자는 한 그룹). 1위부터 정렬 */
export function topRankGroups(leaderboard: RankedEntry[], maxRank = 5): RankGroup[] {
  const groups: RankGroup[] = [];
  leaderboard.forEach((entry) => {
    if (entry.rank > maxRank) return;
    const last = groups[groups.length - 1];
    if (last && last.rank === entry.rank) last.entries.push(entry);
    else groups.push({ rank: entry.rank, score: entry.score, entries: [entry] });
  });
  return groups;
}
