"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import {
  STATUS_DB,
  infoStatus,
  infoPembayaran,
} from "@/lib/orders";

// =====================================================
// OPSI PENGIRIMAN & VOUCHER
// =====================================================

const BIAYA_PENGIRIMAN: Record<string, number> = {
  hemat: 9000,
  reguler: 15000,
  ekspres: 30000,
};

// Voucher (kode -> persen diskon). TODO: pindahkan ke tabel database.
const VOUCHER: Record<string, number> = { FAURE10: 10 };

const ALAMAT_LENGKAP = (a: {
  recipient_name: string | null;
  phone: string | null;
  full_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}) =>
  Boolean(
    a.recipient_name &&
      a.phone &&
      a.full_address &&
      a.city &&
      a.province &&
      a.postal_code,
  );

export type CreateOrderInput = {
  addressId: number;
  shippingMethod: string;
  paymentMethod: string;
  voucherCode?: string | null;
  // Baris keranjang yang mau dibeli beserta jumlahnya (id = cart_items.id).
  // Kalau kosong, seluruh isi keranjang ikut dibeli (perilaku lama).
  cartItems?: Array<{ id: number; quantity: number }> | null;
};

// Hasil relasi Supabase kadang berupa array meski relasi many-to-one.
// Helper ini menormalkan nilai menjadi objek tunggal atau null.
function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type VarianKeranjang = {
  id: number;
  size: string | null;
  color: string | null;
  extra_price: number | null;
  stock: number | null;
  image_url: string | null;
  products:
    | { id: number; name: string; base_price: number }
    | { id: number; name: string; base_price: number }[]
    | null;
};

type BarisKeranjang = {
  id: number;
  quantity: number;
  product_variants: VarianKeranjang | VarianKeranjang[] | null;
};

