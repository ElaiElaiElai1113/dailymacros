const PHP_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPHP(amount: number) {
  return PHP_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCents(cents: number) {
  return formatPHP((Number(cents || 0)) / 100);
}
