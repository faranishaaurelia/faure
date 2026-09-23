import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  formatTanggal,
  kodePesanan,
  rupiah,
  infoStatus,
  STATUS_DB,
} from "@/lib/orders";
import StatusBadge from "@/components/orders/StatusBadge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type StokMenipisRow = {
  id: number;
  size?: string | null;
  color?: string | null;
  stock?: number | null;
  products:
    | { id: number; name: string }
    | { id: number; name: string }[]
    | null;
};

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
  pesanan: (
    <svg {...styleSvg}>
      <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </svg>
  ),
  pengguna: (
    <svg {...styleSvg}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" />
    </svg>
  ),
  ulasan: (
    <svg {...styleSvg}>
      <path d="M12 3l2.2 6.6H21l-5.4 3.9 2.1 6.5L12 16.8 6.3 20l2.1-6.5L3 9.6h6.8L12 3z" />
    </svg>
  ),
  kotak: (
    <svg {...styleSvg}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  ),
  jam: (
    <svg {...styleSvg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { count: jumlahProduk },
    { count: jumlahPesanan },
    { count: jumlahUser },
    { count: jumlahUlasan },
    { count: pesananBaru },
    { data: pesananTerbaru },
    { data: stokMenipis },
    { count: jumlahStokMenipis },
    { data: pendapatanRows },
    { count: refundMenunggu },
    { data: refundTerbaru },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    // Nilai di DB: "pending" (alias "menunggu_pembayaran" ikut disertakan
    // untuk jaga-jaga kalau ada baris lama).
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", [
        STATUS_DB.menunggu_pembayaran,
        "menunggu_pembayaran",
        STATUS_DB.diproses,
      ]),
    supabase
      .from("orders")
      .select("id, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("product_variants")
      .select("id, size, color, stock, products ( id, name )")
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(6),
    supabase
      .from("product_variants")
      .select("*", { count: "exact", head: true })
      .lte("stock", 5),
    supabase.from("orders").select("total").in("status", ["selesai"]),
    supabase
      .from("refund_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("refund_requests")
      .select(
        "id, order_id, reason, refund_amount, requested_at, orders ( id, total )",
      )
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(5),
  ]);

  const totalPendapatan = (pendapatanRows ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0,
  );

  const nama = profile?.full_name?.split(" ")[0] ?? "Admin";
  const hari = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  const kartu = [
    {
      label: "Produk",
      value: jumlahProduk ?? 0,
      href: "/admin/products",
      hint: "Katalog toko",
      icon: IKON.produk,
    },
    {
      label: "Pesanan",
      value: jumlahPesanan ?? 0,
      href: "/admin/orders",
      hint: "Semua transaksi",
      icon: IKON.pesanan,
    },
    {
      label: "Pengguna",
      value: jumlahUser ?? 0,
      href: "/admin/users",
      hint: "Akun terdaftar",
      icon: IKON.pengguna,
    },
    {
      label: "Ulasan",
      value: jumlahUlasan ?? 0,
      href: "/admin/reviews",
      hint: "Masukan pembeli",
      icon: IKON.ulasan,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        kicker={hari}
        title={`Halo, ${nama}`}
        description="Ringkasan toko Faure hari ini. Kelola pesanan, stok, dan koleksi dari satu tempat."
      />

      {/* ===== Banner perhatian + pendapatan ===== */}
      <section className="relative overflow-hidden rounded-[26px] bg-[#1E1C18] text-[#F7F3EE] mb-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8B6B5A]/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -bottom-28 h-64 w-64 rounded-full bg-[#C4B5A8]/20 blur-3xl"
        />

        <div className="relative grid gap-7 p-7 md:grid-cols-[1.5fr_1fr] md:items-center">
          <div>
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#C4B5A8]">
              <span className="text-[#E8DFD6]">{IKON.jam}</span>
              Perlu perhatian
            </p>

            {(pesananBaru ?? 0) > 0 ? (
              <>
                <p className="mt-3 font-serif text-[34px] sm:text-[40px] leading-none tracking-[-0.02em]">
                  {pesananBaru} pesanan menunggu
                </p>
                <p className="mt-3 text-sm text-[#D9CFC4] max-w-md">
                  Status menunggu pembayaran atau sedang diproses. Selesaikan
                  yang tertunda supaya pelanggan cepat menerima barangnya.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 font-serif text-[34px] sm:text-[40px] leading-none tracking-[-0.02em]">
                  Semua pesanan selesai
                </p>
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/admin/orders"
                className="inline-flex h-10 items-center rounded-full bg-[#F7F3EE] px-5 text-[13px] font-semibold text-[#1E1C18] transition hover:bg-white"
              >
                Kelola pesanan →
              </Link>
              <Link
                href="/admin/products"
                className="inline-flex h-10 items-center rounded-full border border-white/25 px-5 text-[13px] font-medium text-[#E8DFD6] transition hover:border-white/60 hover:text-white"
              >
                Lihat koleksi
              </Link>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#C4B5A8]">
              Pendapatan (pesanan selesai)
            </p>
            <p className="mt-3 font-serif text-[30px] leading-none tracking-[-0.02em]">
              {rupiah(totalPendapatan)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[11px] text-[#C4B5A8]">Stok menipis</p>
                <p className="mt-1 text-[15px] font-semibold">
                  {jumlahStokMenipis ?? 0} varian
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#C4B5A8]">Total pesanan</p>
                <p className="mt-1 text-[15px] font-semibold">
                  {jumlahPesanan ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Kartu ringkasan ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kartu.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group bg-white rounded-[22px] border border-black/5 shadow-sm p-5 hover:border-[#1E1C18]/20 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A] transition group-hover:bg-[#1E1C18] group-hover:text-[#F7F3EE]">
                {item.icon}
              </span>
              <span className="text-[13px] text-[#C0B8AE] transition group-hover:text-[#8B6B5A] group-hover:translate-x-0.5">
                →
              </span>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
              {item.label}
            </p>
            <p className="mt-2 font-serif text-[34px] leading-none tracking-[-0.03em] text-[#1E1C18]">
              {item.value}
            </p>
            <p className="mt-2 text-[12px] text-[#8A837B]">{item.hint}</p>
          </Link>
        ))}
      </div>

      {/* ===== Aktivitas & inventori ===== */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <section className="admin-card lg:col-span-2 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-[#EFEAE4]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
                Aktivitas
              </p>
              <h2 className="mt-1 font-serif text-xl text-[#1E1C18]">
                Pesanan terbaru
              </h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-[12px] text-[#8B6B5A] hover:text-[#1E1C18] transition"
            >
              Lihat semua →
            </Link>
          </div>
          <div>
            {(pesananTerbaru ?? []).map((order) => {
              const status = infoStatus(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#F3EEE8] hover:bg-[#FAF7F3] transition"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1E1C18]">
                      {kodePesanan(order.id)}
                    </p>
                    <p className="text-[11px] text-[#8A837B] mt-0.5">
                      {formatTanggal(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {rupiah(Number(order.total))}
                    </span>
                    <StatusBadge label={status.label} tone={status.tone} />
                    <span className="text-[13px] text-[#C0B8AE]">→</span>
                  </div>
                </Link>
              );
            })}
            {(!pesananTerbaru || pesananTerbaru.length === 0) && (
              <div className="px-6 py-12 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
                  {IKON.pesanan}
                </span>
                <p className="mt-3 text-sm text-[#8A837B]">
                  Belum ada pesanan masuk.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="admin-card overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EFEAE4] flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
                Inventori
              </p>
              <h2 className="mt-1 font-serif text-xl text-[#1E1C18]">
                Stok menipis
              </h2>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A]">
              {IKON.kotak}
            </span>
          </div>
          <div>
            {(stokMenipis ?? []).map((item: StokMenipisRow) => {
              const produk = satu(item.products);
              const stok = item.stock ?? 0;
              const kritis = stok <= 2;
              const detail = [item.size, item.color].filter(Boolean).join(" · ");

              const isi = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1E1C18] truncate">
                      {produk?.name ?? "Produk"}
                    </p>
                    <p className="text-[11px] text-[#8A837B] mt-0.5 truncate">
                      {detail || "Tanpa detail varian"}
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#F3EEE8] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          kritis ? "bg-[#B3261E]" : "bg-[#D9A441]"
                        }`}
                        style={{ width: `${Math.min(100, stok * 10)}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`min-w-[42px] text-center rounded-full px-3 py-1 text-[12px] font-semibold ${
                      kritis
                        ? "bg-[#FCE8E6] text-[#B3261E]"
                        : "bg-[#F3EFE9] text-[#8B6B5A]"
                    }`}
                  >
                    {stok}
                  </span>
                </>
              );

              return produk?.id ? (
                <Link
                  key={item.id}
                  href={`/admin/products/${produk.id}`}
                  className="flex items-center gap-4 px-6 py-4 border-t border-[#F3EEE8] hover:bg-[#FAF7F3] transition"
                >
                  {isi}
                </Link>
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4 border-t border-[#F3EEE8]"
                >
                  {isi}
                </div>
              );
            })}
            {(!stokMenipis || stokMenipis.length === 0) && (
              <div className="px-6 py-12 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F4EA] text-[#3A7D44]">
                  {IKON.kotak}
                </span>
                <p className="mt-3 text-sm text-[#8A837B]">
                  Semua stok masih aman.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===== Pengajuan refund menunggu ===== */}
      {(refundMenunggu ?? 0) > 0 && (
        <section className="admin-card lg:col-span-3 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-[#EFEAE4]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
                Refund
              </p>
              <h2 className="mt-1 font-serif text-xl text-[#1E1C18]">
                {refundMenunggu} pengajuan refund menunggu review
              </h2>
            </div>
            <Link
              href="/admin/refunds"
              className="text-[12px] text-[#8B6B5A] hover:text-[#1E1C18] transition"
            >
              Kelola refund →
            </Link>
          </div>

          <div>
            {(refundTerbaru ?? []).map((refund) => {
              const order = satu(refund.orders);
              return (
                <Link
                  key={refund.id}
                  href={`/admin/orders/${refund.order_id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#F3EEE8] hover:bg-[#FAF7F3] transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E1C18]">
                      {kodePesanan(refund.order_id)}
                    </p>
                    <p className="mt-0.5 max-w-[520px] truncate text-[12px] text-[#8A837B]">
                      {refund.reason || "Tanpa alasan"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {rupiah(Number(refund.refund_amount ?? order?.total ?? 0))}
                    </span>
                    <span className="text-[13px] text-[#C0B8AE]">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
