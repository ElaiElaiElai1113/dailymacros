export type IngredientLineLike = {
  ingredient_name?: string | null;
  name?: string | null;
  amount?: number | null;
  unit?: string | null;
};

export function formatAddonList(
  names: string[],
  { maxChars = 70 }: { maxChars?: number } = {}
): string {
  const cleaned = names.map((n) => n.trim()).filter((n) => n.length > 0);
  if (cleaned.length === 0) return "none";

  const counts = new Map<string, { label: string; count: number }>();
  cleaned.forEach((name) => {
    const key = name.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label: name, count: 1 });
    }
  });

  const merged = Array.from(counts.values()).map((v) =>
    v.count > 1 ? `${v.label} (x${v.count})` : v.label
  );

  let acc = "";
  let shown = 0;
  for (let i = 0; i < merged.length; i += 1) {
    const next = merged[i];
    const candidate = acc ? `${acc}, ${next}` : next;
    if (candidate.length > maxChars) break;
    acc = candidate;
    shown += 1;
  }
  const remaining = merged.length - shown;
  return remaining > 0 ? `${acc} +${remaining} more` : acc;
}

export function groupIngredientLines<T extends IngredientLineLike>(
  lines: T[]
): Array<{ name: string; amount: number; unit: string; count: number }> {
  const order: string[] = [];
  const map = new Map<string, { name: string; amount: number; unit: string; count: number }>();

  lines.forEach((line) => {
    const name = (line.ingredient_name || line.name || "Unknown").trim();
    const unit = (line.unit || "").trim();
    const amount = typeof line.amount === "number" ? line.amount : 0;
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += amount;
      existing.count += 1;
    } else {
      map.set(key, { name, amount, unit, count: 1 });
      order.push(key);
    }
  });

  return order.map((k) => map.get(k)!);
}

export function formatGroupedIngredientLines(
  lines: Array<{ name: string; amount: number; unit: string; count: number }>,
  { maxChars = 80 }: { maxChars?: number } = {}
): string {
  if (lines.length === 0) return "none";
  const parts = lines.map((l) => {
    const count = l.count > 1 ? ` (x${l.count})` : "";
    const amount = l.unit ? ` - ${l.amount} ${l.unit}` : "";
    return `${l.name}${count}${amount}`;
  });
  let acc = "";
  let shown = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const next = parts[i];
    const candidate = acc ? `${acc}, ${next}` : next;
    if (candidate.length > maxChars) break;
    acc = candidate;
    shown += 1;
  }
  const remaining = parts.length - shown;
  return remaining > 0 ? `${acc} +${remaining} more` : acc;
}
