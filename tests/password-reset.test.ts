import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const afterTasks: Array<() => unknown | Promise<unknown>> = [];
  return {
    findFirst: vi.fn(),
    createRecovery: vi.fn(),
    sendEmail: vi.fn(),
    writeAudit: vi.fn(),
    reportError: vi.fn(),
    rateLimit: vi.fn(),
    afterTasks,
    scheduleAfter: vi.fn((task: () => unknown | Promise<unknown>) => {
      afterTasks.push(task);
    }),
  };
});

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }) }));
vi.mock("next/server", () => ({ after: mocks.scheduleAfter }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/internal-auth-admin", () => ({ createInternalRecoveryLink: mocks.createRecovery }));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, value: string) => `${scope}:${value}`,
  clientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/site-url", () => ({ SITE_URL: "https://staging.moonid.test" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { requestPasswordReset } from "@/app/(auth)/actions";

async function completePublicResponse(email: string): Promise<void> {
  let settled = false;
  const response = requestPasswordReset(email);
  void response.then(
    () => { settled = true; },
    () => { settled = true; },
  );

  await vi.advanceTimersByTimeAsync(299);
  expect(settled).toBe(false);

  await vi.advanceTimersByTimeAsync(202);
  await response;
}

async function runAfterTasks(): Promise<void> {
  const tasks = mocks.afterTasks.splice(0);
  for (const task of tasks) await task();
}

describe("scanner-safe obnova hesla", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.afterTasks.length = 0;
    mocks.rateLimit.mockResolvedValue({ ok: true, count: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pred verejnou odpoveďou nenačíta účet ani nevolá externé služby", async () => {
    const response = requestPasswordReset("user@test.invalid");

    await vi.advanceTimersByTimeAsync(299);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.createRecovery).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(202);
    await expect(response).resolves.toBeUndefined();
    expect(mocks.scheduleAfter).toHaveBeenCalledOnce();
  });

  it("neexistujúci účet neprezradí a nevydá recovery token ani neposiela e-mail", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);

    await completePublicResponse("nobody@test.invalid");
    expect(mocks.findFirst).not.toHaveBeenCalled();

    await runAfterTasks();

    expect(mocks.createRecovery).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("neaktívny účet ani firma nedostanú recovery token", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: "user-1",
      authId: "auth-1",
      email: "user@test.invalid",
      active: true,
      companyId: "company-1",
      company: { active: false },
    });

    await completePublicResponse("user@test.invalid");
    await runAfterTasks();

    expect(mocks.createRecovery).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("pošle iba fragmentový recovery odkaz cez centrálne doručenie", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: "user-1",
      authId: "auth-1",
      email: "user@test.invalid",
      active: true,
      companyId: "company-1",
      company: { active: true },
    });
    mocks.createRecovery.mockResolvedValueOnce({
      authId: "auth-1",
      url: "https://staging.moonid.test/potvrdit-pristup#token_hash=secret&type=recovery",
      createdAuthUser: false,
    });
    mocks.sendEmail.mockResolvedValueOnce({ ok: true });

    await completePublicResponse("USER@test.invalid");
    expect(mocks.createRecovery).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();

    await runAfterTasks();

    expect(mocks.createRecovery).toHaveBeenCalledWith("user@test.invalid");
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@test.invalid",
      text: expect.stringContaining("/potvrdit-pristup#token_hash="),
    }));
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PASSWORD_RESET_REQUESTED" }));
  });

  it("pri odlišnom provider authId link fail-closed neodošle", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: "user-1",
      authId: "auth-original",
      email: "user@test.invalid",
      active: true,
      companyId: null,
      company: null,
    });
    mocks.createRecovery.mockResolvedValueOnce({
      authId: "auth-other",
      url: "https://staging.moonid.test/potvrdit-pristup#token_hash=secret&type=recovery",
      createdAuthUser: false,
    });

    await completePublicResponse("user@test.invalid");
    await runAfterTasks();

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith(
      "auth.passwordReset.identityMismatch",
      expect.any(Error),
      { action: "reset_withheld" },
    );
  });

  it("pri neúspešnom e-maile nevytvorí zavádzajúci audit úspešného resetu", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: "user-1",
      authId: "auth-1",
      email: "user@test.invalid",
      active: true,
      companyId: null,
      company: null,
    });
    mocks.createRecovery.mockResolvedValueOnce({
      authId: "auth-1",
      url: "https://staging.moonid.test/potvrdit-pristup#token_hash=secret&type=recovery",
      createdAuthUser: false,
    });
    mocks.sendEmail.mockResolvedValueOnce({ ok: false });

    await completePublicResponse("user@test.invalid");
    await runAfterTasks();

    expect(mocks.writeAudit).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith(
      "auth.passwordReset.email",
      expect.any(Error),
      { action: "reset_email_failed" },
    );
  });

  it("zaloguje zlyhanie background spracovania bez odmietnutia verejnej odpovede", async () => {
    const backgroundError = new Error("database unavailable");
    mocks.findFirst.mockRejectedValueOnce(backgroundError);

    await completePublicResponse("user@test.invalid");
    expect(mocks.reportError).not.toHaveBeenCalled();

    await runAfterTasks();

    expect(mocks.reportError).toHaveBeenCalledWith(
      "auth.passwordReset",
      backgroundError,
      { action: "reset_failed" },
    );
    expect(mocks.createRecovery).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("pri zlyhaní registrácie after zaloguje chybu a zachová verejnú odpoveď", async () => {
    const scheduleError = new Error("waitUntil unavailable");
    mocks.scheduleAfter.mockImplementationOnce(() => {
      throw scheduleError;
    });

    await expect(completePublicResponse("user@test.invalid")).resolves.toBeUndefined();

    expect(mocks.reportError).toHaveBeenCalledWith(
      "auth.passwordReset.schedule",
      scheduleError,
      { action: "reset_schedule_failed" },
    );
    expect(mocks.afterTasks).toHaveLength(0);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("zablokovaná IP neinkrementuje emailový limit a stále dostane rovnaký padding", async () => {
    mocks.rateLimit.mockResolvedValueOnce({ ok: false, count: 11 });

    await completePublicResponse("user@test.invalid");

    expect(mocks.rateLimit).toHaveBeenCalledOnce();
    expect(mocks.rateLimit).toHaveBeenCalledWith("reset-ip:127.0.0.1", {
      limit: 10,
      windowSec: 3600,
    });
    expect(mocks.scheduleAfter).not.toHaveBeenCalled();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("zachová oba limity, canonical email kľúč a pri blokovaní nič nenaplánuje", async () => {
    mocks.rateLimit
      .mockResolvedValueOnce({ ok: true, count: 1 })
      .mockResolvedValueOnce({ ok: false, count: 4 });

    await completePublicResponse(" USER@test.invalid ");

    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, "reset-email:user@test.invalid", {
      limit: 3,
      windowSec: 3600,
    });
    expect(mocks.scheduleAfter).not.toHaveBeenCalled();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
