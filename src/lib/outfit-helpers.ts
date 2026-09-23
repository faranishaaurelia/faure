// Helper BACA (bukan server action) untuk merangkai data outfit_items yang
// nyata di database kamu: source_type 'product' -> join ke product_variants,
// source_type 'closet' -> join ke closet_items -> product_variants.
// Dipakai di halaman list & detail "Outfit Saya".

export type SlotTubuh = "atasan" | "bawahan" | "outer" | "lainnya";

// Tabel outfit_items tidak menyimpan width/height persen, jadi ukuran
// tampilan dihitung ulang dari item_role (slot) — sama seperti
// SLOT_POSISI di BuatOutfit.tsx, tapi kita cuma butuh ukurannya di sini
// karena posisi (pos_x/pos_y) sudah tersimpan persis.
export const SLOT_UKURAN: Record<
  SlotTubuh,
  { widthPercent: number; heightPercent: number }
> = {
  atasan: { widthPercent: 34, heightPercent: 26 },
  outer: { widthPercent: 36, heightPercent: 28 },
  bawahan: { widthPercent: 28, heightPercent: 34 },
  lainnya: { widthPercent: 22, heightPercent: 16 },
};

export function ukuranSlot(slot: string | null) {
  return SLOT_UKURAN[(slot as SlotTubuh) ?? "lainnya"] ?? SLOT_UKURAN.lainnya;
}

export function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type GambarProduk = {
  url?: string | null;
  cutout_url?: string | null;
  sort_order?: number | null;
};

export function cutoutUtama(
  images: GambarProduk | GambarProduk[] | null | undefined,
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

type ProdukRelasi = {
  id: number;
  name: string;
  base_price: number;
  product_images?: GambarProduk | GambarProduk[] | null;
} | null;

type VarianRelasi = {
  id: number;
  size?: string | null;
  color?: string | null;
  image_url: string | null;
  products?: ProdukRelasi | ProdukRelasi[] | null;
} | null;

type ClosetRelasi = {
  id: number;
  product_variants?: VarianRelasi | VarianRelasi[] | null;
} | null;

export type OutfitItemRow = {
  id: number;
  source_type: "product" | "closet";
  item_role: string | null;
  pos_x: number | null;
  pos_y: number | null;
  scale: number | null;
  z_index: number | null;
  product_variant_id: number | null;
  closet_item_id: number | null;
  product_variants?: VarianRelasi | VarianRelasi[] | null;
  closet_items?: ClosetRelasi | ClosetRelasi[] | null;
};

export type OutfitItemTampil = {
  id: number;
  slot: string;
  posX: number;
  posY: number;
  scale: number;
  zIndex: number;
  productId: number | null;
  variantId: number | null;
  nama: string;
  gambar: string | null;
  basePrice: number | null;
  ukuran: string | null;
  warna: string | null;
};

export const SELECT_OUTFIT_ITEMS = `
  id,
  source_type,
  item_role,
  pos_x,
  pos_y,
  scale,
  z_index,
  product_variant_id,
  closet_item_id,
  product_variants (
    id,
    size,
    color,
    image_url,
    products (
      id,
      name,
      base_price,
      product_images ( url, cutout_url, sort_order )
    )
  ),
  closet_items (
    id,
    product_variants (
      id,
      size,
      color,
      image_url,
      products (
        id,
        name,
        base_price,
        product_images ( url, cutout_url, sort_order )
      )
    )
  )
`;

export const SLOT_LABEL: Record<string, string> = {
  atasan: "Atasan",
  bawahan: "Bawahan",
  outer: "Outer",
  lainnya: "Aksesori",
};

export const OUTFIT_KATEGORI = [
  "Casual",
  "Formal",
  "Streetwear",
  "Vintage",
] as const;

export type OutfitKategori = (typeof OUTFIT_KATEGORI)[number];

const KATEGORI_PREFIX = "kategori:";

export function isOutfitKategori(nilai: string): nilai is OutfitKategori {
  return (OUTFIT_KATEGORI as readonly string[]).includes(nilai);
}

export function kategoriDariCover(
  cover: string | null | undefined,
): OutfitKategori | null {
  if (!cover?.startsWith(KATEGORI_PREFIX)) return null;
  const nilai = cover.slice(KATEGORI_PREFIX.length);
  return isOutfitKategori(nilai) ? nilai : null;
}

export function encodeKategoriOutfit(kategori: OutfitKategori) {
  return `${KATEGORI_PREFIX}${kategori}`;
}

export function handlePengguna(nama: string | null | undefined) {
  const slug = (nama ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return slug || "pengguna";
}

export function ringkasanItemOutfit(items: { nama: string }[]) {
  const unik = [...new Set(items.map((item) => item.nama).filter(Boolean))];
  if (unik.length === 0) return "Outfit";
  if (unik.length <= 2) return unik.join(" + ");
  return `${unik.slice(0, 2).join(" + ")} +${unik.length - 2}`;
}

export function formatTanggalOutfit(tanggal: string, loc: string = "id-ID") {
  return new Date(tanggal).toLocaleDateString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function rupiahOutfit(angka: number) {
  return "Rp" + Math.round(angka).toLocaleString("id-ID");
}

// Merangkai 1 baris outfit_items (apapun source_type-nya) jadi bentuk
// seragam yang gampang dipakai buat render & checkout.
export function resolveOutfitItem(item: OutfitItemRow): OutfitItemTampil {
  let variant: NonNullable<VarianRelasi> | null = null;

  if (item.source_type === "product") {
    variant = satu(item.product_variants);
  } else {
    const closet = satu(item.closet_items);
    variant = closet ? satu(closet.product_variants) : null;
  }

  const produk = variant ? satu(variant.products) : null;

  return {
    id: item.id,
    slot: item.item_role ?? "lainnya",
    posX: item.pos_x ?? 50,
    posY: item.pos_y ?? 50,
    scale: item.scale ?? 1,
    zIndex: item.z_index ?? 0,
    productId: produk?.id ?? null,
    variantId: variant?.id ?? item.product_variant_id ?? null,
    nama: produk?.name ?? "Produk",
    basePrice: produk?.base_price ?? null,
    ukuran: variant?.size ?? null,
    warna: variant?.color ?? null,
    gambar: cutoutUtama(produk?.product_images) ?? variant?.image_url ?? null,
  };
}
