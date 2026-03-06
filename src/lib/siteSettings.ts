import { supabase } from "@/lib/supabaseClient";

export type SiteSettingsRow = {
  id: string;
  logo_url: string | null;
  home_background_url: string | null;
  hero_heading_en: string | null;
  hero_heading_ar: string | null;
  hero_subheading_en: string | null;
  hero_subheading_ar: string | null;
  pledge_text_en: string | null;
  pledge_text_ar: string | null;
  updated_at: string;
};

const SITE_ASSETS_BUCKET = "site-assets";

/** Fetch the single site_settings row (singleton). */
export async function getSiteSettings(): Promise<SiteSettingsRow | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as SiteSettingsRow | null;
}

/** Upload a file to site-assets and return its public URL. Replaces existing file at same path. */
export async function uploadSiteAsset(
  path: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(SITE_ASSETS_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(data.path);
  return { url: publicUrl };
}

/** Update the singleton site_settings row. Pass the row id from getSiteSettings. */
export async function updateSiteSettings(
  id: string,
  updates: Partial<Omit<SiteSettingsRow, "id" | "updated_at">>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("site_settings")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
