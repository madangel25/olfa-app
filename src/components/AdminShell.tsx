"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dashboard/settings", label: "إعدادات الموقع", labelEn: "Site Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="flex min-h-[calc(100vh-3.5rem)] bg-[#f8f9fa] font-[family-name:var(--font-cairo)] text-zinc-900"
      dir="rtl"
    >
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        className="fixed top-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 md:hidden"
        aria-label={sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
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
        className={`fixed top-14 right-0 z-40 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-l border-zinc-200 bg-white shadow-sm transition-transform md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
        aria-label="Admin navigation"
      >
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition flex-row-reverse text-right ${
                  isActive
                    ? "bg-sky-100 text-sky-600 border-r-2 border-r-sky-500"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
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
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 flex-row-reverse text-right"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className="flex-1">العودة للمستخدم</span>
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 pr-4 md:pr-56">
        {children}
      </main>
    </div>
  );
}
