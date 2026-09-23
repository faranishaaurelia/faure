import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { UKURAN_LIST } from "@/lib/sizes";
import { getT } from "@/lib/i18n/server";
import { translateCategory } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// =====================================================
// UKURAN
// =====================================================

const ukuranList = UKURAN_LIST;

// =====================================================
// HARGA
// =====================================================

const HARGA_CONFIG = [
  { id: "p1", key: "product.priceUnder150", fallback: "Di bawah Rp150.000", min: 0, max: 149999 },
  { id: "p2", key: "product.price150to250", fallback: "Rp150.000 – Rp250.000", min: 150000, max: 250000 },
  { id: "p3", key: "product.price250to350", fallback: "Rp250.000 – Rp350.000", min: 250000, max: 350000 },
  { id: "p4", key: "product.priceOver350", fallback: "Di atas Rp350.000", min: 350001, max: 999999999 },
];

// =====================================================
// TIPE DATA PRODUK (hasil olahan dari Supabase)
// =====================================================

type ProdukTampilan = {
  id: number;
  nama: string;
  kategori: string; // slug, dipakai untuk filter (contoh: "kaus")
  kategoriNama: string; // nama tampilan (contoh: "Kaus")
  harga: number;
  ukuran: string[];
  gambar: string | null;
};

// "Kaus" -> "kaus", "T-Shirt" -> "t-shirt"
const buatSlug = (teks: string) =>
  teks
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// =====================================================
// PAGE
// =====================================================

