// src/app/api/payment/notification/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTransactionStatus } from "@/lib/midtrans";
import { restoreOrderStock } from "@/lib/stock";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const n = await req.json().catch(() => null);
  if (!n?.order_id) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Jangan percaya isi notifikasi begitu saja. Tanyakan status asli
  // langsung ke Midtrans memakai Server Key kita (cara resmi yang direkomendasikan).
  const s = await getTransactionStatus(n.order_id);
  if (!s || String(s.status_code) === "404" || s.order_id !== n.order_id) {
    console.log("NOTIFIKASI DITOLAK: tidak terverifikasi di Midtrans", {
      order_id: n.order_id,
      status_code: s?.status_code,
      status_message: s?.status_message,
    });
    return NextResponse.json({ error: "Not verified" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id,status,payment_status,total")
    .eq("midtrans_order_id", s.order_id)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true }); // percobaan lama / tak dikenal

  // Nominal dari Midtrans harus sama dengan total pesanan kita
  if (Math.round(Number(s.gross_amount)) !== Math.round(Number(order.total))) {
    console.log("NOMINAL TIDAK COCOK", {
      midtrans: s.gross_amount,
      pesanan: order.total,
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const ts = s.transaction_status as string;
  const now = new Date().toISOString();

  const paid =
    ts === "settlement" || (ts === "capture" && s.fraud_status === "accept");

  if (paid && order.status === "pending") {
    await admin
      .from("orders")
      .update({
        status: "diproses",
        payment_status: "dibayar",
        paid_at: now,
        midtrans_transaction_id: s.transaction_id,
        updated_at: now,
      })
      .eq("id", order.id);
    // payment_method sengaja TIDAK ditimpa: label di UI memakai pilihan user
  } else if (
    (ts === "expire" || ts === "cancel") &&
    order.status === "pending"
  ) {
    // Update bersyarat supaya stok hanya dipulihkan sekali walaupun Midtrans
    // mengirim notifikasi yang sama lebih dari satu kali.
    const { data: updated } = await admin
      .from("orders")
      .update({
        status: "dibatalkan",
        payment_status: "kedaluwarsa",
        cancelled_at: now,
        cancellation_reason:
          ts === "expire"
            ? "Pembayaran kedaluwarsa (24 jam)"
            : "Pembayaran dibatalkan",
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id");

    // Stok dikurangi saat createOrder, jadi dikembalikan di sini.
    if (updated && updated.length > 0) {
      await restoreOrderStock(order.id, admin);
      revalidatePath("/admin/orders");
      revalidatePath("/admin/products");
      revalidatePath("/pesanan");
      revalidatePath("/produk");
    }
  } else if (ts === "deny" && order.status === "pending") {
    // Pesanan tetap pending; user bisa bayar lagi (token baru)
    await admin
      .from("orders")
      .update({ payment_status: "gagal", updated_at: now })
      .eq("id", order.id);
  } else if (ts === "refund" || ts === "partial_refund") {
    await admin
      .from("orders")
      .update({
        payment_status: "dikembalikan",
        refunded_at: now,
        refund_amount: Number(s.refund_amount ?? s.gross_amount),
        updated_at: now,
      })
      .eq("id", order.id);
  }

  return NextResponse.json({ ok: true });
}
