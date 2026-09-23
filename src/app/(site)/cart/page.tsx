import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CartClient, { type ItemKeranjang } from "@/components/cart/CartClient";
import { fotoProduk } from "@/lib/images";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

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

// Supabase kadang mengembalikan relasi many-to-one sebagai array.
// Helper ini menormalkan menjadi objek tunggal atau null.
function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function CartPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="bg-[#F8F8F8] text-[#1E1C18] min-h-screen pt-[110px] pb-16">
        <div className="site-container py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-3">{t("cart.title")}</h1>
            <p className="text-sm text-[#656058] mb-6">
              {t("cart.loginBody")}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#1E1C18] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-black transition"
            >
              {t("cart.loginNow")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: cartItems } = await supabase
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

  const items: ItemKeranjang[] = ((cartItems ?? []) as BarisKeranjang[]).map(
    (item) => {
      const variant = satu(item.product_variants);
      const product = satu(variant?.products);
      const harga = (product?.base_price ?? 0) + (variant?.extra_price ?? 0);
      return {
        id: item.id,
        nama: product?.name ?? t("common.product"),
        ukuran: variant?.size ?? null,
        warna: variant?.color ?? null,
        harga,
        quantity: item.quantity,
        gambar: fotoProduk(variant, product),
      };
    },
  );

  return (
    <main className="bg-[#F8F8F8] text-[#1E1C18] min-h-screen pt-[110px] pb-16">
      <div className="site-container">
        <h1 className="text-2xl md:text-3xl font-bold text-[#2B2B2B] mb-8">
          {t("cart.title")}
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-black/5">
            <p className="text-[#656058] text-sm mb-4">
              {t("cart.empty")}
            </p>
            <Link
              href="/produk"
              className="inline-flex items-center gap-2 bg-[#1E1C18] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-black transition"
            >
              {t("cart.startShopping")}
            </Link>
          </div>
        ) : (
          <CartClient items={items} />
        )}
      </div>
    </main>
  );
}
