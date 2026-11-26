import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/orders/StatusBadge";
import {
  STATUS_TKEY,
  TAB_STATUS,
  angka,
  formatTanggal,
  infoItem,
  infoPembayaran,
  infoStatus,
  kodePesanan,
  labelMetodeBayar,
  rupiah,
  type ItemRow,
} from "@/lib/orders";
import { getT, dateLocale } from "@/lib/i18n/server";

type PesananRow = {
  id: number;
  status: string;
  total: number | string;
  created_at: string;
  payment_method: string | null;
  payment_status: string | null;
  cancellation_reason: string | null;
  order_items: ItemRow[] | null;
};

// Jumlah produk yang ditampilkan di tiap kartu (sisanya "+N produk lainnya")
const MAKS_ITEM = 2;

export default async function PesananPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const { t, locale } = await getT();

  const halaman = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      total,
      created_at,
      payment_method,
      payment_status,
      cancellation_reason,
      order_items (
        id,
        product_name_snapshot,
        price,
        quantity,
        product_variants (
          size,
          color,
          image_url,
          products (
            name,
            product_images ( url, sort_order )
          )
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil pesanan:", error.message);
  }

  const semuaPesanan = (data ?? []) as unknown as PesananRow[];

  // ---------- Filter status ----------
  const tabAktif = TAB_STATUS.some((t) => t.key === status)
    ? (status as string)
    : "semua";

  const hitung: Record<string, number> = { semua: semuaPesanan.length };
  for (const p of semuaPesanan) {
    const key = infoStatus(p.status).key;
    if (key) hitung[key] = (hitung[key] ?? 0) + 1;
  }

  const pesananTampil =
    tabAktif === "semua"
      ? semuaPesanan
      : semuaPesanan.filter((p) => infoStatus(p.status).key === tabAktif);

  // ---------- Pagination: 3 pesanan per halaman ----------
  const PESANAN_PER_HALAMAN = 3;
  const totalHalaman = Math.max(
    1,
    Math.ceil(pesananTampil.length / PESANAN_PER_HALAMAN),
  );
  const halamanValid = Math.min(halaman, totalHalaman);
  const mulai = (halamanValid - 1) * PESANAN_PER_HALAMAN;
  const pesananHalaman = pesananTampil.slice(
    mulai,
    mulai + PESANAN_PER_HALAMAN,
  );

  // Link ke halaman lain, mempertahankan filter status yang aktif.
  function hrefHalaman(h: number) {
    const sp = new URLSearchParams();
    if (tabAktif !== "semua") sp.set("status", tabAktif);
    if (h > 1) sp.set("page", String(h));
    const qs = sp.toString();
    return `/pesanan${qs ? `?${qs}` : ""}`;
  }

  // Nomor halaman ringkas: 1 ... 4 5 6 ... 12 (kalau halamannya banyak)
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

  return (
    <div>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em]">
            {t("account.ordersTitle")}
          </h1>
          <p className="mt-2 text-sm text-[#8B8478]">
            {t("account.ordersBody")}
          </p>

          {/* ===================== TAB STATUS ===================== */}
          <nav
            aria-label={t("account.filterStatus")}
            className="mt-8 flex gap-2 overflow-x-auto pb-1"
          >
            {TAB_STATUS.map((tab) => {
              const aktif = tabAktif === tab.key;
              const jumlah = hitung[tab.key] ?? 0;

              return (
                <Link
                  key={tab.key}
                  href={
                    tab.key === "semua"
                      ? "/pesanan"
                      : `/pesanan?status=${tab.key}`
                  }
                  aria-current={aktif ? "page" : undefined}
                  className={`shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-xs transition ${
                    aktif
                      ? "bg-[#1E1C18] text-white"
                      : "bg-white border border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"
                  }`}
                >
                  {tab.key === "semua"
                    ? t("account.statusAll")
                    : t(STATUS_TKEY[tab.key])}
                  {jumlah > 0 && (
                    <span
                      className={`text-[10px] ${
                        aktif ? "text-white/70" : "text-[#8B8478]"
                      }`}
                    >
                      {jumlah}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ===================== DAFTAR ===================== */}
          <div
            className="mt-6 space-y-4 overflow-y-auto pr-1 inner-scroll"
            style={{ height: "min(680px, calc(100dvh - 220px))" }}
          >
            {error ? (
              <div className="bg-white rounded-[24px] border border-black/5 shadow-sm px-6 py-12 text-center">
                <p className="text-sm font-medium">{t("account.loadFail")}</p>
                <p className="mt-1 text-sm text-[#8B8478]">
                  {t("account.loadFailBody")}
                </p>
              </div>
            ) : pesananTampil.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-black/5 shadow-sm px-6 py-14 text-center">
                <p className="text-sm font-medium">
                  {semuaPesanan.length === 0
                    ? t("account.noOrders")
                    : t("account.noOrdersStatus")}
                </p>
                <p className="mt-1 text-sm text-[#8B8478]">
                  {semuaPesanan.length === 0
                    ? t("account.noOrdersBody")
                    : t("account.tryOtherStatus")}
                </p>

                <Link
                  href={semuaPesanan.length === 0 ? "/produk" : "/pesanan"}
                  className="inline-flex items-center justify-center mt-6 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition"
                >
                  {semuaPesanan.length === 0
                    ? t("account.startShopping")
                    : t("account.seeAllOrders")}
                </Link>
              </div>
            ) : (
              <>
                {pesananHalaman.map((p) => {
                const info = infoStatus(p.status, t);
                const bayar = infoPembayaran(p.payment_status, info.key, t);
                const items = (p.order_items ?? []).map((i) => infoItem(i, t));
                const sisa = items.length - MAKS_ITEM;

                return (
                  <article
                    key={p.id}
                    className="bg-white rounded-[24px] border border-black/5 shadow-sm p-5 md:p-6"
                  >
                    {/* HEADER */}
                    <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#EFEDE8]">
                      <div>
                        <p className="text-sm font-semibold">
                          {kodePesanan(p.id)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8B8478]">
                          {formatTanggal(p.created_at, dateLocale(locale))}
                        </p>
                      </div>

                      <StatusBadge label={info.label} tone={info.tone} />
                    </header>

                    {/* ALASAN PEMBATALAN */}
                    {info.key === "dibatalkan" && p.cancellation_reason && (
                      <p className="pt-4 border-b border-[#EFEDE8] text-xs text-[#8A2530]">
                        <span className="font-medium">
                          {t("account.cancelReasonLabel")}:
                        </span>{" "}
                        {p.cancellation_reason}
                      </p>
                    )}

                    {/* ITEM */}
                    <ul className="py-4 space-y-3">
                      {items.slice(0, MAKS_ITEM).map((item) => (
                        <li key={item.id} className="flex gap-4">
                          <div className="w-14 aspect-[4/5] shrink-0 overflow-hidden rounded-lg bg-[#F3F1EC]">
                            {item.gambar && (
                              <img
                                src={item.gambar}
                                alt={item.nama}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-5">
                              {item.nama}
                            </p>
                            {item.detail && (
                              <p className="mt-0.5 text-xs text-[#8B8478]">
                                {item.detail}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-[#8B8478]">
                              {item.jumlah} x {rupiah(item.harga)}
                            </p>
                          </div>
                        </li>
                      ))}

                      {sisa > 0 && (
                        <li className="text-xs text-[#8B8478]">
                          {t("account.moreProducts", { count: sisa })}
                        </li>
                      )}

                      {items.length === 0 && (
                        <li className="text-xs text-[#8B8478]">
                          {t("account.noItemDetail")}
                        </li>
                      )}
                    </ul>

                    {/* PEMBAYARAN */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-4 border-t border-[#EFEDE8] text-xs text-[#6B655A]">
                      <span>{t("account.payment")}</span>
                      <StatusBadge label={bayar.label} tone={bayar.tone} />
                      {p.payment_method && (
                        <span>
                          {t("account.via", {
                            method: labelMetodeBayar(p.payment_method),
                          })}
                        </span>
                      )}
                    </div>

                    {/* FOOTER */}
                    <footer className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#EFEDE8]">
                      <div>
                        <p className="text-[11px] text-[#8B8478]">
                          {t("account.orderTotal")}
                        </p>
                        <p className="text-base font-semibold">
                          {rupiah(angka(p.total))}
                        </p>
                      </div>

                      <Link
                        href={`/pesanan/${p.id}`}
                        className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition"
                      >
                        {t("account.viewDetail")}
                      </Link>
                    </footer>
                  </article>
                );
              })}

              {/* PAGINATION */}
              {totalHalaman > 1 && (
                <nav
                  aria-label={t("account.pageOf", {
                    current: halamanValid,
                    total: totalHalaman,
                  })}
                  className="pt-2 flex flex-col items-center gap-3.5"
                >
                  <p className="text-[11px] text-[#8B8478]">
                    {t("account.pageOf", {
                      current: halamanValid,
                      total: totalHalaman,
                    })}
                  </p>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={hrefHalaman(halamanValid - 1)}
                      aria-disabled={halamanValid <= 1}
                      aria-label={t("account.previousPage")}
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
                      aria-label={t("account.nextPage")}
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
          )}
        </div>
        </div>
    </div>
  );
}
