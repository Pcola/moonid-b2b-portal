import { afterEach, describe, expect, it, vi } from "vitest";
import { passwordCompromiseStatus } from "@/lib/password-security";

afterEach(() => vi.unstubAllGlobals());

describe("passwordCompromiseStatus", () => {
  it("sends only the five-character k-anonymity prefix and detects a leaked password", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n00000000000000000000000000000000000:0",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(passwordCompromiseStatus("password")).resolves.toBe("pwned");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.pwnedpasswords.com/range/5BAA6");
    expect(String(url)).not.toContain("1E4C9B93F3F0682250B6CF8331B7EE68FD8");
    expect(init.headers).toMatchObject({ "Add-Padding": "true", "User-Agent": "Moonid-B2B-Portal/1.0" });
    expect(init.cache).toBe("no-store");
  });

  it("treats padded zero-count entries as clean", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:0",
    }));
    await expect(passwordCompromiseStatus("password")).resolves.toBe("clean");
  });

  it("fails closed when the provider is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    await expect(passwordCompromiseStatus("password")).resolves.toBe("unavailable");
  });
});
