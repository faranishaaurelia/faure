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

// Pilih gambar untuk satu varian. Urutan prioritas:
// 1. Versi transparan dari foto produk yang dipilih varian ini
// 2. Foto varian yang memang sudah PNG / cutout
// 3. Foto varian itu sendiri (walau masih ada background)
// 4. Cadangan: cutout foto utama produk, lalu foto pertama produk
function pilihGambar(
  fotoVarian: string | null | undefined,
  cutoutMap: Map<string, string>,
  cadanganCutout: string | null,
  cadanganUrl: string | null | undefined,
): string | null {
  const raw = (fotoVarian ?? "").trim();
  if (raw) {
    const cutout = cutoutMap.get(raw);
    if (cutout) return cutout;
    return raw;
  }
  return cadanganCutout ?? cadanganUrl ?? null;
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

export const dynamic = "force-dynamic";

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

  // Item toko:
  // Produk dengan beberapa warna tampil 1 kartu per warna.
  // Varian dengan warna sama tapi beda ukuran hanya tampil 1 kartu.
  const produkToko: {
    id: number;
    productId: number;
    variantId: number | null;
    nama: string;
    kategoriId: number | null;
    kategori: string;
    gambar: string | null;
  }[] = [];

  for (const produk of productsData ?? []) {
    const variants = produk.product_variants ?? [];
    const galeri = [...(produk.product_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    const kategoriId = produk.category_id ?? null;
    const kategoriNama =
      kategoriId != null ? (kategoriPerId.get(kategoriId) ?? "") : "";

    // Map URL foto asli -> cutout_url
    const cutoutMap = new Map<string, string>();
    for (const g of galeri) {
      if (g.url && g.cutout_url) {
        cutoutMap.set(g.url, g.cutout_url);
      }
    }

    const fotoUtamaCutout = cutoutUtama(galeri);
    const fotoUtamaUrl = galeri[0]?.url ?? null;

    // Kelompokkan varian per warna. Dari tiap warna, pilih 1 varian yang
    // mewakili: utamakan yang ada stoknya, lalu yang punya foto.
    const warnaUnikMap = new Map<string, (typeof variants)[0]>();

    for (const v of variants) {
      const warna = (v.color ?? "").trim();
      if (!warna) continue;

      const key = warna.toLowerCase();
      const lama = warnaUnikMap.get(key);

      if (!lama) {
        warnaUnikMap.set(key, v);
        continue;
      }

      const lamaAdaStok = (lama.stock ?? 0) > 0;
      const baruAdaStok = (v.stock ?? 0) > 0;
      const lamaAdaFoto = Boolean((lama.image_url ?? "").trim());
      const baruAdaFoto = Boolean((v.image_url ?? "").trim());

      if (
        (!lamaAdaStok && baruAdaStok) ||
        (lamaAdaStok === baruAdaStok && !lamaAdaFoto && baruAdaFoto)
      ) {
        warnaUnikMap.set(key, v);
      }
    }

    const daftarWarnaUnik = Array.from(warnaUnikMap.values());

    if (daftarWarnaUnik.length > 1) {
      // Produk punya lebih dari 1 warna: 1 kartu per warna
      for (const v of daftarWarnaUnik) {
        const labelWarna = v.color?.trim() ? ` - ${v.color.trim()}` : "";

        produkToko.push({
          id: v.id,
          productId: produk.id,
          variantId: v.id,
          nama: `${produk.name}${labelWarna}`,
          kategoriId,
          kategori: kategoriNama,
          gambar: pilihGambar(
            v.image_url,
            cutoutMap,
            fotoUtamaCutout,
            fotoUtamaUrl,
          ),
        });
      }
    } else {
      // Hanya 1 warna atau hanya beda ukuran: 1 kartu saja
      const idDefault = variantDefault(variants);
      const vDefault = variants.find((v) => v.id === idDefault) ?? variants[0];

      produkToko.push({
        id: produk.id,
        productId: produk.id,
        variantId: idDefault,
        nama: produk.name,
        kategoriId,
        kategori: kategoriNama,
        gambar: pilihGambar(
          vDefault?.image_url,
          cutoutMap,
          fotoUtamaCutout,
          fotoUtamaUrl,
        ),
      });
    }
  }

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

    const rawItemLemari = ((closetItems ?? []) as unknown as BarisLemari[])
      .map((item) => {
        const variant = satu(item.product_variants);
        const product = variant ? satu(variant.products) : null;

        // Tanpa productId & variantId, item ini tidak bisa dipakai untuk
        // checkout / link ke detail produk — jadi dilewati saja.
        if (!variant || !product) return null;

        const galeriProduk = product.product_images
          ? Array.isArray(product.product_images)
            ? product.product_images
            : [product.product_images]
          : [];

        const cutoutMap = new Map<string, string>();
        for (const g of galeriProduk as GambarDenganCutout[]) {
          if (g.url && g.cutout_url) cutoutMap.set(g.url, g.cutout_url);
        }

        const warna = (variant.color ?? "").trim();

        return {
          id: item.id,
          productId: product.id,
          variantId: variant.id,
          warna,
          nama: `${product.name ?? t("common.product")}${warna ? ` - ${warna}` : ""}`,
          kategori:
            product.category_id != null
              ? (kategoriPerId.get(product.category_id) ?? "")
              : "",
          // Foto varian yang dibeli dulu (versi transparan kalau ada),
          // baru cadangan lama.
          gambar:
            pilihGambar(
              variant.image_url,
              cutoutMap,
              cutoutUtama(galeriProduk as GambarDenganCutout[]),
              null,
            ) ?? fotoProduk(variant, product),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Barang yang sama (produk + warna sama) yang dibeli berkali-kali
    // hanya muncul 1 kali.
    const seen = new Set<string>();
    itemLemari = rawItemLemari
      .filter((item) => {
        const key = `${item.productId}|${item.warna.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ warna: _warna, ...sisanya }) => sisanya);
  }

  return (
    <BuatOutfit
      produkToko={produkToko}
      itemLemari={itemLemari}
      kategoriList={kategoriList.map((k) => k.nama)}
    />
  );
}
