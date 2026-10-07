import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  auditContext: vi.fn(),
  auditRequired: vi.fn(),
  revalidatePath: vi.fn(),
}));

const tx = {
  pohodaSyncJob: { findUnique: mocks.findUnique, updateMany: mocks.updateMany },
};

vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/audit", () => ({
  auditRequestContext: mocks.auditContext,
  writeAuditRequired: mocks.auditRequired,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { retrySyncJob } from "@/app/staff/synchronizacia/actions";

describe("retrySyncJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin" });
    mocks.auditContext.mockResolvedValue({ ip: "127.0.0.1", userAgent: "test" });
    mocks.findUnique.mockResolvedValue({ id: "job-1", kind: "ORDER", status: "FAILED", attempts: 2, orderId: "order-1" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditRequired.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  });

  it("updates the queue and writes the required audit through the same transaction client", async () => {
    const result = await retrySyncJob("job-1");

    expect(result).toEqual({ ok: true });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "job-1", status: "FAILED" } }));
    expect(mocks.auditRequired).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: "SYNC_JOB_RETRY", entityId: "job-1" }),
      { ip: "127.0.0.1", userAgent: "test" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/staff/synchronizacia");
  });

  it("does not report success when the required audit fails", async () => {
    mocks.auditRequired.mockRejectedValue(new Error("audit unavailable"));

    await expect(retrySyncJob("job-1")).rejects.toThrow("audit unavailable");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
