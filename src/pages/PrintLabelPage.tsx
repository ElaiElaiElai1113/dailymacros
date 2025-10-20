// src/pages/PrintLabelPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type IngredientLine = {
  ingredient_id: string;
  name: string;
  amount: number;
  unit: string;
  grams: number | null;
};
type ItemMacros = {
  order_item_id: string;
  order_id: string;
  item_name: string;
  total_kcal: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
  total_carbs_g: number | null;
  total_sugars_g: number | null;
  total_fiber_g: number | null;
  total_sodium_mg: number | null;
  ingredients: IngredientLine[];
};
type OrderMeta = { pickup_time: string | null };

export default function PrintLabelPage() {
  const { orderItemId } = useParams<{ orderItemId: string }>();
  const [data, setData] = useState<(ItemMacros & OrderMeta) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!orderItemId) throw new Error("Missing order item id in URL.");

        // join orders for pickup_time
        const { data: rows, error } = await supabase
          .from("order_item_macros_v")
          .select("*, orders!inner(pickup_time)")
          .eq("order_item_id", orderItemId)
          .limit(1);

        if (error) throw error;

        const row = rows?.[0] as any;
        if (!row) throw new Error("Label data not found for this item.");

        setData({
          ...row,
          pickup_time: row.orders?.pickup_time ?? null,
          ingredients: row.ingredients || [],
        });

        // auto-print after first paint
        setTimeout(() => window.print(), 300);
      } catch (e: any) {
        setErr(e.message || "Failed to load label");
      }
    })();
  }, [orderItemId]);

  if (err) {
    return <div className="p-4 text-sm text-rose-700">{err}</div>;
  }
  if (!data) {
    return <div className="p-4 text-sm text-gray-600">Loading…</div>;
  }

  const kcal = Math.round(data.total_kcal || 0);
  const P = (data.total_protein_g || 0).toFixed(1);
  const C = (data.total_carbs_g || 0).toFixed(1);
  const F = (data.total_fat_g || 0).toFixed(1);
  const Sug = (data.total_sugars_g || 0).toFixed(1);
  const Fib = (data.total_fiber_g || 0).toFixed(1);
  const Na = Math.round(data.total_sodium_mg || 0);
  const pickup = data.pickup_time
    ? new Date(data.pickup_time).toLocaleString([], { hour12: true })
    : "—";

  return (
    <div className="label">
      <div className="title">{data.item_name}</div>
      <div className="sub">
        #{data.order_id.slice(0, 8)} • {pickup}
      </div>

      <div className="box">
        <div className="row">
          <b>Calories</b>
          <b>{kcal}</b>
        </div>
        <div className="grid">
          <div>
            Protein: <b>{P}g</b>
          </div>
          <div>
            Carbs: <b>{C}g</b>
          </div>
          <div>
            Fat: <b>{F}g</b>
          </div>
          <div>
            Sugars: <b>{Sug}g</b>
          </div>
          <div>
            Fiber: <b>{Fib}g</b>
          </div>
          <div>
            Sodium: <b>{Na}mg</b>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="ing-title">Ingredients</div>
        {data.ingredients?.length ? (
          data.ingredients.map((l, i) => (
            <div key={i} className="row">
              <div className="truncate">{l.name}</div>
              <div className="muted">
                {l.amount} {l.unit}
              </div>
            </div>
          ))
        ) : (
          <div className="muted">None</div>
        )}
      </div>

      <div className="noprint actions">
        <button onClick={() => window.print()}>Print</button>
      </div>

      <style>{`
        @page { size: 2.25in 3.5in; margin: 6mm; }
        html, body { background: #fff; }
        body { margin:0; }
        .label { font: 12px/1.25 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif; padding: 8px; color:#111;}
        .title { font-weight: 700; font-size: 14px; }
        .sub { color:#666; margin-top:2px; }
        .box { border:1px solid #ddd; border-radius:6px; padding:6px; margin-top:6px; }
        .row { display:flex; justify-content:space-between; gap:8px; }
        .grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:4px; margin-top:4px; }
        .muted { color:#666; }
        .truncate { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .actions { margin-top:8px; }
        .actions button { border:1px solid #ccc; border-radius:6px; padding:4px 8px; background:#fff; }
        @media print { .noprint { display: none } }
      `}</style>
    </div>
  );
}
