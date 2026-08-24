import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function tsxFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFilesUnder(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("staff heading hierarchy", () => {
  it("reserves the single page-level h1 for StaffShell", () => {
    const root = process.cwd();
    const staffFiles = tsxFilesUnder(resolve(root, "app/staff"));
    const nestedH1s = staffFiles
      .filter((file) => /<h1\b/i.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(nestedH1s).toEqual([]);

    const shell = readFileSync(resolve(root, "components/staff/staff-shell.tsx"), "utf8");
    expect(shell.match(/<h1\b/gi)).toHaveLength(1);
  });

  it("gives the staff navigation landmark an accessible name", () => {
    const shell = readFileSync(resolve(process.cwd(), "components/staff/staff-shell.tsx"), "utf8");
    expect(shell).toMatch(/<nav\s+aria-label="Navigácia administrácie"/);
  });
});
