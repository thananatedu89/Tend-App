"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.18s ease" }}>
      {children}
    </div>
  );
}
