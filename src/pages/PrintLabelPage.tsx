// src/pages/PrintLabelPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/assets/dailymacroslogo.png";
import fruitBg from "@/assets/fruitbg.png";
import { formatAddonList } from "@/utils/addons";

type IngredientLine = {
  ingredient_id: string;
  name: string;
  amount: number;
  unit: string;
  grams: number | null;
  is_addon: boolean;
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

        // Get macros from view
        const { data: macrosRow, error: macrosError } = await supabase
          .from("order_item_macros_v")
          .select("*, orders!inner(pickup_time)")
          .eq("order_item_id", orderItemId)
          .limit(1);

        if (macrosError) throw macrosError;
        if (!macrosRow?.[0]) throw new Error("Label data not found for this item.");

        // Get ingredients with is_addon status
        const { data: ingredientLines, error: ingredientsError } = await supabase
          .from("order_item_ingredients")
          .select("ingredient_id, amount, unit, ingredients(name, is_addon)")
          .eq("order_item_id", orderItemId);

        if (ingredientsError) throw ingredientsError;

        // Filter to only show addons (is_addon = true)
        const addonIngredients = (ingredientLines || [])
          .filter((l: any) => l.ingredients?.is_addon === true)
          .map((l: any) => ({
            ingredient_id: l.ingredient_id,
            name: l.ingredients?.name || "Unknown",
            amount: l.amount,
            unit: l.unit,
            grams: null,
            is_addon: true,
          }));

        setData({
          ...macrosRow[0],
          pickup_time: macrosRow[0].orders?.pickup_time ?? null,
          ingredients: addonIngredients,
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
  const addonsText = formatAddonList(
    data.ingredients?.map((l) => l.name) || []
  );

  return (
    <div className="label-container">
      {/* Fruit background pattern */}
      <div className="fruit-bg" />

      <div className="label">
        <div className="nf-title">Nutritional Facts</div>

        <div className="kcal-row">
          <span className="kcal">{kcal}</span>
          <span className="kcal-unit">kcal</span>
        </div>

        <div className="macros">
          <div className="macro-item">
            <span className="macro-icon">🌾</span>
            <span className="macro-text">{C}g Carbs</span>
          </div>
          <div className="macro-item">
            <span className="macro-icon">💪</span>
            <span className="macro-text">{P}g Protein</span>
          </div>
          <div className="macro-item">
            <span className="macro-icon">💧</span>
            <span className="macro-text">{F}g Fat</span>
          </div>
        </div>

        <div className="serving">per 16 oz serving</div>

        <div className="item-name">{data.item_name.toUpperCase()}</div>

        <div className="addons">add ons: {addonsText}</div>

        <div className="tagline">Balanced nutrition for everyday energy.</div>

        <div className="logo-wrap">
          <img src={logo} alt="daily macros" />
        </div>
      </div>

      <div className="noprint actions">
        <button onClick={() => window.print()}>Print</button>
      </div>

      <style>{`
        @page { size: 5cm 5cm; margin: 0; }
        html, body { background: #FFF8E7; margin: 0; }

        .label-container {
          position: relative;
          width: 5cm;
          min-height: 5cm;
          overflow: hidden;
        }

        /* Fruit background pattern */
        .fruit-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url(${fruitBg});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        .label {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 5cm;
          font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: #111;
          padding: 5mm 3mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
        }

        .nf-title {
          font-weight: 700;
          font-size: 11px;
          text-align: center;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .kcal-row {
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 4px;
        }

        .kcal {
          font-size: 20px;
          font-weight: 800;
          line-height: 1;
        }

        .kcal-unit {
          font-size: 10px;
          font-weight: 700;
        }

        .macros {
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
          margin-bottom: 4px;
        }

        .macro-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 500;
        }

        .macro-icon {
          font-size: 10px;
        }

        .macro-text {
          font-size: 9px;
        }

        .serving {
          text-align: center;
          font-size: 8px;
          margin-top: 2px;
          margin-bottom: 2px;
        }

        .item-name {
          text-align: center;
          font-weight: 800;
          font-size: 10px;
          margin-top: 2px;
          letter-spacing: 0.3px;
          line-height: 1.3;
        }

        .addons {
          text-align: center;
          font-size: 7px;
          margin-top: 2px;
          max-width: 100%;
          word-wrap: break-word;
          overflow: hidden;
        }

        .tagline {
          text-align: center;
          font-size: 7px;
          font-style: italic;
          margin-top: 4px;
          opacity: 0.8;
        }

        .logo-wrap {
          display: flex;
          justify-content: center;
          margin-top: auto;
          padding-top: 4px;
        }

        .logo-wrap img {
          width: 20px;
          height: auto;
        }

        .actions {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
        }

        .actions button {
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 8px 16px;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
        }

        @media print {
          .noprint { display: none; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}
