import { judgeAnswer } from "./answerJudge";
import type { GameState, Job, Submission } from "./types";

/** 종료 화면 특별상. 칭찬형 상은 이름을 보여주고, 오답형 상은 이름 없이 답만 보여줌 */
export interface LightningRow {
  jobIndex: number;
  studentName: string;
  /** 라운드 시작부터 정답 제출까지 걸린 초 (시작 시각 기록이 없으면 null) */
  seconds: number | null;
  hintStage: number;
}

export type Award =
  | { kind: "lightning"; winners: string[]; count: number; rows: LightningRow[] }
  | { kind: "persistence"; winners: string[]; count: number }
  | { kind: "hardest"; jobIndex: number; title: string; correct: number; total: number }
  | { kind: "telepathy"; items: { jobIndex: number; answer: string; count: number }[] }
  | { kind: "creative"; items: { jobIndex: number; answer: string }[] };

const normalize = (s: string) => s.trim().replace(/\s+/g, "").toLowerCase();

/** 정답으로 인정된 시도의 위치. 자동 정답이면 첫 correct, 보류를 정답 처리했으면 첫 보류 시도 */
function correctAttemptIndex(sub: Submission, job: Job): number {
  const verdicts = sub.attempts.map((a) => judgeAnswer(a.answer, job));
  const auto = verdicts.indexOf("correct");
  if (auto >= 0) return auto;
  const review = verdicts.indexOf("reviewNeeded");
  return review >= 0 ? review : sub.attempts.length - 1;
}

/** 가장 많이 받은 학생(동점이면 모두). 한 명도 없으면 null */
function topCounts(counts: Map<string, { name: string; count: number }>) {
  let max = 0;
  counts.forEach((v) => (max = Math.max(max, v.count)));
  if (max === 0) return null;
  const winners = [...counts.values()].filter((v) => v.count === max).map((v) => v.name);
  return { winners, count: max };
}

export function buildAwards(game: GameState, submissions: Submission[]): Award[] {
  const awards: Award[] = [];
  const total = new Set(submissions.map((s) => s.studentId)).size;
  const byJob = new Map<number, Submission[]>();
  submissions.forEach((s) => {
    const list = byJob.get(s.jobIndex) ?? [];
    list.push(s);
    byJob.set(s.jobIndex, list);
  });
  const jobIndexes = [...byJob.keys()].filter((i) => game.jobs[i]).sort((a, b) => a - b);

  // ⚡ 번개 탐정: 문제마다 가장 먼저 정답을 낸 학생, 그 횟수가 가장 많은 학생이 수상
  const lightningRows: LightningRow[] = [];
  const lightningCounts = new Map<string, { name: string; count: number }>();
  // 💪 끈기상: 2~3번째 시도에서 정답을 낸 횟수가 가장 많은 학생
  const persistenceCounts = new Map<string, { name: string; count: number }>();

  jobIndexes.forEach((jobIndex) => {
    const job = game.jobs[jobIndex];
    let best: { sub: Submission; at: number; stage: number } | null = null;
    byJob.get(jobIndex)!.forEach((sub) => {
      if (!sub.correct) return;
      const idx = correctAttemptIndex(sub, job);
      const attempt = sub.attempts[idx];
      if (!attempt) return;
      if (!best || attempt.submittedAt < best.at) {
        best = { sub, at: attempt.submittedAt, stage: attempt.hintsOpenAtSubmit };
      }
      if (idx >= 1) {
        const cur = persistenceCounts.get(sub.studentId) ?? { name: sub.studentName, count: 0 };
        cur.count += 1;
        persistenceCounts.set(sub.studentId, cur);
      }
    });
    if (!best) return;
    const { sub, at, stage } = best as { sub: Submission; at: number; stage: number };
    const startedAt = game.roundStartTimes[sub.roundId];
    lightningRows.push({
      jobIndex,
      studentName: sub.studentName,
      seconds: startedAt ? Math.max(0, Math.round((at - startedAt) / 1000)) : null,
      hintStage: stage,
    });
    const cur = lightningCounts.get(sub.studentId) ?? { name: sub.studentName, count: 0 };
    cur.count += 1;
    lightningCounts.set(sub.studentId, cur);
  });

  const lightning = topCounts(lightningCounts);
  if (lightning) awards.push({ kind: "lightning", ...lightning, rows: lightningRows });

  const persistence = topCounts(persistenceCounts);
  if (persistence) awards.push({ kind: "persistence", ...persistence });

  // 🏔️ 최고 난도 문제: 정답률이 가장 낮은 문제 (같으면 앞 번호)
  let hardest: { jobIndex: number; correct: number } | null = null;
  jobIndexes.forEach((jobIndex) => {
    const correct = byJob.get(jobIndex)!.filter((s) => s.correct).length;
    if (!hardest || correct < hardest.correct) hardest = { jobIndex, correct };
  });
  if (hardest && total > 0) {
    const h = hardest as { jobIndex: number; correct: number };
    awards.push({
      kind: "hardest",
      jobIndex: h.jobIndex,
      title: game.jobs[h.jobIndex].title,
      correct: h.correct,
      total,
    });
  }

  // 오답 모으기: 문제별로 같은 답(띄어쓰기·대소문자 무시)을 쓴 학생 수. 한 학생이 같은 답을 여러 번 써도 1명
  const wrongGroups: { jobIndex: number; answer: string; students: Set<string> }[] = [];
  jobIndexes.forEach((jobIndex) => {
    const job = game.jobs[jobIndex];
    const groups = new Map<string, { answer: string; students: Set<string> }>();
    byJob.get(jobIndex)!.forEach((sub) => {
      sub.attempts.forEach((a) => {
        if (sub.correct && judgeAnswer(a.answer, job) !== "wrong") return;
        const key = normalize(a.answer);
        if (!key) return;
        const g = groups.get(key) ?? { answer: a.answer.trim(), students: new Set<string>() };
        g.students.add(sub.studentId);
        groups.set(key, g);
      });
    });
    groups.forEach((g) => wrongGroups.push({ jobIndex, ...g }));
  });

  // 👯 텔레파시 오답: 여러 명이 똑같이 쓴 오답 (많은 순 3개)
  const telepathy = wrongGroups
    .filter((g) => g.students.size >= 2)
    .sort((a, b) => b.students.size - a.students.size || a.jobIndex - b.jobIndex)
    .slice(0, 3)
    .map((g) => ({ jobIndex: g.jobIndex, answer: g.answer, count: g.students.size }));
  if (telepathy.length > 0) awards.push({ kind: "telepathy", items: telepathy });

  // 🤣 기발한 오답: 한 명만 쓴 오답 목록. 어떤 답이 기발한지는 선생님이 화면에서 고름
  const creative = wrongGroups
    .filter((g) => g.students.size === 1)
    .sort((a, b) => a.jobIndex - b.jobIndex || a.answer.localeCompare(b.answer, "ko"))
    .map((g) => ({ jobIndex: g.jobIndex, answer: g.answer }));
  if (creative.length > 0) awards.push({ kind: "creative", items: creative });

  return awards;
}
