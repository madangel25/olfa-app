"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  getSiteSettings,
  uploadSiteAsset,
  updateSiteSettings,
  type SiteSettingsRow,
  THEME_OPTIONS_MALE,
  THEME_OPTIONS_FEMALE,
} from "@/lib/siteSettings";

type TabId = "identity" | "content" | "theme";

type FormState = {
  logo_url: string;
  home_background_url: string;
  hero_heading_en: string;
  hero_heading_ar: string;
  hero_subheading_en: string;
  hero_subheading_ar: string;
  pledge_text_en: string;
  pledge_text_ar: string;
  theme_male: string;
  theme_female: string;
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
  theme_male: "blue",
  theme_female: "pink-gold",
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
    theme_male: row.theme_male ?? "blue",
    theme_female: row.theme_female ?? "pink-gold",
  };
}

const glass = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl";
const inputGlass = "rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30";

export default function SiteSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("identity");
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
      theme_male: form.theme_male || null,
      theme_female: form.theme_female || null,
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
      <LoadingScreen message="Loading site settings…" theme="sky" />
    );
  }

  const tabs: { id: TabId; label: string; labelAr: string }[] = [
    { id: "identity", label: "Site Identity", labelAr: "هوية الموقع" },
    { id: "content", label: "Content", labelAr: "المحتوى" },
    { id: "theme", label: "Theme Settings", labelAr: "المظهر" },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className={`${glass} mb-6 border-amber-500/20 bg-amber-500/5 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-amber-400/90 transition hover:text-amber-300"
              >
                ← Dashboard
              </Link>
              <span className="text-slate-600">/</span>
              <h1 className="text-xl font-semibold tracking-tight text-slate-50">
                Site Settings
              </h1>
              <span className="text-xs text-slate-500">إعدادات المنصة</span>
            </div>
          </div>
        </header>

        {message && (
          <div
            className={`mb-4 rounded-xl border px-3 py-2 text-sm backdrop-blur-sm ${
              message.type === "success"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                : "border-red-500/50 bg-red-500/10 text-red-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className={`mb-4 flex gap-1 rounded-2xl p-1 ${glass} border-amber-500/10`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-200 shadow-inner"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Tab: Site Identity */}
          {activeTab === "identity" && (
            <div className={`${glass} border-amber-500/10 p-5 space-y-6`}>
              <h2 className="text-sm font-semibold text-amber-200/90">Logo & Background</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs text-slate-400">Logo</p>
                  <div className="flex flex-wrap items-end gap-3">
                    {form.logo_url ? (
                      <div className="flex h-20 w-36 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-36 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">No logo</div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                        {uploadingLogo ? "Uploading…" : "Upload"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs text-slate-400">Home background</p>
                  <div className="flex flex-wrap items-end gap-3">
                    {form.home_background_url ? (
                      <div className="h-20 w-36 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <img src={form.home_background_url} alt="Bg" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-36 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">No image</div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                        {uploadingBg ? "Uploading…" : "Upload"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={uploadingBg} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Content */}
          {activeTab === "content" && (
            <div className={`${glass} border-amber-500/10 p-5 space-y-6`}>
              <h2 className="text-sm font-semibold text-amber-200/90">Hero & Pledge</h2>
              <div>
                <p className="mb-2 text-xs text-slate-400">Hero (EN/AR)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={form.hero_heading_en}
                    onChange={(e) => setForm((p) => ({ ...p, hero_heading_en: e.target.value }))}
                    placeholder="Heading EN"
                    className={`w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${inputGlass}`}
                  />
                  <input
                    value={form.hero_heading_ar}
                    onChange={(e) => setForm((p) => ({ ...p, hero_heading_ar: e.target.value }))}
                    placeholder="العنوان AR"
                    dir="rtl"
                    className={`w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${inputGlass}`}
                  />
                  <input
                    value={form.hero_subheading_en}
                    onChange={(e) => setForm((p) => ({ ...p, hero_subheading_en: e.target.value }))}
                    placeholder="Subheading EN"
                    className={`w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${inputGlass}`}
                  />
                  <input
                    value={form.hero_subheading_ar}
                    onChange={(e) => setForm((p) => ({ ...p, hero_subheading_ar: e.target.value }))}
                    placeholder="العنوان الفرعي AR"
                    dir="rtl"
                    className={`w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${inputGlass}`}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-amber-400/90">Pledge (English)</label>
                  <textarea
                    value={form.pledge_text_en}
                    onChange={(e) => setForm((p) => ({ ...p, pledge_text_en: e.target.value }))}
                    placeholder={DEFAULT_PLEDGE_EN}
                    rows={10}
                    className={`w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${inputGlass}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-amber-400/90">تعهد الجدية (عربي)</label>
                  <textarea
                    value={form.pledge_text_ar}
                    onChange={(e) => setForm((p) => ({ ...p, pledge_text_ar: e.target.value }))}
                    placeholder={DEFAULT_PLEDGE_AR}
                    rows={10}
                    dir="rtl"
                    className={`w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 ${inputGlass}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Theme Settings */}
          {activeTab === "theme" && (
            <div className={`${glass} border-amber-500/10 p-5 space-y-6`}>
              <h2 className="text-sm font-semibold text-amber-200/90">Preferred theme by profile type</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">Male profiles</label>
                  <select
                    value={form.theme_male}
                    onChange={(e) => setForm((p) => ({ ...p, theme_male: e.target.value }))}
                    className={`w-full px-3 py-2.5 text-sm text-slate-100 ${inputGlass}`}
                  >
                    {THEME_OPTIONS_MALE.map((o) => (
                      <option key={o.value} value={o.value} className="bg-slate-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">Female profiles</label>
                  <select
                    value={form.theme_female}
                    onChange={(e) => setForm((p) => ({ ...p, theme_female: e.target.value }))}
                    className={`w-full px-3 py-2.5 text-sm text-slate-100 ${inputGlass}`}
                  >
                    {THEME_OPTIONS_FEMALE.map((o) => (
                      <option key={o.value} value={o.value} className="bg-slate-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500">Light Blue for men, Soft Pink/Gold for women by default. Used across profile and dashboard UI.</p>
            </div>
          )}

          <div className={`flex flex-wrap gap-3 pt-2 ${glass} border-amber-500/10 px-4 py-3`}>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-900/20 hover:bg-amber-400 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
