import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withLock: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCount: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  companyFindUnique: vi.fn(),
  generateLink: vi.fn(),
  sendEmail: vi.fn(),
  rateLimit: vi.fn(),
  auditContext: vi.fn(),
  writeAuditRequired: vi.fn(),
  prismaTransaction: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/lib/user-lifecycle-lock", () => ({ withUserLifecycleLock: mocks.withLock }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.prismaTransaction } }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink: mocks.generateLink } } }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, value: string) => `${scope}:${value}`,
}));
vi.mock("@/lib/audit", () => ({
  auditRequestContext: mocks.auditContext,
  writeAuditRequired: mocks.writeAuditRequired,
}));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/site-url", () => ({ SITE_URL: "https://staging.moonid.test" }));

import { inviteUser } from "@/lib/invite";

const tx = {
  user: {
    findUnique: mocks.userFindUnique,
    findFirst: mocks.userFindFirst,
    count: mocks.userCount,
    create: mocks.userCreate,
    update: mocks.userUpdate,
  },
  company: { findUnique: mocks.companyFindUnique },
};

const actor = { id: "actor-1", kind: "COMPANY_ADMIN" as const };
const existingUser = {
  id: "user-1",
  authId: "auth-original",
  email: "member@test.invalid",
  name: "Member",
  role: "CUSTOMER_USER",
  companyId: "company-1",
  active: true,
  updatedAt: new Date("2026-08-24T12:00:00.000Z"),
};

