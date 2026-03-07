"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { dispatchProfileUpdated } from "@/lib/profileCompleteness";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import PhoneInput from "react-phone-number-input/max";
import "react-phone-number-input/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImagePlus,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Phone,
  CheckCircle,
  User,
  Ruler,
  Heart,
  Briefcase,
  FileText,
  Save,
  Loader2,
  Camera,
  Wand2,
  ChevronDown,
  Copy,
} from "lucide-react";

const BUCKET = "user-assets";
const MAX_COUNTRY_VISIBLE = 50;

function getCountryDisplayName(code: string, locale: string, fallback: string): string {
  if (locale === "ar") {
    try {
      const dn = new Intl.DisplayNames(["ar"], { type: "region" });
      return dn.of(code.toUpperCase()) ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function SearchableCountrySelect({
  value,
  onChange,
  placeholder,
  className,
  inputClass,
  locale = "en",
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  className?: string;
  inputClass: string;
  locale?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isAr = locale === "ar";
  const searchLower = search.trim().toLowerCase();
  const filtered =
    searchLower.length === 0
      ? COUNTRIES.slice(0, 200)
      : COUNTRIES.filter((c) => {
          const nameEn = c.name.toLowerCase();
          const nameAr = isAr ? getCountryDisplayName(c.code, "ar", "").toLowerCase() : "";
          return nameEn.includes(searchLower) || (nameAr && nameAr.includes(searchLower));
        }).slice(0, 100);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = value || "";
  const selectedCountry = COUNTRIES.find((c) => c.name === value);
  const displayLabel = selectedCountry
    ? getCountryDisplayName(selectedCountry.code, locale, selectedCountry.name)
    : displayValue || placeholder;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full min-h-[2.75rem] items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-zinc-900 shadow-sm outline-none transition-all focus:ring-2 focus:ring-sky-500 placeholder:text-zinc-400 ${!displayValue ? "text-zinc-400" : ""}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedCountry ? (
            <>
              <span className="text-lg leading-none">{getFlagEmoji(selectedCountry.code)}</span>
              <span>{displayLabel}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
          >
            <div className="border-b border-zinc-200 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className={inputClass + " py-2"}
                autoFocus
              />
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.slice(0, MAX_COUNTRY_VISIBLE).map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.name);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-zinc-700 hover:bg-zinc-100"
                  >
                    <span className="text-lg leading-none">{getFlagEmoji(c.code)}</span>
                    <span>{getCountryDisplayName(c.code, locale, c.name)}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-zinc-500">No matches</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
const MAX_PHOTOS = 5;

type Toast = { type: "success" | "error"; message: string } | null;

type ProfileState = {
  full_name: string;
  gender: string;
  email: string;
  phone: string;
  phone_verified: boolean;
  nationality: string;
  age: string;
  marital_status: string;
  height_cm: string;
  weight_kg: string;
  skin_tone: string;
  smoking_status: string;
  religious_commitment: string;
  desire_children: string;
  job_title: string;
  education_level: string;
  country: string;
  city: string;
  about_me: string;
  ideal_partner: string;
  photo_urls: string[];
  primary_photo_index: number;
  photo_privacy_blur: boolean;
};

const initialProfile: ProfileState = {
  full_name: "",
  gender: "",
  email: "",
  phone: "",
  phone_verified: false,
  nationality: "",
  age: "",
  marital_status: "",
  height_cm: "",
  weight_kg: "",
  skin_tone: "",
  smoking_status: "",
  religious_commitment: "",
  desire_children: "",
  job_title: "",
  education_level: "",
  country: "",
  city: "",
  about_me: "",
  ideal_partner: "",
  photo_urls: [],
  primary_photo_index: 0,
  photo_privacy_blur: false,
};

const MARITAL_VALUES = ["", "single", "divorced", "widowed"] as const;
const SKIN_VALUES = ["", "fair", "medium", "olive", "brown", "dark"] as const;
const SMOKING_VALUES = ["", "never", "former", "occasionally", "yes"] as const;
const RELIGIOUS_VALUES = ["", "practicing", "moderate", "revert", "seeking"] as const;
const CHILDREN_VALUES = ["", "yes", "no", "open", "undecided"] as const;
const EDUCATION_VALUES = ["", "high_school", "bachelors", "masters", "doctorate", "other"] as const;

/** Converts option value to translation key suffix, e.g. "high_school" -> "HighSchool". */
function valueToKeySuffix(value: string): string {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("");
}

/**
 * Returns gender-aware label for a dropdown option.
 * Uses profile.gender to show male/female form (e.g. Arabic: أعزب vs عزباء).
 */
function getOptionLabel(
  t: (key: string) => string,
  value: string,
  isFemale: boolean
): string {
  if (!value) return "";
  const suffix = valueToKeySuffix(value);
  const genderedKey = `profile.opt${suffix}${isFemale ? "Female" : "Male"}`;
  const neutralKey = `profile.opt${suffix}`;
  const out = t(genderedKey);
  if (out && out !== genderedKey) return out;
  return t(neutralKey);
}

function toNum(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

const STEP_ORDER = [
  { id: 0, icon: User, key: "step1" as const },
  { id: 1, icon: Ruler, key: "step2" as const },
  { id: 2, icon: Camera, key: "step3" as const },
  { id: 3, icon: FileText, key: "step4" as const },
];

export default function ProfilePage() {
  const router = useRouter();
  const { locale, dir, t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneOtpConfirming, setPhoneOtpConfirming] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState<"about_me" | "ideal_partner" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState<"friendly" | "romantic" | "professional">("friendly");

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/register");
          return;
        }
        setUserId(user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "full_name, gender, email, phone_verified, nationality, age, marital_status, height_cm, weight_kg, skin_tone, smoking_status, religious_commitment, desire_children, job_title, education_level, country, city, about_me, ideal_partner, photo_urls, primary_photo_index, photo_privacy_blur"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Profile fetch error:", error);
          setLoading(false);
          return;
        }

        if (data && typeof data === "object") {
          const raw = data as Record<string, unknown>;
          const safeStr = (v: unknown) => (v != null && typeof v === "string" ? v : v != null ? String(v) : "");
          const safeNum = (v: unknown, def: number) =>
            typeof v === "number" && Number.isFinite(v) ? v : def;
          let photo_urls: string[] = [];
          try {
            if (Array.isArray(raw.photo_urls)) {
              photo_urls = raw.photo_urls.filter((u): u is string => typeof u === "string");
            }
          } catch {
            photo_urls = [];
          }

          setProfile({
            full_name: safeStr(raw.full_name),
            gender: safeStr(raw.gender),
            email: safeStr(raw.email),
            phone: safeStr(raw.phone),
            phone_verified: raw.phone_verified === true,
            nationality: safeStr(raw.nationality),
            age: raw.age != null ? String(raw.age) : "",
            marital_status: safeStr(raw.marital_status),
            height_cm: raw.height_cm != null ? String(raw.height_cm) : "",
            weight_kg: raw.weight_kg != null ? String(raw.weight_kg) : "",
            skin_tone: safeStr(raw.skin_tone),
            smoking_status: safeStr(raw.smoking_status),
            religious_commitment: safeStr(raw.religious_commitment),
            desire_children: safeStr(raw.desire_children),
            job_title: safeStr(raw.job_title),
            education_level: safeStr(raw.education_level),
            country: safeStr(raw.country),
            city: safeStr(raw.city),
            about_me: safeStr(raw.about_me),
            ideal_partner: safeStr(raw.ideal_partner),
            photo_urls,
            primary_photo_index: safeNum(raw.primary_photo_index, 0),
            photo_privacy_blur: raw.photo_privacy_blur === true,
          });
        }
      } catch (err) {
        console.warn("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const updateField = useCallback(<K extends keyof ProfileState>(key: K, value: ProfileState[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  }, []);

  const handleCopyBio = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      void navigator.clipboard.writeText(text.trim()).then(() => showToast("success", t("profile.copied")));
    },
    [showToast, t]
  );

  const performSave = async (): Promise<boolean> => {
    if (!userId) return false;
    const payload: Record<string, unknown> = {
      full_name: profile.full_name?.trim() || null,
      gender: profile.gender?.trim() || null,
      email: profile.email?.trim() || null,
      phone: profile.phone?.trim() || null,
      phone_verified: profile.phone_verified,
      nationality: profile.nationality?.trim() || null,
      age: toNum(profile.age),
      marital_status: profile.marital_status?.trim() || null,
      height_cm: toNum(profile.height_cm),
      weight_kg: toNum(profile.weight_kg),
      skin_tone: profile.skin_tone?.trim() || null,
      smoking_status: profile.smoking_status?.trim() || null,
      religious_commitment: profile.religious_commitment?.trim() || null,
      desire_children: profile.desire_children?.trim() || null,
      job_title: profile.job_title?.trim() || null,
      education_level: profile.education_level?.trim() || null,
      country: profile.country?.trim() || null,
      city: profile.city?.trim() || null,
      about_me: profile.about_me?.trim() || null,
      ideal_partner: profile.ideal_partner?.trim() || null,
      photo_urls: Array.isArray(profile.photo_urls) ? profile.photo_urls : [],
      primary_photo_index: typeof profile.primary_photo_index === "number" ? profile.primary_photo_index : 0,
      photo_privacy_blur: profile.photo_privacy_blur === true,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) throw error;
    dispatchProfileUpdated();
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await performSave();
      if (ok) showToast("success", t("profile.toastSaved"));
    } catch (e) {
      console.warn("Profile save failed:", e);
      showToast("error", e instanceof Error ? e.message : t("profile.toastError"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndReturn = async () => {
    setSaving(true);
    try {
      const ok = await performSave();
      if (ok) {
        showToast("success", t("profile.toastSaved"));
        router.push("/profile");
        return;
      }
    } catch (e) {
      console.warn("Profile save failed:", e);
      showToast("error", e instanceof Error ? e.message : t("profile.toastError"));
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneVerify = async () => {
    const phone = (profile.phone || "").trim();
    if (!phone) {
      showToast("error", t("profile.toastError"));
      return;
    }
    setPhoneOtpLoading(true);
    setPhoneOtpCode("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith("+") ? phone : `+${phone}`,
        options: { channel: "sms" },
      });
      if (error) {
        setPhoneOtpSent(false);
        showToast("error", error.message);
        setPhoneOtpLoading(false);
        return;
      }
      setPhoneOtpSent(true);
      showToast("success", t("profile.enterCode"));
    } catch {
      showToast("error", t("profile.toastError"));
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handlePhoneOtpSimulate = () => {
    setPhoneOtpSent(true);
    setPhoneOtpCode("123456");
    showToast("success", t("profile.enterCode"));
  };

  const handleConfirmOtp = async () => {
    if (!userId) return;
    const code = phoneOtpCode.replace(/\D/g, "").slice(0, 6);
    if (code.length < 6) {
      showToast("error", t("profile.enterCode"));
      return;
    }
    setPhoneOtpConfirming(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: profile.phone.startsWith("+") ? profile.phone : `+${profile.phone}`,
        token: code,
        type: "sms",
      });
      if (error) {
        showToast("error", error.message);
        setPhoneOtpConfirming(false);
        return;
      }
      await supabase.from("profiles").update({ phone_verified: true }).eq("id", userId);
      updateField("phone_verified", true);
      setPhoneOtpSent(false);
      setPhoneOtpCode("");
      showToast("success", t("profile.verified"));
      dispatchProfileUpdated();
    } catch {
      showToast("error", t("profile.toastError"));
    } finally {
      setPhoneOtpConfirming(false);
    }
  };

  const handleConfirmOtpSimulated = async () => {
    if (!userId) return;
    const code = phoneOtpCode.replace(/\D/g, "").slice(0, 6);
    if (code.length < 6) {
      showToast("error", t("profile.enterCode"));
      return;
    }
    if (code !== "123456") {
      showToast("error", t("profile.useSimulatedCode"));
      return;
    }
    setPhoneOtpConfirming(true);
    await new Promise((r) => setTimeout(r, 600));
    await supabase.from("profiles").update({ phone_verified: true }).eq("id", userId);
    updateField("phone_verified", true);
    setPhoneOtpSent(false);
    setPhoneOtpCode("");
    showToast("success", t("profile.verified"));
    dispatchProfileUpdated();
    setPhoneOtpConfirming(false);
  };

  const handleMarkPhoneVerified = async () => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ phone_verified: true }).eq("id", userId);
    if (error) {
      showToast("error", error.message);
      return;
    }
    updateField("phone_verified", true);
    showToast("success", t("profile.verified"));
    dispatchProfileUpdated();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!userId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (profile.photo_urls.length >= MAX_PHOTOS) {
      showToast("error", `${MAX_PHOTOS}`);
      return;
    }
    setUploadingIndex(index);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (uploadError) {
        const msg = String(uploadError.message || "").toLowerCase();
        const isBucketError =
          msg.includes("bucket") ||
          msg.includes("not found") ||
          msg.includes("404") ||
          msg.includes("resource") ||
          msg.includes("does not exist");
        showToast("error", isBucketError ? t("profile.toastBucketMissing") : t("profile.toastUploadFailed"));
        setUploadingIndex(null);
        e.target.value = "";
        return;
      }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const newUrls = [...profile.photo_urls];
      newUrls.splice(index, 0, urlData.publicUrl);
      const trimmed = newUrls.slice(0, MAX_PHOTOS);
      updateField("photo_urls", trimmed);
      if (trimmed.length === 1) updateField("primary_photo_index", 0);
      showToast("success", t("profile.toastSaved"));
    } catch (err) {
      const msg = err instanceof Error ? String(err.message).toLowerCase() : "";
      const isBucketError =
        msg.includes("bucket") ||
        msg.includes("not found") ||
        msg.includes("404") ||
        msg.includes("resource") ||
        msg.includes("does not exist");
      showToast("error", isBucketError ? t("profile.toastBucketMissing") : t("profile.toastUploadFailed"));
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = (index: number) => {
    const newUrls = profile.photo_urls.filter((_, i) => i !== index);
    let newPrimary = profile.primary_photo_index;
    if (profile.primary_photo_index >= newUrls.length && newUrls.length > 0) newPrimary = newUrls.length - 1;
    else if (profile.primary_photo_index >= newUrls.length) newPrimary = 0;
    else if (index < profile.primary_photo_index) newPrimary = profile.primary_photo_index - 1;
    updateField("photo_urls", newUrls);
    updateField("primary_photo_index", newPrimary);
    showToast("success", t("profile.toastPhotoRemoved"));
  };

  const setPrimaryPhoto = (index: number) => {
    updateField("primary_photo_index", index);
    showToast("success", t("profile.toastPrimaryUpdated"));
  };

  const handleAiSuggest = async (field: "about_me" | "ideal_partner") => {
    setAiLoading(field);
    setIsLoading(true);
    try {
      const age = profile.age || "unknown";
      const job = profile.job_title || "unknown";
      const userGender = profile.gender === "female" ? "بنت" : "شاب";
      const targetAudience =
        profile.gender === "female"
          ? "للشباب اللي بيزوروا بروفايلي"
          : "للبنات اللي بيزوروا بروفايلي";
      const toneText =
        tone === "friendly" ? "رايق وكول" : tone === "romantic" ? "رومانسي وحالم" : "جاد وعملي";
      const aboutMe = profile.about_me?.trim() || "(لم يذكر بعد)";
      const partnerInfo = profile.ideal_partner?.trim() || "(لم يذكر بعد)";

      const prompt =
        field === "about_me"
          ? `أنت كاتب محتوى بروفايلات محترف. اكتب نبذة تعريفية (Bio) تظهر في بروفايلي الشخصي ليقرأها الآخرون.
المعطيات:
- أنا ${userGender}، سني ${age}، وبشتغل ${job}.
- عن نفسي: "${aboutMe}"
- شريكي المنشود: "${partnerInfo}"
- المود: ${toneText}

المطلوب (بكل دقة):
1. اكتب بلساني (أنا) بصيغة المتكلم، بس النص يكون موجه "للناس اللي بتقرأ بروفايلي" (مش ليا أنا).
2. اللهجة: عربية بيضاء (مصرية/سعودية خفيفة) بعيدة عن الفصحى.
3. ادمج كلامي عن نفسي مع تطلعاتي في "شريكي" في فقرة واحدة صايعة (أقصى حاجة 4 سطور).
4. ابعد تماماً عن صيغة النصيحة أو المخاطبة ليا.. ابدأ فوراً في تقديم نفسي بأسلوب جذاب.
5. النتيجة: النص فقط.`
          : `أنت كاتب محتوى بروفايلات محترف. اكتب وصفاً قصيراً بالعربية (من 2 لـ 4 أسطر) عن الشريك المثالي لشخص ${userGender} عمره ${age} وبشتغل ${job}. الجمهور: ${targetAudience}. المود: ${toneText}. عن نفسه: "${aboutMe}". شريكي المنشود: "${partnerInfo}". النتيجة: النص فقط.`;

      console.log("Gemini prompt (before send):", prompt);

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      let text = "";
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        if (text) console.log("AI Response:", text);
      } else {
        console.warn("Gemini request failed:", res.status, await res.text());
      }

      if (text) updateField(field, text);
      else showToast("error", t("profile.toastError"));
    } catch (e) {
      console.log(e);
    } finally {
      setAiLoading(null);
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen message={t("common.loading")} theme="sky" />
    );
  }

  const isFemale = (profile.gender || "").toLowerCase() === "female";
  const theme = {
    accent: isFemale ? "pink" : "sky",
    bg: isFemale ? "bg-pink-100" : "bg-sky-100",
    border: isFemale ? "border-pink-300" : "border-sky-300",
    text: isFemale ? "text-pink-600" : "text-sky-600",
    textMuted: isFemale ? "text-pink-700" : "text-sky-700",
    focusRing: isFemale ? "focus:ring-pink-500" : "focus:ring-sky-500",
    hoverBorder: isFemale ? "hover:border-pink-400" : "hover:border-sky-400",
    hoverBg: isFemale ? "hover:bg-pink-100" : "hover:bg-sky-100",
    hoverText: isFemale ? "hover:text-pink-600" : "hover:text-sky-600",
    fill: isFemale ? "fill-pink-600" : "fill-sky-600",
    badge: isFemale ? "bg-pink-500" : "bg-sky-500",
    primaryBtn: isFemale ? "bg-pink-500 hover:bg-pink-600 text-white border-0" : "bg-sky-500 hover:bg-sky-600 text-white border-0",
  };

  const cardClass = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6";
  const inputClass =
    `min-h-[2.75rem] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm outline-none transition-all ${theme.focusRing} focus:ring-2 placeholder:text-zinc-400`;
  const buttonClass =
    `inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all ${theme.focusRing} focus:ring-2 disabled:opacity-60`;

  return (
    <div className="min-h-full space-y-6 bg-[#f8f9fa] pb-8 font-[family-name:var(--font-cairo)]" dir={dir}>
      {/* Page header: title and subtitle only; save actions are at bottom of form */}
      <header className={`mb-8 ${dir === "rtl" ? "text-right" : "text-left"}`}>
        <h1 className="text-2xl font-semibold text-zinc-900">{t("profile.title")}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t("profile.subtitle")}</p>
      </header>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-xl sm:left-auto ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="alert"
        >
          {toast.message}
        </motion.div>
      )}

      {/* Stepper */}
      <nav
        className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm sm:flex-nowrap"
        aria-label="Profile sections"
      >
        {STEP_ORDER.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStep(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
              step === id
                ? `${theme.bg} ${theme.text} border ${theme.border}`
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(`profile.${key}`)}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: dir === "rtl" ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir === "rtl" ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[320px]"
        >
          {step === 0 && (
            <div className="space-y-6">
              <section className={cardClass}>
                <h2 className={`mb-4 flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
                  <User className="h-5 w-5" />
                  {t("profile.step1")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.fullName")}</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.gender")}</label>
                    <select
                      value={profile.gender || ""}
                      disabled
                      aria-readonly
                      className={inputClass + " opacity-75 cursor-not-allowed"}
                    >
                      <option value="">{t("profile.selectOption")}</option>
                      <option value="male">{t("profile.male")}</option>
                      <option value="female">{t("profile.female")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.nationality")}</label>
                    <SearchableCountrySelect
                      value={profile.nationality}
                      onChange={(name) => updateField("nationality", name)}
                      placeholder={t("profile.selectOption")}
                      inputClass={inputClass}
                      locale={locale ?? "en"}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.age")}</label>
                    <input
                      type="number"
                      min={18}
                      max={120}
                      value={profile.age}
                      onChange={(e) => updateField("age", e.target.value)}
                      className={inputClass}
                    />
                    {!profile.age?.trim() && (
                      <p className="mt-1 text-xs text-amber-600">{t("profile.completeFieldToBoostStrength")}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.maritalStatus")}</label>
                    <select value={profile.marital_status} onChange={(e) => updateField("marital_status", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {MARITAL_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{getOptionLabel(t, v, isFemale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.email")}</label>
                    <input type="email" value={profile.email} readOnly disabled className={inputClass + " opacity-75 cursor-not-allowed"} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.phoneVerification")}</label>
                    <p className="mb-2 text-xs text-zinc-500">{t("profile.phoneVerifySubtitle")}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <PhoneInput
                        international
                        defaultCountry="EG"
                        value={profile.phone || undefined}
                        onChange={(val) => updateField("phone", val || "")}
                        className="flex flex-1 rounded-xl border border-zinc-200 bg-white [&_.PhoneInputInput]:rounded-r-xl [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:px-4 [&_.PhoneInputInput]:py-2.5 [&_.PhoneInputInput]:text-zinc-900 [&_.PhoneInputCountry]:rounded-l-xl [&_.PhoneInputCountry]:bg-zinc-50 [&_.PhoneInputCountry]:pl-3 [&_.PhoneInputCountrySelectArrow]:text-zinc-500"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handlePhoneVerify}
                          disabled={phoneOtpLoading || profile.phone_verified}
                          className={`inline-flex items-center gap-2 rounded-xl border ${theme.border} ${theme.bg} px-4 py-2.5 text-sm font-medium ${theme.textMuted} disabled:opacity-60`}
                        >
                          {phoneOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("profile.sendOtp")}
                        </button>
                        <button
                          type="button"
                          onClick={handlePhoneOtpSimulate}
                          disabled={profile.phone_verified || phoneOtpSent}
                          className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                        >
                          {t("profile.simulateOtp")}
                        </button>
                      </div>
                    </div>
                    {phoneOtpSent && !profile.phone_verified && (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.enterCode")}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={phoneOtpCode}
                            onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className={inputClass + " max-w-[10rem] text-center text-lg tracking-[0.4em]"}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleConfirmOtpSimulated} disabled={phoneOtpCode.length < 6 || phoneOtpConfirming} className={`inline-flex items-center gap-2 rounded-xl border ${theme.border} ${theme.bg} px-4 py-2.5 text-sm font-medium ${theme.textMuted} disabled:opacity-60`}>
                            {phoneOtpConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {t("profile.confirmSimulated")}
                          </button>
                          <button type="button" onClick={handleConfirmOtp} disabled={phoneOtpCode.length < 6 || phoneOtpConfirming} className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-60">
                            {t("profile.confirmRealSms")}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {profile.phone_verified && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          {t("profile.verified")}
                        </span>
                      )}
                      {phoneOtpSent && !profile.phone_verified && (
                        <button type="button" onClick={handleMarkPhoneVerified} className={`text-sm ${theme.text} underline opacity-90 hover:opacity-100`}>
                          {t("profile.markVerified")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <section className={cardClass}>
                <h2 className={`mb-1 flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
                  <Ruler className="h-5 w-5" />
                  {t("profile.appearance")}
                </h2>
                <p className="mb-4 text-xs text-slate-500">{t("profile.appearanceSub")}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.height")}</label>
                    <input type="number" min={100} max={250} value={profile.height_cm} onChange={(e) => updateField("height_cm", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.weight")}</label>
                    <input type="number" min={30} max={300} value={profile.weight_kg} onChange={(e) => updateField("weight_kg", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.skinTone")}</label>
                    <select value={profile.skin_tone} onChange={(e) => updateField("skin_tone", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {SKIN_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{getOptionLabel(t, v, isFemale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              <section className={cardClass}>
                <h2 className={`mb-1 flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
                  <Heart className="h-5 w-5" />
                  {t("profile.lifestyle")}
                </h2>
                <p className="mb-4 text-xs text-zinc-500">{t("profile.lifestyleSub")}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.smoking")}</label>
                    <select value={profile.smoking_status} onChange={(e) => updateField("smoking_status", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {SMOKING_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{getOptionLabel(t, v, isFemale)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.religiousCommitment")}</label>
                    <select value={profile.religious_commitment} onChange={(e) => updateField("religious_commitment", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {RELIGIOUS_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{getOptionLabel(t, v, isFemale)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.desireChildren")}</label>
                    <select value={profile.desire_children} onChange={(e) => updateField("desire_children", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {CHILDREN_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{getOptionLabel(t, v, isFemale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              <section className={cardClass}>
                <h2 className={`mb-1 flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
                  <Briefcase className="h-5 w-5" />
                  {t("profile.career")}
                </h2>
                <p className="mb-4 text-xs text-zinc-500">{t("profile.careerSub")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.jobTitle")}</label>
                    <input type="text" value={profile.job_title} onChange={(e) => updateField("job_title", e.target.value)} className={inputClass} />
                    {!profile.job_title?.trim() && (
                      <p className="mt-1 text-xs text-amber-600">{t("profile.completeFieldToBoostStrength")}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.education")}</label>
                    <select value={profile.education_level} onChange={(e) => updateField("education_level", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {EDUCATION_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{getOptionLabel(t, v, isFemale)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.country")}</label>
                    <SearchableCountrySelect
                      value={profile.country}
                      onChange={(name) => updateField("country", name)}
                      locale={locale ?? "en"}
                      placeholder={t("profile.selectOption")}
                      inputClass={inputClass}
                    />
                    {!profile.country?.trim() && !profile.city?.trim() && (
                      <p className="mt-1 text-xs text-amber-600">{t("profile.completeFieldToBoostStrength")}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">{t("profile.city")}</label>
                    <input type="text" value={profile.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} />
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <section className={cardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
                    <Camera className="h-5 w-5" />
                    {t("profile.photos")}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">{t("profile.photosSub")}</p>
                  {profile.photo_urls.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">{t("profile.completeFieldToBoostStrength")}</p>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
                  <span className="flex items-center gap-1.5">
                    {profile.photo_privacy_blur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {t("profile.blurNonMatches")}
                  </span>
                  <input type="checkbox" checked={profile.photo_privacy_blur} onChange={(e) => updateField("photo_privacy_blur", e.target.checked)} className={`h-4 w-4 rounded border-zinc-300 bg-white ${theme.focusRing} focus:ring-2`} />
                </label>
              </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                  <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    {profile.photo_urls[i] ? (
                      <>
                        <img src={profile.photo_urls[i]} alt="" className={`h-full w-full object-cover ${profile.photo_privacy_blur ? "blur-md" : ""}`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition group-hover:opacity-100">
                          <button type="button" onClick={() => setPrimaryPhoto(i)} className={`rounded-lg bg-white/95 p-2.5 ${theme.text} shadow-lg hover:bg-zinc-100`} title={t("profile.setPrimary")}>
                            <Star className={`h-5 w-5 ${profile.primary_photo_index === i ? theme.fill : ""}`} />
                          </button>
                          <button type="button" onClick={() => handleDeletePhoto(i)} className="rounded-lg bg-white/95 p-2.5 text-red-500 shadow-lg hover:bg-zinc-100" title={t("profile.delete")}>
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        {profile.primary_photo_index === i && (
                          <span className={`absolute left-2 top-2 rounded-md ${theme.badge} px-2 py-1 text-xs font-semibold text-white shadow`}>{t("profile.primary")}</span>
                        )}
                      </>
                    ) : (
                      <label className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-500 ${theme.hoverBorder} hover:bg-zinc-100 ${theme.hoverText}`}>
                        {uploadingIndex === i ? <Loader2 className="h-8 w-8 animate-spin" /> : <><ImagePlus className="h-10 w-10" /><span className="text-xs font-medium">{t("profile.addPhoto")}</span></>}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, i)} disabled={uploadingIndex !== null} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className={cardClass}>
              <h2 className={`mb-1 flex items-center gap-2 text-lg font-semibold ${theme.text}`}>
                <FileText className="h-5 w-5" />
                {t("profile.personalEssays")}
              </h2>
              <p className="mb-4 text-xs text-zinc-500">{t("profile.personalEssaysSub")}</p>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium text-zinc-500">{t("profile.aboutMe")}</label>
                    {!profile.about_me?.trim() && (
                      <span className="text-xs text-amber-600">{t("profile.completeFieldToBoostStrength")}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as "friendly" | "romantic" | "professional")}
                        className={`rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm outline-none ${theme.focusRing} focus:ring-2`}
                      >
                        <option value="friendly">رايق</option>
                        <option value="romantic">رومانسي</option>
                        <option value="professional">جاد</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAiSuggest("about_me")}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.border} ${theme.bg} px-2.5 py-1.5 text-xs font-medium ${theme.textMuted} ${theme.hoverBg} disabled:opacity-60`}
                      >
                        {aiLoading === "about_me" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        {t("profile.magicWand")}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex justify-end border-b border-zinc-200 bg-zinc-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleCopyBio(profile.about_me)}
                        disabled={!profile.about_me.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 disabled:opacity-40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                    <textarea
                      dir={dir}
                      value={profile.about_me}
                      onChange={(e) => updateField("about_me", e.target.value)}
                      rows={5}
                      placeholder={t("profile.aboutMePlaceholder")}
                      className={inputClass + " min-h-0 resize-y rounded-t-none rounded-b-xl border-t-0 bg-transparent text-lg leading-relaxed"}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium text-zinc-700">{t("profile.idealPartner")}</label>
                    {!profile.ideal_partner?.trim() && (
                      <span className="text-xs text-amber-600">{t("profile.completeFieldToBoostStrength")}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as "friendly" | "romantic" | "professional")}
                        className={`rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm outline-none ${theme.focusRing} focus:ring-2`}
                      >
                        <option value="friendly">رايق</option>
                        <option value="romantic">رومانسي</option>
                        <option value="professional">جاد</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAiSuggest("ideal_partner")}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.border} ${theme.bg} px-2.5 py-1.5 text-xs font-medium ${theme.textMuted} ${theme.hoverBg} disabled:opacity-60`}
                      >
                        {aiLoading === "ideal_partner" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        {t("profile.magicWand")}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex justify-end border-b border-zinc-200 bg-zinc-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleCopyBio(profile.ideal_partner)}
                        disabled={!profile.ideal_partner.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 disabled:opacity-40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                    <textarea
                      dir={dir}
                      value={profile.ideal_partner}
                      onChange={(e) => updateField("ideal_partner", e.target.value)}
                      rows={5}
                      placeholder={t("profile.idealPartnerPlaceholder")}
                      className={inputClass + " min-h-0 resize-y rounded-t-none rounded-b-xl border-t-0 bg-transparent text-lg leading-relaxed"}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Save actions at bottom only — consistent spacing from last field */}
      <div className={`mt-8 flex flex-wrap justify-end gap-3 pt-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={buttonClass + ` border ${theme.border} ${theme.primaryBtn}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("profile.saveChanges")}
        </button>
        <button
          type="button"
          onClick={handleSaveAndReturn}
          disabled={saving}
          className={buttonClass + ` border ${theme.border} ${theme.primaryBtn}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("profile.saveAndReturn")}
        </button>
      </div>
    </div>
  );
}
