import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/** Firebase 콘솔에서 이 문서(config/teacherPin)를 지우면 PIN을 처음부터 다시 만들 수 있음 */
const PIN_DOC = doc(db, "config", "teacherPin");
const UNLOCK_KEY = "careerclue:teacherUnlockedUntil";
const REMEMBER_MS = 12 * 60 * 60 * 1000;
const ITERATIONS = 150_000;

export const PIN_PATTERN = /^\d{4,6}$/;

interface PinRecord {
  salt: string;
  hash: string;
  iterations: number;
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** PIN 원문은 저장하지 않고 PBKDF2-SHA256(무작위 salt) 해시만 저장 */
async function hashPin(pin: string, saltHex: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations },
    key,
    256,
  );
  return toHex(bits);
}

export async function hasTeacherPin(): Promise<boolean> {
  const snap = await getDoc(PIN_DOC);
  return snap.exists() && typeof snap.data().hash === "string";
}

/** PIN 최초 설정. 그사이 다른 기기에서 먼저 만들었다면 false */
export async function createTeacherPin(pin: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) throw new Error("PIN은 숫자 4~6자리여야 해요.");
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPin(pin, salt, ITERATIONS);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(PIN_DOC);
    if (snap.exists()) return false;
    tx.set(PIN_DOC, { salt, hash, iterations: ITERATIONS, createdAt: serverTimestamp() });
    return true;
  });
}

export async function verifyTeacherPin(pin: string): Promise<boolean> {
  const snap = await getDoc(PIN_DOC);
  if (!snap.exists()) return false;
  const record = snap.data() as PinRecord;
  const hash = await hashPin(pin, record.salt, record.iterations ?? ITERATIONS);
  return hash === record.hash;
}

/** 이 기기에서 PIN을 통과했으면 12시간 동안 다시 묻지 않음 */
export function isTeacherUnlockRemembered(): boolean {
  try {
    const until = Number(window.localStorage.getItem(UNLOCK_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function rememberTeacherUnlock(): void {
  try {
    window.localStorage.setItem(UNLOCK_KEY, String(Date.now() + REMEMBER_MS));
  } catch {
    // 저장이 막힌 환경이면 매번 PIN을 묻게 됨
  }
}
