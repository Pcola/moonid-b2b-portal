import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpdate: vi.fn(),
  tierFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  companyFindUnique: vi.fn(),
  companyCreate: vi.fn(),
  inviteUser: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessRequest: { findUnique: mocks.requestFindUnique, update: mocks.requestUpdate },
    priceTier: { findFirst: mocks.tierFindFirst },
    user: { findFirst: mocks.userFindFirst },
    company: { findUnique: mocks.companyFindUnique, create: mocks.companyCreate },
  },
}));
vi.mock("@/lib/invite", () => ({ inviteUser: mocks.inviteUser }));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { approveRequest } from "@/app/staff/ziadosti/actions";

describe("schválenie verejnej žiadosti o prístup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({ id: "staff-1" });
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      status: "PENDING",
      ico: "12345678",
      companyName: "Existujúca firma",
      email: "attacker@test.invalid",
      contactName: "Attacker",
    });
    mocks.tierFindFirst.mockResolvedValue({ id: "tier-1" });
    mocks.userFindFirst.mockResolvedValue(null);
  });

  it("existujúce IČO neprepíše a žiadateľovi nepridelí tenant admina", async () => {
    mocks.companyFindUnique.mockResolvedValue({ id: "company-existing" });

    const result = await approveRequest("request-1", "B2B", 14);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("už v portáli existuje");
    expect(mocks.companyCreate).not.toHaveBeenCalled();
    expect(mocks.inviteUser).not.toHaveBeenCalled();
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});
