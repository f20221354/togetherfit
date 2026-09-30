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

// Rounded face for the togetherfit wordmark.
const brandFont = Baloo_2({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const DESCRIPTION = "Posture, urges, sleep, movement and accountability — your wellness, together in one app.";

export const metadata: Metadata = {
  title: "togetherfit",
  applicationName: "togetherfit",
  description: DESCRIPTION,
  openGraph: {
    title: "togetherfit",
    description: DESCRIPTION,
    siteName: "togetherfit",
    images: [{ url: "/brand/togetherfit-logo-light.png", width: 520, height: 506, alt: "togetherfit logo" }],
  },
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
