"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { PROFILE_UPDATED_EVENT } from "@/lib/profileCompleteness";

export type ThemeVariant = "male" | "female" | "neutral";

type ThemeContextValue = {
  theme: ThemeVariant;
  /** Primary hex (e.g. #0EA5E9). */
  primaryColor: string;
  /** Light background hex (e.g. #F0F9FF). */
  bgLight: string;
  /** Tailwind accent class for links/buttons (e.g. text-sky-600, bg-pink-500). */
  accentClass: string;
  /** Border/sidebar accent. */
  borderClass: string;
  /** Hover background. */
  hoverBgClass: string;
};

const THEMES: Record<ThemeVariant, Omit<ThemeContextValue, "theme">> = {
  male: {
    primaryColor: "#0EA5E9",
    bgLight: "#F0F9FF",
    accentClass: "text-sky-600",
    borderClass: "border-sky-200",
    hoverBgClass: "hover:bg-sky-50",
  },
  female: {
    primaryColor: "#DB2777",
    bgLight: "#FDF2F8",
    accentClass: "text-pink-600",
    borderClass: "border-pink-200",
    hoverBgClass: "hover:bg-pink-50",
  },
  neutral: {
    primaryColor: "#7C3AED",
    bgLight: "#FAF5FF",
    accentClass: "text-violet-600",
    borderClass: "border-violet-200",
    hoverBgClass: "hover:bg-violet-50",
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getThemeFromGender(gender: string | null | undefined): ThemeVariant {
  if (!gender || typeof gender !== "string") return "neutral";
  const g = gender.toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  return "neutral";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeVariant>("neutral");

  const fetchGender = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTheme("neutral");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", user.id)
      .maybeSingle();
    const gender = (data as { gender?: string } | null)?.gender;
    setTheme(getThemeFromGender(gender));
  }, []);

  useEffect(() => {
    fetchGender();
  }, [fetchGender]);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(() => {
      fetchGender();
    });
    return () => sub.data.subscription.unsubscribe();
  }, [fetchGender]);

  useEffect(() => {
    window.addEventListener(PROFILE_UPDATED_EVENT, fetchGender);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, fetchGender);
  }, [fetchGender]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    ...THEMES[theme],
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "neutral",
      ...THEMES.neutral,
    };
  }
  return ctx;
}
