/**
 * 교사 화면 전용 효과음. 음원 파일 없이 Web Audio API로 직접 합성해 저작권 걱정이 없음.
 * 브라우저 자동재생 정책 때문에 반드시 버튼 클릭 같은 사용자 동작 안에서 호출해야 함.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedCtx) sharedCtx = new AudioContextClass();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  { type = "sine", volume = 0.2 }: { type?: OscillatorType; volume?: number } = {},
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** 짧은 3음 차임 */
export function playRevealChime() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => tone(ctx, freq, now + i * 0.12, 0.3));
}

/** 2~5위 등장: 짧은 '뿅' 상승음 */
export function playRankPop() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
  tone(ctx, 1318.5, now + 0.16, 0.25, { volume: 0.12 });
}

/** 1위 직전 드럼롤 (화이트 노이즈를 빠르게 끊어 쳐서 만든 소리). 길이(초)를 반환 */
export function playDrumroll(duration = 1.4): number {
  const ctx = getCtx();
  if (!ctx) return duration;
  const now = ctx.currentTime;
  const hitLength = 0.05;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * hitLength), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.connect(ctx.destination);

  const interval = 0.045;
  for (let t = 0; t < duration; t += interval) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    const vol = 0.08 + 0.3 * (t / duration); // 점점 커지는 롤
    gain.gain.setValueAtTime(vol, now + t);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + hitLength);
    src.connect(gain).connect(filter);
    src.start(now + t);
  }
  return duration;
}

/** 1위 공개 팡파레 */
export function playFanfare() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes: [number, number, number][] = [
    [523.25, 0, 0.16],
    [659.25, 0.15, 0.16],
    [783.99, 0.3, 0.16],
    [1046.5, 0.45, 0.9],
  ];
  notes.forEach(([freq, offset, dur]) => {
    tone(ctx, freq, now + offset, dur, { type: "square", volume: 0.08 });
    tone(ctx, freq, now + offset, dur, { type: "triangle", volume: 0.18 });
  });
  // 마지막 화음
  [659.25, 783.99].forEach((freq) =>
    tone(ctx, freq, now + 0.45, 0.9, { type: "triangle", volume: 0.12 }),
  );
}