describe("bezpečné zákaznícke pozvánky", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withLock.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    mocks.prismaTransaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    mocks.rateLimit.mockResolvedValue({ ok: true, count: 1 });
    mocks.auditContext.mockResolvedValue({ ip: null, userAgent: null });
    mocks.writeAuditRequired.mockResolvedValue(undefined);
    mocks.companyFindUnique.mockResolvedValue({ active: true });
    mocks.userFindUnique.mockImplementation(async ({ where }: { where: { id?: string; authId?: string } }) => {
      if (where.id === actor.id) return { role: "CUSTOMER_ADMIN", active: true, companyId: "company-1" };
      return null;
    });
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userCount.mockResolvedValue(0);
    mocks.userCreate.mockResolvedValue({ id: "user-new" });
    mocks.userUpdate.mockResolvedValue({ id: "user-1" });
    mocks.generateLink.mockResolvedValue({
      data: { user: { id: "auth-new" }, properties: { hashed_token: "invite-secret" } },
      error: null,
    });
    mocks.sendEmail.mockResolvedValue({ ok: true });
  });

  it("po úspešnom e-maile nikdy nevráti raw bearer link", async () => {
    const result = await inviteUser(
      "member@test.invalid", "Member", "CUSTOMER_USER", "company-1", "Firma", actor,
    );

    expect(result).toEqual({ ok: true, emailSent: true, inviteLink: null });
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("/potvrdit-pristup#token_hash="),
    }));
    expect(mocks.withLock).toHaveBeenCalledTimes(2);
  });

  it("provider I/O prebieha medzi dvoma krátkymi lifecycle lockmi", async () => {
    let lockHeld = false;
    mocks.withLock.mockImplementation(async (callback: (client: typeof tx) => unknown) => {
      lockHeld = true;
      try {
        return await callback(tx);
      } finally {
        lockHeld = false;
      }
    });
    mocks.generateLink.mockImplementationOnce(async () => {
      expect(lockHeld).toBe(false);
      return {
        data: { user: { id: "auth-new" }, properties: { hashed_token: "invite-secret" } },
        error: null,
      };
    });

    await inviteUser("member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", actor);

    expect(mocks.withLock).toHaveBeenCalledTimes(2);
  });

  it("11. pozvánku customer admina zastaví pred providerom", async () => {
    mocks.rateLimit
      .mockResolvedValueOnce({ ok: false, count: 11 })
      .mockResolvedValue({ ok: true, count: 1 });

    const result = await inviteUser(
      "member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", actor,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("limit pozvánok");
    expect(mocks.rateLimit).toHaveBeenCalledWith("customer-invite-actor:actor-1", { limit: 10, windowSec: 3600 });
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.withLock).not.toHaveBeenCalled();
  });

  it("member cap zastaví vytváranie pred providerom", async () => {
    mocks.userCount
      .mockResolvedValueOnce(250)
      .mockResolvedValueOnce(0);

    const result = await inviteUser(
      "member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", actor,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("limit 250");
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  it("kapacitu revaliduje po providerovi a zastaví súbežné prekročenie limitu", async () => {
    mocks.userCount
      .mockResolvedValueOnce(249)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(250)
      .mockResolvedValueOnce(0);

    const result = await inviteUser(
      "member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", actor,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("limit 250");
    expect(mocks.generateLink).toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("existujúci app účet nikdy neprepojí na odlišné provider authId", async () => {
    mocks.userFindFirst.mockResolvedValue(existingUser);
    mocks.generateLink
      .mockResolvedValueOnce({ data: null, error: new Error("already exists") })
      .mockResolvedValueOnce({
        data: { user: { id: "auth-other" }, properties: { hashed_token: "recovery-secret" } },
        error: null,
      });

    const result = await inviteUser(
      existingUser.email, existingUser.name, "CUSTOMER_USER", "company-1", "Firma", actor,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("inú Auth identitu");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("manuálny fallback zobrazí link iba staffu a iba po required audite", async () => {
    const staffActor = { id: "staff-1", kind: "STAFF" as const };
    mocks.userFindUnique.mockImplementation(async ({ where }: { where: { id?: string; authId?: string } }) => {
      if (where.id === staffActor.id) return { role: "STAFF", active: true, companyId: null };
      return null;
    });
    mocks.sendEmail.mockResolvedValueOnce({ ok: false, skipped: true });

    const result = await inviteUser(
      "member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", staffActor,
    );

    expect(result.ok).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(result.inviteLink).toContain("#token_hash=");
    expect(mocks.prismaTransaction).toHaveBeenCalledOnce();
    expect(mocks.writeAuditRequired).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: "CUSTOMER_USER_INVITE_EMAIL_FALLBACK",
        meta: expect.objectContaining({ linkDisclosed: true }),
      }),
      expect.anything(),
    );
  });

  it("customer admin pri zlyhaní e-mailu nedostane bearer link", async () => {
    mocks.sendEmail.mockResolvedValueOnce({ ok: false });

    const result = await inviteUser(
      "member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", actor,
    );

    expect(result.ok).toBe(true);
    expect(result.inviteLink).toBeNull();
    expect(result.warning).toContain("nezobrazuje");
    expect(mocks.writeAuditRequired).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ meta: expect.objectContaining({ linkDisclosed: false }) }),
      expect.anything(),
    );
  });

  it("pri zlyhaní fallback auditu link fail-closed zadrží", async () => {
    const staffActor = { id: "staff-1", kind: "STAFF" as const };
    mocks.userFindUnique.mockImplementation(async ({ where }: { where: { id?: string; authId?: string } }) => {
      if (where.id === staffActor.id) return { role: "STAFF", active: true, companyId: null };
      return null;
    });
    mocks.sendEmail.mockResolvedValueOnce({ ok: false });
    mocks.prismaTransaction.mockRejectedValueOnce(new Error("audit unavailable"));

    const result = await inviteUser(
      "member@test.invalid", null, "CUSTOMER_USER", "company-1", "Firma", staffActor,
    );

    expect(result.ok).toBe(false);
    expect(result.inviteLink).toBeNull();
    expect(mocks.reportError).toHaveBeenCalledWith(
      "customerInvite.fallbackAudit",
      expect.any(Error),
      { action: "access_link_withheld" },
    );
  });
});
