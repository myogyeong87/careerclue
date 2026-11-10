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

/** 앞 글자 받침에 맞는 조사. withJosa("1학년 1반", "이", "가") → "1학년 1반이" */
export function withJosa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  // 숫자로 끝나면 읽는 소리 기준 (2·4·5·9만 받침 없음), 그 밖의 문자는 받침 있는 쪽
  const hasFinal = code >= 0 && code <= 11171 ? code % 28 !== 0 : !/[2459]$/.test(last);
  return word + (hasFinal ? withFinal : withoutFinal);
}
