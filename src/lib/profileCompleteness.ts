/**
 * Profile completeness: which fields count and how.
 * Used by DashboardShell and profile page. Dispatch 'profile-updated' to refresh shell.
 */

export type ProfileForCompleteness = {
  full_name?: string | null;
  gender?: string | null;
  email?: string | null;
  is_verified?: boolean | null;
  phone?: string | null;
  phone_verified?: boolean | null;
  nationality?: string | null;
  age?: number | null;
  marital_status?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  skin_tone?: string | null;
  smoking_status?: string | null;
  religious_commitment?: string | null;
  desire_children?: string | null;
  job_title?: string | null;
  education_level?: string | null;
  country?: string | null;
  city?: string | null;
  about_me?: string | null;
  ideal_partner?: string | null;
  photo_urls?: unknown;
};

const FIELDS: { key: keyof ProfileForCompleteness; weight: number }[] = [
  { key: "full_name", weight: 8 },
  { key: "gender", weight: 4 },
  { key: "email", weight: 6 },
  { key: "is_verified", weight: 6 },
  { key: "phone", weight: 5 },
  { key: "phone_verified", weight: 5 },
  { key: "nationality", weight: 5 },
  { key: "age", weight: 4 },
  { key: "marital_status", weight: 4 },
  { key: "height_cm", weight: 3 },
  { key: "weight_kg", weight: 2 },
  { key: "skin_tone", weight: 3 },
  { key: "smoking_status", weight: 3 },
  { key: "religious_commitment", weight: 5 },
  { key: "desire_children", weight: 4 },
  { key: "job_title", weight: 6 },
  { key: "education_level", weight: 4 },
  { key: "country", weight: 4 },
  { key: "city", weight: 4 },
  { key: "about_me", weight: 8 },
  { key: "ideal_partner", weight: 7 },
  { key: "photo_urls", weight: 4 },
];

const TOTAL_WEIGHT = FIELDS.reduce((s, f) => s + f.weight, 0);

function filled(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "number") return Number.isFinite(val) && val > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

export function getProfileCompleteness(profile: ProfileForCompleteness | null): number {
  if (!profile) return 0;
  let score = 0;
  for (const { key, weight } of FIELDS) {
    const v = profile[key];
    if (key === "photo_urls") {
      if (Array.isArray(v) && v.length > 0) score += weight;
    } else if (key === "is_verified" || key === "phone_verified") {
      if (v === true) score += weight;
    } else if (filled(v)) {
      score += weight;
    }
  }
  return Math.min(100, Math.round((score / TOTAL_WEIGHT) * 100));
}

export const PROFILE_UPDATED_EVENT = "profile-updated";

export function dispatchProfileUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
  }
}