export async function createOrder(input: CreateOrderInput) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("errors.loginRequiredCheckout"), orderId: null };

  // ---------- Alamat ----------
  const { data: alamat } = await supabase
    .from("addresses")
    .select(
      "id, recipient_name, phone, full_address, city, province, postal_code, is_default",
    )
    .eq("id", input.addressId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!alamat) {
    return { error: t("errors.addressNotFound"), orderId: null };
  }

  if (!ALAMAT_LENGKAP(alamat)) {
    return {
      error: t("errors.addressIncomplete"),
      orderId: null,
    };
  }

  // ---------- Isi keranjang (harga dihitung ulang di server) ----------
  // Kalau cartItems diisi, hanya baris itu yang dibeli sebanyak yang diminta;
  // user_id tetap dipakai sebagai pembatas supaya tidak bisa akses milik orang.
  const pilih = (input.cartItems ?? []).filter(
    (c) => Number.isInteger(c.id) && c.id > 0 && Number.isInteger(c.quantity) && c.quantity > 0,
  );
  const pilihMap = new Map(pilih.map((c) => [c.id, c.quantity]));
  const pilihIds = pilih.map((c) => c.id);

  let cartQuery = supabase
    .from("cart_items")
    .select(
      `
      id,
      quantity,
      product_variants (
        id,
        size,
        color,
        extra_price,
        stock,
        image_url,
        products (
          id,
          name,
          base_price
        )
      )
    `,
    )
    .eq("user_id", user.id);

  if (pilihIds.length > 0) {
    cartQuery = cartQuery.in("id", pilihIds);
  }

  const { data: cart } = await cartQuery;

  const items = ((cart ?? []) as BarisKeranjang[])
    .map((row) => {
      const varian = satu(row.product_variants);
      if (!varian) return null;
      const produk = satu(varian.products);
      if (!produk) return null;

      const qtyKeranjang = Number(row.quantity) || 0;
      // Jumlah yang diminta user; dibatasi qty di keranjang.
      const diminta = pilihMap.get(row.id);
      const jumlah =
        diminta === undefined
          ? qtyKeranjang
          : Math.max(1, Math.min(qtyKeranjang, diminta));
      if (jumlah <= 0) return null;

      const harga = Number(produk.base_price) + Number(varian.extra_price ?? 0);

      return {
        cartItemId: row.id,
        varianId: varian.id,
        nama: produk.name,
        harga,
        jumlah,
        qtyKeranjang,
        stok: Number(varian.stock ?? 0),
      };
    })
    .filter(
      (i): i is NonNullable<typeof i> =>
        i !== null && i.jumlah > 0,
    );

  if (items.length === 0) {
    return { error: t("errors.cartEmpty"), orderId: null };
  }

  // ---------- Perhitungan ----------
  const subtotal = items.reduce((t, i) => t + i.harga * i.jumlah, 0);

  if (!(input.shippingMethod in BIAYA_PENGIRIMAN)) {
    return { error: t("errors.shippingMethodInvalid"), orderId: null };
  }
  const ongkir = BIAYA_PENGIRIMAN[input.shippingMethod];

  const kodeVoucher = input.voucherCode?.trim().toUpperCase() || null;
  const persenVoucher = kodeVoucher ? VOUCHER[kodeVoucher] : undefined;
  const diskon = persenVoucher ? Math.round((subtotal * persenVoucher) / 100) : 0;

  const total = subtotal + ongkir - diskon;

  // Sesi user tidak punya izin RLS untuk menulis order_items dan
  // product_variants, jadi operasi tulis memakai service role. Semua
  // data di bawah sudah dibatasi ke user yang sedang login.
  const db = createAdminClient();

  // ---------- Simpan pesanan ----------
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id: user.id,
      address_id: input.addressId,
      status: STATUS_DB.menunggu_pembayaran,
      payment_status: "belum_dibayar",
      payment_method: input.paymentMethod,
      shipping_method: input.shippingMethod,
      shipping_cost: ongkir,
      discount: diskon,
      voucher_code: kodeVoucher,
      total,
      payment_deadline: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return {
      error: orderError?.message ?? t("errors.orderFail"),
      orderId: null,
    };
  }

  // ---------- Item pesanan ----------
  const { error: itemError } = await db.from("order_items").insert(
    items.map((item) => ({
      order_id: order.id,
      product_variant_id: item.varianId,
      product_name_snapshot: item.nama,
      price: item.harga,
      quantity: item.jumlah,
    })),
  );

  if (itemError) {
    // Jangan tinggalkan pesanan tanpa item kalau penyimpanan item gagal.
    await db.from("orders").delete().eq("id", order.id);
    return { error: itemError.message, orderId: null };
  }

  // ---------- Kurangi stok ----------
  for (const item of items) {
    await db
      .from("product_variants")
      .update({ stock: Math.max(0, item.stok - item.jumlah) })
      .eq("id", item.varianId);
  }

  // ---------- Kurangi keranjang (hanya item yang dibeli) ----------
  // Qty di keranjang dikurangi sesuai yang dibeli; baris dihapus kalau
  // qty-nya habis, sisanya tetap tersimpan di keranjang.
  for (const item of items) {
    const sisa = item.qtyKeranjang - item.jumlah;
    if (sisa <= 0) {
      await db.from("cart_items").delete().eq("id", item.cartItemId);
    } else {
      await db
        .from("cart_items")
        .update({ quantity: sisa })
        .eq("id", item.cartItemId);
    }
  }

  revalidatePath("/cart");
  revalidatePath("/pesanan");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/pesanan/${order.id}`);
  revalidatePath("/checkout/sukses");

  return { error: null, orderId: order.id };
}

// =====================================================
// PEMBATALAN OLEH USER + PENGAJUAN REFUND
// =====================================================

// Kunci status (bukan nilai DB) yang masih boleh dibatalkan oleh user.
// Setelah pesanan dikirim, pembatalan tidak bisa dilakukan dari sisi user.
const BISA_DIBATALKAN: ReadonlySet<string> = new Set([
  "menunggu_pembayaran",
  "diproses",
]);

async function revalidatePesanan(orderId: number) {
  revalidatePath(`/pesanan/${orderId}`);
  revalidatePath("/pesanan");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/refunds");
  revalidatePath("/produk");
}

export async function cancelOrder(
  orderId: number,
  reason: string,
): Promise<{ error: string | null; note?: string }> {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("errors.loginRequired") };

  const alasan = reason.trim();
  if (alasan.length < 2) {
    return { error: t("errors.cancelReasonRequired") };
  }

  // Fetch lewat sesi user → RLS memastikan pesanan milik user yang login.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, payment_status, total")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) return { error: t("errors.orderNotFound") };

  const statusKunci = infoStatus(order.status).key;
  const bayarKunci = infoPembayaran(order.payment_status, statusKunci).key;
  const sudahBayar = bayarKunci === "dibayar";

  if (!statusKunci || !BISA_DIBATALKAN.has(statusKunci)) {
    return { error: t("errors.cancelNotAllowed") };
  }

  // Tulis pakai service-role: sesi user tidak punya izin tulis orders.
  const db = createAdminClient();

  const { error: updateError } = await db
    .from("orders")
    .update({
      status: STATUS_DB.dibatalkan,
      cancellation_reason: alasan,
      cancelled_at: new Date().toISOString(),
      // Kolom cancelled_by bertipe uuid → simpan ID user yang membatalkan.
      cancelled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (updateError) return { error: updateError.message };

  // Kalau sudah dibayar, otomatis dibuat pengajuan pengembalian dana.
  let refundDibuat = false;
  if (sudahBayar) {
    const { error: refundError } = await db.from("refund_requests").insert({
      order_id: order.id,
      user_id: user.id,
      reason: alasan,
      refund_amount: Math.round(Number(order.total ?? 0)),
      status: "pending",
    });
    refundDibuat = !refundError;
  }

  revalidatePesanan(order.id);

  return {
    error: null,
    note: refundDibuat
      ? t("account.cancelRefundAuto")
      : sudahBayar
        ? t("account.cancelRefundFailNote")
        : undefined,
  };
}

export async function requestRefund(
  orderId: number,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("errors.loginRequired") };

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, payment_status, total, cancellation_reason")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) return { error: t("errors.orderNotFound") };

  const statusKunci = infoStatus(order.status).key;
  const bayarKunci = infoPembayaran(order.payment_status, statusKunci).key;

  // Refund hanya untuk pesanan yang sudah dibatalkan dan sudah dibayar.
  if (statusKunci !== "dibatalkan" || bayarKunci !== "dibayar") {
    return { error: t("errors.refundNotAllowed") };
  }

  const db = createAdminClient();

  // Hindari duplikat pengajuan.
  const { data: existing } = await db
    .from("refund_requests")
    .select("id")
    .eq("order_id", order.id)
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existing) return { error: t("errors.refundAlreadyRequested") };

  const { error } = await db.from("refund_requests").insert({
    order_id: order.id,
    user_id: user.id,
    reason: order.cancellation_reason?.trim() || t("errors.refundNoReason"),
    refund_amount: Math.round(Number(order.total ?? 0)),
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePesanan(order.id);

  return { error: null };
}