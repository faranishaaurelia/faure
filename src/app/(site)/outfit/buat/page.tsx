import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { fotoProduk, type GambarProduk } from "@/lib/images";
import BuatOutfit from "@/components/outfit/BuatOutfit";

// =====================================================
// HELPER RELASI (Supabase bisa mengembalikan objek/array)
// =====================================================

type VarianLemari = {
  id: number;
  size: string | null;
  color: string | null;
  image_url: string | null;
  products:
    | {
        id: number;
        name: string;
        category_id: number | null;
        product_images?: GambarProduk | GambarProduk[] | null;
      }
    | {
        id: number;
        name: string;
        category_id: number | null;
        product_images?: GambarProduk | GambarProduk[] | null;
      }[]
    | null;
};

type BarisLemari = {
  id: number;
  added_at: string;
  product_variants: VarianLemari | VarianLemari[] | null;
};

// Foto produk + versi PNG transparan (hasil remove background)
type GambarDenganCutout = {
  url?: string | null;
  cutout_url?: string | null;
  sort_order?: number | null;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

// Ambil cutout_url dari foto utama (sort_order terkecil).
// Kalau foto utama belum punya cutout, coba foto lain yang punya.
function cutoutUtama(
  images: GambarDenganCutout | GambarDenganCutout[] | null | undefined,
): string | null {
  if (!images) return null;
  const daftar = Array.isArray(images) ? images : [images];
  const urut = [...daftar].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return (
    urut[0]?.cutout_url ?? urut.find((i) => i.cutout_url)?.cutout_url ?? null
  );
}

// Pilih varian default untuk item yang ditambahkan dari katalog toko:
// BuatOutfit belum punya UI pilih ukuran/warna, jadi saat "Beli Semua
// Item Ini" / checkout dipakai, kita perlu satu variant_id per produk.
// Prioritas: varian dengan stok > 0, kalau tidak ada pakai varian pertama.
function variantDefault(
  variants: { id: number; stock: number | null }[] | null | undefined,
): number | null {
  if (!variants || variants.length === 0) return null;
  const adaStok = variants.find((v) => (v.stock ?? 0) > 0);
  return (adaStok ?? variants[0]).id;
}

// =====================================================
// PAGE
// =====================================================

export default async function BuatOutfitPage() {
  const { t } = await getT();
  const supabase = await createClient();

  // Produk + kategori diambil terpisah, dicocokkan lewat category_id
  // (pola yang sama dengan halaman koleksi & beranda).
  const [
    { data: productsData, error },
    { data: kategoriData, error: errorKategori },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
            id,
            name,
            base_price,
            category_id,
            product_variants ( id, size, color, extra_price, image_url, stock ),
            product_images ( url, cutout_url, sort_order )
          `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),

    supabase.from("categories").select("id, name").order("id"),
  ]);

  if (error) {
    console.error("Gagal fetch produk:", error.message);
  }

  if (errorKategori) {
    console.error("Gagal fetch kategori:", errorKategori.message);
  }

  const kategoriList = (kategoriData ?? []).map((k) => ({
    id: k.id as number,
    nama: k.name as string,
  }));
  const kategoriPerId = new Map(kategoriList.map((k) => [k.id, k.nama]));

  // Item toko: utamakan cutout (PNG transparan), lalu foto utama
  // (sort_order terkecil), lalu image_url varian sebagai cadangan terakhir.
  const produkToko = (productsData ?? []).map((produk) => {
    const variants = produk.product_variants ?? [];

    const galeri = [...(produk.product_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    const gambar =
      cutoutUtama(galeri) ??
      galeri[0]?.url ??
      variants.find((v) => v.image_url)?.image_url ??
      null;

    return {
      id: produk.id,
      productId: produk.id,
      variantId: variantDefault(variants),
      nama: produk.name,
      kategoriId: produk.category_id ?? null,
      kategori: kategoriPerId.get(produk.category_id) ?? "",
      gambar,
    };
  });

  // Item lemari: pakaian milik pengguna yang sudah dibeli.
  // Kalau belum login, daftarnya kosong (tab "Lemari Saya" menampilkan
  // ajakan masuk/belanja).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let itemLemari: {
    id: number;
    productId: number;
    variantId: number;
    nama: string;
    kategori: string;
    gambar: string | null;
  }[] = [];

  if (user) {
    const { data: closetItems } = await supabase
      .from("closet_items")
      .select(
        `
          id,
          added_at,
          product_variants (
            id,
            size,
            color,
            image_url,
            products (
              id,
              name,
              category_id,
              product_images (
                url,
                cutout_url,
                sort_order
              )
            )
          )
        `,
      )
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    itemLemari = ((closetItems ?? []) as unknown as BarisLemari[])
      .map((item) => {
        const variant = satu(item.product_variants);
        const product = variant ? satu(variant.products) : null;

        // Tanpa productId & variantId, item ini tidak bisa dipakai untuk
        // checkout / link ke detail produk — jadi dilewati saja.
        if (!variant || !product) return null;

        return {
          id: item.id,
          productId: product.id,
          variantId: variant.id,
          nama: product.name ?? t("common.product"),
          kategori:
            product.category_id != null
              ? (kategoriPerId.get(product.category_id) ?? "")
              : "",
          // Cutout dulu; kalau belum ada, pakai logika foto lama.
          gambar:
            cutoutUtama(
              product.product_images as
                | GambarDenganCutout
                | GambarDenganCutout[]
                | null
                | undefined,
            ) ?? fotoProduk(variant, product),
        };
      })
      .filter((x): x is (typeof itemLemari)[number] => x !== null);
  }

  return (
    <BuatOutfit
      produkToko={produkToko}
      itemLemari={itemLemari}
      kategoriList={kategoriList.map((k) => k.nama)}
    />
  );
}
