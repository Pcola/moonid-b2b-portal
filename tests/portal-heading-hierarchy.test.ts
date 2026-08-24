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

describe("portal heading hierarchy", () => {
  it("reserves the single page-level h1 for PortalShell", () => {
    const root = process.cwd();
    const portalFiles = tsxFilesUnder(resolve(root, "app/(portal)"));
    const nestedH1s = portalFiles
      .filter((file) => /<h1\b/i.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(nestedH1s).toEqual([]);

    const shell = readFileSync(resolve(root, "components/portal/portal-shell.tsx"), "utf8");
    expect(shell.match(/<h1\b/gi)).toHaveLength(1);
  });

  it("gives the portal navigation landmark an accessible name", () => {
    const shell = readFileSync(resolve(process.cwd(), "components/portal/portal-shell.tsx"), "utf8");
    expect(shell).toMatch(/<nav\b[^>]*\baria-label="Navigácia portálu"/);
  });

  it("does not skip directly from the shell h1 to h3 inside a portal component", () => {
    const root = process.cwd();
    const portalFiles = tsxFilesUnder(resolve(root, "app/(portal)"));
    const skippedLevelFiles = portalFiles
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return /<h3\b/i.test(source) && !/<h2\b/i.test(source);
      })
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(skippedLevelFiles).toEqual([]);
  });

  it("uses meaningful shell titles for nested portal routes", () => {
    const shell = readFileSync(resolve(process.cwd(), "components/portal/portal-shell.tsx"), "utf8");
    expect(shell).toContain('pathname === "/objednavky/opakovat"');
    expect(shell).toContain('pathname.startsWith("/objednavky/")');
    expect(shell).toContain('pathname.startsWith("/katalog/")');
  });
});
