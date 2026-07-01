import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { PageTransition } from "@/components/PageTransition";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/server";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  weight: ["400", "500"],
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "Tend",
  description: "Money, quietly in order.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tend",
  },
  icons: {
    icon: ["/icons/icon-192.png", "/icons/icon-512.png"],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f1e9",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${ibmPlexSansThai.variable} h-full antialiased`}
    >
      <head>
        {/* Read theme from localStorage before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('tend_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `document.addEventListener('click',function(e){var b=e.target.closest('button[type="submit"],a[href]');if(b&&navigator.vibrate)navigator.vibrate(6);});` }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <RegisterServiceWorker />
        <OnboardingGate />
        <PageTransition>{children}</PageTransition>
        {/* spacer so fixed bottom nav never covers content */}
        <div className="h-16 shrink-0" aria-hidden="true" />
        <BottomNav />
        <Toast />
      </body>
    </html>
  );
}
