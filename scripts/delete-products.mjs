/* eslint-disable */
// Script admin: hapus produk dummy beserta data terkaitnya.
// Menangani FK: jika varian dipakai order_items, order yang berisi hanya
// produk yang dihapus akan ikut dibersihkan (order_items, closet_items, order).
// Jalankan: node scripts/delete-products.mjs 4
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");

function loadEnv(file) {
  const vars = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return vars;
}

const env = loadEnv(envPath);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ids = process.argv.slice(2).map(Number).filter(Number.isInteger);
if (ids.length === 0) {
  console.error("Contoh: node scripts/delete-products.mjs 4");
  process.exit(1);
}

for (const id of ids) {
  console.log(`\nMenghapus produk id=${id}...`);

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", id)
    .single();
  if (pErr || !product) {
    console.error(`  Produk id=${id} tidak ditemukan.`);
    continue;
  }
  console.log(`  ${product.name}`);

  const variantIds = ((await supabase.from("product_variants").select("id").eq("product_id", id)).data ?? []).map((v) => v.id);

  // 1. Ulasan
  await supabase.from("reviews").delete().eq("product_id", id);
  console.log("  - reviews dihapus");

  // 2. Foto produk
  await supabase.from("product_images").delete().eq("product_id", id);
  console.log("  - product_images dihapus");

  // 3. Item keranjang yang memakai varian produk ini
  if (variantIds.length > 0) {
    await supabase.from("cart_items").delete().in("product_variant_id", variantIds);
    console.log(`  - cart_items dihapus (${variantIds.length} varian)`);
  }

  // 4. Referensi order: closet_items & order_items & order
  if (variantIds.length > 0) {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, order_id")
      .in("product_variant_id", variantIds);

    const orderIds = [...new Set((orderItems ?? []).map((oi) => oi.order_id))];

    for (const orderId of orderIds) {
      // Pastikan order tersebut TIDAK berisi produk lain (selain yang dihapus)
      const { data: otherItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId)
        .not("product_variant_id", "in", `(${variantIds.join(",")})`);

      if (otherItems && otherItems.length > 0) {
        console.error(
          `  order ${orderId} berisi produk lain, produk tidak bisa dihapus.`,
        );
        process.exit(1);
      }

      await supabase
        .from("closet_items")
        .delete()
        .in(
          "order_item_id",
          (orderItems ?? []).filter((oi) => oi.order_id === orderId).map((oi) => oi.id),
        );
      await supabase.from("order_items").delete().eq("order_id", orderId);
      await supabase.from("orders").delete().eq("id", orderId);
      console.log(`  - order ${orderId} (hanya berisi produk dummy) dihapus`);
    }

    if (orderIds.length > 0) {
      // closet_items juga bisa menunjuk order_item dari order ini
      await supabase
        .from("closet_items")
        .delete()
        .in("order_item_id", (orderItems ?? []).map((oi) => oi.id));
    }
  }

  // 5. Varian
  const { error: vErr } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", id);
  if (vErr) {
    console.error(`  GAGAL hapus varian: ${vErr.message}`);
    continue;
  }
  console.log("  - product_variants dihapus");

  // 6. Produk
  const { error: dErr } = await supabase.from("products").delete().eq("id", id);
  if (dErr) {
    console.error(`  GAGAL hapus produk: ${dErr.message}`);
    continue;
  }
  console.log("  - produk dihapus ✔");
}

console.log("\nSelesai.");