// src/theme/brand.ts
export const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#F6ECC6",
} as const;

// quick utility classes (Tailwind) that match brand tones
export const brand = {
  panel: "bg-white border border-gray-200 rounded-2xl p-4 shadow-sm",
  header: "text-2xl font-bold",
  subheader: "text-sm text-gray-600",
  buttonPrimary:
    "px-4 py-2.5 text-white font-medium rounded-lg shadow-sm hover:opacity-90 transition disabled:opacity-60",
  buttonOutline: "px-4 py-2.5 border font-medium rounded-lg transition",
  chip: "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full",
};
