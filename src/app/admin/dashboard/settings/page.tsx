"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getSiteSettings,
  uploadSiteAsset,
  updateSiteSettings,
  type SiteSettingsRow,
} from "@/lib/siteSettings";

type FormState = {
  logo_url: string;
  home_background_url: string;
  hero_heading_en: string;
  hero_heading_ar: string;
  hero_subheading_en: string;
  hero_subheading_ar: string;
  pledge_text_en: string;
  pledge_text_ar: string;
};

const emptyForm: FormState = {
  logo_url: "",
  home_background_url: "",
  hero_heading_en: "",
  hero_heading_ar: "",
  hero_subheading_en: "",
  hero_subheading_ar: "",
  pledge_text_en: "",
  pledge_text_ar: "",
};

const DEFAULT_PLEDGE_EN = `By using Olfa, I commit to a serious, respectful search for marriage. I understand and accept the following:

• I will not use offensive language, harassment, or manipulation in any conversation or profile.
• I will not attempt to deceive other members or the platform (fake profiles, misrepresentation, or abuse).
• I understand that breaking these rules will result in the permanent banning of my account, with no right to appeal.`;

const DEFAULT_PLEDGE_AR = `باستخدام أولفا، ألتزم ببحث جاد ومحترم عن الزواج. أفهم وأقبل ما يلي:

• لن أستخدم لغة مسيئة أو مضايقة أو تلاعباً في أي محادثة أو ملف.
• لن أحاول خداع الأعضاء أو المنصة (ملفات مزيفة، تحريف، أو إساءة استخدام).
• أفهم أن مخالفة هذه القواعد ستؤدي إلى حظر حسابي نهائياً، دون حق في الاستئناف.`;

function fromRow(row: SiteSettingsRow | null): FormState {
  if (!row) return emptyForm;
  return {
    logo_url: row.logo_url ?? "",
    home_background_url: row.home_background_url ?? "",
    hero_heading_en: row.hero_heading_en ?? "",
    hero_heading_ar: row.hero_heading_ar ?? "",
    hero_subheading_en: row.hero_subheading_en ?? "",
    hero_subheading_ar: row.hero_subheading_ar ?? "",
    pledge_text_en: row.pledge_text_en ?? "",
    pledge_text_ar: row.pledge_text_ar ?? "",
  };
}

