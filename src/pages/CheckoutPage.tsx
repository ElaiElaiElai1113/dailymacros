import { useCart } from "@/context/CartContext";
import PickupTimePicker from "@/components/PickupTimePicker";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Hash, Phone, User, Tag } from "lucide-react";

function Price({ cents }: { cents: number }) {
  return <span>PHP {(Number(cents || 0) / 100).toFixed(2)}</span>;
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
  const {
    items,
    clear,
    appliedPromo,
    promoDiscount,
    getSubtotal,
    getTotal,
    appliedPromoVariantId,
    appliedPromoAddonId,
  } = useCart();
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

  const subtotal = useMemo(() => getSubtotal(), [items, getSubtotal]);
  const total = useMemo(() => getTotal(), [items, getTotal, promoDiscount]);

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

      const cartItemsPayload = items.map((it) => ({
        drink_id: it.drink_id ?? null,
        size_ml: it.size_ml ?? null,
        item_name: it.item_name,
        lines: (it.lines || []).map((l) => ({
          ingredient_id: l.ingredient_id,
          amount: Number(l.amount),
          unit: l.unit,
          is_extra: !!(l as any).is_extra || (l as any).role === "extra",
        })),
      }));

      const { data: orderResult, error: orderErr } = await supabase.rpc(
        "create_order_with_items",
        {
          p_pickup_time: new Date(pickup).toISOString(),
          p_guest_name: trimmedName || null,
          p_guest_phone: trimmedPhone || null,
          p_payment_method: paymentMethod,
          p_payment_status: payment_status,
          p_payment_reference: paymentRef.trim() || null,
          p_payment_proof_url: payment_proof_url,
          p_cart_items: cartItemsPayload,
          p_promo_code: appliedPromo?.code || null,
          p_selected_variant_id: appliedPromoVariantId || null,
          p_selected_addon_id: appliedPromoAddonId || null,
          p_customer_identifier: trimmedPhone || null,
        }
      );

      if (orderErr || !orderResult?.success) {
        throw orderErr || new Error(orderResult?.errors?.[0] || "Failed to create order.");
      }

      clear();
      setPlaced({ id: orderResult.order_id, tracking_code: orderResult.tracking_code });
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
      <div className="min-h-[70vh] bg-[radial-gradient(circle_at_top,_rgba(210,110,61,0.15),_transparent_55%)] px-4 py-12">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Order placed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We will start preparing your drink near your pickup time.
            </p>
            <div className="flex justify-center">
              <QRCode value={trackUrl} size={180} />
            </div>
            <div className="rounded-xl border bg-muted/30 px-3 py-2 text-xs">
              {trackUrl}
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigator.clipboard.writeText(trackUrl)}
            >
              Copy Tracking Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="secondary">Checkout</Badge>
          <h1 className="mt-2 text-2xl font-semibold">Finish your order</h1>
        </div>
        <Badge variant="glow">{items.length} item(s)</Badge>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>We need a few fixes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className={fieldErrors.pickup ? "border-destructive/60" : ""}>
            <CardHeader>
              <CardTitle className="text-base">Pickup time</CardTitle>
            </CardHeader>
            <CardContent>
              <PickupTimePicker
                value={pickup}
                min={getMinPickup()}
                onChange={setPickup}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Choose a time at least a few minutes from now.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Jane Dela Cruz"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`pl-9 ${fieldErrors.name ? "border-destructive/60" : ""}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="09xx xxx xxxx"
                    required
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`pl-9 ${fieldErrors.phone ? "border-destructive/60" : ""}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as PaymentMethod)
                }
                className="grid gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Cash on pickup</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="gcash" id="gcash" />
                  <Label htmlFor="gcash">GCash</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bank" id="bank" />
                  <Label htmlFor="bank">Bank transfer (BPI)</Label>
                </div>
              </RadioGroup>

              {paymentMethod === "gcash" && (
                <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
                  <div className="font-semibold">GCash details</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Send payment to 09XX XXX XXXX (DailyMacros).
                  </p>
                  <div className="mt-3 flex justify-center">
                    <img
                      src="/gcash-qr.png"
                      alt="GCash QR Code"
                      className="h-32 w-32 object-contain"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "bank" && (
                <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
                  <div className="font-semibold">BPI bank details</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Account name: DailyMacros
                    <br />
                    Account number: XXXX XXXX XXXX
                  </p>
                  <div className="mt-3 flex justify-center">
                    <img
                      src="/bpi-qr.png"
                      alt="BPI QR Code"
                      className="h-32 w-32 object-contain"
                    />
                  </div>
                </div>
              )}

              {(paymentMethod === "gcash" || paymentMethod === "bank") && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentRef">
                      Reference no. / Sender name
                    </Label>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="paymentRef"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="Ref #1234 / Juan Dela Cruz"
                        className={`pl-9 ${fieldErrors.paymentRef ? "border-destructive/60" : ""}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proof">Upload payment proof</Label>
                    <Input
                      id="proof"
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
                      className={
                        fieldErrors.paymentProof ? "border-destructive/60" : ""
                      }
                    />

                    {paymentProofPreview && (
                      <div className="flex items-center gap-2">
                        <img
                          src={paymentProofPreview}
                          alt="Payment proof preview"
                          className="h-14 w-14 rounded-xl border object-cover"
                        />
                        <span className="text-xs text-muted-foreground">
                          {paymentProofFile?.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                {items.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {it.base_drink_name
                          ? `Custom - ${it.base_drink_name}`
                          : it.item_name}
                      </div>
                      {it.size_ml ? (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {Math.round((it.size_ml / 29.5735) * 10) / 10} oz
                        </div>
                      ) : null}
                      {typeof it.base_price_cents === "number" &&
                        typeof it.addons_price_cents === "number" && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Base <Price cents={it.base_price_cents} /> + Add-ons{" "}
                            <Price cents={it.addons_price_cents} />
                          </div>
                        )}
                    </div>
                    <div className="shrink-0 font-semibold">
                      <Price cents={it.unit_price_cents} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between text-base">
                <div className="font-medium">Subtotal</div>
                <div className="font-semibold">
                  <Price cents={subtotal} />
                </div>
              </div>

              {appliedPromo && promoDiscount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    <span className="font-medium">Promo ({appliedPromo.code})</span>
                  </div>
                  <div className="font-semibold">
                    -₱{(promoDiscount / 100).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-lg pt-2 border-t">
                <div className="font-semibold">Total</div>
                <div className="font-bold text-[#D26E3D]">
                  <Price cents={total} />
                </div>
              </div>

              <Button
                disabled={loading || cartEmpty}
                onClick={placeOrder}
                className="w-full"
              >
                {loading ? "Placing..." : "Place Order"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                You will receive a tracking QR and link after checkout.
              </p>
            </CardContent>
          </Card>
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
