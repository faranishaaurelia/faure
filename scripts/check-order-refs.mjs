/* eslint-disable */
// Lihat profil user + order + closet terkait order tertentu.
// Jalankan: node scripts/check-order-refs.mjs --user <userId>
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");
const text = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mode = process.argv[2];

if (mode === "--user") {
  const userId = process.argv[3];
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  console.log("PROFILE:", JSON.stringify(profile, null, 2));

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("user_id", userId);
  console.log("ORDERS:", JSON.stringify(orders, null, 2));

  const { data: closet } = await supabase
    .from("closet_items")
    .select("id, product_variant_id, order_item_id, added_at")
    .eq("user_id", userId);
  console.log("CLOSET:", JSON.stringify(closet, null, 2));

  const { data: cart } = await supabase
    .from("cart_items")
    .select("id, product_variant_id, quantity")
    .eq("user_id", userId);
  console.log("CART:", JSON.stringify(cart, null, 2));
}
if (mode === "--orders") {
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, order_id, product_variant_id, product_name_snapshot, price, quantity");
  console.log("ALL ORDER_ITEMS:", JSON.stringify(orderItems, null, 2));
}