import { describe, it, expect } from "vitest";
import { evaluateSession, sessionIdFromJwt, IDLE_MS, ABSOLUTE_MS } from "@/lib/session-timeout";

const SID = "e3f1a2b4-0000-4000-8000-abcdef012345";
const NOW = 1_900_000_000_000;
const cookie = (sid: string, start: number, last: number) => `${sid}:${start}:${last}`;

describe("evaluateSession — časovanie relácie (idle 24 h / absolútne 14 dní)", () => {
  it("bez cookie → INIT s aktuálnym časom", () => {
    expect(evaluateSession(undefined, SID, NOW)).toEqual({ kind: "INIT", value: `${SID}:${NOW}:${NOW}` });
  });

  it("iné session_id (nové prihlásenie) → INIT, nie falošný timeout zo starého cookie", () => {
    const stale = cookie("ina-relacia", NOW - ABSOLUTE_MS - 1000, NOW - ABSOLUTE_MS - 1000);
    expect(evaluateSession(stale, SID, NOW)).toEqual({ kind: "INIT", value: `${SID}:${NOW}:${NOW}` });
  });

  it("poškodený cookie (ne-číselné časy, budúce časy) → INIT", () => {
    expect(evaluateSession(`${SID}:abc:def`, SID, NOW).kind).toBe("INIT");
    expect(evaluateSession(`${SID}:${NOW + 9999}:${NOW}`, SID, NOW).kind).toBe("INIT");
  });

  it("čerstvá aktivita → OK (žiadny zápis cookie)", () => {
    expect(evaluateSession(cookie(SID, NOW - 3600_000, NOW - 60_000), SID, NOW)).toEqual({ kind: "OK" });
  });

  it("aktivita staršia ako 5 min → REFRESH last-seen (start ostáva)", () => {
    const start = NOW - 3600_000;
    const dec = evaluateSession(cookie(SID, start, NOW - 10 * 60_000), SID, NOW);
    expect(dec).toEqual({ kind: "REFRESH", value: `${SID}:${start}:${NOW}` });
  });

  it("neaktivita > 24 h → TIMEOUT idle", () => {
    const dec = evaluateSession(cookie(SID, NOW - 2 * IDLE_MS, NOW - IDLE_MS - 1000), SID, NOW);
    expect(dec).toEqual({ kind: "TIMEOUT", reason: "idle" });
  });

  it("relácia > 14 dní → TIMEOUT absolute (aj pri stálej aktivite)", () => {
    const dec = evaluateSession(cookie(SID, NOW - ABSOLUTE_MS - 1000, NOW - 30_000), SID, NOW);
    expect(dec).toEqual({ kind: "TIMEOUT", reason: "absolute" });
  });

  it("hranice: presne na limite ešte beží", () => {
    expect(evaluateSession(cookie(SID, NOW - ABSOLUTE_MS, NOW - 60_000), SID, NOW).kind).toBe("OK");
    expect(evaluateSession(cookie(SID, NOW - 3600_000, NOW - IDLE_MS), SID, NOW).kind).toBe("REFRESH");
  });
});

describe("sessionIdFromJwt — session_id claim z access tokenu", () => {
  const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

  it("vytiahne session_id", () => {
    expect(sessionIdFromJwt(jwt({ sub: "u1", session_id: SID }))).toBe(SID);
  });

  it("UTF-8 diakritika v payloade nerozbije parsovanie session_id", () => {
    expect(sessionIdFromJwt(jwt({ session_id: SID, user_metadata: { name: "Lukáš Šťastný" } }))).toBe(SID);
  });

  it("chýbajúci/nečitateľný token → null", () => {
    expect(sessionIdFromJwt(undefined)).toBeNull();
    expect(sessionIdFromJwt("nie-jwt")).toBeNull();
    expect(sessionIdFromJwt(jwt({ sub: "u1" }))).toBeNull();
  });
});
