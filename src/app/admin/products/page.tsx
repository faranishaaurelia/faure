import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTanggal, rupiah } from "@/lib/orders";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { deleteProduct } from "@/lib/actions/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

const styleSvg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IKON = {
  produk: (
    <svg {...styleSvg}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </svg>
  ),
  tag: (
    <svg {...styleSvg}>
      <path d="M12.6 2.9H4a1 1 0 0 0-1 1v8.6a1 1 0 0 0 .3.7l8.9 8.9a2 2 0 0 0 2.8 0l7.6-7.6a2 2 0 0 0 0-2.8l-8.9-8.9a1 1 0 0 0-.7-.3z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  ),
  kotak: (
    <svg {...styleSvg}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  ),
  peringatan: (
    <svg {...styleSvg}>
      <path d="M12 3.5 2.5 20h19L12 3.5z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
};

type ProdukRow = {
  id: number;
  name: string;
  base_price: number | string;
  created_at: string;
  categories: { name: string } | { name: string }[] | null;
  product_variants: { id: number; stock?: number | null }[] | null;
  product_images: { url: string; sort_order?: number | null }[] | null;
};

const VARIANT_MENIPIS = 5;

function namaKategori(relasi: ProdukRow["categories"]) {
  if (Array.isArray(relasi)) return relasi[0]?.name ?? "-";
  return relasi?.name ?? "-";
}

function gambarUtama(relasi: ProdukRow["product_images"]) {
  const arr = [...(relasi ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return arr[0]?.url ?? null;
}

function totalStok(varian: ProdukRow["product_variants"]) {
  return (varian ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

const PER_HALAMAN = 10;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const [kunci, { count: jumlahKategori }, { count: jumlahVarianMenipis }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          `
          id, name, base_price, created_at,
          categories ( name ),
          product_variants ( id, stock ),
          product_images ( url, sort_order )
        `,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*", { count: "exact", head: true }),
      supabase
        .from("product_variants")
        .select("*", { count: "exact", head: true })
        .lte("stock", VARIANT_MENIPIS),
    ]);

  const semuaProduk = (kunci.data ?? []) as unknown as ProdukRow[];

  // Pencarian nama (case-insensitive) via query string ?q=
  const kata = q?.trim().toLowerCase() ?? "";
  const produkTerfilter =
    kata.length > 0
      ? semuaProduk.filter((p) => p.name.toLowerCase().includes(kata))
      : semuaProduk;

  // ---------- Pagination ----------
  const halamanSekarang = Math.max(1, parseInt(pageParam ?? "1", 10));
  const totalHalaman = Math.ceil(produkTerfilter.length / PER_HALAMAN);
  const halamanValid = Math.min(halamanSekarang, Math.max(1, totalHalaman));
  const mulai = (halamanValid - 1) * PER_HALAMAN;
  const produk = produkTerfilter.slice(mulai, mulai + PER_HALAMAN);

  function hrefHalaman(h: number) {
    const params = new URLSearchParams();
    if (kata) params.set("q", q!);
    if (h > 1) params.set("page", String(h));
    const qs = params.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  }

  const totalStokSemua = semuaProduk.reduce(
    (sum, p) => sum + totalStok(p.product_variants),
    0,
  );

  const ringkasan = [
    {
      label: "Total Produk",
      value: String(semuaProduk.length),
      hint: "Semua koleksi",
      icon: IKON.produk,
    },
    {
      label: "Kategori",
      value: String(jumlahKategori ?? 0),
      hint: "Grup koleksi",
      icon: IKON.tag,
    },
    {
      label: "Stok Unit",
      value: String(totalStokSemua),
      hint: "Total semua varian",
      icon: IKON.kotak,
    },
    {
      label: "Stok Menipis",
      value: String(jumlahVarianMenipis ?? 0),
      hint: `Varian ≤ ${VARIANT_MENIPIS} unit`,
      icon: IKON.peringatan,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Produk"
        description="Tambah, ubah, dan atur stok koleksi Faure."
        action={
          <Link href="/admin/products/baru" className="admin-btn">
            + Tambah Produk
          </Link>
        }
      />

      {/* ===== Ringkasan ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ringkasan.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-[22px] border border-black/5 shadow-sm p-5"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A]">
              {item.icon}
            </span>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
              {item.label}
            </p>
            <p className="mt-2 font-serif text-[28px] leading-none tracking-[-0.03em] text-[#1E1C18]">
              {item.value}
            </p>
            <p className="mt-2 text-[12px] text-[#8A837B]">{item.hint}</p>
          </div>
        ))}
      </div>

      {/* ===== Pencarian ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <form action="/admin/products" method="GET" className="flex-1 max-w-md">
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B7AEA3]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              defaultValue={kata}
              placeholder="Cari produk…"
              aria-label="Cari produk"
              className="w-full h-10 rounded-full border border-[#E7E5E0] bg-white pl-10 pr-4 text-[13px] placeholder:text-[#B0A89D] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A] focus:border-[#8B6B5A] transition"
            />
          </div>
        </form>

        <p className="text-[12px] text-[#8A837B]">
          Menampilkan {produkTerfilter.length} dari {semuaProduk.length} produk
          {kata.length > 0 && (
            <Link
              href="/admin/products"
              className="ml-1.5 text-[#8B6B5A] hover:text-[#1E1C18] underline underline-offset-4 transition"
            >
              reset
            </Link>
          )}
        </p>
      </div>

      {/* ===== Daftar ===== */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Ditambahkan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produk.map((p) => {
              const namaKtg = namaKategori(p.categories);
              const gambar = gambarUtama(p.product_images);
              const jumlahVarian = (p.product_variants ?? []).length;
              const stok = totalStok(p.product_variants);
              const menipis = (p.product_variants ?? []).filter(
                (v) => (v.stock ?? 0) <= VARIANT_MENIPIS,
              ).length;

              return (
                <tr
                  key={p.id}
                  className="group transition hover:bg-[#FAF7F3]"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-[52px] shrink-0 overflow-hidden rounded-lg bg-[#F3F1EC]">
                        {gambar && (
                          <img
                            src={gambar}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#8A837B]">
                          {jumlahVarian} varian
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-[#716A63]">{namaKtg}</td>
                  <td className="font-semibold whitespace-nowrap">
                    {rupiah(Number(p.base_price))}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="font-medium">{stok}</span>
                    {menipis > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-[#FCE8E6] px-2 py-0.5 text-[10px] font-semibold text-[#B3261E]">
                        Stok menipis
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[#716A63]">
                    {formatTanggal(p.created_at)}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[#8B6B5A] font-medium hover:text-[#1E1C18] transition"
                    >
                      Ubah
                    </Link>
                    <span className="mx-2 text-[#D8D1CA]">·</span>
                    <ConfirmButton
                      label="Hapus"
                      confirmText={`Hapus produk "${p.name}"?`}
                      className="text-[#B23B3B] font-medium"
                      action={deleteProduct}
                      id={p.id}
                    />
                  </td>
                </tr>
              );
            })}

            {produk.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
                    {IKON.produk}
                  </span>
                  <p className="mt-3 text-sm font-medium text-[#1E1C18]">
                    {semuaProduk.length === 0
                      ? "Belum ada produk."
                      : `Tidak ada produk yang cocok dengan "${kata}".`}
                  </p>
                  <p className="mt-1 text-sm text-[#8A837B]">
                    {semuaProduk.length === 0
                      ? "Tambahkan produk pertama untuk mulai berjualan."
                      : "Coba kata kunci lain atau reset pencarian."}
                  </p>
                  {semuaProduk.length === 0 ? (
                    <Link
                      href="/admin/products/baru"
                      className="inline-flex items-center justify-center mt-5 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-[13px] font-semibold hover:bg-[#8B6B5A] transition"
                    >
                      + Tambah Produk
                    </Link>
                  ) : (
                    <Link
                      href="/admin/products"
                      className="inline-flex items-center justify-center mt-5 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-[13px] font-semibold hover:bg-[#8B6B5A] transition"
                    >
                      Lihat semua produk
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Pagination ===== */}
      {totalHalaman > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 text-[13px]">
          <p className="text-[#8A837B]">
            Menampilkan {mulai + 1}–{Math.min(mulai + PER_HALAMAN, produkTerfilter.length)} dari {produkTerfilter.length} produk
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={hrefHalaman(halamanValid - 1)}
              aria-disabled={halamanValid <= 1}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${halamanValid <= 1 ? "pointer-events-none border-[#E7E5E0] text-[#C0B8AE]" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
            >
              ←
            </Link>
            {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((h) => (
              <Link
                key={h}
                href={hrefHalaman(h)}
                aria-current={h === halamanValid ? "page" : undefined}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-medium transition ${h === halamanValid ? "border-[#1E1C18] bg-[#1E1C18] text-white" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
              >
                {h}
              </Link>
            ))}
            <Link
              href={hrefHalaman(halamanValid + 1)}
              aria-disabled={halamanValid >= totalHalaman}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${halamanValid >= totalHalaman ? "pointer-events-none border-[#E7E5E0] text-[#C0B8AE]" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
            >
              →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}