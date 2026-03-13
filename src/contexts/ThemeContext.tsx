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
  primaryColor: string;
  bgLight: string;
  accentClass: string;
  borderClass: string;
  hoverBgClass: string;
};

const UNIFIED_THEME: Omit<ThemeContextValue, "theme"> = {
  primaryColor: "#F43F5E",
  bgLight: "#FFF1F2",
  accentClass: "text-rose-600",
  borderClass: "border-stone-200",
  hoverBgClass: "hover:bg-stone-50",
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
    ...UNIFIED_THEME,
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
      ...UNIFIED_THEME,
    };
  }
  return ctx;
}
