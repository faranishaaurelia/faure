import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import type { Address } from "@/lib/addresses";
import type { CheckoutItem } from "@/components/checkout/CheckoutForm";
import { fotoProduk } from "@/lib/images";

export const dynamic = "force-dynamic";

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type ProdukKeranjang = {
  id: number;
  name: string;
  base_price: number;
  product_images:
    | { url: string; sort_order: number | null }[]
    | { url: string; sort_order: number | null }
    | null;
};

type VarianKeranjang = {
  id: number;
  size: string | null;
  color: string | null;
  extra_price: number | null;
  image_url: string | null;
  products: ProdukKeranjang | ProdukKeranjang[] | null;
};

type BarisKeranjang = {
  id: number;
  quantity: number;
  product_variants: VarianKeranjang | VarianKeranjang[] | null;
};

// Halaman asal sebelum masuk checkout, dipakai tombol "Kembali" supaya user
// balik ke tempat yang benar (detail produk atau keranjang). Hanya path
// internal yang diterima, biar tidak bisa diarahkan ke situs luar.
function asalCheckout(from?: string) {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/cart";
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; items?: string; mode?: string }>;
}) {
  const { from, items: itemsParam, mode } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Daftar pilihan dari halaman keranjang (?items=12:2,15:1 → id:qty).
  // Format lama "12,15" tetap didukung: qty dianggap penuh sesuai keranjang.
  // Kalau param tidak ada, semua isi keranjang ikut checkout.
  const pilih = (itemsParam ?? "")
    .split(",")
    .map((bagian) => bagian.trim())
    .filter(Boolean)
    .map((bagian) => {
      const [idStr, qtyStr] = bagian.split(":");
      const id = Number(idStr);
      if (!Number.isInteger(id) || id <= 0) return null;
      const qty = qtyStr ? Number(qtyStr) : null;
      const qtyValid =
        qty !== null && Number.isInteger(qty) && qty > 0 ? qty : null;
      return { id, qty: qtyValid };
    })
    .filter((x): x is { id: number; qty: number | null } => x !== null);

  const pilihMap = new Map(pilih.map((p) => [p.id, p.qty]));
  const pilihIds = pilih.map((p) => p.id);

  // Keranjang user (sumber data checkout, bukan data dummy)
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
        image_url,
        products (
          id,
          name,
          base_price,
          product_images (
            url,
            sort_order
          )
        )
      )
    `,
    )
    .eq("user_id", user.id);

  if (pilihIds.length > 0) {
    cartQuery = cartQuery.in("id", pilihIds);
  }

  const { data: cart } = await cartQuery;

  const items: CheckoutItem[] = ((cart ?? []) as BarisKeranjang[])
    .map((row) => {
      const varian = satu(row.product_variants);
      if (!varian) return null;
      const produk = satu(varian.products);
      if (!produk) return null;

      const jumlahKeranjang = Number(row.quantity) || 0;
      // Jumlah yang diminta user untuk dibeli (dibatasi qty di keranjang).
      const diminta = pilihMap.get(row.id);
      const jumlah =
        diminta === undefined
          ? jumlahKeranjang
          : Math.max(1, Math.min(jumlahKeranjang, diminta ?? jumlahKeranjang));

      return {
        id: row.id,
        nama: produk.name,
        ukuran: varian.size ?? "",
        warna: varian.color ?? "",
        harga: Number(produk.base_price) + Number(varian.extra_price ?? 0),
        jumlah,
        gambar: fotoProduk(varian, produk),
      };
    })
    .filter((i): i is CheckoutItem => i !== null && i.jumlah > 0);

  // Keranjang kosong -> kembali ke keranjang
  if (items.length === 0) {
    redirect("/cart");
  }

  // Alamat utama tampil paling atas, sisanya dari yang terbaru
  const { data } = await supabase
    .from("addresses")
    .select(
      "id, label, recipient_name, phone, full_address, city, province, postal_code, notes, is_default",
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <CheckoutForm
      addresses={(data ?? []) as Address[]}
      items={items}
      kembaliKe={asalCheckout(from)}
      mode={mode === "buynow" ? "buynow" : "cart"}
    />
  );
}