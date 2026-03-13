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
import { Home, User, MessageCircle, Heart, UserCircle, MapPin, ShieldCheck } from "lucide-react";

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

const ACTIVE_LTR = "bg-amber-50 text-amber-800 border-l-[3px] border-l-amber-400";
const ACTIVE_RTL = "bg-amber-50 text-amber-800 border-r-[3px] border-r-amber-400";
const HOVER_CLASS = "hover:bg-stone-100 hover:text-stone-800";

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

  return (
    <OnlinePresenceContext.Provider value={{ onlineUserIds }}>
      <div className="min-h-screen bg-[#faf9f7] font-[family-name:var(--font-cairo)] text-stone-900">
        <aside
          className={`fixed inset-y-0 z-40 hidden w-[240px] bg-white md:flex md:flex-col ${locale === "ar" ? "right-0 border-l border-stone-200/80" : "left-0 border-r border-stone-200/80"}`}
          aria-label="Dashboard navigation"
        >
          <div className="flex h-[60px] shrink-0 items-center border-b border-stone-200/60 px-5">
            <Link href="/dashboard" className="text-lg font-bold tracking-tight text-stone-800">
              Olfa
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="flex flex-col gap-0.5" dir={locale === "ar" ? "rtl" : "ltr"}>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/dashboard/profile" &&
                    pathname.startsWith(item.href)) ||
                  (item.href === "/dashboard/profile" &&
                    (pathname === "/dashboard/profile" ||
                      pathname.startsWith("/dashboard/profile/")));
                const Icon = item.icon;
                const label = locale === "ar" ? item.label : item.labelEn;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? linkActiveClass
                        : `text-stone-500 ${HOVER_CLASS}`
                    } ${locale === "ar" ? "flex-row-reverse text-right" : "text-left"}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1" lang={locale === "ar" ? "ar" : "en"}>
                      {label}
                    </span>
                  </Link>
                );
              })}
              {isAdmin && (() => {
                const item = ADMIN_NAV_ITEM;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const label = locale === "ar" ? item.label : item.labelEn;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? linkActiveClass
                        : `text-stone-500 ${HOVER_CLASS}`
                    } ${locale === "ar" ? "flex-row-reverse text-right" : "text-left"}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1" lang={locale === "ar" ? "ar" : "en"}>
                      {label}
                    </span>
                  </Link>
                );
              })()}
            </nav>
          </div>

          {profileComplete !== null && (
            <div className="shrink-0 border-t border-stone-200/60 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{locale === "ar" ? "اكتمال الملف" : "Profile"}</span>
                <span className="font-semibold text-stone-700">{profileComplete}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${profileComplete}%` }}
                />
              </div>
            </div>
          )}
        </aside>

        <div className={`min-w-0 ${locale === "ar" ? "md:mr-[240px]" : "md:ml-[240px]"}`}>
          <Navbar
            compact
            className={`${locale === "ar" ? "left-0 right-0 md:right-[240px]" : "left-0 right-0 md:left-[240px]"}`}
          />
          <main className="mt-[60px] h-[calc(100vh-60px)] overflow-y-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </OnlinePresenceContext.Provider>
  );
}
