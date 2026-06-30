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
  let hasPlanAlert = false;
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: budget } = await supabase
        .from("budgets")
        .select("id, budget_lines(category_id, allocated_amount)")
        .eq("month", monthStart)
        .maybeSingle();
      if (budget?.budget_lines?.length) {
        const { data: txns } = await supabase
          .from("transactions")
          .select("category_id, amount")
          .gte("occurred_at", monthStart)
          .lt("amount", 0);
        const spent = new Map<string, number>();
        for (const t of txns ?? []) {
          if (!t.category_id) continue;
          spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + Math.abs(t.amount));
        }
        hasPlanAlert = budget.budget_lines.some(
          (line) => (spent.get(line.category_id) ?? 0) > line.allocated_amount,
        );
      }
    }
  } catch {
    // non-critical — badge silently absent on error
  }

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
        <BottomNav hasPlanAlert={hasPlanAlert} />
        <Toast />
      </body>
    </html>
  );
}
