// src/app/api/checkout/route.ts
// Body: { orderId: number } -> pesanan sudah dibuat createOrder() dengan status 'pending'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSnapTransaction, newMidtransOrderId } from "@/lib/midtrans";

// Metode yang dipilih user di CheckoutForm -> nama channel Snap
const CHANNEL: Record<string, string[]> = {
  qris: ["other_qris"],
  bca: ["bca_va"],
  bni: ["bni_va"],
  mandiri: ["echannel"],
  gopay: ["gopay"],
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id,user_id,status,payment_status,payment_method,total,shipping_cost,discount,snap_token,payment_deadline,order_items(product_variant_id,product_name_snapshot,price,quantity)",
    )
    .eq("id", orderId)
    .single();

  if (!order || order.user_id !== auth.user.id) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan" },
      { status: 404 },
    );
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Pesanan ini tidak bisa dibayar" },
      { status: 400 },
    );
  }

  // Token lama masih berlaku -> pakai lagi
  if (
    order.snap_token &&
    order.payment_status !== "gagal" &&
    order.payment_deadline &&
    new Date(order.payment_deadline) > new Date()
  ) {
    return NextResponse.json({ token: order.snap_token });
  }

  const items: { id: string; price: number; quantity: number; name: string }[] =
    order.order_items.map((i: any) => ({
      id: String(i.product_variant_id),
      price: Math.round(Number(i.price)),
      quantity: i.quantity,
      name: String(i.product_name_snapshot ?? "Produk").slice(0, 50),
    }));
  if (Number(order.shipping_cost) > 0) {
    items.push({
      id: "SHIPPING",
      price: Math.round(Number(order.shipping_cost)),
      quantity: 1,
      name: "Ongkos kirim",
    });
  }
  if (Number(order.discount) > 0) {
    items.push({
      id: "DISCOUNT",
      price: -Math.round(Number(order.discount)),
      quantity: 1,
      name: "Diskon",
    });
  }

  const gross = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (gross !== Math.round(Number(order.total))) {
    return NextResponse.json(
      { error: "Total pesanan tidak cocok dengan rincian item" },
      { status: 500 },
    );
  }

  const midtransOrderId = newMidtransOrderId(order.id);
  const channel = order.payment_method
    ? CHANNEL[order.payment_method]
    : undefined;

  const snap = await createSnapTransaction({
    transaction_details: { order_id: midtransOrderId, gross_amount: gross },
    item_details: items,
    customer_details: { email: auth.user.email },
    expiry: { unit: "hours", duration: 24 },
    ...(channel ? { enabled_payments: channel } : {}),
  });

  if (!snap.token) {
    console.error("Midtrans error:", snap);
    return NextResponse.json(
      { error: "Gagal membuat transaksi pembayaran" },
      { status: 502 },
    );
  }

  await admin
    .from("orders")
    .update({
      snap_token: snap.token,
      midtrans_order_id: midtransOrderId,
      payment_status: "belum_dibayar",
      payment_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return NextResponse.json({ token: snap.token });
}
