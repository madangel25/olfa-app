import type { Metadata } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LayoutWithNavbar } from "@/components/LayoutWithNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
});

export const metadata: Metadata = {
  title: "Olfa – Islamic Marriage Platform",
  description:
    "Olfa is an intentional Islamic marriage platform with safety-first verification, guided matching, and role-based community protection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="neutral" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} antialiased`}
      >
        <LanguageProvider>
          <ThemeProvider>
            <LayoutWithNavbar>{children}</LayoutWithNavbar>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

