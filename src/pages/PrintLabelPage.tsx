// src/pages/PrintLabelPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/assets/dailymacroslogo.png";

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
  const P = Math.round(data.total_protein_g || 0);
  const C = Math.round(data.total_carbs_g || 0);
  const F = Math.round(data.total_fat_g || 0);
  return (
    <div className="label">
      <div className="nf-title">Nutritional Facts</div>
      <div className="kcal-row">
        <div className="kcal">{kcal}</div>
        <div className="kcal-unit">kcal</div>
      </div>

      <div className="rule" />

      <div className="macro-list">
        <div className="macro-row">
          <span>{C}g Carbs</span>
        </div>
        <div className="macro-row">
          <span>{P}g Protein</span>
        </div>
        <div className="macro-row">
          <span>{F}g Fat</span>
        </div>
      </div>

      <div className="rule" />

      <div className="serving">per 16 oz serving</div>
      <div className="item-name">{data.item_name.toUpperCase()}</div>
      <div className="addons">
        add ons:{" "}
        {data.ingredients?.length
          ? data.ingredients.map((l) => l.name).join(", ")
          : "none"}
      </div>
      <div className="tagline">Balanced nutrition for everyday energy.</div>

      <div className="logo-wrap">
        <img src={logo} alt="daily macros" />
      </div>

      <div className="noprint actions">
        <button onClick={() => window.print()}>Print</button>
      </div>

      <style>{`
        @page { size: 5cm 14cm; margin: 6mm; }
        html, body { background: #fff; }
        body { margin: 0; }
        .label {
          width: 5cm;
          min-height: 14cm;
          font: 12px/1.2 "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: #111;
          padding: 6mm 5mm;
          box-sizing: border-box;
        }
        .nf-title { font-weight: 700; font-size: 16px; text-align: center; }
        .kcal-row {
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 6px;
          margin-top: 6px;
        }
        .kcal { font-size: 34px; font-weight: 800; }
        .kcal-unit { font-size: 18px; font-weight: 700; }
        .rule { height: 3px; background: #222; margin: 10px 0; border-radius: 2px; }
        .macro-list { display: grid; gap: 6px; justify-items: center; font-size: 13px; }
        .macro-row { display: flex; align-items: center; gap: 6px; font-weight: 600; }
        .serving { text-align: center; font-size: 12px; margin-top: 2px; }
        .item-name { text-align: center; font-weight: 800; font-size: 13px; margin-top: 6px; letter-spacing: 0.3px; }
        .addons { text-align: center; font-size: 11px; margin-top: 4px; }
        .tagline { text-align: center; font-size: 11px; font-style: italic; margin-top: 12px; }
        .logo-wrap { display: flex; justify-content: center; margin-top: 20px; }
        .logo-wrap img { width: 36px; height: auto; }
        .actions { margin-top: 10px; text-align: center; }
        .actions button { border: 1px solid #ccc; border-radius: 6px; padding: 4px 8px; background: #fff; }
        @media print { .noprint { display: none } }
      `}</style>
    </div>
  );
}
