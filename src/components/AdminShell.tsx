"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Menu, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, dir } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRtl = dir === "rtl";

  const navItems = [
    {
      href: "/admin/dashboard",
      label: locale === "ar" ? "لوحة التحكم" : "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/dashboard/settings",
      label: locale === "ar" ? "إعدادات الموقع" : "Site Settings",
      icon: Settings,
    },
  ];

  return (
    <div
      className="flex min-h-screen bg-[var(--theme-bg)] font-[family-name:var(--font-cairo)] text-zinc-900"
      dir={dir}
    >
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 md:hidden"
        aria-label={sidebarOpen ? (locale === "ar" ? "إغلاق القائمة" : "Close menu") : (locale === "ar" ? "فتح القائمة" : "Open menu")}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay when sidebar open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 z-40 h-screen w-56 shrink-0 border-zinc-200 bg-white shadow-sm transition-transform md:translate-x-0 ${
          isRtl ? "right-0 border-l" : "left-0 border-r"
        } ${
          sidebarOpen ? "translate-x-0" : `${isRtl ? "translate-x-full" : "-translate-x-full"} md:translate-x-0`
        }`}
        aria-label={locale === "ar" ? "تنقل الإدارة" : "Admin navigation"}
      >
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-sky-100 text-sky-600 border-r-2 border-r-sky-500"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                } ${isRtl ? "flex-row-reverse text-right" : "text-left"}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 ${isRtl ? "flex-row-reverse text-right" : "text-left"}`}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className="flex-1">{locale === "ar" ? "العودة للمستخدم" : "Back to user"}</span>
            </Link>
          </div>
        </nav>
      </aside>

      <main className={`flex-1 min-w-0 ${isRtl ? "pr-4 md:pr-56" : "pl-4 md:pl-56"}`}>
        {children}
      </main>
    </div>
  );
}
