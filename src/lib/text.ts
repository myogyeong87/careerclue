const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** 한글 음절의 초성만 추출. 한글이 아닌 문자(공백·영문 등)는 그대로 둔다. */
export function toChosung(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return ch;
      return CHOSUNG[Math.floor(code / 588)];
    })
    .join("");
}

/** 글자 수 빈칸 미리보기: 공백은 그대로, 나머지는 ○로 치환 */
export function charCountPreview(text: string): string {
  return Array.from(text)
    .map((ch) => (ch === " " ? " " : "○"))
    .join("");
}
