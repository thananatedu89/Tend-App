"use client";

import { usePathname } from "next/navigation";

const items = [
  {
    label: "Home",
    href: "/",
    match: (p: string) => p === "/",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 2L2 9v9h5v-5h6v5h5V9L10 2z" />
      </svg>
    ),
  },
  {
    label: "Add",
    href: "/transactions/new",
    match: (p: string) => p === "/transactions/new",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 7v6M7 10h6" />
      </svg>
    ),
  },
  {
    label: "History",
    href: "/transactions",
    match: (p: string) =>
      p.startsWith("/transactions") && p !== "/transactions/new",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M3 5h14M3 10h14M3 15h9" />
      </svg>
    ),
  },
  {
    label: "Budget",
    href: "/budget",
    match: (p: string) => p.startsWith("/budget"),
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 17h3v-5H3v5zM8.5 17h3V9h-3v8zM14 17h3V5h-3v12z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-paper border-t border-mist safe-bottom">
      <div className="flex">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? "text-ink" : "text-ink/35 hover:text-ink/60"
              }`}
            >
              {item.icon}
              <span className="font-body text-[10px] leading-none">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
