import { createClient } from "@/lib/supabase/server";
import { formatTanggalWaktu, infoRefund, kodePesanan, rupiah } from "@/lib/orders";
import StatusBadge from "@/components/orders/StatusBadge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import RefundReviewPanel from "@/components/admin/RefundReviewPanel";

type RefundRow = {
  id: number;
  order_id: number;
  user_id: string;
  status: string | null;
  reason: string | null;
  refund_amount: number | string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  orders:
    | { id: number; total: number | string | null }
    | { id: number; total: number | string | null }[]
    | null;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function AdminRefundsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("refund_requests")
    .select(
      "id, order_id, user_id, status, reason, refund_amount, requested_at, reviewed_at, orders ( id, total )",
    )
    .order("requested_at", { ascending: false });

  const refunds = ((data ?? []) as RefundRow[]).map((r) => ({
    ...r,
    orders: satu(r.orders),
  }));

  // Nama pelanggan (refund_requests & profiles tidak punya relasi langsung)
  const userIds = [...new Set(refunds.map((r) => r.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const namaMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

  const hitung = { semua: refunds.length, menunggu: 0, disetujui: 0, ditolak: 0 };
  for (const r of refunds) {
    const key = infoRefund(r.status).key;
    if (key === "menunggu") hitung.menunggu += 1;
    if (key === "disetujui") hitung.disetujui += 1;
    if (key === "ditolak") hitung.ditolak += 1;
  }

  const ringkasan = [
    { label: "Total Pengajuan", value: String(hitung.semua), hint: "Semua permintaan refund" },
    { label: "Menunggu Review", value: String(hitung.menunggu), hint: "Perlu tindakan admin" },
    { label: "Disetujui", value: String(hitung.disetujui), hint: "Dana ditandai dikembalikan" },
    { label: "Ditolak", value: String(hitung.ditolak), hint: "Pengajuan ditolak" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Pengajuan Refund"
        description="Tinjau pengajuan pengembalian dana dari pelanggan yang pesanannya dibatalkan setelah pembayaran."
      />

      {/* ===== Ringkasan ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ringkasan.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-[22px] border border-black/5 shadow-sm p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
              {item.label}
            </p>
            <p className="mt-2 font-serif text-[28px] leading-none tracking-[-0.03em] text-[#1E1C18]">
              {item.value}
            </p>
            <p className="mt-2 text-[12px] text-[#8A837B]">{item.hint}</p>
          </div>
        ))}
      </div>

      {/* ===== Daftar ===== */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pesanan</th>
              <th>Pelanggan</th>
              <th>Jumlah</th>
              <th>Alasan</th>
              <th>Diajukan</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((refund) => (
              <tr key={refund.id} className="group transition hover:bg-[#FAF7F3]">
                <td className="font-medium whitespace-nowrap">
                  {kodePesanan(refund.order_id)}
                  <span className="block mt-0.5 text-[11px] font-normal text-[#8A837B]">
                    {rupiah(Number(refund.orders?.total ?? 0))}
                  </span>
                </td>
                <td>{namaMap.get(refund.user_id) ?? "-"}</td>
                <td className="font-semibold whitespace-nowrap">
                  {rupiah(Number(refund.refund_amount ?? 0))}
                </td>
                <td className="max-w-[240px]">
                  <span
                    className="block truncate text-[13px] text-[#716A63]"
                    title={refund.reason ?? ""}
                  >
                    {refund.reason || "-"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-[#716A63]">
                  {refund.requested_at
                    ? formatTanggalWaktu(refund.requested_at)
                    : "-"}
                </td>
                <td>
                  <StatusBadge
                    label={infoRefund(refund.status).label}
                    tone={infoRefund(refund.status).tone}
                  />
                </td>
                <td className="text-right">
                  <RefundReviewPanel
                    compact
                    refund={{
                      id: refund.id,
                      order_id: refund.order_id,
                      reason: refund.reason,
                      refund_amount: refund.refund_amount,
                      status: refund.status,
                      requested_at: refund.requested_at,
                      reviewed_at: refund.reviewed_at,
                    }}
                  />
                </td>
              </tr>
            ))}

            {refunds.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="2.5" y="6" width="19" height="12" rx="2" />
                      <circle cx="12" cy="12" r="2.4" />
                    </svg>
                  </span>
                  <p className="mt-3 text-sm font-medium text-[#1E1C18]">
                    Belum ada pengajuan refund.
                  </p>
                  <p className="mt-1 text-sm text-[#8A837B]">
                    Pengajuan muncul otomatis saat pelanggan membatalkan pesanan yang sudah dibayar.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}