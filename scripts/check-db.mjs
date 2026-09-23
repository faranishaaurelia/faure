/* eslint-disable */
// Script admin: lihat isi database & bucket storage.
// Jalankan: node scripts/check-db.mjs
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Tidak ada NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mode = process.argv[2] ?? "products";

if (mode === "products") {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, base_price, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Gagal ambil produk:", error.message);
    process.exit(1);
  }
  console.log("PRODUK DI DATABASE:");
  for (const p of data ?? []) {
    console.log(`  id=${p.id} | ${p.name} | Rp${p.base_price} | ${p.created_at}`);
  }
  console.log(`\nTotal: ${(data ?? []).length} produk`);
}

if (mode === "buckets") {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Gagal ambil bucket:", error.message);
    process.exit(1);
  }
  console.log("STORAGE BUCKETS:");
  for (const b of data ?? []) {
    console.log(`  ${b.name} | public=${b.public}`);
  }
}

if (mode === "users") {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Gagal ambil users:", error.message);
    process.exit(1);
  }
  console.log("PROFILES (users):");
  for (const u of data ?? []) {
    console.log(`  ${u.id} | ${u.full_name ?? "-"} | role=${u.role} | ${u.created_at}`);
  }
  console.log(`\nTotal: ${(data ?? []).length} pengguna`);
}