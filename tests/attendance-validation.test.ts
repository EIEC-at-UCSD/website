import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEventCode, safeReturnPath, validateDisplayName, validateEventTitle, normalizeMemberEmail, validateNewPassword, validatePoints, csvCell } from "../lib/attendance/validation";
import { generateEventCode, hashEventCode, checkInURL } from "../lib/attendance/codes";

test("event codes use strong random values and accept harmless formatting differences", () => {
  const codes = new Set(Array.from({ length: 100 }, generateEventCode));
  assert.equal(codes.size, 100);
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(normalizeEventCode(" abcde-23456 "), "ABCDE23456");
  assert.equal(hashEventCode("abcde 23456"), hashEventCode("ABCDE-23456"));
  for (const value of [null, "", "short", "ABCDE12345", "ABCDEFGHIJ", "A".repeat(100), "<script>"]) {
    assert.throws(() => normalizeEventCode(value));
  }
});

test("QR check-in links keep event secrets out of the query string", () => {
  const url = new URL(checkInURL("https://eiecatucsd.vercel.app", "ABCDE-23456"));
  assert.equal(url.pathname, "/check-in");
  assert.equal(url.search, "");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("code"), "ABCDE23456");
  assert.throws(() => checkInURL("http://untrusted.example", "ABCDE23456"));
});

test("auth return paths cannot redirect to external sites or carry event codes", () => {
  for (const path of ["https://evil.example", "//evil.example", "/\\evil.example", "/projects", "/administer", "/%2f%2fevil.example", null]) {
    assert.equal(safeReturnPath(path), "/account");
  }
  assert.equal(safeReturnPath("/admin/events/123"), "/admin/events/123");
  assert.equal(safeReturnPath("/points"), "/points");
  assert.equal(safeReturnPath("/check-in?code=ABCDE23456"), "/check-in");
});

test("profile and event names have bounded lengths and reject control characters", () => {
  assert.equal(validateDisplayName("  Alex  Smith "), "Alex Smith");
  assert.equal(validateEventTitle("  General Body Meeting  "), "General Body Meeting");
  assert.throws(() => validateDisplayName("A"));
  assert.throws(() => validateEventTitle("x".repeat(121)));
  assert.throws(() => validateEventTitle("Meeting\u0000"));
});

test("member email validation requires the exact UCSD domain", () => {
  assert.equal(normalizeMemberEmail(" Alex@UCSD.EDU "), "alex@ucsd.edu");
  for (const email of ["alex+alias@ucsd.edu", "alex@example.com", "alex@ucsd.edu.evil.example", "alex@sub.ucsd.edu", "a@@ucsd.edu", "a\nb@ucsd.edu", "@ucsd.edu"]) assert.throws(() => normalizeMemberEmail(email));
});

test("password validation preserves spaces and rejects mismatches and bcrypt truncation", () => {
  const phrase = "  a long EIEC passphrase  ";
  assert.equal(validateNewPassword(phrase, phrase), phrase);
  assert.equal(validateNewPassword("a".repeat(8), "a".repeat(8)), "a".repeat(8));
  assert.equal(validateNewPassword("a".repeat(72), "a".repeat(72)), "a".repeat(72));
  for (const password of ["short", "a".repeat(7), "a".repeat(73), "é".repeat(37), "long enough\u0000password"]) assert.throws(() => validateNewPassword(password, password));
  assert.throws(() => validateNewPassword(phrase, phrase.trim()), /match/);
});

test("display names accept real names and refuse emails, digits and markup", () => {
  for (const name of ["Mary-Jane O'Neil", "José Álvarez", "Li Wei", "J. R. Smith"]) assert.equal(validateDisplayName(name), name);
  for (const name of ["alex@ucsd.edu", "Alex 123", "<b>Alex</b>", "Alex (he/him)", "-Alex"]) assert.throws(() => validateDisplayName(name));
});

test("points are whole numbers from 0 to 1000", () => {
  assert.equal(validatePoints("0"), 0);
  assert.equal(validatePoints(" 1000 "), 1000);
  assert.equal(validatePoints("", 3), 3);
  for (const value of ["-1", "1001", "1.5", "abc", "1e3", null, ""]) assert.throws(() => validatePoints(value));
});

test("CSV cells are quoted and cannot run as spreadsheet formulas", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  for (const start of ["=", "+", "-", "@"]) assert.equal(csvCell(`${start}cmd()`), `'${start}cmd()`);
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(12), "12");
});
