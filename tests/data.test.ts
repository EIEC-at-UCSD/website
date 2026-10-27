import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV, safeURL, photoURL, groupProjects, recruitmentStats, type Row } from "../lib/data";

test("CSV supports multiline quoted values, CRLF, escaped quotes and BOM headers", () => {
  assert.deepEqual(parseCSV('\uFEFFName,Description\r\nAlice,"Build, test\nand say ""hello"""\r\n\r\n'), [
    { name: "Alice", description: 'Build, test\nand say "hello"' },
  ]);
  assert.deepEqual(parseCSV('Name,Role\nAlice,'), [{ name: "Alice", role: "" }]);
  assert.deepEqual(parseCSV("name,role\n"), []);
  assert.throws(() => parseCSV('name,role\n"Alice'), /Incomplete/);
  assert.throws(() => parseCSV('<!doctype html>\n<html>'), /Invalid/);
});

test("untrusted sheet links cannot execute scripts", () => {
  assert.equal(safeURL("javascript:alert(1)"), undefined);
  assert.equal(safeURL("data:text/html,hello"), undefined);
  assert.equal(safeURL("//evil.example"), undefined);
  assert.equal(safeURL("not a url"), undefined);
  assert.equal(safeURL("https://forms.google.com/apply"), "https://forms.google.com/apply");
  assert.equal(photoURL("https://drive.google.com/file/d/abcdefghijklmnopqrstuvwxyz/view"), "https://lh3.googleusercontent.com/d/abcdefghijklmnopqrstuvwxyz=w800");
});

test("project grouping handles missing tags and counts only actual roles", () => {
  const rows: Row[] = [
    { "project name": "Robot", description: "Build a robot", "role title": "Engineer", hours: "5-8 hrs / week" },
    { "project name": "Robot", "role title": "Designer", hours: "3–6 hrs / week" },
    { "project name": "Research" },
    { "role title": "Orphan" },
  ];
  const projects = groupProjects(rows);
  assert.equal(projects.length, 2);
  assert.equal(projects[0].roles.length, 2);
  assert.deepEqual(projects[0].tags, []);
  assert.deepEqual(recruitmentStats(rows), { projects: 2, roles: 2, hours: "4–7" });
  assert.deepEqual(recruitmentStats([]), { projects: 0, roles: 0, hours: "Varies" });
});
