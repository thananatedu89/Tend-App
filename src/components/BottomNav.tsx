"use client";

import { usePathname } from "next/navigation";

const tabs = [
  {
    label: "Today",
    href: "/",
    match: (p: string) => p === "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    label: "Activity",
    href: "/transactions",
    match: (p: string) => p.startsWith("/transactions"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  null, // center + placeholder
  {
    label: "Plan",
    href: "/budget",
    match: (p: string) => p.startsWith("/budget"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4v-6H4v6zM10 20h4V10h-4v10zM16 20h4V4h-4v16z" />
      </svg>
    ),
  },
  {
    label: "You",
    href: "/settings",
    match: (p: string) => p.startsWith("/settings"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function BottomNav({ hasPlanAlert }: { hasPlanAlert?: boolean }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-mist safe-bottom z-40">
      <div className="flex items-end">
        {tabs.map((tab, i) => {
          // Center add button
          if (tab === null) {
            return (
              <a
                key="add"
                href="/transactions/new"
                className="flex-1 flex flex-col items-center pb-2 -mt-5"
                aria-label="Add transaction"
              >
                <span className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-sage text-sage bg-paper transition-colors hover:bg-sage-soft">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </a>
            );
          }

          const active = tab.match(pathname);
          const showBadge = hasPlanAlert && tab.href === "/budget";
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? "text-ink" : "text-ink/35 hover:text-ink/60"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {showBadge && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ background: "var(--color-terracotta)" }}
                  />
                )}
              </span>
              <span className="font-body text-[10px] leading-none">{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