export default async function KoleksiPage({
  searchParams,
}: {
  searchParams: Promise<{
    kategori?: string;
    q?: string;
    urutkan?: string;
    ukuran?: string;
    harga?: string;
    page?: string;
  }>;
}) {
  const { t } = await getT();
  const params = await searchParams;

  const kategoriAktif = params.kategori?.toLowerCase();
  const query = params.q?.toLowerCase() ?? "";
  const urutkan = params.urutkan ?? "terbaru";
  const ukuranAktif = params.ukuran?.toUpperCase();
  const hargaAktif = params.harga;
  const halaman = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const hargaList = HARGA_CONFIG.map((item) => ({
    id: item.id,
    label: t(item.key),
    min: item.min,
    max: item.max,
  }));

  // =====================================================
  // FETCH DARI SUPABASE
  // =====================================================
  // Produk dan kategori diambil terpisah, lalu dicocokkan lewat
  // category_id. Cara ini tidak bergantung pada bentuk hasil join
  // (objek atau array), dan daftar kategori di sidebar selalu sama
  // dengan isi tabel categories.

  const supabase = await createClient();

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
          slug,
          base_price,
          category_id,
          product_variants ( size, color, extra_price, image_url ),
          product_images ( url, sort_order )
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

  // Daftar kategori untuk sidebar
  const kategoriList = (kategoriData ?? []).map((k) => ({
    id: k.id as number,
    nama: k.name as string,
    slug: buatSlug(k.name as string),
  }));

  const kategoriPerId = new Map(kategoriList.map((k) => [k.id, k]));

  // =====================================================
  // OLAH DATA MENTAH JADI BENTUK YANG DIPAKAI HALAMAN INI
  // =====================================================

  const semuaProduk: ProdukTampilan[] = (productsData ?? []).map((produk) => {
    const variants = produk.product_variants ?? [];

    const hargaTermurah =
      variants.length > 0
        ? Math.min(
            ...variants.map((v) => produk.base_price + (v.extra_price ?? 0)),
          )
        : produk.base_price;

    // Ukuran dirapikan (spasi dibuang, huruf besar) supaya "m" dan "M" sama
    const ukuranTersedia = Array.from(
      new Set(
        variants
          .map((v) => v.size?.trim().toUpperCase())
          .filter((s): s is string => Boolean(s)),
      ),
    );

    // Foto 1 untuk card koleksi = product_images dengan sort_order terkecil.
    // Fallback ke image_url varian kalau product_images masih kosong.
    const galeri = [...(produk.product_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const gambar =
      galeri[0]?.url ?? variants.find((v) => v.image_url)?.image_url ?? null;

    const kategori = kategoriPerId.get(produk.category_id);

    return {
      id: produk.id,
      nama: produk.name,
      kategori: kategori?.slug ?? "",
      kategoriNama: kategori?.nama ?? "",
      harga: hargaTermurah,
      ukuran: ukuranTersedia,
      gambar,
    };
  });

  // =====================================================
  // FILTER PRODUK
  // =====================================================

  let produkTampil = semuaProduk.filter((produk) => {
    const cocokKategori = kategoriAktif
      ? produk.kategori === kategoriAktif
      : true;

    const cocokQuery = query ? produk.nama.toLowerCase().includes(query) : true;

    const cocokUkuran = ukuranAktif
      ? produk.ukuran.includes(ukuranAktif)
      : true;

    let cocokHarga = true;

    if (hargaAktif) {
      const hargaTerpilih =
        hargaList.find((item) => item.id === hargaAktif || item.label === hargaAktif);

      if (hargaTerpilih) {
        cocokHarga =
          produk.harga >= hargaTerpilih.min &&
          produk.harga <= hargaTerpilih.max;
      }
    }

    return cocokKategori && cocokQuery && cocokUkuran && cocokHarga;
  });

  // =====================================================
  // SORTING
  // =====================================================

  if (urutkan === "termurah") {
    produkTampil = [...produkTampil].sort((a, b) => a.harga - b.harga);
  }

  if (urutkan === "termahal") {
    produkTampil = [...produkTampil].sort((a, b) => b.harga - a.harga);
  }

  // =====================================================
  // PAGINATION — 20 produk per halaman (5 baris × 4 kolom
  // di layout desktop xl:grid-cols-4). Kalau hasil filter
  // lebih dari itu, halaman berikutnya dibuat lewat ?page=.
  // Halaman di luar rentang (mis. ?page=9 padahal cuma 2
  // halaman) otomatis dikembalikan ke halaman terakhir.
  // =====================================================

  const PRODUK_PER_HALAMAN = 20;
  const totalProduk = produkTampil.length;
  const totalHalaman = Math.max(1, Math.ceil(totalProduk / PRODUK_PER_HALAMAN));
  const halamanValid = Math.min(halaman, totalHalaman);
  const mulai = (halamanValid - 1) * PRODUK_PER_HALAMAN;
  const produkHalaman = produkTampil.slice(mulai, mulai + PRODUK_PER_HALAMAN);

  // Link ke halaman lain, mempertahankan semua filter yang aktif.
  function hrefHalaman(h: number) {
    const sp = new URLSearchParams();
    if (kategoriAktif) sp.set("kategori", kategoriAktif);
    if (query) sp.set("q", query);
    if (urutkan && urutkan !== "terbaru") sp.set("urutkan", urutkan);
    if (ukuranAktif) sp.set("ukuran", ukuranAktif);
    if (hargaAktif) sp.set("harga", hargaAktif);
    if (h > 1) sp.set("page", String(h));
    const qs = sp.toString();
    return `/produk${qs ? `?${qs}` : ""}`;
  }

  // Nomor halaman dengan ringkas: 1 ... 4 5 6 ... 12 (untuk kasus banyak halaman)
  function daftarHalaman(total: number, aktif: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const nomor = new Set<number>([1, total, aktif - 1, aktif, aktif + 1]);
    const urut = [...nomor]
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);

    const hasil: (number | "...")[] = [];
    urut.forEach((n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) hasil.push("...");
      hasil.push(n);
    });
    return hasil;
  }

  // =====================================================
  // JUMLAH FILTER AKTIF
  // =====================================================

  const jumlahFilterAktif = [
    kategoriAktif,
    ukuranAktif,
    hargaAktif,
    query,
    urutkan !== "terbaru" ? urutkan : null,
  ].filter(Boolean).length;

  const adaFilterAktif = jumlahFilterAktif > 0;

  const namaKategoriAktif = kategoriAktif
    ? translateCategory(t, kategoriAktif)
    : "";

  return (
    <main className="min-h-screen bg-white text-[#1A1A1A] font-sans pb-24">
      {/* =====================================================
          CATALOG
      ===================================================== */}

      <section id="koleksi" className="bg-white">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-10 pt-28 pb-10">
            {/* FILTER SIDEBAR */}

            <aside className="lg:border-r lg:border-[#EAE7E3] lg:pr-7">
              <form method="GET" action="/produk">
                {query && <input type="hidden" name="q" value={query} />}

                <div className="flex items-center justify-between pb-5 border-b border-[#EAE7E3]">
                  <div className="flex items-center gap-2.5">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                      <path
                        d="M4 6H20M7 12H17M10 18H14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    <h3 className="text-sm font-medium">{t("product.filter")}</h3>

                    {jumlahFilterAktif > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[9px]">
                        {jumlahFilterAktif}
                      </span>
                    )}
                  </div>

                  {adaFilterAktif && (
                    <Link
                      href="/produk"
                      className="text-[10px] text-[#8A8178] hover:text-[#1A1A1A] transition"
                    >
                      {t("product.reset")}
                    </Link>
                  )}
                </div>

                {/* KATEGORI */}
                <div className="py-6 border-b border-[#EAE7E3]">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A8178] mb-4">
                    {t("product.category")}
                  </p>

                  <div className="space-y-1">
                    {[{ id: 0, nama: t("product.all"), slug: "" }, ...kategoriList].map(
                      (kategori) => (
                        <label
                          key={kategori.slug || "semua"}
                          className="flex items-center gap-3 py-2 cursor-pointer group"
                        >
                          <input
                            type="radio"
                            name="kategori"
                            value={kategori.slug}
                            defaultChecked={
                              (kategoriAktif ?? "") === kategori.slug
                            }
                            className="sr-only peer"
                          />

                          <span
                            className="
                            w-4 h-4 rounded-full border border-[#CFC9C2]
                            flex items-center justify-center transition
                            peer-checked:border-[#1A1A1A] peer-checked:bg-[#1A1A1A]
                            group-hover:border-[#1A1A1A]
                          "
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
                          </span>

                          <span
                            className="
                            text-[11px] text-[#6F6A65] group-hover:text-[#1A1A1A]
                            peer-checked:text-[#1A1A1A] transition
                          "
                          >
                            {kategori.slug ? translateCategory(t, kategori.slug) : kategori.nama}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </div>

                {/* UKURAN */}
                <div className="py-6 border-b border-[#EAE7E3]">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A8178] mb-4">
                    {t("product.size")}
                  </p>

                  <div className="grid grid-cols-5 gap-1.5">
                    {ukuranList.map((ukuran) => (
                      <label key={ukuran} className="cursor-pointer">
                        <input
                          type="radio"
                          name="ukuran"
                          value={ukuran}
                          defaultChecked={ukuranAktif === ukuran}
                          className="sr-only peer"
                        />

                        <span
                          className="
                            h-9 flex items-center justify-center rounded-md
                            border border-[#DDD8D2] bg-white text-[10px] text-[#5F5953]
                            transition peer-checked:bg-[#1A1A1A] peer-checked:border-[#1A1A1A]
                            peer-checked:text-white hover:border-[#1A1A1A]
                          "
                        >
                          {ukuran}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* RENTANG HARGA */}
                <div className="py-6 border-b border-[#EAE7E3]">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A8178] mb-4">
                    {t("product.priceRange")}
                  </p>

                  <div className="space-y-1">
                    {hargaList.map((harga) => (
                      <label
                        key={harga.id}
                        className="flex items-center gap-3 py-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="harga"
                          value={harga.id}
                          defaultChecked={hargaAktif === harga.id || hargaAktif === harga.label}
                          className="sr-only peer"
                        />

                        <span
                          className="
                            w-4 h-4 rounded-full border border-[#CFC9C2]
                            flex items-center justify-center transition
                            peer-checked:border-[#1A1A1A] peer-checked:bg-[#1A1A1A]
                            group-hover:border-[#1A1A1A]
                          "
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
                        </span>

                        <span className="text-[11px] text-[#6F6A65] group-hover:text-[#1A1A1A] transition">
                          {harga.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* URUTKAN */}
                <div className="py-6">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A8178] mb-4">
                    {t("product.sort")}
                  </p>

                  <div className="space-y-1">
                    {[
                      { label: t("product.newest"), value: "terbaru" },
                      { label: t("product.cheapest"), value: "termurah" },
                      { label: t("product.expensive"), value: "termahal" },
                    ].map((item) => (
                      <label
                        key={item.value}
                        className="flex items-center gap-3 py-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="urutkan"
                          value={item.value}
                          defaultChecked={urutkan === item.value}
                          className="sr-only peer"
                        />

                        <span
                          className="
                            w-4 h-4 rounded-full border border-[#CFC9C2]
                            flex items-center justify-center transition
                            peer-checked:border-[#1A1A1A] peer-checked:bg-[#1A1A1A]
                            group-hover:border-[#1A1A1A]
                          "
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
                        </span>

                        <span className="text-[11px] text-[#6F6A65] group-hover:text-[#1A1A1A] transition">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="
                    w-full h-11 rounded-full bg-[#1A1A1A] text-white text-[11px]
                    font-medium tracking-[0.02em] hover:bg-[#302D2A] transition-all
                    duration-300 flex items-center justify-center gap-2
                  "
                >
                  {t("product.apply")}
                  <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
                    <path
                      d="M4 10H16M11 5L16 10L11 15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </aside>

            {/* PRODUCT AREA */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[#77716B]">
                      {t("product.showing")}{" "}
                      <span className="text-[#1A1A1A] font-medium">
                        {produkTampil.length}
                      </span>{" "}
                      {t("product.productsCount")}
                    </p>
                  </div>

                  {adaFilterAktif && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {kategoriAktif && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F0EB] text-[9px] text-[#5F5953]">
                          {namaKategoriAktif}
                        </span>
                      )}

                      {ukuranAktif && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F0EB] text-[9px] text-[#5F5953]">
                          {t("product.sizeWith", { size: ukuranAktif })}
                        </span>
                      )}

                      {hargaAktif && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F0EB] text-[9px] text-[#5F5953]">
                          {hargaList.find((h) => h.id === hargaAktif)?.label ?? hargaAktif}
                        </span>
                      )}

                      {query && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F0EB] text-[9px] text-[#5F5953]">
                          &quot;{query}&quot;
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <span className="hidden sm:block text-[9px] tracking-[0.2em] text-[#9A938C]">
                  FAURE STORE
                </span>
              </div>

              {produkTampil.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-5 gap-y-10">
                    {produkHalaman.map((produk) => (
                      <ProductCard
                        key={produk.id}
                        id={produk.id}
                        nama={produk.nama}
                        harga={produk.harga}
                        kategori={translateCategory(t, produk.kategori || produk.kategoriNama)}
                        gambar={produk.gambar ?? undefined}
                      />
                    ))}
                  </div>

                  {/* PAGINATION — muncul kalau hasil lebih dari 5 baris
                      (20 produk per halaman di grid 4 kolom) */}
                  {totalHalaman > 1 && (
                    <nav
                      aria-label={t("product.pageOf", {
                        current: halamanValid,
                        total: totalHalaman,
                      })}
                      className="mt-14 flex flex-col items-center gap-3.5"
                    >
                      <p className="text-[11px] text-[#8A8178]">
                        {t("product.pageOf", {
                          current: halamanValid,
                          total: totalHalaman,
                        })}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={hrefHalaman(halamanValid - 1)}
                          aria-disabled={halamanValid <= 1}
                          aria-label={t("product.previousPage")}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[12px] transition ${
                            halamanValid <= 1
                              ? "pointer-events-none border-[#E7E5E0] text-[#C8C1B8]"
                              : "border-[#DDD8D2] text-[#5F5953] hover:border-[#1A1A1A]"
                          }`}
                        >
                          ←
                        </Link>

                        {daftarHalaman(totalHalaman, halamanValid).map(
                          (item, i) =>
                            item === "..." ? (
                              <span
                                key={`gap-${i}`}
                                className="inline-flex h-9 min-w-6 items-center justify-center px-0.5 text-[12px] text-[#B3ACA4]"
                              >
                                …
                              </span>
                            ) : (
                              <Link
                                key={item}
                                href={hrefHalaman(item)}
                                aria-current={
                                  item === halamanValid ? "page" : undefined
                                }
                                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-1.5 text-[12px] font-medium transition ${
                                  item === halamanValid
                                    ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                                    : "border-[#DDD8D2] text-[#5F5953] hover:border-[#1A1A1A]"
                                }`}
                              >
                                {item}
                              </Link>
                            ),
                        )}

                        <Link
                          href={hrefHalaman(halamanValid + 1)}
                          aria-disabled={halamanValid >= totalHalaman}
                          aria-label={t("product.nextPage")}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[12px] transition ${
                            halamanValid >= totalHalaman
                              ? "pointer-events-none border-[#E7E5E0] text-[#C8C1B8]"
                              : "border-[#DDD8D2] text-[#5F5953] hover:border-[#1A1A1A]"
                          }`}
                        >
                          →
                        </Link>
                      </div>
                    </nav>
                  )}
                </>
              ) : (
                <div className="min-h-[350px] bg-[#FAF8F5] rounded-[10px] flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#8A8178]">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path
                        d="M9 9L15 15M15 9L9 15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />

                      <circle
                        cx="12"
                        cy="12"
                        r="8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <h3 className="mt-5 text-sm font-medium">
                    {t("product.notFoundTitle")}
                  </h3>

                  <p className="mt-2 max-w-[320px] text-xs leading-6 text-[#77716B]">
                    {t("product.notFoundBody")}
                  </p>

                  <Link
                    href="/produk"
                    className="
                      mt-5 inline-flex items-center justify-center px-5 py-2.5
                      rounded-full bg-[#1A1A1A] text-white text-[10px] font-medium
                      hover:bg-[#302D2A] transition
                    "
                  >
                    {t("product.seeAll")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
