import {
  ArrowDown,
  Car,
  Circle,
  Film,
  Heart,
  Receipt,
  ShoppingBag,
  Utensils,
  type LucideProps,
} from "lucide-react";
import type React from "react";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  "arrow-down": ArrowDown,
  bag: ShoppingBag,
  car: Car,
  circle: Circle,
  film: Film,
  heart: Heart,
  receipt: Receipt,
  utensils: Utensils,
};

const LUCIDE_NAME = /^[a-z][a-z0-9-]*$/;

export const COLOR_PALETTE: { key: string; bg: string; fg: string; label: string }[] = [
  { key: "sage",       bg: "var(--color-sage-soft)",  fg: "var(--color-sage)",       label: "Sage" },
  { key: "clay",       bg: "#f5ede4",                  fg: "#9a6f4a",                 label: "Clay" },
  { key: "terracotta", bg: "#f5e0da",                  fg: "var(--color-terracotta)", label: "Terra" },
  { key: "sky",        bg: "#ddeaf5",                  fg: "#4a7a9b",                 label: "Sky" },
  { key: "lavender",   bg: "#ebe5f5",                  fg: "#7a5a95",                 label: "Lavender" },
  { key: "gold",       bg: "#f5f0da",                  fg: "#9a8030",                 label: "Gold" },
  { key: "rose",       bg: "#f5e0eb",                  fg: "#964a70",                 label: "Rose" },
  { key: "mint",       bg: "#daf5ea",                  fg: "#3a8060",                 label: "Mint" },
];

export function colorStyles(color: string | null | undefined): { bg: string; fg: string } {
  const found = COLOR_PALETTE.find((c) => c.key === color);
  return found ?? { bg: "var(--color-sage-soft)", fg: "var(--color-sage)" };
}

export function CategoryIcon({
  icon,
  size = 14,
}: {
  icon: string | null | undefined;
  size?: number;
}) {
  if (!icon) return null;
  if (LUCIDE_NAME.test(icon)) {
    const Icon = ICON_MAP[icon];
    return Icon ? <Icon size={size} className="shrink-0" /> : null;
  }
  return <>{icon}</>;
}

/** Colored circle badge wrapping the icon — for list rows. */
export function CategoryBadge({
  icon,
  color,
  size = 16,
}: {
  icon: string | null | undefined;
  color?: string | null;
  size?: number;
}) {
  const { bg, fg } = colorStyles(color);
  return (
    <span
      className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
      style={{ background: bg, color: fg }}
    >
      <CategoryIcon icon={icon} size={size} />
    </span>
  );
}

/** For <option> elements — strips Lucide names, keeps emoji. */
export function catOptionLabel(name: string | null, icon: string | null): string {
  if (!icon || LUCIDE_NAME.test(icon)) return name ?? "Uncategorized";
  return `${icon} ${name ?? "Uncategorized"}`;
}
