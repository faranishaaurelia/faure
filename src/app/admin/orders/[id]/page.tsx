import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  infoStatus,
  infoPembayaran,
  infoRefund,
  rupiah,
  kodePesanan,
  formatTanggalWaktu,
  labelMetodeBayar,
  labelPengiriman,
  infoItem,
  TAB_STATUS,
  TAHAP,
} from "@/lib/orders";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusBadge from "@/components/orders/StatusBadge";
import UpdateStatusForm from "@/components/admin/UpdateStatusForm";
import UpdateTrackingForm from "@/components/admin/UpdateTrackingForm";
import RefundReviewPanel from "@/components/admin/RefundReviewPanel";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      id, user_id, status, payment_status, total, shipping_cost, discount,
      shipping_method, payment_method, tracking_number, created_at,
      cancellation_reason, cancelled_at, cancelled_by,
      addresses ( recipient_name, phone, full_address, city, province, postal_code ),
      order_items ( id, product_name_snapshot, price, quantity, product_variants ( size, color, image_url, products ( name, product_images ( url, sort_order ) ) ) )
    `,
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  // Ambil profil pelanggan secara terpisah (karena orders & profiles gak punya FK langsung)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", order.user_id)
    .single();

  // Pengajuan refund milik pesanan ini (dipakai admin utk review)
  const { data: refunds } = await supabase
    .from("refund_requests")
    .select("id, status, reason, refund_amount, requested_at, reviewed_at")
    .eq("order_id", order.id)
    .order("requested_at", { ascending: false });

  const status = infoStatus(order.status);
  const pembayaran = infoPembayaran(order.payment_status, status.key);
  const alamat = Array.isArray(order.addresses)
    ? order.addresses[0]
    : order.addresses;

  const statusOptions = TAB_STATUS.filter((s) => s.key !== "semua");

  const indeksTahap = status.key ? TAHAP.indexOf(status.key) : -1;

  return (
    <div>
      <AdminPageHeader
        kicker="Pesanan"
        title={kodePesanan(order.id)}
        description={formatTanggalWaktu(order.created_at)}
        action={<StatusBadge label={status.label} tone={status.tone} />}
      />

      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 mb-5 text-[12px] font-medium text-[#8B6B5A] hover:text-[#1E1C18] transition"
      >
        <span aria-hidden>←</span> Kembali ke daftar pesanan
      </Link>

      {/* ===== Progres pesanan ===== */}
      {status.key === "dibatalkan" || indeksTahap >= 0 ? (
        <section className="admin-card p-6 mb-6">
          {status.key === "dibatalkan" ? (
            <div className="rounded-2xl bg-[#FCE8E6] px-5 py-4 text-sm text-[#B3261E]">
              <p className="font-medium">{status.deskripsi}</p>
              {order.cancelled_at && (
                <p className="mt-1 text-[13px] text-[#8A2530]">
                  Dibatalkan {formatTanggalWaktu(order.cancelled_at)} oleh{" "}
                  {order.cancelled_by === order.user_id ? "pelanggan" : "admin"}
                </p>
              )}
              {order.cancellation_reason && (
                <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
                    Alasan pembatalan
                  </p>
                  <p className="mt-1 text-[13px] text-[#5C1A14]">
                    {order.cancellation_reason}
                  </p>
                </div>
              )}
            </div>
          ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
                  Progres pesanan
                </p>
                <p className="mt-1 text-sm text-[#716A63]">
                  {status.deskripsi}
                </p>
              </div>
            </div>
            <ol className="flex items-start" aria-label="Progres pesanan">
              {TAHAP.map((key, i) => {
                const tercapai = i <= indeksTahap;
                const sekarang = i === indeksTahap;

                return (
                  <li
                    key={key}
                    aria-current={sekarang ? "step" : undefined}
                    className="relative flex-1 flex flex-col items-center text-center"
                  >
                    {i > 0 && (
                      <span
                        aria-hidden
                        className={`absolute top-3 right-1/2 w-full h-px ${
                          tercapai ? "bg-[#1E1C18]" : "bg-[#E7E5E0]"
                        }`}
                      />
                    )}

                    <span
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                        tercapai
                          ? "bg-[#1E1C18] text-white"
                          : "bg-white border border-[#E7E5E0] text-[#B5AEA2]"
                      }`}
                    >
                      {tercapai ? (
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden
                          className="w-3 h-3"
                        >
                          <path
                            d="M4.5 10.5L8.5 14.5L15.5 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>

                    <span
                      className={`mt-2 px-1 text-[10px] sm:text-[11px] leading-4 ${
                        sekarang
                          ? "font-semibold text-[#1E1C18]"
                          : "text-[#8A837B]"
                      }`}
                    >
                      {infoStatus(key).label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
          )}
        </section>
      ) : null}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="admin-card p-6">
            <h2 className="font-serif text-lg mb-4">Item Pesanan</h2>
            <div className="space-y-3">
              {order.order_items?.map((item) => {
                const info = infoItem(item);
                return (
                  <div
                    key={info.id}
                    className="flex gap-4 text-[13px] border-b border-[#f0f0f0] pb-3 last:border-0"
                  >
                    {info.gambar && (
                      <div className="w-12 aspect-[4/5] shrink-0 overflow-hidden rounded-lg bg-[#F3F1EC]">
                        <img
                          src={info.gambar}
                          alt={info.nama}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#202124]">
                        {info.nama}
                      </p>
                      <p className="text-[#777]">
                        {info.detail} · {info.jumlah}x
                      </p>
                    </div>
                    <p className="font-medium shrink-0">
                      {rupiah(info.harga * info.jumlah)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-[#eee] space-y-1 text-[13px]">
              <div className="flex justify-between text-[#777]">
                <span>Ongkos Kirim</span>
                <span>{rupiah(order.shipping_cost)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[#777]">
                  <span>Diskon</span>
                  <span>-{rupiah(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-[#202124] pt-1">
                <span>Total</span>
                <span>{rupiah(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h2 className="font-serif text-lg mb-3">Alamat Pengiriman</h2>
            {alamat ? (
              <div className="text-[13px] text-[#444] space-y-1">
                <p className="font-medium text-[#202124]">
                  {alamat.recipient_name} · {alamat.phone}
                </p>
                <p>{alamat.full_address}</p>
                <p>
                  {alamat.city}, {alamat.province} {alamat.postal_code}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-[#999]">Alamat tidak tersedia.</p>
            )}
          </div>
        </div>

        {/* Kolom kanan: info & update status */}
        <div className="space-y-4">
          <div className="admin-card p-6">
            <h2 className="font-serif text-lg mb-3">Update Status</h2>
            {status.key === "dibatalkan" ? (
              <p className="text-[13px] text-[#8A2530]">
                Pesanan ini sudah dibatalkan dan statusnya tidak dapat diubah lagi.
              </p>
            ) : (
              <UpdateStatusForm
                orderId={order.id}
                currentStatus={order.status}
                options={statusOptions}
              />
            )}
          </div>

          <div className="admin-card p-6">
            <h2 className="font-serif text-lg mb-3">Nomor Resi</h2>
            <UpdateTrackingForm
              orderId={order.id}
              currentTracking={order.tracking_number}
            />
          </div>

          {(refunds ?? []).length > 0 && (
            <div className="admin-card p-6">
              <h2 className="font-serif text-lg mb-3">
                Pengajuan Refund{" "}
                <span className="ml-1 text-[12px] font-normal text-[#777]">
                  ({(refunds ?? []).length})
                </span>
              </h2>
              <div className="space-y-4">
                {(refunds ?? []).map((refund) => (
                  <div
                    key={refund.id}
                    className="rounded-xl border border-[#EFEAE4] p-4 space-y-2 text-[13px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#777]">Status</span>
                      <StatusBadge
                        label={infoRefund(refund.status).label}
                        tone={infoRefund(refund.status).tone}
                      />
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#777]">Jumlah dana</span>
                      <span className="font-semibold">
                        {rupiah(Number(refund.refund_amount ?? 0))}
                      </span>
                    </div>
                    {refund.reason && (
                      <div>
                        <span className="text-[#777]">Alasan</span>
                        <p className="mt-1 leading-5 text-[#444]">
                          {refund.reason}
                        </p>
                      </div>
                    )}
                    {refund.requested_at && (
                      <div className="flex justify-between gap-3">
                        <span className="text-[#777]">Diajukan</span>
                        <span className="font-medium">
                          {formatTanggalWaktu(refund.requested_at)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#F3EEE8]">
                      <RefundReviewPanel
                        refund={{
                          id: refund.id,
                          order_id: order.id,
                          reason: refund.reason,
                          refund_amount: refund.refund_amount,
                          status: refund.status,
                          requested_at: refund.requested_at,
                          reviewed_at: refund.reviewed_at,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-card p-6 text-[13px] space-y-2">
            <h2 className="font-serif text-lg mb-2">Info Lain</h2>
            <div className="flex justify-between">
              <span className="text-[#777]">Pelanggan</span>
              <span className="font-medium">{profile?.full_name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#777]">Pembayaran</span>
              <StatusBadge label={pembayaran.label} tone={pembayaran.tone} />
            </div>
            <div className="flex justify-between">
              <span className="text-[#777]">Metode Bayar</span>
              <span className="font-medium">
                {labelMetodeBayar(order.payment_method)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#777]">Pengiriman</span>
              <span className="font-medium">
                {labelPengiriman(order.shipping_method)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#777]">Tanggal</span>
              <span className="font-medium">
                {formatTanggalWaktu(order.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
