import {
  useEffect,
  useMemo,
  useState,
  type JSXElementConstructor,
  type Key,
  type ReactElement,
  type ReactNode,
  type ReactPortal,
} from "react";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import { breakdownFor } from "@/utils/nutrition";
import { supabase } from "@/lib/supabaseClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Props = {
  lines: LineIngredient[];
  ingDict?: Record<string, Ingredient>;
  nutrDict?: Record<string, IngredientNutrition>;
  buttonClassName?: string;
  styleOverride?: React.CSSProperties;
};

export default function ExplainMath({
  lines,
  ingDict,
  nutrDict,
  buttonClassName,
  styleOverride,
}: Props) {
  const [open, setOpen] = useState(false);
  const [ing, setIng] = useState<Record<string, Ingredient>>({});
  const [nutr, setNutr] = useState<Record<string, IngredientNutrition>>({});

  useEffect(() => {
    if (ingDict && nutrDict) {
      setIng(ingDict);
      setNutr(nutrDict);
      return;
    }
    (async () => {
      const [{ data: ii = [] }, { data: nn = [] }] = await Promise.all([
        supabase.from("ingredients").select("*").eq("is_active", true),
        supabase.from("ingredient_nutrition_v100").select("*"),
      ]);
      setIng(Object.fromEntries((ii as Ingredient[]).map((x) => [x.id, x])));
      setNutr(
        Object.fromEntries(
          (nn as IngredientNutrition[]).map((x) => [x.ingredient_id, x])
        )
      );
    })();
  }, [ingDict, nutrDict]);

  const rows = useMemo(
    () => breakdownFor(lines, ing, nutr),
    [lines, ing, nutr]
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (
        acc: {
          energy_kcal: any;
          protein_g: any;
          fat_g: any;
          carbs_g: any;
          sugars_g: any;
          fiber_g: any;
          sodium_mg: any;
        },
        r: {
          contrib: {
            energy_kcal: any;
            protein_g: any;
            fat_g: any;
            carbs_g: any;
            sugars_g: any;
            fiber_g: any;
            sodium_mg: any;
          };
        }
      ) => {
        acc.energy_kcal += r.contrib.energy_kcal;
        acc.protein_g += r.contrib.protein_g;
        acc.fat_g += r.contrib.fat_g;
        acc.carbs_g += r.contrib.carbs_g;
        acc.sugars_g += r.contrib.sugars_g;
        acc.fiber_g += r.contrib.fiber_g;
        acc.sodium_mg += r.contrib.sodium_mg;
        return acc;
      },
      {
        energy_kcal: 0,
        protein_g: 0,
        fat_g: 0,
        carbs_g: 0,
        sugars_g: 0,
        fiber_g: 0,
        sodium_mg: 0,
      }
    );
  }, [rows]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={styleOverride}
        className={
          buttonClassName ?? "px-3 py-2 border rounded hover:bg-gray-50 text-sm"
        }
      >
        Explain my math
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] max-h-[90vh] sm:h-[70vh] sm:max-h-[80vh] sm:max-w-2xl sm:mx-auto sm:rounded-t-3xl overflow-y-auto"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted sm:hidden" />
          <SheetHeader className="mt-2 sm:mt-4">
            <SheetTitle>Nutrition breakdown</SheetTitle>
            <SheetDescription>
              See how the nutrition values are calculated for each ingredient.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 overflow-auto max-h-[calc(90vh-8rem)] sm:max-h-[calc(80vh-8rem)]">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr className="border-b">
                    <th className="py-2">Ingredient</th>
                    <th className="py-2">Input</th>
                    <th className="py-2">Grams</th>
                    <th className="py-2">kcal</th>
                    <th className="py-2">P(g)</th>
                    <th className="py-2">F(g)</th>
                    <th className="py-2">C(g)</th>
                    <th className="py-2">Sug(g)</th>
                    <th className="py-2">Fib(g)</th>
                    <th className="py-2">Na(mg)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(
                    (r: {
                      ingredient_id: Key | null | undefined;
                      name:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<
                            unknown,
                            string | JSXElementConstructor<any>
                          >
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<
                                unknown,
                                string | JSXElementConstructor<any>
                              >
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      input: {
                        amount:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        unit:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                      };
                      grams_used:
                        | string
                        | number
                        | bigint
                        | boolean
                        | ReactElement<
                            unknown,
                            string | JSXElementConstructor<any>
                          >
                        | Iterable<ReactNode>
                        | ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | ReactPortal
                            | ReactElement<
                                unknown,
                                string | JSXElementConstructor<any>
                              >
                            | Iterable<ReactNode>
                            | null
                            | undefined
                          >
                        | null
                        | undefined;
                      contrib: {
                        energy_kcal:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        protein_g:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        fat_g:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        carbs_g:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        sugars_g:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        fiber_g:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        sodium_mg:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                      };
                    }) => (
                      <tr key={r.ingredient_id} className="border-b">
                        <td className="py-2">{r.name}</td>
                        <td className="py-2">
                          {r.input.amount} {r.input.unit}
                        </td>
                        <td className="py-2">{r.grams_used}</td>
                        <td className="py-2">{r.contrib.energy_kcal}</td>
                        <td className="py-2">{r.contrib.protein_g}</td>
                        <td className="py-2">{r.contrib.fat_g}</td>
                        <td className="py-2">{r.contrib.carbs_g}</td>
                        <td className="py-2">{r.contrib.sugars_g}</td>
                        <td className="py-2">{r.contrib.fiber_g}</td>
                        <td className="py-2">{r.contrib.sodium_mg}</td>
                      </tr>
                    )
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium">
                    <td className="py-2" colSpan={3}>
                      Totals
                    </td>
                    <td className="py-2">{Math.round(totals.energy_kcal)}</td>
                    <td className="py-2">{totals.protein_g.toFixed(1)}</td>
                    <td className="py-2">{totals.fat_g.toFixed(1)}</td>
                    <td className="py-2">{totals.carbs_g.toFixed(1)}</td>
                    <td className="py-2">{totals.sugars_g.toFixed(1)}</td>
                    <td className="py-2">{totals.fiber_g.toFixed(1)}</td>
                    <td className="py-2">{Math.round(totals.sodium_mg)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className="text-xs text-muted-foreground mt-4">
                Notes: grams are computed from your input using density (ml→g)
                or grams-per-scoop if provided. Per-100g values are scaled by
                grams/100.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
}
