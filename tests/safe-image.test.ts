import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeImageBuffer } from "@/lib/safe-image";

describe("normalizácia nedôveryhodných obrázkov", () => {
  it("dekóduje raster a uloží iba statický WebP bez metadát", async () => {
    const source = await sharp({ create: { width: 4, height: 3, channels: 4, background: "#163f38" } })
      .png()
      .withMetadata({ exif: { IFD0: { Copyright: "secret" } } })
      .toBuffer();
    const result = await normalizeImageBuffer(source);
    const metadata = await sharp(result.buffer).metadata();
    expect(result.contentType).toBe("image/webp");
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(3);
    expect(metadata.exif).toBeUndefined();
  });

  it("odmietne SVG/HTML aj keď útočník klame MIME typom mimo helpera", async () => {
    await expect(normalizeImageBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')))
      .rejects.toThrow(/nepovolen/i);
  });

  it("odmietne vstup nad povoleným bajtovým limitom ešte pred dekódovaním", async () => {
    await expect(normalizeImageBuffer(Buffer.alloc(32), 16)).rejects.toThrow(/veľkosť/i);
  });
});
