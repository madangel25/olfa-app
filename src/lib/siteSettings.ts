import { supabase } from "@/lib/supabaseClient";

export type SiteSettingsRow = {
  id: string;
  site_name: string | null;
  maintenance_mode: boolean | null;
  contact_email: string | null;
  logo_url: string | null;
  home_background_url: string | null;
  landing_feature_image_url: string | null;
  hero_heading_en: string | null;
  hero_heading_ar: string | null;
  hero_subheading_en: string | null;
  hero_subheading_ar: string | null;
  pledge_text_en: string | null;
  pledge_text_ar: string | null;
  theme_male: string | null;
  theme_female: string | null;
  updated_at: string;
};

export const THEME_OPTIONS_MALE = [
  { value: "blue", label: "Light Blue", labelAr: "أزرق فاتح" },
  { value: "slate", label: "Slate / Navy", labelAr: "رمادي غامق" },
  { value: "emerald", label: "Emerald", labelAr: "زمردي" },
] as const;

export const THEME_OPTIONS_FEMALE = [
  { value: "pink-gold", label: "Soft Pink / Gold", labelAr: "وردي ذهبي" },
  { value: "rose", label: "Rose", labelAr: "وردي" },
  { value: "violet", label: "Violet", labelAr: "بنفسجي" },
] as const;

const SITE_ASSETS_BUCKET = "site-assets";

/** Hardcoded defaults when site_settings table is unavailable (500/409) or not ready. */
export const DEFAULT_SITE_SETTINGS: SiteSettingsRow = {
  id: "",
  site_name: "Olfa",
  maintenance_mode: false,
  contact_email: null,
  logo_url: null,
  home_background_url: null,
  landing_feature_image_url: null,
  hero_heading_en: "Find your life partner",
  hero_heading_ar: "ابحث عن شريك حياتك",
  hero_subheading_en: "A serious, respectful space for marriage",
  hero_subheading_ar: "مساحة جادة ومحترمة للزواج",
  pledge_text_en: null,
  pledge_text_ar: null,
  theme_male: "blue",
  theme_female: "pink-gold",
  updated_at: new Date(0).toISOString(),
};

/** Fetch the single site_settings row (singleton). Simple select, no extra filters. Does not throw; returns null on error. */
export async function getSiteSettings(): Promise<SiteSettingsRow | null> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[getSiteSettings] Supabase error:", {
        message: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code,
      });
      return null;
    }
    if (data == null) return null;
    return data as SiteSettingsRow;
  } catch (err) {
    console.error("[getSiteSettings] Unexpected error:", err);
    return null;
  }
}

/** Fetch site settings, or return defaults if the table is unavailable or errors (500/409). */
export async function getSiteSettingsWithDefaults(): Promise<SiteSettingsRow> {
  const row = await getSiteSettings();
  return row ?? DEFAULT_SITE_SETTINGS;
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
  try {
    const { error } = await supabase
      .from("site_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update site settings." };
  }
}
