import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunk,
  DELETE_BATCH_SIZE,
  inferPrefixFromName,
  mostCommonPrefix,
  prefixOfStudentId,
} from "../src/lib/classRules.ts";

test("반 이름에서 학번 접두사 추정", () => {
  assert.equal(inferPrefixFromName("1학년 1반"), "11");
  assert.equal(inferPrefixFromName("3학년 2반"), "32");
  assert.equal(inferPrefixFromName("2-3"), "23");
  assert.equal(inferPrefixFromName("21반"), "21");
  assert.equal(inferPrefixFromName("3학년 10반"), "");
  assert.equal(inferPrefixFromName("기본 반"), "");
});

test("학번 앞 두 자리로 반 접두사", () => {
  assert.equal(prefixOfStudentId("1101"), "11");
  assert.equal(prefixOfStudentId("3215"), "32");
  assert.equal(prefixOfStudentId("110"), null);
  assert.equal(prefixOfStudentId("11011"), null);
  assert.equal(prefixOfStudentId("11a1"), null);
});

test("기존 학번에서 가장 많은 접두사", () => {
  assert.equal(mostCommonPrefix(["1101", "1102", "1201", "abc"]), "11");
  assert.equal(mostCommonPrefix(["1201", "1101"]), "11");
  assert.equal(mostCommonPrefix([]), null);
});

test("삭제 batch는 500건 한도 안에서 빠짐없이 나눔", () => {
  const ids = Array.from({ length: 1234 }, (_, i) => i);
  const parts = chunk(ids, DELETE_BATCH_SIZE);
  assert.ok(DELETE_BATCH_SIZE <= 500);
  assert.ok(parts.every((p) => p.length > 0 && p.length <= 500));
  assert.deepEqual(parts.flat(), ids);
  assert.deepEqual(chunk([], DELETE_BATCH_SIZE), []);
});
