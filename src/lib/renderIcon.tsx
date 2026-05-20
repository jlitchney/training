import { BRAND_ICONS, isBrandIcon } from "@/lib/brandIcons";

// Renders brand icons with fill="currentColor" — use when container sets text color (e.g. text-white on colored bg)
export function renderIcon(emoji: string, svgClassName = "w-6 h-6") {
  if (isBrandIcon(emoji)) {
    const brand = BRAND_ICONS[emoji];
    if (brand) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={svgClassName} aria-label={brand.label}>
          <path d={brand.path} />
        </svg>
      );
    }
  }
  return emoji;
}

// Renders brand icons in their native brand hex color — use on white/neutral backgrounds
export function renderIconColored(emoji: string, svgClassName = "w-6 h-6") {
  if (isBrandIcon(emoji)) {
    const brand = BRAND_ICONS[emoji];
    if (brand) {
      return (
        <svg viewBox="0 0 24 24" fill={brand.hex} className={svgClassName} aria-label={brand.label}>
          <path d={brand.path} />
        </svg>
      );
    }
  }
  return emoji;
}
