"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import {
  getProfileCompleteness,
  PROFILE_UPDATED_EVENT,
  type ProfileForCompleteness,
} from "@/lib/profileCompleteness";
import { Home, User, MessageCircle, Heart, UserCircle, MapPin, ShieldCheck, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", labelEn: "Home", icon: Home },
  { href: "/dashboard/profile", label: "الملف الشخصي", labelEn: "Profile", icon: UserCircle },
  { href: "/dashboard/discovery", label: "البحث", labelEn: "Discovery", icon: User },
  { href: "/dashboard/discover-near-me", label: "الأقرب لك", labelEn: "Near Me", icon: MapPin },
  { href: "/dashboard/likes", label: "الإعجابات", labelEn: "Likes", icon: Heart },
  { href: "/dashboard/messages", label: "الرسائل", labelEn: "Messages", icon: MessageCircle },
];

const ADMIN_NAV_ITEM = {
  href: "/dashboard/admin/moderation",
  label: "الإشراف",
  labelEn: "Moderation",
  icon: ShieldCheck,
};

const PROFILE_SELECT_MINIMAL = "full_name, gender, email, is_verified";
const PROFILE_SELECT_FULL =
  "full_name, gender, email, is_verified, phone, phone_verified, nationality, age, marital_status, height_cm, weight_kg, skin_tone, smoking_status, religious_commitment, desire_children, job_title, education_level, country, city, about_me, ideal_partner, photo_urls";

const ACTIVE_LTR = "bg-rose-50 text-rose-600 border-l-[3px] border-l-rose-500";
const ACTIVE_RTL = "bg-rose-50 text-rose-600 border-r-[3px] border-r-rose-500";
const HOVER_CLASS = "hover:bg-[#FFF3EB] hover:text-stone-700";

type OnlinePresenceContextValue = {
  onlineUserIds: Set<string>;
};

const OnlinePresenceContext = createContext<OnlinePresenceContextValue>({
  onlineUserIds: new Set(),
});

export function useOnlinePresence(): OnlinePresenceContextValue {
  return useContext(OnlinePresenceContext);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dir, locale } = useLanguage();
  const { theme } = useTheme();
  const [profileComplete, setProfileComplete] = useState<number | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  const isRtl = dir === "rtl";
  const linkActiveClass = isRtl ? ACTIVE_RTL : ACTIVE_LTR;

  const fetchCompleteness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const select = PROFILE_SELECT_FULL + ", role";
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_MINIMAL + ", role")
        .eq("id", user.id)
        .maybeSingle();
      setProfileComplete(fallback ? getProfileCompleteness(fallback as ProfileForCompleteness) : 0);
      setIsAdmin((fallback as { role?: string } | null)?.role === "admin");
      return;
    }
    setProfileComplete(data ? getProfileCompleteness(data as ProfileForCompleteness) : 0);
    setIsAdmin((data as { role?: string } | null)?.role === "admin");
  };

  useEffect(() => {
    fetchCompleteness();
  }, []);

  useEffect(() => {
    const onProfileUpdated = () => void fetchCompleteness();
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: any = null;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      channel = supabase
        .channel("global_presence", {
          config: {
            presence: {
              key: user.id,
            },
          },
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
          const ids = new Set<string>();
          Object.values(state).forEach((entries) => {
            entries.forEach((entry) => {
              if (entry.user_id) ids.add(String(entry.user_id));
            });
          });
          setOnlineUserIds(ids);
        });

      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: user.id });
        }
      });
    };

    void init();
    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const renderNavItem = (item: typeof NAV_ITEMS[0], isActive: boolean) => {
    const Icon = item.icon;
    const label = locale === "ar" ? item.label : item.labelEn;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-2.5 px-5 py-[10px] text-[13px] font-medium transition-colors ${
          isActive
            ? linkActiveClass
            : `text-stone-500 ${HOVER_CLASS}`
        } ${locale === "ar" ? "flex-row-reverse text-right" : "text-left"}`}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1" lang={locale === "ar" ? "ar" : "en"}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <OnlinePresenceContext.Provider value={{ onlineUserIds }}>
      <div className="h-screen overflow-hidden bg-[#FFFAF7] font-[family-name:var(--font-jakarta)] text-stone-900">
        <aside
          className={`fixed inset-y-0 z-40 hidden w-[220px] flex-col bg-white md:flex ${locale === "ar" ? "right-0 border-l border-stone-200" : "left-0 border-r border-stone-200"}`}
          aria-label="Dashboard navigation"
        >
          <div className="shrink-0 border-b border-stone-100 px-5 pb-5 pt-5">
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-rose-600" style={{ letterSpacing: "-0.5px" }}>
              olfa<span className="text-stone-300">.</span>
            </Link>
          </div>

          <nav className="mt-2 flex flex-1 flex-col gap-[2px]" dir={locale === "ar" ? "rtl" : "ltr"}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/dashboard/profile" &&
                  pathname.startsWith(item.href)) ||
                (item.href === "/dashboard/profile" &&
                  (pathname === "/dashboard/profile" ||
                    pathname.startsWith("/dashboard/profile/")));
              return renderNavItem(item, isActive);
            })}
            {isAdmin && (() => {
              const item = ADMIN_NAV_ITEM;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return renderNavItem(item, isActive);
            })()}

            <div className="mt-auto">
              <Link
                href="/settings"
                className={`flex items-center gap-2.5 px-5 py-[10px] text-[13px] font-medium text-stone-500 transition-colors ${HOVER_CLASS} ${locale === "ar" ? "flex-row-reverse text-right" : "text-left"}`}
              >
                <Settings className="h-4 w-4 shrink-0 opacity-70" />
                <span className="flex-1">{locale === "ar" ? "الإعدادات" : "Settings"}</span>
              </Link>
            </div>
          </nav>

          {profileComplete !== null && (
            <div className="shrink-0 border-t border-stone-100 px-5 py-3">
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>{locale === "ar" ? "اكتمال الملف" : "Profile strength"}</span>
                <span className="font-semibold text-stone-700">{profileComplete}%</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-500"
                  style={{ width: `${profileComplete}%` }}
                />
              </div>
            </div>
          )}
        </aside>

        <div className={`min-w-0 ${locale === "ar" ? "md:mr-[220px]" : "md:ml-[220px]"}`}>
          <Navbar
            compact
            className={`${locale === "ar" ? "left-0 right-0 md:right-[220px]" : "left-0 right-0 md:left-[220px]"}`}
          />
          <main className="mt-[60px] h-[calc(100vh-60px)] overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </OnlinePresenceContext.Provider>
  );
}
