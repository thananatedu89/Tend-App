"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const SKIP_PATHS = ["/login", "/onboarding", "/register"];

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return;
    if (!localStorage.getItem("tend_onboarded")) {
      router.replace("/onboarding");
    }
  }, [router, pathname]);
  return null;
}
