import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_REMOTE_IMAGE_BYTES, normalizeImageBuffer } from "@/lib/safe-image";

// Verejný bucket s obrázkami produktov (vlastné hostovanie — nie dodávateľ).
export const PRODUCT_BUCKET = "products";

// Anti-SSRF: re-hostovať sa smie len z dôveryhodného zdroja (dodávateľský feed).
const ALLOWED_SOURCE_HOSTS = new Set(["www.partner.humed.sk"]);
// Strop veľkosti sťahovaného obrázka (parita s app/api/img) — ochrana pred memory exhaustion.

/**
 * Stiahne obrázok z externej URL a nahrá ho do Storage bucketu pod stabilným kľúčom.
 * Vráti verejnú URL na Supabase (alebo null pri zlyhaní — volajúci sa rozhodne, čo s tým).
 * Zámerne nikdy nevracia pôvodnú (dodávateľskú) URL.
 */
export async function rehostImage(
  supabase: SupabaseClient,
  sourceUrl: string,
  key: string
): Promise<string | null> {
  try {
    let u: URL;
    try { u = new URL(sourceUrl); } catch { return null; }
    // len https + dôveryhodný host (anti-SSRF: žiadne interné/link-local ciele)
    if (u.protocol !== "https:" || !ALLOWED_SOURCE_HOSTS.has(u.hostname)) return null;

    // redirect:"manual" — 302 z dôveryhodného hosta (alebo open-redirect na ňom)
    // na interné/link-local ciele (169.254.169.254) sa NEnasleduje. 3xx → !res.ok → null.
    const res = await fetch(u.toString(), { redirect: "manual" });
    if (!res.ok || res.status < 200 || res.status >= 300) return null;
    const ct = res.headers.get("content-type");
    // žiadne SVG — vo verejnom buckete by <script> v SVG bol stored-XSS vektor
    if (ct && /svg/i.test(ct)) return null;
    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_REMOTE_IMAGE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_REMOTE_IMAGE_BYTES) return null; // aj keď hlavička klamala/chýbala
    const safe = await normalizeImageBuffer(buf, MAX_REMOTE_IMAGE_BYTES);
    const path = `${key}.${safe.extension}`;
    const { error } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .upload(path, safe.buffer, { contentType: safe.contentType, upsert: true });
    if (error) return null;
    return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
