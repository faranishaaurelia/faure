import { createAdminClient } from "@/lib/supabase/admin";
import { infoStatus } from "@/lib/orders";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Mengembalikan stok varian untuk pesanan yang dibatalkan.
 *
 * Dipakai bersama oleh pembatalan dari user, admin, dan webhook pembayaran.
 * Fungsi ini sengaja bukan Server Action supaya bisa dipanggil dari Route
 * Handler dan Server Action tanpa melewati batas action.
 *
 * Mengembalikan ID produk yang berhasil diperbarui (untuk revalidasi cache).
 */
export async function restoreOrderStock(
  orderId: number,
  db: Db,
): Promise<number[]> {
  try {
    // Hanya pulihkan stok untuk pesanan yang benar-benar dibatalkan.
    // Pemeriksaan ini mencegah stok bertambah pada pesanan aktif.
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Gagal membaca pesanan untuk pemulihan stok:",
        orderError.message,
      );
      return [];
    }

    if (!order || infoStatus(order.status).key !== "dibatalkan") {
      return [];
    }

    // Ambil kuantitas dari order_items — jangan pakai relasi embed supaya
    // tidak bergantung pada schema cache foreign key Supabase.
    const { data: items, error: itemsError } = await db
      .from("order_items")
      .select("id, quantity, product_variant_id")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error(
        "Gagal membaca item pesanan untuk pemulihan stok:",
        itemsError.message,
      );
      return [];
    }

    if (!items || items.length === 0) return [];

    const qtyPerVariant = new Map<number, number>();
    for (const item of items) {
      const variantId = Number(item.product_variant_id);
      const qty = Number(item.quantity) || 0;
      if (!Number.isInteger(variantId) || variantId <= 0 || qty <= 0) continue;
      qtyPerVariant.set(variantId, (qtyPerVariant.get(variantId) ?? 0) + qty);
    }

    const affectedProductIds = new Set<number>();

    for (const [variantId, qty] of qtyPerVariant) {
      const { data: variant, error: variantError } = await db
        .from("product_variants")
        .select("id, stock, product_id")
        .eq("id", variantId)
        .maybeSingle();

      if (variantError || !variant) {
        console.error(
          `Varian ${variantId} tidak ditemukan saat memulihkan stok:`,
          variantError?.message ?? "data tidak ada",
        );
        continue;
      }

      const newStock = Number(variant.stock ?? 0) + qty;
      const { error: updateError } = await db
        .from("product_variants")
        .update({ stock: newStock })
        .eq("id", variantId)
        .select("id");

      if (updateError) {
        console.error(
          `Gagal memulihkan stok varian ${variantId}:`,
          updateError.message,
        );
        continue;
      }

      if (variant.product_id) {
        affectedProductIds.add(Number(variant.product_id));
      }
    }

    return Array.from(affectedProductIds);
  } catch (err) {
    console.error("Gagal mengembalikan stok pesanan:", err);
    return [];
  }
}
