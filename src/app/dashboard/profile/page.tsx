"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { dispatchProfileUpdated } from "@/lib/profileCompleteness";
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
} from "lucide-react";

const BUCKET = "user-assets";
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

const MARITAL_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "single", label: "Single" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const SKIN_TONE_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "fair", label: "Fair" },
  { value: "medium", label: "Medium" },
  { value: "olive", label: "Olive" },
  { value: "brown", label: "Brown" },
  { value: "dark", label: "Dark" },
];

const SMOKING_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "never", label: "Never" },
  { value: "former", label: "Former" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
];

const RELIGIOUS_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "practicing", label: "Practicing" },
  { value: "moderate", label: "Moderate" },
  { value: "revert", label: "Revert" },
  { value: "seeking", label: "Seeking to strengthen" },
];

const CHILDREN_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "open", label: "Open" },
  { value: "undecided", label: "Undecided" },
];

const EDUCATION_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "high_school", label: "High School" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Other" },
];

function toNum(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneOtpConfirming, setPhoneOtpConfirming] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/register");
        return;
      }
      setUserId(user.id);
      const extendedSelect =
        "full_name, gender, email, phone, phone_verified, nationality, age, marital_status, height_cm, weight_kg, skin_tone, smoking_status, religious_commitment, desire_children, job_title, education_level, country, city, about_me, ideal_partner, photo_urls, primary_photo_index, photo_privacy_blur";
      const { data } = await supabase
        .from("profiles")
        .select(extendedSelect)
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        const urls = Array.isArray(data.photo_urls) ? (data.photo_urls as string[]) : [];
        setProfile({
          full_name: (data.full_name as string) ?? "",
          gender: (data.gender as string) ?? "",
          email: (data.email as string) ?? "",
          phone: (data.phone as string) ?? "",
          phone_verified: !!(data as { phone_verified?: boolean }).phone_verified,
          nationality: (data.nationality as string) ?? "",
          age: data.age != null ? String(data.age) : "",
          marital_status: (data.marital_status as string) ?? "",
          height_cm: data.height_cm != null ? String(data.height_cm) : "",
          weight_kg: data.weight_kg != null ? String(data.weight_kg) : "",
          skin_tone: (data.skin_tone as string) ?? "",
          smoking_status: (data.smoking_status as string) ?? "",
          religious_commitment: (data.religious_commitment as string) ?? "",
          desire_children: (data.desire_children as string) ?? "",
          job_title: (data.job_title as string) ?? "",
          education_level: (data.education_level as string) ?? "",
          country: (data.country as string) ?? "",
          city: (data.city as string) ?? "",
          about_me: (data.about_me as string) ?? "",
          ideal_partner: (data.ideal_partner as string) ?? "",
          photo_urls: urls,
          primary_photo_index: typeof (data as { primary_photo_index?: number }).primary_photo_index === "number"
            ? (data as { primary_photo_index?: number }).primary_photo_index!
            : 0,
          photo_privacy_blur: !!(data as { photo_privacy_blur?: boolean }).photo_privacy_blur,
        });
      }
      setLoading(false);
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
        full_name: profile.full_name || null,
        gender: profile.gender || null,
        email: profile.email || null,
        phone: profile.phone || null,
        phone_verified: profile.phone_verified,
        nationality: profile.nationality || null,
        age: toNum(profile.age),
        marital_status: profile.marital_status || null,
        height_cm: toNum(profile.height_cm),
        weight_kg: toNum(profile.weight_kg),
        skin_tone: profile.skin_tone || null,
        smoking_status: profile.smoking_status || null,
        religious_commitment: profile.religious_commitment || null,
        desire_children: profile.desire_children || null,
        job_title: profile.job_title || null,
        education_level: profile.education_level || null,
        country: profile.country || null,
        city: profile.city || null,
        about_me: profile.about_me || null,
        ideal_partner: profile.ideal_partner || null,
        photo_urls: profile.photo_urls,
        primary_photo_index: profile.primary_photo_index,
        photo_privacy_blur: profile.photo_privacy_blur,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      showToast("success", "Profile saved successfully.");
      dispatchProfileUpdated();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneVerify = async () => {
    const phone = profile.phone.trim();
    if (!phone) {
      showToast("error", "Enter a phone number first.");
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
      showToast("success", "Verification code sent. Enter the 6-digit code below.");
    } catch {
      showToast("error", "Phone verification failed.");
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handlePhoneOtpSimulate = () => {
    setPhoneOtpSent(true);
    setPhoneOtpCode("123456");
    showToast("success", "Simulated: Enter 123456 and click Confirm to verify.");
  };

  const handleConfirmOtp = async () => {
    if (!userId) return;
    const code = phoneOtpCode.replace(/\D/g, "").slice(0, 6);
    if (code.length < 6) {
      showToast("error", "Enter a 6-digit code.");
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
      showToast("success", "Phone verified successfully.");
      dispatchProfileUpdated();
    } catch {
      showToast("error", "Verification failed.");
    } finally {
      setPhoneOtpConfirming(false);
    }
  };

  const handleConfirmOtpSimulated = async () => {
    if (!userId) return;
    const code = phoneOtpCode.replace(/\D/g, "").slice(0, 6);
    if (code.length < 6) {
      showToast("error", "Enter a 6-digit code (simulation: use 123456).");
      return;
    }
    setPhoneOtpConfirming(true);
    await new Promise((r) => setTimeout(r, 600));
    await supabase.from("profiles").update({ phone_verified: true }).eq("id", userId);
    updateField("phone_verified", true);
    setPhoneOtpSent(false);
    setPhoneOtpCode("");
    showToast("success", "Phone verified (simulated).");
    dispatchProfileUpdated();
    setPhoneOtpConfirming(false);
  };

  const handleMarkPhoneVerified = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ phone_verified: true })
      .eq("id", userId);
    if (error) {
      showToast("error", error.message);
      return;
    }
    updateField("phone_verified", true);
    showToast("success", "Phone marked as verified.");
    dispatchProfileUpdated();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!userId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (profile.photo_urls.length >= MAX_PHOTOS) {
      showToast("error", `Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }
    setUploadingIndex(index);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const newUrls = [...profile.photo_urls];
      newUrls.splice(index, 0, urlData.publicUrl);
      const trimmed = newUrls.slice(0, MAX_PHOTOS);
      updateField("photo_urls", trimmed);
      if (trimmed.length === 1) updateField("primary_photo_index", 0);
      showToast("success", "Photo uploaded.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = (index: number) => {
    const newUrls = profile.photo_urls.filter((_, i) => i !== index);
    let newPrimary = profile.primary_photo_index;
    if (profile.primary_photo_index >= newUrls.length && newUrls.length > 0)
      newPrimary = newUrls.length - 1;
    else if (profile.primary_photo_index >= newUrls.length) newPrimary = 0;
    else if (index < profile.primary_photo_index) newPrimary = profile.primary_photo_index - 1;
    updateField("photo_urls", newUrls);
    updateField("primary_photo_index", newPrimary);
    showToast("success", "Photo removed.");
  };

  const setPrimaryPhoto = (index: number) => {
    updateField("primary_photo_index", index);
    showToast("success", "Primary photo updated.");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const cardClass =
    "rounded-2xl border border-slate-700/80 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Profile</h1>
          <p className="mt-1 text-sm text-slate-400">ملفك الشخصي — إدارة معلوماتك</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-5 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg sm:left-auto ${
            toast.type === "success"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-100"
              : "border-red-500/50 bg-red-500/20 text-red-100"
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* 1. Photo Management */}
      <section className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-400">
              <Camera className="h-5 w-5" />
              Photos
            </h2>
            <p className="mt-1 text-xs text-slate-500">Up to 5 photos · الصور</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600/80 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800/80">
            <span className="flex items-center gap-1.5">
              {profile.photo_privacy_blur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Blur for non-matches
            </span>
            <input
              type="checkbox"
              checked={profile.photo_privacy_blur}
              onChange={(e) => updateField("photo_privacy_blur", e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-400"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
            <div
              key={i}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-800/80 shadow-inner"
            >
              {profile.photo_urls[i] ? (
                <>
                  <img
                    src={profile.photo_urls[i]}
                    alt=""
                    className={`h-full w-full object-cover transition ${profile.photo_privacy_blur ? "blur-md" : ""}`}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setPrimaryPhoto(i)}
                      className="rounded-lg bg-slate-800/95 p-2.5 text-amber-400 shadow-lg hover:bg-slate-700"
                      title="Set as primary"
                    >
                      <Star className={`h-5 w-5 ${profile.primary_photo_index === i ? "fill-amber-400" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(i)}
                      className="rounded-lg bg-slate-800/95 p-2.5 text-red-400 shadow-lg hover:bg-slate-700"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  {profile.primary_photo_index === i && (
                    <span className="absolute left-2 top-2 rounded-md bg-amber-500/95 px-2 py-1 text-xs font-semibold text-slate-950 shadow">
                      Primary
                    </span>
                  )}
                </>
              ) : (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 text-slate-500 transition hover:border-amber-500/50 hover:bg-slate-800/50 hover:text-amber-400">
                  {uploadingIndex === i ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-10 w-10" />
                      <span className="text-xs font-medium">Add photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, i)}
                    disabled={uploadingIndex !== null}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Phone Verification (OTP) */}
      <section className={cardClass}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
          <Phone className="h-5 w-5" />
          Phone verification
        </h2>
        <p className="mb-4 text-xs text-slate-500">Verify your number with OTP · التحقق بالرمز</p>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+20 123 456 7890"
              className="flex-1 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePhoneVerify}
                disabled={phoneOtpLoading || profile.phone_verified}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-60"
              >
                {phoneOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send OTP
              </button>
              <button
                type="button"
                onClick={handlePhoneOtpSimulate}
                disabled={profile.phone_verified || phoneOtpSent}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
              >
                Simulate OTP
              </button>
            </div>
          </div>
          {phoneOtpSent && !profile.phone_verified && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Enter 6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneOtpCode}
                  onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full max-w-[10rem] rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-center text-lg tracking-[0.4em] text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleConfirmOtpSimulated}
                  disabled={phoneOtpCode.length < 6 || phoneOtpConfirming}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-200 disabled:opacity-60"
                >
                  {phoneOtpConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm (simulated)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOtp}
                  disabled={phoneOtpCode.length < 6 || phoneOtpConfirming}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-700/80 px-4 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-60"
                >
                  Confirm (real SMS)
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {profile.phone_verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Verified
              </span>
            )}
            {phoneOtpSent && !profile.phone_verified && (
              <button
                type="button"
                onClick={handleMarkPhoneVerified}
                className="text-sm text-amber-400 underline hover:text-amber-300"
              >
                Mark as verified (skip)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Basic */}
      <section className={cardClass}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
          <User className="h-5 w-5" />
          Basic info
        </h2>
        <p className="mb-4 text-xs text-slate-500">الاسم، الجنسية، العمر، الحالة الاجتماعية</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Full name · الاسم</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Nationality · الجنسية</label>
            <input
              type="text"
              value={profile.nationality}
              onChange={(e) => updateField("nationality", e.target.value)}
              placeholder="e.g. Egyptian"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Age · العمر</label>
            <input
              type="number"
              min={18}
              max={120}
              value={profile.age}
              onChange={(e) => updateField("age", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Marital status · الحالة الاجتماعية</label>
            <select
              value={profile.marital_status}
              onChange={(e) => updateField("marital_status", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              {MARITAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className={cardClass}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
          <Ruler className="h-5 w-5" />
          Appearance
        </h2>
        <p className="mb-4 text-xs text-slate-500">الطول، الوزن، لون البشرة</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Height (cm)</label>
            <input
              type="number"
              min={100}
              max={250}
              value={profile.height_cm}
              onChange={(e) => updateField("height_cm", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Weight (kg)</label>
            <input
              type="number"
              min={30}
              max={300}
              value={profile.weight_kg}
              onChange={(e) => updateField("weight_kg", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Skin tone</label>
            <select
              value={profile.skin_tone}
              onChange={(e) => updateField("skin_tone", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              {SKIN_TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Lifestyle */}
      <section className={cardClass}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
          <Heart className="h-5 w-5" />
          Lifestyle
        </h2>
        <p className="mb-4 text-xs text-slate-500">التدخين، الالتزام الديني، الرغبة في الأطفال</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Smoking · التدخين</label>
            <select
              value={profile.smoking_status}
              onChange={(e) => updateField("smoking_status", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Religious commitment · الالتزام الديني</label>
            <select
              value={profile.religious_commitment}
              onChange={(e) => updateField("religious_commitment", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              {RELIGIOUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Desire for children · الرغبة في الأطفال</label>
            <select
              value={profile.desire_children}
              onChange={(e) => updateField("desire_children", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              {CHILDREN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Career */}
      <section className={cardClass}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
          <Briefcase className="h-5 w-5" />
          Career
        </h2>
        <p className="mb-4 text-xs text-slate-500">المهنة، التعليم، البلد والمدينة</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Job title</label>
            <input
              type="text"
              value={profile.job_title}
              onChange={(e) => updateField("job_title", e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Education level</label>
            <select
              value={profile.education_level}
              onChange={(e) => updateField("education_level", e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              {EDUCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Country</label>
            <input
              type="text"
              value={profile.country}
              onChange={(e) => updateField("country", e.target.value)}
              placeholder="e.g. Egypt"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">City</label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="e.g. Cairo"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>
      </section>

      {/* 4. Personal Narratives */}
      <section className={cardClass}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-amber-400">
          <FileText className="h-5 w-5" />
          Personal narratives
        </h2>
        <p className="mb-4 text-xs text-slate-500">عني · شريكي المنشود</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              About me / عني
            </label>
            <textarea
              dir="rtl"
              lang="ar"
              value={profile.about_me}
              onChange={(e) => updateField("about_me", e.target.value)}
              rows={5}
              placeholder="الشخصية والهوايات..."
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Ideal partner / شريكي المنشود
            </label>
            <textarea
              dir="rtl"
              lang="ar"
              value={profile.ideal_partner}
              onChange={(e) => updateField("ideal_partner", e.target.value)}
              rows={5}
              placeholder="صف الشريك الذي تبحث عنه..."
              className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save all
        </button>
      </div>
    </div>
  );
}
