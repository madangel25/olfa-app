"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical } from "lucide-react";

export type QuizOptionRow = {
  value: string;
  label_en: string;
  label_ar: string;
  helper_en: string;
  helper_ar: string;
};

export type QuizQuestionForm = {
  category: string;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  options: QuizOptionRow[];
};

const emptyOption: QuizOptionRow = {
  value: "",
  label_en: "",
  label_ar: "",
  helper_en: "",
  helper_ar: "",
};

type Props = {
  initial?: QuizQuestionForm | null;
  onSave: (data: QuizQuestionForm) => void;
  onClose: () => void;
  saving: boolean;
};

export function QuizEditorModal({ initial, onSave, onClose, saving }: Props) {
  const [form, setForm] = useState<QuizQuestionForm>({
    category: "",
    title_en: "",
    title_ar: "",
    subtitle_en: "",
    subtitle_ar: "",
    options: [{ ...emptyOption }],
  });

  useEffect(() => {
    if (initial) {
      setForm({
        category: initial.category,
        title_en: initial.title_en,
        title_ar: initial.title_ar,
        subtitle_en: initial.subtitle_en,
        subtitle_ar: initial.subtitle_ar,
        options:
          initial.options.length > 0
            ? initial.options.map((o) => ({ ...emptyOption, ...o }))
            : [{ ...emptyOption }],
      });
    }
  }, [initial]);

  const addOption = () => {
    setForm((f) => ({ ...f, options: [...f.options, { ...emptyOption }] }));
  };

  const removeOption = (index: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, field: keyof QuizOptionRow, value: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) =>
        i === index ? { ...o, [field]: value } : o
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opts = form.options.filter((o) => o.value.trim() || o.label_en.trim());
    if (opts.length === 0) return;
    onSave({ ...form, options: opts });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl my-8 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">
            {initial ? "تعديل السؤال" : "إضافة سؤال"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">الفئة (Category)</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              placeholder="e.g. financial_views"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">النص (EN)</label>
              <input
                type="text"
                value={form.title_en}
                onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">النص (AR)</label>
              <input
                type="text"
                value={form.title_ar}
                onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان الفرعي (EN)</label>
              <input
                type="text"
                value={form.subtitle_en}
                onChange={(e) => setForm((f) => ({ ...f, subtitle_en: e.target.value }))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">العنوان الفرعي (AR)</label>
              <input
                type="text"
                value={form.subtitle_ar}
                onChange={(e) => setForm((f) => ({ ...f, subtitle_ar: e.target.value }))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-700">الخيارات</label>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة خيار
              </button>
            </div>
            <div className="space-y-3">
              {form.options.map((opt, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-200 p-3 space-y-2 bg-zinc-50/50"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-500">خيار {index + 1}</span>
                    {form.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="mr-auto p-1 rounded text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={opt.value}
                    onChange={(e) => updateOption(index, "value", e.target.value)}
                    placeholder="value (e.g. traditional_provider)"
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                    dir="ltr"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={opt.label_en}
                      onChange={(e) => updateOption(index, "label_en", e.target.value)}
                      placeholder="Label EN"
                      className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                      dir="ltr"
                    />
                    <input
                      type="text"
                      value={opt.label_ar}
                      onChange={(e) => updateOption(index, "label_ar", e.target.value)}
                      placeholder="Label AR"
                      className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={opt.helper_en}
                      onChange={(e) => updateOption(index, "helper_en", e.target.value)}
                      placeholder="Helper EN"
                      className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                      dir="ltr"
                    />
                    <input
                      type="text"
                      value={opt.helper_ar}
                      onChange={(e) => updateOption(index, "helper_ar", e.target.value)}
                      placeholder="Helper AR"
                      className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
