// Integračný test onboardingu — createAccessRequest (žiadosť o prístup z verejnej registrácie).
// Overuje: validáciu, honeypot (bot ticho odmietnutý), informačnú povinnosť, rate-limit a zápis
// žiadosti. Audit/email/rate-limit/headers mockujeme; AccessRequest sa píše reálne do DB.
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }), STAFF_NOTIFY: "staff@test.invalid" }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  rateLimitKey: vi.fn((scope: string, identifier: string) => `${scope}:${identifier}`),
  clientIp: vi.fn().mockReturnValue("1.2.3.4"),
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

import { createAccessRequest } from "@/app/registracia/actions";
import { rateLimit } from "@/lib/rate-limit";

const prisma = new PrismaClient();
const EMAIL = "ziadatel@reg-test.invalid";

const base = { ico: "12345678", companyName: "Reg Test s.r.o.", contactName: "Ján Test", email: EMAIL };
const cleanup = () => prisma.accessRequest.deleteMany({ where: { email: { contains: "reg-test.invalid" } } });

beforeEach(async () => {
  await cleanup();
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, count: 1 }); // default: pod limitom
});
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("createAccessRequest — žiadosť o prístup", () => {
  it("platný vstup → založí žiadosť (PENDING) a používateľovi stačí privacy notice", async () => {
    const res = await createAccessRequest(base);
    expect(res.ok).toBe(true);
    const reqs = await prisma.accessRequest.findMany({ where: { email: EMAIL } });
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({ companyName: "Reg Test s.r.o.", ico: "12345678", status: "PENDING" });
  });

  it("honeypot vyplnený → tvári sa OK, ale žiadosť NEZALOŽÍ (bot)", async () => {
    const res = await createAccessRequest({ ...base, hp: "i-am-a-bot" });
    expect(res.ok).toBe(true);
    expect(await prisma.accessRequest.count({ where: { email: EMAIL } })).toBe(0);
  });

  it("neplatný e-mail → ok:false (validácia)", async () => {
    const res = await createAccessRequest({ ...base, email: "nie-email" });
    expect(res.ok).toBe(false);
    expect(await prisma.accessRequest.count({ where: { email: { contains: "reg-test.invalid" } } })).toBe(0);
  });

  it("nad rate-limitom → ok:false, žiadny zápis", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ ok: false, count: 99 });
    const res = await createAccessRequest(base);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/priveľa/i);
    expect(await prisma.accessRequest.count({ where: { email: EMAIL } })).toBe(0);
  });
});
