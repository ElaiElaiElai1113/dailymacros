import { useCart } from "@/context/CartContext";
import PickupTimePicker from "@/components/PickupTimePicker";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";

function Price({ cents }: { cents: number }) {
  return <span>₱{(Number(cents || 0) / 100).toFixed(2)}</span>;
}

type PaymentMethod = "cash" | "gcash" | "bank";

type FieldErrors = {
  pickup: boolean;
  name: boolean;
  phone: boolean;
  paymentRef: boolean;
  paymentProof: boolean;
};

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const [loadedAt] = useState(() => Date.now());
  const [pickup, setPickup] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(
    null
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    pickup: false,
    name: false,
    phone: false,
    paymentRef: false,
    paymentProof: false,
  });
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState<{
    id: string;
    tracking_code: string;
  } | null>(null);

  const cartEmpty = items.length === 0;

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.unit_price_cents || 0), 0),
    [items]
  );

  function getMinPickup() {
    return new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  }

  function validatePickup(ts: string) {
    const dt = new Date(ts);
    return dt.getTime() > Date.now() + 5 * 60 * 1000;
  }

  function phoneLooksOk(v: string) {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }

  useEffect(() => {
    return () => {
      if (paymentProofPreview) {
        URL.revokeObjectURL(paymentProofPreview);
      }
    };
  }, [paymentProofPreview]);

  async function placeOrder() {
    const newErrors: string[] = [];
    const newFieldErrors: FieldErrors = {
      pickup: false,
      name: false,
      phone: false,
      paymentRef: false,
      paymentProof: false,
    };

    if (honeypot.trim()) {
      newErrors.push("Unable to submit your order. Please try again.");
    }

    if (Date.now() - loadedAt < 3000) {
      newErrors.push("Please wait a moment before submitting.");
    }

    if (cartEmpty) {
      newErrors.push("Your cart is empty.");
    }

    if (!validatePickup(pickup)) {
      newErrors.push("Pickup time must be at least 5 minutes from now.");
      newFieldErrors.pickup = true;
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      newErrors.push("Please enter your full name.");
      newFieldErrors.name = true;
    }

    if (!trimmedPhone) {
      newErrors.push("Please enter your phone number.");
      newFieldErrors.phone = true;
    } else if (!phoneLooksOk(trimmedPhone)) {
      newErrors.push("Enter a valid phone number (10-13 digits).");
      newFieldErrors.phone = true;
    }

    if (paymentMethod === "gcash" || paymentMethod === "bank") {
      if (!paymentRef.trim()) {
        newErrors.push(
          "Please enter your payment reference number or sender name."
        );
        newFieldErrors.paymentRef = true;
      }
      if (!paymentProofFile) {
        newErrors.push("Please upload a screenshot of your payment.");
        newFieldErrors.paymentProof = true;
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setFieldErrors(newFieldErrors);
      return;
    }

    setErrors([]);
    setFieldErrors({
      pickup: false,
      name: false,
      phone: false,
      paymentRef: false,
      paymentProof: false,
    });

    const payment_status =
      paymentMethod === "cash" ? "unpaid" : "pending_verification";

    setLoading(true);
    try {
      let payment_proof_url: string | null = null;

      if (paymentProofFile) {
        const fileExt = paymentProofFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, paymentProofFile);
        if (uploadErr) throw uploadErr;
        const { data: publicUrlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(uploadData.path);
        payment_proof_url = publicUrlData.publicUrl;
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          pickup_time: new Date(pickup).toISOString(),
          guest_name: trimmedName || null,
          guest_phone: trimmedPhone || null,
          status: "pending",
          payment_method: paymentMethod,
          payment_status,
          payment_reference: paymentRef.trim() || null,
          payment_proof_url,
          subtotal_cents: subtotal,
        })
        .select("id, tracking_code")
        .single();

      if (orderErr || !order)
        throw orderErr || new Error("Failed to create order.");

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const { data: oi, error: oiErr } = await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            drink_id: it.drink_id ?? null,
            item_name: it.item_name,
            size_ml: it.size_ml ?? null,
            unit_price_cents: it.unit_price_cents,
            line_total_cents: it.unit_price_cents,
            position: idx,
          })
          .select("id")
          .single();

        if (oiErr || !oi) throw oiErr || new Error("Failed to add order item.");

        const lineRows =
          (it.lines || []).map((l) => ({
            order_item_id: oi.id,
            ingredient_id: l.ingredient_id,
            amount: Number(l.amount),
            unit: l.unit,
            is_extra: !!(l as any).is_extra,
          })) || [];

        if (lineRows.length > 0) {
          const { error: liErr } = await supabase
            .from("order_item_ingredients")
            .insert(lineRows);
          if (liErr) throw liErr;
        }
      }

      clear();
      setPlaced({ id: order.id, tracking_code: order.tracking_code });
    } catch (err: any) {
      setErrors([
        err?.message ||
          "Something went wrong placing your order. Please try again.",
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (placed) {
    const trackUrl = `${window.location.origin}/track/${placed.tracking_code}`;
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#D26E3D] mb-2">
            Order Placed 🎉
          </h1>
          <p className="text-gray-700 mb-4">
            Thank you! We’ll start preparing your drink near your pickup time.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Scan or share this QR to track your order in real time:
          </p>
          <div className="flex justify-center mb-4">
            <QRCode value={trackUrl} size={180} />
          </div>
          <div className="text-sm font-medium break-all text-gray-700">
            {trackUrl}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(trackUrl)}
            className="mt-4 w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Copy Tracking Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold tracking-tight">Checkout</h1>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-3">
          <div className="mt-0.5">⚠️</div>
          <div>
            <div className="font-semibold mb-1">
              We need a few fixes before placing your order:
            </div>
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div
            className={`rounded-2xl border bg-white p-4 ${
              fieldErrors.pickup ? "border-red-300" : ""
            }`}
          >
            <div className="font-semibold">Pickup Time</div>
            <div className="mt-2">
              <PickupTimePicker
                value={pickup}
                min={getMinPickup()}
                onChange={setPickup}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Choose a time at least a few minutes from now.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold">Contact</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                  fieldErrors.name
                    ? "border-red-300 focus:ring-red-300"
                    : "focus:ring-[#D26E3D]/30"
                }`}
                placeholder="Full Name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                  fieldErrors.phone
                    ? "border-red-300 focus:ring-red-300"
                    : "focus:ring-[#D26E3D]/30"
                }`}
                placeholder="Phone Number"
                required
                inputMode="numeric"
                autoComplete="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="font-semibold">Payment</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                Cash on pickup
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={paymentMethod === "gcash"}
                  onChange={() => setPaymentMethod("gcash")}
                />
                GCash
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={paymentMethod === "bank"}
                  onChange={() => setPaymentMethod("bank")}
                />
                Bank transfer (BPI)
              </label>
            </div>

            {paymentMethod === "gcash" && (
              <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                <div className="text-sm font-semibold">GCash Details</div>
                <p>
                  Send payment to:{" "}
                  <span className="font-medium">09XX XXX XXXX</span>{" "}
                  (DailyMacros)
                </p>
                <div className="mt-2 flex justify-center">
                  <img
                    src="/gcash-qr.png"
                    alt="GCash QR Code"
                    className="h-32 w-32 object-contain"
                  />
                </div>
              </div>
            )}

            {paymentMethod === "bank" && (
              <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                <div className="text-sm font-semibold">BPI Bank Details</div>
                <p>
                  Account name: <span className="font-medium">DailyMacros</span>
                  <br />
                  Account number:{" "}
                  <span className="font-medium">XXXX XXXX XXXX</span>
                </p>
                <div className="mt-2 flex justify-center">
                  <img
                    src="/bpi-qr.png"
                    alt="BPI QR Code"
                    className="h-32 w-32 object-contain"
                  />
                </div>
              </div>
            )}

            {(paymentMethod === "gcash" || paymentMethod === "bank") && (
              <>
                <div className="mt-3">
                  <label
                    className={`text-xs ${
                      fieldErrors.paymentRef ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    Reference No. / Sender name{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                      fieldErrors.paymentRef
                        ? "border-red-300 focus:ring-red-300"
                        : "focus:ring-[#D26E3D]/30"
                    }`}
                    placeholder="e.g. GCash Ref #1234 / Juan Dela Cruz"
                  />
                </div>
                <div className="mt-2">
                  <label
                    className={`text-xs ${
                      fieldErrors.paymentProof
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    Upload payment proof (screenshot){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setPaymentProofFile(f);

                      setPaymentProofPreview((old) => {
                        if (old) URL.revokeObjectURL(old);
                        if (!f) return null;
                        return URL.createObjectURL(f);
                      });
                    }}
                    className={`mt-1 block w-full text-sm ${
                      fieldErrors.paymentProof ? "text-red-700" : ""
                    }`}
                  />

                  {paymentProofPreview && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={paymentProofPreview}
                        alt="Payment proof preview"
                        className="h-16 w-16 rounded border object-cover"
                      />
                      <span className="max-w-[140px] truncate text-[11px] text-gray-500">
                        {paymentProofFile?.name}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="md:col-span-1">
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Order Summary</div>
              <div className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                {items.length} item{items.length > 1 ? "s" : ""}
              </div>
            </div>

            <ul className="divide-y divide-gray-100 text-sm">
              {items.map((it, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {it.base_drink_name
                          ? `Custom — ${it.base_drink_name}`
                          : it.item_name}
                      </div>
                      {typeof it.base_price_cents === "number" &&
                        typeof it.addons_price_cents === "number" && (
                          <div className="mt-0.5 text-[11px] text-gray-500">
                            Base <Price cents={it.base_price_cents} /> · Add-ons{" "}
                            <Price cents={it.addons_price_cents} />
                          </div>
                        )}
                    </div>
                    <div className="shrink-0">
                      <Price cents={it.unit_price_cents} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between text-base">
              <div className="font-medium">Subtotal</div>
              <div className="font-semibold">
                <Price cents={subtotal} />
              </div>
            </div>

            <button
              disabled={loading || cartEmpty}
              onClick={placeOrder}
              className="mt-4 w-full rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Placing…" : "Place Order"}
            </button>
            <p className="mt-2 text-[11px] text-gray-500 text-center">
              You’ll receive a tracking QR and link after checkout.
            </p>
          </div>
        </aside>
      </div>

      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-px w-px opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}
