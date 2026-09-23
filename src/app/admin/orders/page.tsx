import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  TAB_STATUS,
  formatTanggal,
  infoPembayaran,
  infoStatus,
  kodePesanan,
  rupiah,
} from "@/lib/orders";
import StatusBadge from "@/components/orders/StatusBadge";
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
  pesanan: (
    <svg {...styleSvg}>
      <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </svg>
  ),
  jam: (
    <svg {...styleSvg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  truk: (
    <svg {...styleSvg}>
      <path d="M2.5 5h12v11h-12z" />
      <path d="M14.5 9h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  ),
  rupiah: (
    <svg {...styleSvg}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  ),
};

type OrderRow = {
  id: number;
  user_id: string;
  status: string;
  payment_status: string | null;
  total: number | string;
  created_at: string;
  cancellation_reason: string | null;
  order_items: { quantity: number | string }[] | null;
};

const jumlahProduk = (item: OrderRow["order_items"]) =>
  (item ?? []).reduce((sum, i) => sum + Number(i.quantity ?? 0), 0);

const PER_HALAMAN = 10;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, user_id, status, payment_status, total, created_at, cancellation_reason, order_items ( quantity )",
    )
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as OrderRow[];

  // Nama pelanggan (orders & profiles tidak punya FK langsung)
  const userIds = [...new Set(orders.map((o) => o.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const namaMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

  // ---------- Filter status (dari URL) ----------
  const tabAktif = TAB_STATUS.some((t) => t.key === status)
    ? (status as string)
    : "semua";

  const hitung: Record<string, number> = { semua: orders.length };
  for (const o of orders) {
    const key = infoStatus(o.status).key;
    if (key) hitung[key] = (hitung[key] ?? 0) + 1;
  }

  const semuaTampil =
    tabAktif === "semua"
      ? orders
      : orders.filter((o) => infoStatus(o.status).key === tabAktif);

  // ---------- Pagination ----------
  const halamanSekarang = Math.max(1, parseInt(pageParam ?? "1", 10));
  const totalHalaman = Math.ceil(semuaTampil.length / PER_HALAMAN);
  const halamanValid = Math.min(halamanSekarang, Math.max(1, totalHalaman));
  const mulai = (halamanValid - 1) * PER_HALAMAN;
  const pesananTampil = semuaTampil.slice(mulai, mulai + PER_HALAMAN);

  function hrefHalaman(h: number) {
    const params = new URLSearchParams();
    if (tabAktif !== "semua") params.set("status", tabAktif);
    if (h > 1) params.set("page", String(h));
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  }

  // ---------- Ringkasan ----------
  const menunggu = orders.filter((o) => {
    const k = infoStatus(o.status).key;
    return k === "menunggu_pembayaran" || k === "diproses";
  }).length;

  const dikirim = orders.filter(
    (o) => infoStatus(o.status).key === "dikirim",
  ).length;

  const pendapatan = orders
    .filter((o) => infoStatus(o.status).key === "selesai")
    .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  const ringkasan = [
    {
      label: "Total Pesanan",
      value: String(orders.length),
      hint: "Semua transaksi",
      icon: IKON.pesanan,
    },
    {
      label: "Menunggu Tindakan",
      value: String(menunggu),
      hint: "Belum bayar & diproses",
      icon: IKON.jam,
    },
    {
      label: "Dalam Pengiriman",
      value: String(dikirim),
      hint: "Sedang dikirim ke pembeli",
      icon: IKON.truk,
    },
    {
      label: "Pendapatan",
      value: rupiah(pendapatan),
      hint: "Dari pesanan selesai",
      icon: IKON.rupiah,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Pesanan"
        description="Pantau status, pembayaran, dan pengiriman pesanan pelanggan."
      />

      {/* ===== Ringkasan ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ringkasan.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-[22px] border border-black/5 shadow-sm p-5"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A]">
                {item.icon}
              </span>
            </div>
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

      {/* ===== Filter status ===== */}
      <nav
        aria-label="Filter status pesanan"
        className="flex gap-2 overflow-x-auto pb-1 mb-5"
      >
        {TAB_STATUS.map((tab) => {
          const aktif = tabAktif === tab.key;
          const jumlah = hitung[tab.key] ?? 0;

          return (
            <Link
              key={tab.key}
              href={
                tab.key === "semua"
                  ? "/admin/orders"
                  : `/admin/orders?status=${tab.key}`
              }
              aria-current={aktif ? "page" : undefined}
              className={`shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-[12px] font-medium transition ${
                aktif
                  ? "bg-[#1E1C18] text-white"
                  : "bg-white border border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"
              }`}
            >
              {tab.label}
              {jumlah > 0 && (
                <span
                  className={`rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1 text-[10px] font-semibold ${
                    aktif
                      ? "bg-white/20 text-white"
                      : "bg-[#F3EFE9] text-[#8B6B5A]"
                  }`}
                >
                  {jumlah}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ===== Daftar ===== */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Pelanggan</th>
              <th>Tanggal</th>
              <th>Total</th>
              <th>Pembayaran</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pesananTampil.map((order) => {
              const statusInfo = infoStatus(order.status);
              const bayar = infoPembayaran(
                order.payment_status,
                statusInfo.key,
              );
              const jumlah = jumlahProduk(order.order_items);

              return (
                <tr
                  key={order.id}
                  className="group transition hover:bg-[#FAF7F3]"
                >
                  <td className="font-medium whitespace-nowrap">
                    {kodePesanan(order.id)}
                    <span className="block mt-0.5 text-[11px] font-normal text-[#8A837B]">
                      {jumlah} produk
                    </span>
                  </td>
                  <td>{namaMap.get(order.user_id) ?? "-"}</td>
                  <td className="whitespace-nowrap text-[#716A63]">
                    {formatTanggal(order.created_at)}
                  </td>
                  <td className="font-semibold whitespace-nowrap">
                    {rupiah(Number(order.total))}
                  </td>
                  <td>
                    <StatusBadge label={bayar.label} tone={bayar.tone} />
                  </td>
                  <td>
                    <StatusBadge
                      label={statusInfo.label}
                      tone={statusInfo.tone}
                    />
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      aria-label={`Lihat detail ${kodePesanan(order.id)}`}
                      className="inline-flex items-center gap-1 text-[#8B6B5A] hover:text-[#1E1C18] font-medium whitespace-nowrap transition"
                    >
                      Detail
                      <span
                        aria-hidden
                        className="text-[#C0B8AE] transition group-hover:text-[#8B6B5A] group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}

            {pesananTampil.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
                    {IKON.pesanan}
                  </span>
                  <p className="mt-3 text-sm font-medium text-[#1E1C18]">
                    {orders.length === 0
                      ? "Belum ada pesanan."
                      : "Tidak ada pesanan dengan status ini."}
                  </p>
                  <p className="mt-1 text-sm text-[#8A837B]">
                    {orders.length === 0
                      ? "Pesanan yang masuk akan muncul di sini."
                      : "Coba status lain atau lihat semua pesanan."}
                  </p>
                  {orders.length > 0 && (
                    <Link
                      href="/admin/orders"
                      className="inline-flex items-center justify-center mt-5 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-[13px] font-semibold hover:bg-[#8B6B5A] transition"
                    >
                      Lihat semua pesanan
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
            Menampilkan {mulai + 1}–{Math.min(mulai + PER_HALAMAN, semuaTampil.length)} dari {semuaTampil.length} pesanan
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