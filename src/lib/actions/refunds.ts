"use server";
// src/lib/actions/refunds.ts

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundOrder } from "@/lib/midtrans";
import { REFUND_STATUS_DB, infoRefund } from "@/lib/orders";

export type HasilRefund = {
  error: string | null;
  note?: string;
  canManual?: boolean; // true -> admin boleh menandai "sudah dikembalikan manual"
};

async function adalahAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: p } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return p?.role === "admin";
}

function segarkan(orderId: number) {
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/pesanan");
  revalidatePath(`/pesanan/${orderId}`);
}

export async function approveRefund(
  refundId: number,
  manual = false,
): Promise<HasilRefund> {
  if (!(await adalahAdmin()))
    return { error: "Hanya admin yang boleh meninjau refund." };

  const db = createAdminClient();

  const { data: refund } = await db
    .from("refund_requests")
    .select("id, order_id, status, reason, refund_amount")
    .eq("id", refundId)
    .maybeSingle();
  if (!refund) return { error: "Pengajuan tidak ditemukan." };
  if (infoRefund(refund.status).key !== "menunggu") {
    return { error: "Pengajuan ini sudah diproses." };
  }

  const { data: order } = await db
    .from("orders")
    .select("id, midtrans_order_id")
    .eq("id", refund.order_id)
    .maybeSingle();
  if (!order) return { error: "Pesanan tidak ditemukan." };

  const jumlah = Number(refund.refund_amount ?? 0);
  const now = new Date().toISOString();

  if (!manual) {
    if (!order.midtrans_order_id) {
      return {
        error:
          "Pesanan ini tidak dibayar lewat Midtrans, jadi tidak bisa direfund otomatis.",
        canManual: true,
      };
    }
    const hasil = await refundOrder(
      order.midtrans_order_id,
      jumlah,
      refund.reason ?? "Pesanan dibatalkan",
      order.id,
    );
    if (!hasil.ok) {
      return {
        error: `Refund otomatis gagal: ${hasil.message}. Metode ini mungkin tidak mendukung refund via API.`,
        canManual: true,
      };
    }
  }

  await db
    .from("refund_requests")
    .update({ status: REFUND_STATUS_DB.disetujui, reviewed_at: now })
    .eq("id", refund.id);

  await db
    .from("orders")
    .update({
      payment_status: "dikembalikan",
      refunded_at: now,
      refund_amount: jumlah,
      refund_reason: refund.reason,
      updated_at: now,
    })
    .eq("id", order.id);

  segarkan(order.id);
  return {
    error: null,
    note: manual
      ? "Ditandai sudah dikembalikan secara manual."
      : "Dana dikembalikan lewat Midtrans.",
  };
}

export async function rejectRefund(refundId: number): Promise<HasilRefund> {
  if (!(await adalahAdmin()))
    return { error: "Hanya admin yang boleh meninjau refund." };

  const db = createAdminClient();
  const { data: refund } = await db
    .from("refund_requests")
    .select("id, order_id, status")
    .eq("id", refundId)
    .maybeSingle();
  if (!refund) return { error: "Pengajuan tidak ditemukan." };
  if (infoRefund(refund.status).key !== "menunggu") {
    return { error: "Pengajuan ini sudah diproses." };
  }

  const { error } = await db
    .from("refund_requests")
    .update({
      status: REFUND_STATUS_DB.ditolak,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", refund.id);
  if (error) return { error: error.message };

  segarkan(refund.order_id);
  return { error: null, note: "Pengajuan ditolak." };
}
