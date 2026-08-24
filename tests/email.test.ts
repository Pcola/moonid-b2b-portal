import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/site-url", () => ({ SITE_URL: "https://staging.moonid.test" }));

describe("centrálne odosielanie e-mailov", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM", "Moonid <test@moonid.test>");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("Resend API error response nikdy neoznačí ako doručený e-mail", async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: "provider rejected" } });
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail({ to: "user@test.invalid", subject: "Test", text: "Text" }))
      .resolves.toEqual({ ok: false });
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });

  it("úspech vráti iba pri potvrdenom Resend message id", async () => {
    mocks.send.mockResolvedValueOnce({ data: { id: "email-1" }, error: null });
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail({ to: "user@test.invalid", subject: "Test", text: "Text" }))
      .resolves.toEqual({ ok: true });
  });
});
