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

/** Sage-soft circle badge wrapping the icon — for list rows. */
export function CategoryBadge({
  icon,
  size = 16,
}: {
  icon: string | null | undefined;
  size?: number;
}) {
  return (
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-sage-soft shrink-0 text-sage">
      <CategoryIcon icon={icon} size={size} />
    </span>
  );
}

/** For <option> elements — strips Lucide names, keeps emoji. */
export function catOptionLabel(name: string | null, icon: string | null): string {
  if (!icon || LUCIDE_NAME.test(icon)) return name ?? "Uncategorized";
  return `${icon} ${name ?? "Uncategorized"}`;
}
