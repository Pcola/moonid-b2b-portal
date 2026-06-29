import type { SupabaseClient } from "@supabase/supabase-js";

// Verejný bucket s obrázkami produktov (vlastné hostovanie — nie dodávateľ).
export const PRODUCT_BUCKET = "products";

function extFromContentType(ct: string | null): string {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("svg")) return "svg";
  return "jpg";
}

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
    const res = await fetch(sourceUrl);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type");
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${key}.${extFromContentType(ct)}`;
    const { error } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .upload(path, buf, { contentType: ct ?? "image/jpeg", upsert: true });
    if (error) return null;
    return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
