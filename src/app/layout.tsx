import type { Metadata } from "next";
import { Baloo_2, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Rounded Devanagari + Latin face for the स्वस्थ Bharat wordmark.
const brandFont = Baloo_2({
  variable: "--font-brand",
  subsets: ["devanagari", "latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "स्वस्थ Bharat",
  description: "Posture, urges, sleep, movement and accountability — your wellness, together in one app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
