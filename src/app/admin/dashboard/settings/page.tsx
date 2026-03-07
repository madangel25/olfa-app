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

type TabId = "general" | "identity" | "content" | "theme";

type FormState = {
  site_name: string;
  maintenance_mode: boolean;
  contact_email: string;
  logo_url: string;
  home_background_url: string;
  landing_feature_image_url: string;
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
  site_name: "",
  maintenance_mode: false,
  contact_email: "",
  logo_url: "",
  home_background_url: "",
  landing_feature_image_url: "",
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
    site_name: row.site_name ?? "",
    maintenance_mode: row.maintenance_mode ?? false,
    contact_email: row.contact_email ?? "",
    logo_url: row.logo_url ?? "",
    home_background_url: row.home_background_url ?? "",
    landing_feature_image_url: (row as { landing_feature_image_url?: string | null }).landing_feature_image_url ?? "",
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

const card = "bg-white rounded-2xl shadow-lg shadow-sky-900/5 border border-sky-100";
const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20";

export default function SiteSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingFeature, setUploadingFeature] = useState(false);
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

  const handleFeatureImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFeature(true);
    setMessage(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const result = await uploadSiteAsset(`landing-feature.${ext}`, file);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setForm((prev) => ({ ...prev, landing_feature_image_url: result.url }));
      setMessage({ type: "success", text: "Landing feature image uploaded. Click Save to persist." });
    }
    setUploadingFeature(false);
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
      site_name: form.site_name || null,
      maintenance_mode: form.maintenance_mode,
      contact_email: form.contact_email || null,
      logo_url: form.logo_url || null,
      home_background_url: form.home_background_url || null,
      landing_feature_image_url: form.landing_feature_image_url || null,
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
      setMessage({ type: "success", text: "تم حفظ الإعدادات." });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <LoadingScreen message="جاري تحميل الإعدادات…" theme="sky" />
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "general", label: "عام" },
    { id: "identity", label: "هوية الموقع" },
    { id: "content", label: "المحتوى" },
    { id: "theme", label: "المظهر" },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full bg-[#f8f9fa] font-[family-name:var(--font-cairo)] text-zinc-900" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            ← لوحة التحكم
          </Link>
          <span className="text-zinc-400">/</span>
          <h1 className="text-xl font-semibold text-zinc-900">إعدادات الموقع</h1>
        </header>

        {message && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl p-1.5 bg-white border border-sky-100 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-sky-100 text-sky-700 border border-sky-200"
                  : "text-zinc-600 hover:bg-zinc-50 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Tab: General */}
          {activeTab === "general" && (
            <div className={`${card} p-6 space-y-5`}>
              <h2 className="text-base font-semibold text-zinc-800 border-b border-zinc-100 pb-2">إعدادات عامة</h2>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">اسم الموقع</label>
                <input
                  type="text"
                  value={form.site_name}
                  onChange={(e) => setForm((p) => ({ ...p, site_name: e.target.value }))}
                  placeholder="مثال: Olfa"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.maintenance_mode}
                    onChange={(e) => setForm((p) => ({ ...p, maintenance_mode: e.target.checked }))}
                    className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm font-medium text-zinc-700">وضع الصيانة</span>
                </label>
                <p className="text-xs text-zinc-500 mt-1">عند التفعيل يظهر للمستخدمين رسالة صيانة (ما عدا الإدارة).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">البريد الإلكتروني للتواصل</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                  placeholder="contact@example.com"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Tab: Site Identity */}
          {activeTab === "identity" && (
            <div className={`${card} p-6 space-y-6`}>
              <h2 className="text-base font-semibold text-zinc-800 border-b border-zinc-100 pb-2">الشعار والخلفيات</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm text-zinc-600">الشعار</p>
                  <div className="flex flex-wrap items-end gap-3">
                    {form.logo_url ? (
                      <div className="flex h-20 w-36 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-36 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-500">لا شعار</div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                        {uploadingLogo ? "جاري الرفع…" : "رفع"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-zinc-600">خلفية الصفحة الرئيسية</p>
                  <div className="flex flex-wrap items-end gap-3">
                    {form.home_background_url ? (
                      <div className="h-20 w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <img src={form.home_background_url} alt="Bg" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-36 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-500">لا صورة</div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                        {uploadingBg ? "جاري الرفع…" : "رفع"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={uploadingBg} />
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm text-zinc-600">صورة لاندنغ (1/3)</p>
                  <div className="flex flex-wrap items-end gap-3">
                    {form.landing_feature_image_url ? (
                      <div className="h-20 w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <img src={form.landing_feature_image_url} alt="Feature" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-20 w-36 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-500">لا صورة</div>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                        {uploadingFeature ? "جاري الرفع…" : "رفع"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFeatureImageUpload} disabled={uploadingFeature} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Content */}
          {activeTab === "content" && (
            <div className={`${card} p-6 space-y-6`}>
              <h2 className="text-base font-semibold text-zinc-800 border-b border-zinc-100 pb-2">الهيرو والتعهد</h2>
              <div>
                <p className="mb-2 text-sm text-zinc-600">الهيرو (EN/AR)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={form.hero_heading_en}
                    onChange={(e) => setForm((p) => ({ ...p, hero_heading_en: e.target.value }))}
                    placeholder="Heading EN"
                    className={inputClass}
                  />
                  <input
                    value={form.hero_heading_ar}
                    onChange={(e) => setForm((p) => ({ ...p, hero_heading_ar: e.target.value }))}
                    placeholder="العنوان AR"
                    dir="rtl"
                    className={inputClass}
                  />
                  <input
                    value={form.hero_subheading_en}
                    onChange={(e) => setForm((p) => ({ ...p, hero_subheading_en: e.target.value }))}
                    placeholder="Subheading EN"
                    className={inputClass}
                  />
                  <input
                    value={form.hero_subheading_ar}
                    onChange={(e) => setForm((p) => ({ ...p, hero_subheading_ar: e.target.value }))}
                    placeholder="العنوان الفرعي AR"
                    dir="rtl"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">التعهد (إنجليزي)</label>
                  <textarea
                    value={form.pledge_text_en}
                    onChange={(e) => setForm((p) => ({ ...p, pledge_text_en: e.target.value }))}
                    placeholder={DEFAULT_PLEDGE_EN}
                    rows={10}
                    className={inputClass + " resize-y"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">تعهد الجدية (عربي)</label>
                  <textarea
                    value={form.pledge_text_ar}
                    onChange={(e) => setForm((p) => ({ ...p, pledge_text_ar: e.target.value }))}
                    placeholder={DEFAULT_PLEDGE_AR}
                    rows={10}
                    dir="rtl"
                    className={inputClass + " resize-y"}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Theme Settings */}
          {activeTab === "theme" && (
            <div className={`${card} p-6 space-y-6`}>
              <h2 className="text-base font-semibold text-zinc-800 border-b border-zinc-100 pb-2">المظهر حسب نوع الملف</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">ملفات الذكور</label>
                  <select
                    value={form.theme_male}
                    onChange={(e) => setForm((p) => ({ ...p, theme_male: e.target.value }))}
                    className={inputClass}
                  >
                    {THEME_OPTIONS_MALE.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">ملفات الإناث</label>
                  <select
                    value={form.theme_female}
                    onChange={(e) => setForm((p) => ({ ...p, theme_female: e.target.value }))}
                    className={inputClass}
                  >
                    {THEME_OPTIONS_FEMALE.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-zinc-500">أزرق فاتح للذكور، وردي ذهبي للإناث افتراضياً.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-l from-sky-500 to-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-900/20 hover:from-sky-600 hover:to-sky-700 disabled:opacity-60 transition"
            >
              {saving ? "جاري الحفظ…" : "حفظ"}
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
