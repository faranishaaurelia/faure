// Helper memilih foto produk untuk ditampilkan di halaman pesanan, lemari,
// keranjang, dan checkout.
//
// Sumber gambar ada dua:
// 1. product_images.url — galeri produk (diurutkan pakai sort_order) — utama.
// 2. product_variants.image_url — gambar yang ditempel langsung di varian — fallback.
//
// Relasi Supabase bisa dikembalikan sebagai objek tunggal atau array, jadi
// helper ini menerima keduanya.

export type GambarProduk = {
  url: string;
  sort_order?: number | null;
};

export type VarianGambar = {
  image_url?: string | null;
};

export type ProdukGambar = {
  product_images?: GambarProduk | GambarProduk[] | null;
};

// Foto utama: pakai gambar produk (product_images) dengan sort_order
// terkecil dulu — sama seperti halaman koleksi & detail. Kalau galeri kosong,
// baru fallback ke image_url varian. (Urutan ini penting: image_url varian
// kadang berisi path lokal yang tidak tersedia, sementara galeri selalu
// berisi URL storage yang valid.)
export function fotoProduk(
  varian: VarianGambar | null | undefined,
  produk: ProdukGambar | null | undefined,
): string | null {
  const gambar = Array.isArray(produk?.product_images)
    ? produk.product_images
    : produk?.product_images
      ? [produk.product_images]
      : [];

  const gambarProduk =
    [...gambar]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((img) => img.url)
      .find(Boolean) ?? null;

  return gambarProduk ?? varian?.image_url ?? null;
}