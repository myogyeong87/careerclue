const STEPS = [
  {
    icon: "🔍",
    title: "단서로 추리해요",
    desc: "문제 하나당 단서가 최대 5개까지 순서대로 공개돼요. 단서를 보고 어떤 직업인지 맞혀보세요.",
  },
  {
    icon: "🏆",
    title: "빨리 맞힐수록 점수가 높아요",
    desc: "1번째 단서에서 맞히면 100점, 2번째 80점, 3번째 60점, 4번째 40점, 5번째 20점이에요.",
  },
  {
    icon: "🔤",
    title: "특별 힌트도 있어요",
    desc: "초성 힌트, 글자수 힌트가 필요하면 추가로 공개될 수 있어요.",
  },
  {
    icon: "✍️",
    title: "정답은 최대 3번까지",
    desc: "한 문제당 정답을 최대 3번 입력할 수 있어요.",
  },
];

export default function HowToPlay() {
  return (
    <div className="flex flex-col gap-3">
      {STEPS.map((s) => (
        <div
          key={s.title}
          className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-[var(--color-primary)]/30 bg-[var(--color-background)] px-4 py-3 text-left"
        >
          <span className="text-2xl">{s.icon}</span>
          <div>
            <p className="font-semibold text-[var(--foreground)]">{s.title}</p>
            <p className="text-sm text-[var(--foreground)]/70">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
