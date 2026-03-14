"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  X,
  Briefcase,
  GraduationCap,
  Ruler,
  Heart,
  MapPin,
  MessageCircle,
  Scale,
  Globe,
  Palette,
  Cigarette,
  BookOpen,
  Baby,
  FileText,
  User,
  Star,
  UserMinus,
  Undo2,
  Loader2,
} from "lucide-react";

export type ProfileOverlayData = {
  full_name: string | null;
  gender: string | null;
  age: string | null;
  job_title: string | null;
  education_level: string | null;
  marital_status: string | null;
  height_cm: string | null;
  weight_kg: string | null;
  country: string | null;
  city: string | null;
  nationality: string | null;
  skin_tone: string | null;
  smoking_status: string | null;
  religious_commitment: string | null;
  desire_children: string | null;
  about_me: string | null;
  ideal_partner: string | null;
  photo_urls: string[];
  primary_photo_index: number;
};

function getProfileStrength(p: ProfileOverlayData): number {
  const hasImage = p.photo_urls.length > 0;
  const hasAboutMe = Boolean(p.about_me?.trim());
  const hasPartnerInfo = Boolean(p.ideal_partner?.trim());
  const hasJob = Boolean(p.job_title?.trim());
  const hasAge = p.age != null && String(p.age).trim() !== "";
  const hasLocation = Boolean(p.country?.trim() || p.city?.trim());
  const jobAgeLocation = (hasJob ? 10 : 0) + (hasAge ? 10 : 0) + (hasLocation ? 10 : 0);
  return (
    (hasImage ? 25 : 0) +
    (hasAboutMe ? 25 : 0) +
    (hasPartnerInfo ? 20 : 0) +
    jobAgeLocation
  );
}

function getCharismaRating(strengthPercent: number): number {
  return Math.round((strengthPercent / 100) * 10 * 10) / 10;
}

const EDUCATION_KEYS: Record<string, string> = {
  high_school: "optHighSchool",
  bachelors: "optBachelors",
  masters: "optMasters",
  doctorate: "optDoctorate",
  other: "optOther",
};

const MARITAL_KEYS: Record<string, string> = {
  single: "optSingle",
  divorced: "optDivorced",
  widowed: "optWidowed",
};

const OPT_KEYS: Record<string, string> = {
  fair: "optFair",
  medium: "optMedium",
  olive: "optOlive",
  brown: "optBrown",
  dark: "optDark",
  never: "optNever",
  former: "optFormer",
  occasionally: "optOccasionally",
  yes: "optYes",
  no: "optNo",
  open: "optOpen",
  undecided: "optUndecided",
  practicing: "optPracticing",
  moderate: "optModerate",
  revert: "optRevert",
  seeking: "optSeeking",
};

function optLabel(t: (k: string) => string, value: string | null): string | null {
  if (!value?.trim()) return null;
  const key = OPT_KEYS[value.trim().toLowerCase()] ?? value;
  const out = t(`profile.${key}`);
  return out && out !== `profile.${key}` ? out : value;
}

export type ProfileOverlayCopy = {
  like: string;
  liked: string;
  ignore: string;
  ignored: string;
  close: string;
  sendMessage: string;
  profileStrength: string;
  charismaRating: string;
  aboutMe: string;
  idealPartner: string;
  years: string;
};

type ProfileOverlayProps = {
  profileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  dir: "ltr" | "rtl";
  locale: string;
  t: (key: string) => string;
  currentUserId: string | null;
  currentUserGender: string | null;
  onLike: (userId: string) => void;
  onIgnore: (userId: string) => void;
  likingId: string | null;
  ignoringId: string | null;
  isLiked: (userId: string) => boolean;
  isIgnoredByMe: (userId: string) => boolean;
  theyIgnoredMe: (userId: string) => boolean;
  copy: ProfileOverlayCopy;
  recordVisit: (visitedId: string) => void;
};

