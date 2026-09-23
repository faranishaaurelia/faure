import { fotoProduk, type GambarProduk } from "@/lib/images";

export const OUTFIT_ITEM_SELECT = `
  id,
  product_variant_id,
  closet_item_id,
  source_type,
  item_role,
  pos_x,
  pos_y,
  scale,
  z_index,
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
`;

type ProdukRelasi = {
  id: number;
  name: string;
  base_price: number | string | null;
  product_images?: GambarProduk | GambarProduk[] | null;
} | null;

type VarianRelasi = {
  id: number;
  size: string | null;
  color: string | null;
  extra_price: number | string | null;
  image_url: string | null;
  products: ProdukRelasi | ProdukRelasi[] | null;
} | null;

export type OutfitItemDb = {
  id: number;
  product_variant_id: number | null;
  closet_item_id: number | null;
  source_type: string | null;
  item_role: string | null;
  pos_x: number | string | null;
  pos_y: number | string | null;
  scale: number | string | null;
  z_index: number | null;
  product_variants: VarianRelasi | VarianRelasi[] | null;
};

const SLOT_UKURAN: Record<string, { width: number; height: number }> = {
  atasan: { width: 34, height: 26 },
  outer: { width: 36, height: 28 },
  bawahan: { width: 28, height: 34 },
  lainnya: { width: 22, height: 16 },
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export type OutfitItemTampilan = {
  id: number;
  productId: number | null;
  variantId: number | null;
  nama: string;
  gambar: string | null;
  harga: number | null;
  ukuran: string | null;
  warna: string | null;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  scale: number;
  zIndex: number;
};

export function mapOutfitItem(item: OutfitItemDb): OutfitItemTampilan {
  const varian = satu(item.product_variants);
  const produk = satu(varian?.products);
  const ukuranSlot = SLOT_UKURAN[item.item_role ?? ""] ?? SLOT_UKURAN.lainnya;

  return {
    id: item.id,
    productId: produk?.id ?? null,
    variantId: varian?.id ?? item.product_variant_id,
    nama: produk?.name ?? "Produk",
    gambar: fotoProduk(varian, produk),
    harga: produk?.base_price != null ? Number(produk.base_price) : null,
    ukuran: varian?.size ?? null,
    warna: varian?.color ?? null,
    xPercent: Number(item.pos_x ?? 20),
    yPercent: Number(item.pos_y ?? 20),
    widthPercent: ukuranSlot.width,
    heightPercent: ukuranSlot.height,
    scale: Number(item.scale ?? 1) || 1,
    zIndex: item.z_index ?? 1,
  };
}
