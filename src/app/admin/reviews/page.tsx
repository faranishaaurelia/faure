import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { deleteReview } from "@/lib/actions/admin";
import { formatTanggal } from "@/lib/orders";
import SortSelect from "@/components/admin/SortSelect";

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
  ulasan: (
    <svg {...styleSvg}>
      <path d="M12 3l2.2 6.6H21l-5.4 3.9 2.1 6.5L12 16.8 6.3 20l2.1-6.5L3 9.6h6.8L12 3z" />
    </svg>
  ),
  bintang: (
    <svg {...styleSvg}>
      <path d="M12 3l2.2 6.6H21l-5.4 3.9 2.1 6.5L12 16.8 6.3 20l2.1-6.5L3 9.6h6.8L12 3z" />
    </svg>
  ),
  bagus: (
    <svg {...styleSvg}>
      <path d="M12 3l2.2 6.6H21l-5.4 3.9 2.1 6.5L12 16.8 6.3 20l2.1-6.5L3 9.6h6.8L12 3z" />
    </svg>
  ),
  waspada: (
    <svg {...styleSvg}>
      <path d="M12 3.5 2.5 20h19L12 3.5z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function inisial(nama: string | null) {
  const kata = (nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  return (kata[0][0] + (kata[1]?.[0] ?? "")).toUpperCase();
}

function Bintang({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-sm"
      aria-label={`${rating} dari 5 bintang`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden
          className={n <= rating ? "text-[#B18452]" : "text-[#D8D1CA]"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

const PER_HALAMAN = 10;

const SORT_ULASAN = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terlama", label: "Terlama" },
  { value: "rating-tinggi", label: "Rating tertinggi" },
  { value: "rating-rendah", label: "Rating terendah" },
  { value: "produk-az", label: "Produk A–Z" },
];

type SortUlasan = (typeof SORT_ULASAN)[number]["value"];

const FILTER_RATING = [
  { value: "", label: "Semua Rating" },
  { value: "5", label: "5 bintang" },
  { value: "4", label: "4 bintang" },
  { value: "3", label: "3 bintang" },
  { value: "2", label: "2 bintang" },
  { value: "1", label: "1 bintang" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    rating?: string;
  }>;
}) {
  const { q, page: pageParam, sort: sortParam, rating: ratingParam } =
    await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("reviews")
    .select(
      `
      id, rating, comment, created_at, user_id,
      products ( name )
    `,
    )
    .order("created_at", { ascending: false });

  const semuaReviews = (data ?? []) as {
    id: number;
    rating: number | null;
    comment: string | null;
    created_at: string;
    user_id: string;
    products: { name: string } | { name: string }[] | null;
  }[];

  const userIds = [...new Set(semuaReviews.map((r) => r.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const namaMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

  // Pencarian produk / komentar
  const kata = q?.trim().toLowerCase() ?? "";
  const reviewsTerfilter =
    kata.length > 0
      ? semuaReviews.filter((r) => {
          const namaProduk = satu(r.products)?.name ?? "";
          return (
            namaProduk.toLowerCase().includes(kata) ||
            (r.comment ?? "").toLowerCase().includes(kata)
          );
        })
      : semuaReviews;

  // ---------- Filter rating ----------
  const ratingAktif = FILTER_RATING.some(
    (r) => r.value === ratingParam && r.value !== "",
  )
    ? (ratingParam as string)
    : "";

  const reviewsRating = ratingAktif
    ? reviewsTerfilter.filter(
        (r) => Number(r.rating) === Number(ratingAktif),
      )
    : reviewsTerfilter;

  const deskripsiFilter = [
    kata.length > 0 ? `kata kunci "${kata}"` : null,
    ratingAktif ? `rating ${ratingAktif} bintang` : null,
  ]
    .filter(Boolean)
    .join(" dan ");

  // ---------- Urutan ----------
  const sort: SortUlasan = SORT_ULASAN.some((s) => s.value === sortParam)
    ? (sortParam as SortUlasan)
    : "terbaru";

  const namaProdukUlasan = (r: (typeof semuaReviews)[number]) =>
    satu(r.products)?.name ?? "";

  const reviewsTerurut = [...reviewsRating].sort((a, b) => {
    switch (sort) {
      case "terlama":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "rating-tinggi":
        return Number(b.rating ?? 0) - Number(a.rating ?? 0);
      case "rating-rendah":
        return Number(a.rating ?? 0) - Number(b.rating ?? 0);
      case "produk-az":
        return namaProdukUlasan(a).localeCompare(namaProdukUlasan(b), "id");
      default:
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  });

  // ---------- Pagination ----------
  const halamanSekarang = Math.max(1, parseInt(pageParam ?? "1", 10));
  const totalHalaman = Math.ceil(reviewsTerurut.length / PER_HALAMAN);
  const halamanValid = Math.min(halamanSekarang, Math.max(1, totalHalaman));
  const mulai = (halamanValid - 1) * PER_HALAMAN;
  const reviews = reviewsTerurut.slice(mulai, mulai + PER_HALAMAN);

  function hrefHalaman(h: number) {
    const params = new URLSearchParams();
    if (kata) params.set("q", q!);
    if (sort !== "terbaru") params.set("sort", sort);
    if (ratingAktif) params.set("rating", ratingAktif);
    if (h > 1) params.set("page", String(h));
    const qs = params.toString();
    return `/admin/reviews${qs ? `?${qs}` : ""}`;
  }

  // Ringkasan
  const denganRating = semuaReviews.filter(
    (r) => r.rating != null && r.rating > 0,
  );
  const rataRata = denganRating.length
    ? denganRating.reduce((s, r) => s + (r.rating ?? 0), 0) /
      denganRating.length
    : 0;
  const bintang5 = semuaReviews.filter((r) => (r.rating ?? 0) >= 5).length;
  const perluPerhatian = semuaReviews.filter(
    (r) => (r.rating ?? 0) <= 2,
  ).length;

  const ringkasan = [
    {
      label: "Total Ulasan",
      value: String(semuaReviews.length),
      hint: "Semua komentar",
      icon: IKON.ulasan,
    },
    {
      label: "Rating Rata-rata",
      value: denganRating.length ? rataRata.toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "–",
      hint: "Dari 5 bintang",
      icon: IKON.bintang,
    },
    {
      label: "Bintang 5",
      value: String(bintang5),
      hint: "Kepuasan tertinggi",
      icon: IKON.bagus,
    },
    {
      label: "Perlu Perhatian",
      value: String(perluPerhatian),
      hint: "Rating 1–2 bintang",
      icon: IKON.waspada,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Ulasan"
        description="Moderasi rating dan komentar pembeli."
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
        <form action="/admin/reviews" method="GET" className="flex-1 max-w-md">
          {sort !== "terbaru" && (
            <input type="hidden" name="sort" value={sort} />
          )}
          {ratingAktif && (
            <input type="hidden" name="rating" value={ratingAktif} />
          )}
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
              placeholder="Cari produk atau komentar…"
              aria-label="Cari ulasan"
              className="w-full h-10 rounded-full border border-[#E7E5E0] bg-white pl-10 pr-4 text-[13px] placeholder:text-[#B0A89D] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A] focus:border-[#8B6B5A] transition"
            />
          </div>
        </form>

        <SortSelect
          value={ratingAktif}
          options={FILTER_RATING}
          paramName="rating"
          baseParams={{
            q,
            sort: sort !== "terbaru" ? sort : undefined,
          }}
          ariaLabel="Filter rating ulasan"
        />

        <SortSelect
          value={sort}
          options={SORT_ULASAN}
          baseParams={{
            q,
            rating: ratingAktif || undefined,
          }}
          ariaLabel="Urutkan ulasan"
        />

        <p className="text-[12px] text-[#8A837B] sm:ml-auto">
          Menampilkan {reviewsTerurut.length} dari {semuaReviews.length} ulasan
          {(kata.length > 0 || ratingAktif) && (
            <Link
              href="/admin/reviews"
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
              <th>Pelanggan</th>
              <th>Rating</th>
              <th>Ulasan</th>
              <th>Tanggal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => {
              const produk = satu(review.products);
              const nama = namaMap.get(review.user_id) ?? null;
              const rating = Number(review.rating ?? 0);

              return (
                <tr
                  key={review.id}
                  className="group transition hover:bg-[#FAF7F3]"
                >
                  <td className="font-medium">{produk?.name ?? "-"}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EFE9] font-serif text-[11px] font-semibold text-[#8B6B5A]">
                        {inisial(nama)}
                      </span>
                      <span>{nama ?? "-"}</span>
                    </div>
                  </td>
                  <td>
                    <Bintang rating={rating} />
                  </td>
                  <td className="max-w-xs text-[#716A63]">
                    <p className="line-clamp-2">{review.comment || "-"}</p>
                  </td>
                  <td className="whitespace-nowrap text-[#716A63]">
                    {formatTanggal(review.created_at)}
                  </td>
                  <td className="text-right">
                    <ConfirmButton
                      label="Hapus"
                      confirmText="Hapus ulasan ini?"
                      className="text-[#B23B3B] font-medium"
                      action={deleteReview}
                      id={review.id}
                    />
                  </td>
                </tr>
              );
            })}

            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
                    {IKON.ulasan}
                  </span>
                  <p className="mt-3 text-sm font-medium text-[#1E1C18]">
                    {semuaReviews.length === 0
                      ? "Belum ada ulasan."
                      : `Tidak ada ulasan yang cocok${deskripsiFilter ? ` dengan ${deskripsiFilter}` : ""}.`}
                  </p>
                  <p className="mt-1 text-sm text-[#8A837B]">
                    {semuaReviews.length === 0
                      ? "Ulasan pembeli akan muncul di sini."
                      : "Coba ubah filter atau kata kunci lain."}
                  </p>
                  {semuaReviews.length > 0 && (
                    <Link
                      href="/admin/reviews"
                      className="inline-flex items-center justify-center mt-5 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-[13px] font-semibold hover:bg-[#8B6B5A] transition"
                    >
                      Lihat semua ulasan
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
            Menampilkan {mulai + 1}–{Math.min(mulai + PER_HALAMAN, reviewsTerurut.length)} dari {reviewsTerurut.length} ulasan
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