export function ProfileOverlay({
  profileId,
  isOpen,
  onClose,
  dir,
  locale,
  t,
  currentUserId,
  currentUserGender,
  onLike,
  onIgnore,
  likingId,
  ignoringId,
  isLiked,
  isIgnoredByMe,
  theyIgnoredMe,
  copy,
  recordVisit,
}: ProfileOverlayProps) {
  const [profile, setProfile] = useState<ProfileOverlayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSlideIn(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlideIn(true));
    });
    return () => {
      cancelAnimationFrame(rafId);
      document.body.style.overflow = "";
      setSlideIn(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !profileId || !currentUserId) {
      setProfile(null);
      return;
    }
    if (profileId !== currentUserId) {
      recordVisit(profileId);
    }
    setLoading(true);
    setProfile(null);
    const run = async () => {
      const { data: row, error } = await supabase
        .from("profiles")
        .select(
          "full_name, gender, age, job_title, education_level, marital_status, height_cm, weight_kg, country, city, nationality, skin_tone, smoking_status, religious_commitment, desire_children, about_me, ideal_partner, photo_urls, primary_photo_index"
        )
        .eq("id", profileId)
        .maybeSingle();
      setLoading(false);
      if (error || !row) return;
      const raw = row as Record<string, unknown>;
      let photo_urls: string[] = [];
      if (Array.isArray(raw.photo_urls)) {
        photo_urls = raw.photo_urls.filter((u): u is string => typeof u === "string");
      }
      setProfile({
        full_name: (raw.full_name as string) ?? null,
        gender: (raw.gender as string) ?? null,
        age: raw.age != null ? String(raw.age) : null,
        job_title: (raw.job_title as string) ?? null,
        education_level: (raw.education_level as string) ?? null,
        marital_status: (raw.marital_status as string) ?? null,
        height_cm: raw.height_cm != null ? String(raw.height_cm) : null,
        weight_kg: raw.weight_kg != null ? String(raw.weight_kg) : null,
        country: (raw.country as string) ?? null,
        city: (raw.city as string) ?? null,
        nationality: (raw.nationality as string) ?? null,
        skin_tone: (raw.skin_tone as string) ?? null,
        smoking_status: (raw.smoking_status as string) ?? null,
        religious_commitment: (raw.religious_commitment as string) ?? null,
        desire_children: (raw.desire_children as string) ?? null,
        about_me: (raw.about_me as string) ?? null,
        ideal_partner: (raw.ideal_partner as string) ?? null,
        photo_urls,
        primary_photo_index: typeof raw.primary_photo_index === "number" ? raw.primary_photo_index : 0,
      });
    };
    run();
  }, [isOpen, profileId, currentUserId, recordVisit]);

  if (!isOpen) return null;

  const isRtl = dir === "rtl";
  const slideFromRight = !isRtl;
  const isFemale = profile?.gender === "female";
  const themeBorder = isFemale ? "border-pink-200" : "border-rose-200";
  const themeAccent = isFemale ? "text-pink-600" : "text-rose-600";
  const themeBg = isFemale ? "bg-pink-500 hover:bg-pink-600" : "bg-rose-500 hover:bg-rose-600";
  const themeBgSoft = isFemale ? "bg-pink-50" : "bg-rose-50";
  const themeBorderL = isFemale ? "border-l-pink-500" : "border-l-rose-500";
  const themeAvatar = isFemale ? "bg-pink-100 text-pink-700" : "bg-rose-100 text-rose-700";
  const themeStarFill = isFemale ? "text-pink-500" : "text-rose-500";
  const themeIcon = isFemale ? "text-pink-500" : "text-rose-500";
  const themeProgress = isFemale ? "bg-pink-500" : "bg-rose-500";

  const sameGender = currentUserGender != null && profile?.gender != null && currentUserGender === profile.gender;
  const iIgnoredThem = profileId ? isIgnoredByMe(profileId) : false;
  const hasIgnoredMe = profileId ? theyIgnoredMe(profileId) : false;
  const isIgnored = iIgnoredThem || hasIgnoredMe;
  const canCommunicate = !sameGender && !isIgnored && profileId !== currentUserId;
  const liked = profileId ? isLiked(profileId) : false;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={scrollRef}
        className={`fixed top-0 bottom-0 z-50 w-full max-w-lg overflow-y-auto bg-[#FFFAF7] shadow-2xl transition-transform duration-300 ease-out ${
          slideFromRight ? "right-0" : "left-0"
        } ${slideIn ? "translate-x-0" : slideFromRight ? "translate-x-full" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-[#FFFAF7] px-4 py-3">
          <span className="text-sm font-medium text-stone-500">{profile?.full_name ?? "—"}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
            aria-label={copy.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-12 pt-4" dir={dir}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          )}

          {!loading && profile && profileId && (
            <>
              <div className={`overflow-hidden rounded-2xl border bg-white ${themeBorder}`}>
                {/* Actions: Ignore + Like (and Message if match) */}
                <div className={`flex flex-wrap items-center gap-2 border-b border-stone-100 p-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <button
                    type="button"
                    onClick={() => onIgnore(profileId)}
                    disabled={ignoringId === profileId}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition disabled:opacity-50 ${
                      iIgnoredThem
                        ? "border-stone-400 bg-stone-200 text-stone-700 hover:bg-stone-300"
                        : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    {ignoringId === profileId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : iIgnoredThem ? (
                      <Undo2 className="h-4 w-4" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                    {iIgnoredThem ? copy.ignored : copy.ignore}
                  </button>
                  {canCommunicate &&
                    (liked ? (
                      <button
                        type="button"
                        onClick={() => onLike(profileId)}
                        disabled={likingId === profileId}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-300 bg-rose-100 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-200 disabled:opacity-50"
                      >
                        {likingId === profileId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart className="h-4 w-4 fill-current" />
                        )}
                        {copy.liked}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLike(profileId)}
                        disabled={likingId === profileId}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {likingId === profileId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart className="h-4 w-4" />
                        )}
                        {copy.like}
                      </button>
                    ))}
                  {canCommunicate && liked && (
                    <Link
                      href={`/dashboard/messages?with=${profileId}`}
                      className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white transition ${themeBg}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {copy.sendMessage}
                    </Link>
                  )}
                </div>

                {/* Hero */}
                <div className={`flex gap-4 p-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className={`h-28 w-28 shrink-0 overflow-hidden rounded-xl ${themeAvatar} flex items-center justify-center text-4xl font-semibold`}>
                    {profile.photo_urls[profile.primary_photo_index] ?? profile.photo_urls[0] ? (
                      <img
                        src={profile.photo_urls[profile.primary_photo_index] ?? profile.photo_urls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (profile.full_name ?? "?").slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-stone-900">{profile.full_name ?? "—"}</h1>
                    <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm ${isRtl ? "flex-row-reverse" : ""}`}>
                      {profile.age && (
                        <span className={themeAccent}>
                          {profile.age} {copy.years}
                        </span>
                      )}
                      {profile.marital_status && (
                        <span className={themeAccent}>
                          {t(`profile.${(MARITAL_KEYS[profile.marital_status.toLowerCase()] ?? "optSingle") + (isFemale ? "Female" : "Male")}`)}
                        </span>
                      )}
                    </div>
                    {[profile.city, profile.country].filter(Boolean).length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-stone-600">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {[profile.city, profile.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Strength & Charisma */}
                <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{copy.profileStrength}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className={`h-full rounded-full ${themeProgress} transition-all`}
                            style={{ width: `${getProfileStrength(profile)}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-sm font-medium text-stone-900">{getProfileStrength(profile)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{copy.charismaRating}</p>
                      <div className={`flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 shrink-0 ${i <= (getCharismaRating(getProfileStrength(profile)) / 10) * 5 ? themeStarFill : "text-stone-200"}`}
                              fill={i <= (getCharismaRating(getProfileStrength(profile)) / 10) * 5 ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                        <span className={`text-sm font-medium ${themeAccent}`}>{getCharismaRating(getProfileStrength(profile))}/10</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attributes */}
                {(() => {
                  const rows: { icon: React.ReactNode; label: string; value: string }[] = [];
                  if (profile.job_title?.trim()) rows.push({ icon: <Briefcase className="h-4 w-4 shrink-0" />, label: t("profile.jobTitle"), value: profile.job_title });
                  const educationKey = profile.education_level ? (EDUCATION_KEYS[profile.education_level] ?? "optOther") + (isFemale ? "Female" : "Male") : null;
                  const educationLabel = educationKey ? t(`profile.${educationKey}`) : null;
                  if (educationLabel) rows.push({ icon: <GraduationCap className="h-4 w-4 shrink-0" />, label: t("profile.education"), value: educationLabel });
                  if (profile.height_cm?.trim()) rows.push({ icon: <Ruler className="h-4 w-4 shrink-0" />, label: t("profile.height"), value: `${profile.height_cm} cm` });
                  if (profile.weight_kg?.trim()) rows.push({ icon: <Scale className="h-4 w-4 shrink-0" />, label: t("profile.weight"), value: `${profile.weight_kg} kg` });
                  if (profile.city?.trim()) rows.push({ icon: <MapPin className="h-4 w-4 shrink-0" />, label: t("profile.city"), value: profile.city });
                  if (profile.country?.trim()) rows.push({ icon: <Globe className="h-4 w-4 shrink-0" />, label: t("profile.country"), value: profile.country });
                  if (profile.nationality?.trim()) rows.push({ icon: <User className="h-4 w-4 shrink-0" />, label: t("profile.nationality"), value: profile.nationality });
                  const skin = optLabel(t, profile.skin_tone) ?? profile.skin_tone?.trim();
                  if (skin) rows.push({ icon: <Palette className="h-4 w-4 shrink-0" />, label: t("profile.skinTone"), value: skin });
                  const smoke = optLabel(t, profile.smoking_status) ?? profile.smoking_status?.trim();
                  if (smoke) rows.push({ icon: <Cigarette className="h-4 w-4 shrink-0" />, label: t("profile.smoking"), value: smoke });
                  const relig = optLabel(t, profile.religious_commitment) ?? profile.religious_commitment?.trim();
                  if (relig) rows.push({ icon: <BookOpen className="h-4 w-4 shrink-0" />, label: t("profile.religiousCommitment"), value: relig });
                  const children = optLabel(t, profile.desire_children) ?? profile.desire_children?.trim();
                  if (children) rows.push({ icon: <Baby className="h-4 w-4 shrink-0" />, label: t("profile.desireChildren"), value: children });
                  if (rows.length === 0) return null;
                  return (
                    <div className="border-t border-stone-100 px-4 py-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {rows.map((row, idx) => (
                          <div key={idx} className={`flex items-start gap-2 rounded-xl bg-stone-50/80 px-3 py-2 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
                            <span className={themeIcon}>{row.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-stone-500">{row.label}</p>
                              <p className="text-sm font-medium text-stone-900">{row.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {profile.about_me?.trim() && (
                  <div className={`border-t border-stone-100 px-4 py-4 ${themeBgSoft} ${themeBorderL} border-l-4`}>
                    <h2 className={`flex items-center gap-2 text-sm font-semibold text-stone-900 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <FileText className={`h-4 w-4 shrink-0 ${themeIcon}`} />
                      {copy.aboutMe}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-stone-900 whitespace-pre-wrap">{profile.about_me}</p>
                  </div>
                )}

                {profile.ideal_partner?.trim() && (
                  <div className="border-t border-stone-100 px-4 py-4">
                    <h2 className={`flex items-center gap-2 text-sm font-semibold text-stone-900 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <Heart className={`h-4 w-4 shrink-0 ${themeIcon}`} />
                      {copy.idealPartner}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-stone-900 whitespace-pre-wrap">{profile.ideal_partner}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !profile && profileId && (
            <p className="py-8 text-center text-sm text-stone-500">Profile not found.</p>
          )}
        </div>
      </div>
    </>
  );
}
