"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { dispatchProfileUpdated } from "@/lib/profileCompleteness";
import { useLanguage } from "@/contexts/LanguageContext";
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
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-left text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${!displayValue ? "text-slate-500" : ""}`}
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
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
          >
            <div className="border-b border-slate-700 p-2">
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
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-slate-200 hover:bg-white/10"
                  >
                    <span className="text-lg leading-none">{getFlagEmoji(c.code)}</span>
                    <span>{getCountryDisplayName(c.code, locale, c.name)}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-500">No matches</li>
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

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
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
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId);
      if (error) throw error;
      showToast("success", t("profile.toastSaved"));
      dispatchProfileUpdated();
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
    try {
      const age = profile.age || "unknown";
      const job = profile.job_title || "unknown";
      const prompt =
        field === "about_me"
          ? `Write a short bio for a person who is ${age} years old and works as ${job}.`
          : `Write a short description of an ideal partner for someone who is ${age} years old and works as ${job}.`;

      const apiKey = "AIzaSyDBL4SLwdNUixl7aViHZTIrXGAsNCgNsCQ";
      const modelsToTry = ["gemini-pro", "gemini-1.0-pro"] as const;
      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.7,
        },
      };

      let text = "";
      for (const modelId of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
          if (text) {
            console.log("AI Response:", text);
            break;
          }
        } else {
          console.warn(`Gemini (${modelId}) failed:`, res.status, await res.text());
        }
      }

      if (text) updateField(field, text);
      else showToast("error", t("profile.toastError"));
    } catch (e) {
      console.log(e);
    } finally {
      setAiLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" dir={dir}>
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const cardClass = "rounded-2xl border border-slate-700/80 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6";
  const inputClass =
    "w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50";

  return (
    <div className="space-y-6 pb-8" dir={dir}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{t("profile.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("profile.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-5 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("profile.save")}
        </button>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg sm:left-auto ${
            toast.type === "success"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-100"
              : "border-red-500/50 bg-red-500/20 text-red-100"
          }`}
          role="alert"
        >
          {toast.message}
        </motion.div>
      )}

      {/* Stepper */}
      <nav
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/50 p-2 backdrop-blur-sm sm:flex-nowrap"
        aria-label="Profile sections"
      >
        {STEP_ORDER.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStep(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
              step === id
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
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
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-400">
                  <User className="h-5 w-5" />
                  {t("profile.step1")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.fullName")}</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.nationality")}</label>
                    <SearchableCountrySelect
                      value={profile.nationality}
                      onChange={(name) => updateField("nationality", name)}
                      placeholder={t("profile.selectOption")}
                      inputClass={inputClass}
                      locale={locale ?? "en"}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.age")}</label>
                    <input
                      type="number"
                      min={18}
                      max={120}
                      value={profile.age}
                      onChange={(e) => updateField("age", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.maritalStatus")}</label>
                    <select value={profile.marital_status} onChange={(e) => updateField("marital_status", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {MARITAL_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{t(`profile.opt${v.charAt(0).toUpperCase() + v.slice(1)}` as "optSingle" | "optDivorced" | "optWidowed")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.email")}</label>
                    <input type="email" value={profile.email} readOnly disabled className={inputClass + " opacity-75 cursor-not-allowed"} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.phoneVerification")}</label>
                    <p className="mb-2 text-xs text-slate-500">{t("profile.phoneVerifySubtitle")}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <PhoneInput
                        international
                        defaultCountry="EG"
                        value={profile.phone || undefined}
                        onChange={(val) => updateField("phone", val || "")}
                        className="flex flex-1 rounded-xl border border-slate-600 bg-slate-800/80 [&_.PhoneInputInput]:rounded-r-xl [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:px-4 [&_.PhoneInputInput]:py-2.5 [&_.PhoneInputInput]:text-slate-100 [&_.PhoneInputCountry]:rounded-l-xl [&_.PhoneInputCountry]:bg-slate-800/80 [&_.PhoneInputCountry]:pl-3 [&_.PhoneInputCountrySelectArrow]:text-slate-400"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handlePhoneVerify}
                          disabled={phoneOtpLoading || profile.phone_verified}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-200 disabled:opacity-60"
                        >
                          {phoneOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("profile.sendOtp")}
                        </button>
                        <button
                          type="button"
                          onClick={handlePhoneOtpSimulate}
                          disabled={profile.phone_verified || phoneOtpSent}
                          className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                        >
                          {t("profile.simulateOtp")}
                        </button>
                      </div>
                    </div>
                    {phoneOtpSent && !profile.phone_verified && (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.enterCode")}</label>
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
                          <button type="button" onClick={handleConfirmOtpSimulated} disabled={phoneOtpCode.length < 6 || phoneOtpConfirming} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-200 disabled:opacity-60">
                            {phoneOtpConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {t("profile.confirmSimulated")}
                          </button>
                          <button type="button" onClick={handleConfirmOtp} disabled={phoneOtpCode.length < 6 || phoneOtpConfirming} className="rounded-xl border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-60">
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
                        <button type="button" onClick={handleMarkPhoneVerified} className="text-sm text-amber-400 underline hover:text-amber-300">
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
                <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
                  <Ruler className="h-5 w-5" />
                  {t("profile.appearance")}
                </h2>
                <p className="mb-4 text-xs text-slate-500">{t("profile.appearanceSub")}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.height")}</label>
                    <input type="number" min={100} max={250} value={profile.height_cm} onChange={(e) => updateField("height_cm", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.weight")}</label>
                    <input type="number" min={30} max={300} value={profile.weight_kg} onChange={(e) => updateField("weight_kg", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.skinTone")}</label>
                    <select value={profile.skin_tone} onChange={(e) => updateField("skin_tone", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {SKIN_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{t(`profile.opt${v.charAt(0).toUpperCase() + v.slice(1)}` as "optFair" | "optMedium" | "optOlive" | "optBrown" | "optDark")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              <section className={cardClass}>
                <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
                  <Heart className="h-5 w-5" />
                  {t("profile.lifestyle")}
                </h2>
                <p className="mb-4 text-xs text-slate-500">{t("profile.lifestyleSub")}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.smoking")}</label>
                    <select value={profile.smoking_status} onChange={(e) => updateField("smoking_status", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {SMOKING_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{t(`profile.opt${v.charAt(0).toUpperCase() + v.slice(1)}` as "optNever" | "optFormer" | "optOccasionally" | "optYes")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.religiousCommitment")}</label>
                    <select value={profile.religious_commitment} onChange={(e) => updateField("religious_commitment", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {RELIGIOUS_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{t(`profile.opt${v.charAt(0).toUpperCase() + v.slice(1)}` as "optPracticing" | "optModerate" | "optRevert" | "optSeeking")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.desireChildren")}</label>
                    <select value={profile.desire_children} onChange={(e) => updateField("desire_children", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      {CHILDREN_VALUES.slice(1).map((v) => (
                        <option key={v} value={v}>{t(`profile.opt${v.charAt(0).toUpperCase() + v.slice(1)}` as "optYes" | "optNo" | "optOpen" | "optUndecided")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              <section className={cardClass}>
                <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
                  <Briefcase className="h-5 w-5" />
                  {t("profile.career")}
                </h2>
                <p className="mb-4 text-xs text-slate-500">{t("profile.careerSub")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.jobTitle")}</label>
                    <input type="text" value={profile.job_title} onChange={(e) => updateField("job_title", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.education")}</label>
                    <select value={profile.education_level} onChange={(e) => updateField("education_level", e.target.value)} className={inputClass}>
                      <option value="">{t("profile.selectOption")}</option>
                      <option value="high_school">{t("profile.optHighSchool")}</option>
                      <option value="bachelors">{t("profile.optBachelors")}</option>
                      <option value="masters">{t("profile.optMasters")}</option>
                      <option value="doctorate">{t("profile.optDoctorate")}</option>
                      <option value="other">{t("profile.optOther")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.country")}</label>
                    <SearchableCountrySelect
                      value={profile.country}
                      onChange={(name) => updateField("country", name)}
                      locale={locale ?? "en"}
                      placeholder={t("profile.selectOption")}
                      inputClass={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">{t("profile.city")}</label>
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
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-400">
                    <Camera className="h-5 w-5" />
                    {t("profile.photos")}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">{t("profile.photosSub")}</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600/80 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    {profile.photo_privacy_blur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {t("profile.blurNonMatches")}
                  </span>
                  <input type="checkbox" checked={profile.photo_privacy_blur} onChange={(e) => updateField("photo_privacy_blur", e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-400" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                  <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-800/80">
                    {profile.photo_urls[i] ? (
                      <>
                        <img src={profile.photo_urls[i]} alt="" className={`h-full w-full object-cover ${profile.photo_privacy_blur ? "blur-md" : ""}`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition group-hover:opacity-100">
                          <button type="button" onClick={() => setPrimaryPhoto(i)} className="rounded-lg bg-slate-800/95 p-2.5 text-amber-400 shadow-lg hover:bg-slate-700" title={t("profile.setPrimary")}>
                            <Star className={`h-5 w-5 ${profile.primary_photo_index === i ? "fill-amber-400" : ""}`} />
                          </button>
                          <button type="button" onClick={() => handleDeletePhoto(i)} className="rounded-lg bg-slate-800/95 p-2.5 text-red-400 shadow-lg hover:bg-slate-700" title={t("profile.delete")}>
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        {profile.primary_photo_index === i && (
                          <span className="absolute left-2 top-2 rounded-md bg-amber-500/95 px-2 py-1 text-xs font-semibold text-slate-950 shadow">{t("profile.primary")}</span>
                        )}
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 text-slate-500 hover:border-amber-500/50 hover:bg-slate-800/50 hover:text-amber-400">
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
              <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
                <FileText className="h-5 w-5" />
                {t("profile.personalEssays")}
              </h2>
              <p className="mb-4 text-xs text-slate-500">{t("profile.personalEssaysSub")}</p>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-400">{t("profile.aboutMe")}</label>
                    <button
                      type="button"
                      onClick={() => handleAiSuggest("about_me")}
                      disabled={aiLoading !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      {aiLoading === "about_me" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      {t("profile.magicWand")}
                    </button>
                  </div>
                  <textarea
                    dir={dir}
                    value={profile.about_me}
                    onChange={(e) => updateField("about_me", e.target.value)}
                    rows={5}
                    placeholder={t("profile.aboutMePlaceholder")}
                    className={inputClass + " resize-y"}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-400">{t("profile.idealPartner")}</label>
                    <button
                      type="button"
                      onClick={() => handleAiSuggest("ideal_partner")}
                      disabled={aiLoading !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      {aiLoading === "ideal_partner" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      {t("profile.magicWand")}
                    </button>
                  </div>
                  <textarea
                    dir={dir}
                    value={profile.ideal_partner}
                    onChange={(e) => updateField("ideal_partner", e.target.value)}
                    rows={5}
                    placeholder={t("profile.idealPartnerPlaceholder")}
                    className={inputClass + " resize-y"}
                  />
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("profile.save")}
        </button>
      </div>
    </div>
  );
}