export default function SiteSettingsPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const row = await getSiteSettings();
      setForm(fromRow(row));
      setSettingsId(row?.id ?? null);
    } catch {
      setMessage({ type: "error", text: "Failed to load site settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setMessage(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const result = await uploadSiteAsset(`logo.${ext}`, file);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setForm((prev) => ({ ...prev, logo_url: result.url }));
      setMessage({ type: "success", text: "Logo uploaded. Click Save to persist." });
    }
    setUploadingLogo(false);
    e.target.value = "";
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    setMessage(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const result = await uploadSiteAsset(`home-bg.${ext}`, file);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setForm((prev) => ({ ...prev, home_background_url: result.url }));
      setMessage({ type: "success", text: "Home background uploaded. Click Save to persist." });
    }
    setUploadingBg(false);
    e.target.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsId) {
      setMessage({ type: "error", text: "Site settings not loaded. Run the database migration." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await updateSiteSettings(settingsId, {
      logo_url: form.logo_url || null,
      home_background_url: form.home_background_url || null,
      hero_heading_en: form.hero_heading_en || null,
      hero_heading_ar: form.hero_heading_ar || null,
      hero_subheading_en: form.hero_subheading_en || null,
      hero_subheading_ar: form.hero_subheading_ar || null,
      pledge_text_en: form.pledge_text_en || null,
      pledge_text_ar: form.pledge_text_ar || null,
    });
    if (error) {
      setMessage({ type: "error", text: error });
    } else {
      setMessage({ type: "success", text: "Site settings saved." });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-200/80">Loading site settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
            Olfa · Command Center
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="text-xs font-medium text-amber-400/90 transition hover:text-amber-300"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Site Settings
            </h1>
          </div>
          <p className="text-xs text-slate-300/80">
            Edit hero titles and subheadings (EN/AR), upload logo and home background. Stored in <code className="rounded bg-slate-800 px-1 text-[10px]">site_settings</code> and <code className="rounded bg-slate-800 px-1 text-[10px]">site-assets</code>.
          </p>
        </header>

        {message && (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              message.type === "success"
                ? "border-amber-500/50 bg-amber-950/40 text-amber-100"
                : "border-red-500/60 bg-red-950/60 text-red-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Hero section text */}
          <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-50">
              Hero section text
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Main heading and subheading for the home page (English &amp; Arabic). Empty = use defaults.
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/90">
                  English
                </p>
                <div>
                  <label className="block text-[11px] text-slate-400">Main heading</label>
                  <input
                    type="text"
                    value={form.hero_heading_en}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_heading_en: e.target.value }))}
                    placeholder="e.g. Olfa"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">Subheading</label>
                  <input
                    type="text"
                    value={form.hero_subheading_en}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_subheading_en: e.target.value }))}
                    placeholder="e.g. Intentional Islamic Marriage"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/90">
                  العربية
                </p>
                <div>
                  <label className="block text-[11px] text-slate-400">العنوان الرئيسي</label>
                  <input
                    type="text"
                    value={form.hero_heading_ar}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_heading_ar: e.target.value }))}
                    placeholder="مثال: أولفا"
                    dir="rtl"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">العنوان الفرعي</label>
                  <input
                    type="text"
                    value={form.hero_subheading_ar}
                    onChange={(e) => setForm((prev) => ({ ...prev, hero_subheading_ar: e.target.value }))}
                    placeholder="مثال: زواج إسلامي هادف"
                    dir="rtl"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Pledge document */}
          <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-50">Pledge document (Ethical Pledge / تعهد الجدية)</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Shown on the onboarding pledge page. Use plain text; line breaks are preserved. Empty = use default text.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-amber-400/90">Pledge Document (English)</label>
                <textarea
                  value={form.pledge_text_en}
                  onChange={(e) => setForm((prev) => ({ ...prev, pledge_text_en: e.target.value }))}
                  placeholder={DEFAULT_PLEDGE_EN}
                  rows={12}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-400/90">Pledge Document (Arabic) — تعهد الجدية</label>
                <textarea
                  value={form.pledge_text_ar}
                  onChange={(e) => setForm((prev) => ({ ...prev, pledge_text_ar: e.target.value }))}
                  placeholder={DEFAULT_PLEDGE_AR}
                  rows={12}
                  dir="rtl"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
            </div>
          </section>

          {/* Logo */}
          <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-50">Logo</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Shown in navbar and home hero. Upload to <code className="rounded bg-slate-800 px-1">site-assets</code>.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              {form.logo_url ? (
                <div className="flex h-20 w-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80">
                  <img src={form.logo_url} alt="Site logo preview" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-20 w-44 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-[11px] text-slate-500">
                  No logo
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-2xl border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:border-amber-500/60 hover:bg-slate-800/70">
                  {uploadingLogo ? "Uploading…" : form.logo_url ? "Replace logo" : "Upload logo"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </label>
            </div>
          </section>

          {/* Home background */}
          <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-50">Home background image</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Full-width hero background on the home page. Upload to <code className="rounded bg-slate-800 px-1">site-assets</code>.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              {form.home_background_url ? (
                <div className="h-28 w-48 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80">
                  <img
                    src={form.home_background_url}
                    alt="Home background preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-28 w-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-[11px] text-slate-500">
                  No image
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-2xl border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:border-amber-500/60 hover:bg-slate-800/70">
                  {uploadingBg ? "Uploading…" : form.home_background_url ? "Replace background" : "Upload background"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleBgUpload}
                  disabled={uploadingBg}
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-amber-900/30 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-600 bg-slate-900/50 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/70"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
