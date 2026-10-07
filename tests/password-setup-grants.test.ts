import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueGrant: vi.fn(),
  updateManyGrant: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordSetupGrant: {
      findUnique: mocks.findUniqueGrant,
      updateMany: mocks.updateManyGrant,
    },
    $queryRaw: mocks.queryRaw,
  },
}));

import {
  activateImplicitPasswordSetupGrant,
  claimPasswordSetupGrant,
  finishPasswordSetupGrant,
} from "@/lib/password-setup-grants";

const AUTH_ID = "a633b737-baed-484a-b118-75db4238ce90";
const SESSION_ID = "6633b737-baed-484a-b118-75db4238ce91";
const OTHER_SESSION_ID = "7633b737-baed-484a-b118-75db4238ce92";
const NONCE = Buffer.alloc(32, 7).toString("base64url");

function claims(method = "otp", sessionId = SESSION_ID) {
  return {
    sub: AUTH_ID,
    session_id: sessionId,
    amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }],
  };
}

function pendingGrant(overrides: Record<string, unknown> = {}) {
  return {
    id: "grant-1",
    authId: AUTH_ID,
    purpose: "RECOVERY",
    status: "PENDING",
    sessionId: null,
    verifiedUntil: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(Date.now() - 1_000),
    user: { authId: AUTH_ID, active: true, company: { active: true } },
    ...overrides,
  };
}

describe("password setup grant state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUniqueGrant.mockResolvedValue(pendingGrant());
    mocks.updateManyGrant.mockResolvedValue({ count: 1 });
  });

  it("atomicky aktivuje účelový recovery grant pre konkrétnu session", async () => {
    await expect(activateImplicitPasswordSetupGrant(NONCE, claims())).resolves.toBe(true);
    expect(mocks.updateManyGrant).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "grant-1", authId: AUTH_ID, status: "PENDING" }),
      data: expect.objectContaining({ status: "VERIFIED", sessionId: SESSION_ID }),
    }));
  });

  it.each(["password", "totp", "magiclink"])("odmietne %s session aj s platným nonce", async (method) => {
    await expect(activateImplicitPasswordSetupGrant(NONCE, claims(method))).resolves.toBe(false);
    expect(mocks.findUniqueGrant).not.toHaveBeenCalled();
  });

  it("retry je idempotentný iba pre tú istú session a nepredĺži okno", async () => {
    mocks.findUniqueGrant.mockResolvedValueOnce(pendingGrant({
      status: "VERIFIED",
      sessionId: SESSION_ID,
      verifiedUntil: new Date(Date.now() + 30_000),
    }));
    await expect(activateImplicitPasswordSetupGrant(NONCE, claims())).resolves.toBe(true);
    expect(mocks.updateManyGrant).not.toHaveBeenCalled();

    mocks.findUniqueGrant.mockResolvedValueOnce(pendingGrant({
      status: "VERIFIED",
      sessionId: SESSION_ID,
      verifiedUntil: new Date(Date.now() + 30_000),
    }));
    await expect(activateImplicitPasswordSetupGrant(NONCE, claims("otp", OTHER_SESSION_ID))).resolves.toBe(false);
  });

  it.each([
    { label: "revoked", patch: { status: "REVOKED" } },
    { label: "expired", patch: { expiresAt: new Date(Date.now() - 1) } },
    { label: "inactive user", patch: { user: { authId: AUTH_ID, active: false, company: null } } },
    { label: "wrong auth user", patch: { authId: "b633b737-baed-484a-b118-75db4238ce90" } },
  ])("odmietne $label grant", async ({ patch }) => {
    mocks.findUniqueGrant.mockResolvedValueOnce(pendingGrant(patch));
    await expect(activateImplicitPasswordSetupGrant(NONCE, claims())).resolves.toBe(false);
    expect(mocks.updateManyGrant).not.toHaveBeenCalled();
  });

  it("pri dvoch súbežných claime DB vráti presne jedného víťaza", async () => {
    const row = { id: "grant-1", userId: "app-user-1", companyId: "company-1", authId: AUTH_ID };
    mocks.queryRaw.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

    const results = await Promise.all([claimPasswordSetupGrant(claims()), claimPasswordSetupGrant(claims())]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("finalizuje iba vlastný PROCESSING attempt", async () => {
    const grant = { id: "grant-1", userId: "app-user-1", companyId: null, authId: AUTH_ID, attemptId: "attempt-1" };
    await expect(finishPasswordSetupGrant(grant, true)).resolves.toBe(true);
    expect(mocks.updateManyGrant).toHaveBeenCalledWith({
      where: { id: "grant-1", attemptId: "attempt-1", status: "PROCESSING" },
      data: { status: "CONSUMED" },
    });
  });
});
