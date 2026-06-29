import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingGate } from "@/components/OnboardingGate";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${ibmPlexSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <RegisterServiceWorker />
        <OnboardingGate />
        {children}
        {/* spacer so fixed bottom nav never covers content */}
        <div className="h-16 shrink-0" aria-hidden="true" />
        <BottomNav />
      </body>
    </html>
  );
}
