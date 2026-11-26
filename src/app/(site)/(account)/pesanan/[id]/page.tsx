import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/orders/StatusBadge";
import ReviewForm from "@/components/review/ReviewForm";
import CancelOrderForm from "@/components/orders/CancelOrderForm";
import PayButton from "@/components/orders/PayButton";
import RefundRequestButton from "@/components/orders/RefundRequestButton";
import OrderDetailTabs, {
  type OrderDetailTab,
} from "@/components/orders/OrderDetailTabs";
import ChatWidget from "@/components/chat/ChatWidget";
import {
  STATUS_DESC_TKEY,
  STATUS_TKEY,
  TAHAP,
  angka,
  formatTanggal,
  formatTanggalWaktu,
  infoItem,
  infoPembayaran,
  infoRefund,
  infoStatus,
  kodePesanan,
  labelMetodeBayar,
  labelPengiriman,
  rupiah,
  satu,
  type ItemRow,
} from "@/lib/orders";
import { getT, dateLocale } from "@/lib/i18n/server";
import { KOLOM_MESSAGE, type ChatMessage } from "@/lib/chat";

type PesananDetail = {
  id: number;
  status: string;
  total: number | string;
  created_at: string;
  address_id: number | null;
  shipping_method: string | null;
  shipping_cost: number | string | null;
  discount: number | string | null;
  voucher_code: string | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_deadline: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  order_items: ItemRow[] | null;
};

type AlamatRow = {
  label: string | null;
  recipient_name: string | null;
  phone: string | null;
  full_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
};

const kartu = "rounded-[24px] border border-black/5 bg-white shadow-sm";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[13px]">
      <dt className="shrink-0 text-[#8B8478]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-[#1E1C18]">
        {children}
      </dd>
    </div>
  );
}

export default async function DetailPesananPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  const { t, locale } = await getT();
  const lokale = dateLocale(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Filter user_id memastikan pesanan orang lain tidak bisa dibuka
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      total,
      created_at,
      address_id,
      shipping_method,
      shipping_cost,
      discount,
      voucher_code,
      payment_method,
      payment_status,
      payment_deadline,
      paid_at,
      tracking_number,
      cancellation_reason,
      cancelled_at,
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
            id,
            name,
            product_images ( url, sort_order )
          )
        )
      )
    `,
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil detail pesanan:", error.message);

    return (
      <div className="mx-auto max-w-[520px] text-center">
        <div className={`${kartu} p-8`}>
          <p className="text-sm font-medium">{t("account.loadFail")}</p>
          <p className="mt-1 text-sm text-[#8B8478]">
            {t("account.loadFailBody")}
          </p>
          <Link
            href="/pesanan"
            className="inline-flex items-center justify-center mt-6 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition"
          >
            {t("account.backToOrders")}
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const pesanan = data as unknown as PesananDetail;

  // Alamat diambil terpisah lewat address_id
  let alamat: AlamatRow | null = null;
  if (pesanan.address_id) {
    const { data: alamatData } = await supabase
      .from("addresses")
      .select(
        "label, recipient_name, phone, full_address, city, province, postal_code, notes",
      )
      .eq("id", pesanan.address_id)
      .maybeSingle();

    alamat = (alamatData as AlamatRow | null) ?? null;
  }

  // ---------- Olah data ----------
  const info = infoStatus(pesanan.status, t);
  const bayar = infoPembayaran(pesanan.payment_status, info.key, t);
  const items = (pesanan.order_items ?? []).map((i) => infoItem(i, t));

  const subtotal = items.reduce((n, i) => n + i.harga * i.jumlah, 0);
  const ongkir = angka(pesanan.shipping_cost);
  const diskon = angka(pesanan.discount);
  const total = angka(pesanan.total);

  const indeksTahap = info.key ? TAHAP.indexOf(info.key) : -1;
  const dibatalkan = info.key === "dibatalkan";
  const perluBayar = info.key === "menunggu_pembayaran";
  const selesai = info.key === "selesai";

  // Pesanan yang masih bisa dibatalkan user (belum dikirim/selesai).
  const bisaDibatalkan =
    info.key === "menunggu_pembayaran" || info.key === "diproses";

  // ---------- Pengajuan refund (untuk pesanan dibatalkan & sudah dibayar) ----------
  type RefundRow = {
    id: number;
    status: string | null;
    refund_amount: number | string | null;
    reason: string | null;
    requested_at: string | null;
  };
  let refund: RefundRow | null = null;

  const sudahBayar = bayar.key === "dibayar";
  if (dibatalkan && sudahBayar) {
    const { data: refundData } = await supabase
      .from("refund_requests")
      .select("id, status, refund_amount, reason, requested_at")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    refund = (refundData as RefundRow | null) ?? null;
  }
  const refundInfo = refund ? infoRefund(refund.status) : null;

  // ---------- Data ulasan (hanya saat pesanan selesai) ----------
  // Cari product id tiap item, lalu cek ulasan user untuk produk itu.
  const produkIdPerItem = new Map<number, number>();
  const ulasanPerProduk = new Map<
    number,
    { rating: number; comment: string | null; created_at: string }
  >();

  if (selesai) {
    for (const raw of pesanan.order_items ?? []) {
      const varian = satu(raw.product_variants);
      const produk = satu(varian?.products);
      if (produk?.id != null) produkIdPerItem.set(raw.id, Number(produk.id));
    }

    const daftarProdukId = [...new Set(produkIdPerItem.values())];

    if (daftarProdukId.length > 0) {
      const { data: ulasanUser } = await supabase
        .from("reviews")
        .select("product_id, rating, comment, created_at")
        .eq("user_id", user.id)
        .in("product_id", daftarProdukId);

      for (const u of ulasanUser ?? []) {
        ulasanPerProduk.set(u.product_id, u);
      }
    }
  }

  // ---------- Chat pesanan ----------
  const { data: convChat } = await supabase
    .from("conversations")
    .select("id")
    .eq("context_type", "order")
    .eq("context_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  const chatConvId: number | null = convChat?.id ?? null;
  let chatMessages: ChatMessage[] = [];

  if (chatConvId) {
    const { data: msgsChat } = await supabase
      .from("messages")
      .select(KOLOM_MESSAGE)
      .eq("conversation_id", chatConvId)
      .order("created_at", { ascending: true });

    chatMessages = (msgsChat as ChatMessage[] | null) ?? [];
  }

  // ---------- Tab ringkas untuk rincian pesanan ----------
  const tabs: OrderDetailTab[] = [
    {
      key: "payment",
      label: t("account.tabPayment"),
      content: (
        <div className="space-y-4">
          <dl className="divide-y divide-[#EFEDE8]">
            <DetailRow label={t("account.productSubtotal")}>
              {rupiah(subtotal)}
            </DetailRow>
            <DetailRow label={t("account.shippingCost")}>
              {rupiah(ongkir)}
            </DetailRow>
            {diskon > 0 && (
              <DetailRow
                label={`${t("account.discount")}${
                  pesanan.voucher_code ? ` (${pesanan.voucher_code})` : ""
                }`}
              >
                <span className="text-[#1E6B3A]">-{rupiah(diskon)}</span>
              </DetailRow>
            )}
            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-[13px] font-semibold">
                {t("account.total")}
              </span>
              <span className="text-base font-semibold">
                {rupiah(total)}
              </span>
            </div>
          </dl>

          <dl className="divide-y divide-[#EFEDE8] rounded-xl bg-[#FAF8F5] px-3">
            <DetailRow label={t("account.method")}>
              {labelMetodeBayar(pesanan.payment_method)}
            </DetailRow>
            <DetailRow label={t("account.status")}>
              <StatusBadge label={bayar.label} tone={bayar.tone} />
            </DetailRow>
            {pesanan.paid_at && (
              <DetailRow label={t("account.paidOnLabel")}>
                {formatTanggalWaktu(pesanan.paid_at, lokale)}
              </DetailRow>
            )}
          </dl>
        </div>
      ),
    },
    {
      key: "shipping",
      label: t("account.tabShipping"),
      content: (
        <div className="space-y-3">
          <dl className="divide-y divide-[#EFEDE8]">
            <DetailRow label={t("account.method")}>
              {labelPengiriman(pesanan.shipping_method, t)}
            </DetailRow>
            <DetailRow label={t("account.trackingNumber")}>
              {pesanan.tracking_number || (
                <span className="text-[#8B8478]">
                  {t("account.notAvailable")}
                </span>
              )}
            </DetailRow>
          </dl>

          <div className="rounded-xl bg-[#FAF8F5] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9A7B69]">
              {t("account.shippedTo")}
            </p>
            {alamat ? (
              <address className="mt-2 not-italic text-[12px] leading-5 text-[#4A463F]">
                <p className="font-semibold text-[#1E1C18]">
                  {alamat.recipient_name}
                </p>
                <p className="text-[11px] text-[#8B8478]">
                  {[alamat.label, alamat.phone].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1.5">{alamat.full_address}</p>
                <p>
                  {[alamat.city, alamat.province].filter(Boolean).join(", ")}{" "}
                  {alamat.postal_code}
                </p>
                {alamat.notes && (
                  <p className="mt-1.5 text-[11px] text-[#8B8478]">
                    {t("account.notes", { notes: alamat.notes })}
                  </p>
                )}
              </address>
            ) : (
              <p className="mt-2 text-[12px] text-[#8B8478]">
                {t("account.addressNotAvailable")}
              </p>
            )}
          </div>
        </div>
      ),
    },
  ];

  if (dibatalkan && sudahBayar) {
    tabs.push({
      key: "refund",
      label: t("account.tabRefund"),
      content: refund ? (
        <div className="space-y-3">
          <dl className="divide-y divide-[#EFEDE8]">
            <DetailRow label={t("account.refundStatusLabel")}>
              <StatusBadge
                label={refundInfo?.label ?? "-"}
                tone={refundInfo?.tone ?? "abu"}
              />
            </DetailRow>
            <DetailRow label={t("account.refundAmount")}>
              {rupiah(angka(refund.refund_amount ?? pesanan.total))}
            </DetailRow>
            {refund.reason && (
              <DetailRow label={t("account.refundReasonLabel")}>
                {refund.reason}
              </DetailRow>
            )}
          </dl>

          {refund.requested_at && (
            <p className="text-[11px] text-[#8B8478]">
              {t("account.refundRequestedOn", {
                date: formatTanggal(refund.requested_at, lokale),
              })}
            </p>
          )}

          {refundInfo?.key === "menunggu" && (
            <p className="rounded-xl bg-[#FFF4DB] px-3 py-2 text-[11px] text-[#8A5A00]">
              {t("account.refundPendingDesc")}
            </p>
          )}
          {refundInfo?.key === "disetujui" && (
            <p className="rounded-xl bg-[#E6F4EA] px-3 py-2 text-[11px] text-[#1E6B3A]">
              {t("account.refundApprovedDesc")}
            </p>
          )}
          {refundInfo?.key === "ditolak" && (
            <p className="rounded-xl bg-[#FCE8E6] px-3 py-2 text-[11px] text-[#B3261E]">
              {t("account.refundRejectedDesc")}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#FAF8F5] p-3">
          <p className="text-[12px] leading-5 text-[#6B655A]">
            {t("account.requestRefundHint")}
          </p>
          <div className="mt-3 flex justify-end">
            <RefundRequestButton orderId={pesanan.id} />
          </div>
        </div>
      ),
    });
  }

  return (
    <div>
      {/* ===================== HEADER PESANAN ===================== */}
      <section className={`${kartu} mb-6 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-[-0.02em]">
              {kodePesanan(pesanan.id)}
            </h1>
            <p className="mt-1 text-xs text-[#8B8478]">
              {t("account.orderedOn", {
                date: formatTanggalWaktu(
                  pesanan.created_at,
                  dateLocale(locale),
                ),
              })}
            </p>
          </div>

          <StatusBadge label={info.label} tone={info.tone} />
        </div>

        {/* PROGRES */}
        {dibatalkan ? (
          <div className="mt-6 rounded-2xl bg-[#FCE8E6] px-5 py-4 text-sm text-[#B3261E]">
            <p className="font-medium">{t(STATUS_DESC_TKEY.dibatalkan)}</p>
            <p className="mt-1 text-[13px] text-[#8A2530]">
              {t("account.cancelledOn", {
                date: formatTanggalWaktu(
                  pesanan.cancelled_at ?? pesanan.created_at,
                  dateLocale(locale),
                ),
              })}
            </p>
          </div>
        ) : indeksTahap >= 0 ? (
          <ol
            className="mt-8 flex items-start"
            aria-label={t("account.orderProgress")}
          >
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
                      aria-hidden="true"
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
                        aria-hidden="true"
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
                        : "text-[#8B8478]"
                    }`}
                  >
                    {t(STATUS_TKEY[key])}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {info.deskripsi && !dibatalkan && (
          <p className="mt-6 text-sm text-[#6B655A]">{info.deskripsi}</p>
        )}

        {perluBayar && pesanan.payment_deadline && (
          <p className="mt-3 rounded-2xl bg-[#FFF4DB] px-5 py-3 text-sm text-[#8A5A00]">
            {t("account.payBefore", {
              date: formatTanggalWaktu(
                pesanan.payment_deadline,
                dateLocale(locale),
              ),
            })}
          </p>
        )}
        {perluBayar && (
          <div className="mt-4">
            <PayButton orderId={pesanan.id} />
          </div>
        )}

        {/* Nota tersedia setelah pembayaran dikonfirmasi */}
        {sudahBayar && (
          <div className="mt-4">
            <Link
              href={`/pesanan/${pesanan.id}/nota`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#DDD8D2] bg-white px-6 text-xs font-medium text-[#4A463F] transition hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path
                  d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2M7 15h10v6H7v-6Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("nota.viewNotes")}
            </Link>
          </div>
        )}

        {/* Alasan pembatalan (wajib diisi user saat membatalkan) */}
        {dibatalkan && pesanan.cancellation_reason && (
          <div className="mt-6 rounded-2xl border border-[#EFEDE8] bg-white px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
              {t("account.cancelReasonLabel")}
            </p>
            <p className="mt-2 text-sm text-[#4A463F]">
              {pesanan.cancellation_reason}
            </p>
          </div>
        )}

        {/* Tombol batalkan pesanan — hanya sebelum pesanan dikirim */}
        {bisaDibatalkan && (
          <div className="mt-6">
            <CancelOrderForm orderId={pesanan.id} />
          </div>
        )}
      </section>

      {/* ===================== KONTEN UTAMA ===================== */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* PRODUK */}
        <section className={`${kartu} min-w-0 p-5 md:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {t("account.orderedProducts")}
            </h2>
            <span className="rounded-full bg-[#F3F1EC] px-2.5 py-1 text-[11px] text-[#6B655A]">
              {t("account.productCount", { count: items.length })}
            </span>
          </div>

          {selesai && items.length > 0 && (
            <p className="mt-1 text-[11px] text-[#8B8478]">
              {t("account.orderCompleteReviewHint")}
            </p>
          )}

          {items.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[#FAF8F5] px-4 py-6 text-center text-[13px] text-[#8B8478]">
              {t("account.noItemDetail")}
            </p>
          ) : (
            <ul className="mt-4 max-h-[30rem] space-y-2.5 overflow-y-auto pr-1 inner-scroll">
              {items.map((item) => {
                const produkId = produkIdPerItem.get(item.id);
                const ulasan =
                  produkId != null ? ulasanPerProduk.get(produkId) : null;

                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-[#EFEDE8] p-3 md:p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F3F1EC]">
                        {item.gambar && (
                          <img
                            src={item.gambar}
                            alt={item.nama}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {item.nama}
                        </p>
                        {item.detail && (
                          <p className="mt-0.5 truncate text-[11px] text-[#8B8478]">
                            {item.detail}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-[#8B8478]">
                          {item.jumlah} × {rupiah(item.harga)}
                        </p>
                      </div>

                      <p className="shrink-0 text-[13px] font-semibold">
                        {rupiah(item.harga * item.jumlah)}
                      </p>
                    </div>

                    {/* ULASAN — hanya saat pesanan selesai, dan bisa dibuka sesuai kebutuhan */}
                    {selesai && produkId != null && (
                      <div className="mt-3 border-t border-[#EFEDE8] pt-3">
                        {ulasan ? (
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  aria-label={`${ulasan.rating}/5`}
                                  className="text-[13px] tracking-[0.12em] text-[#B18452]"
                                >
                                  {"★".repeat(ulasan.rating)}
                                </span>
                                <span className="text-[11px] text-[#8B8478]">
                                  {t("account.reviewedOn", {
                                    date: formatTanggal(
                                      ulasan.created_at,
                                      lokale,
                                    ),
                                  })}
                                </span>
                              </div>
                              <Link
                                href={`/produk/${produkId}`}
                                className="text-[11px] text-[#8B6B5A] underline underline-offset-4 transition hover:text-[#1E1C18]"
                              >
                                {t("account.seeReviewOnProduct")}
                              </Link>
                            </div>
                            {ulasan.comment && (
                              <p className="mt-1 line-clamp-1 text-[11px] text-[#6B655A]">
                                “{ulasan.comment}”
                              </p>
                            )}
                          </div>
                        ) : (
                          <details className="group">
                            <summary className="cursor-pointer list-none text-[11px] font-medium text-[#8B6B5A] transition hover:text-[#1E1C18]">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  aria-hidden="true"
                                  className="text-[14px] leading-none transition-transform group-open:rotate-90"
                                >
                                  ›
                                </span>
                                {t("account.reviewThisItem")}
                              </span>
                            </summary>
                            <div className="mt-3 rounded-xl bg-[#FAF8F5] p-3">
                              <ReviewForm
                                orderItemId={item.id}
                                productName={item.nama}
                                variantLabel={item.detail || null}
                              />
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* RINCIAN DALAM TAB — lebih ringkas, tetap lengkap */}
        <div className="space-y-4 xl:sticky xl:top-28">
          <section className={`${kartu} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {t("account.orderSummary")}
              </h2>
              <span className="text-[10px] text-[#9A9389]">
                #{String(pesanan.id).padStart(6, "0")}
              </span>
            </div>

            <div className="mt-4">
              <OrderDetailTabs
                tabs={tabs}
                idPrefix={`order-${pesanan.id}`}
                ariaLabel={t("account.orderSummary")}
                defaultTab={dibatalkan && sudahBayar ? "refund" : undefined}
              />
            </div>
          </section>

          <Link
            href="/pesanan"
            className="inline-flex justify-end text-[11px] text-[#8B8478] underline underline-offset-4 transition hover:text-[#1E1C18]"
          >
            {t("account.backToOrders")}
          </Link>
        </div>
      </div>

      {/* ===================== CHAT PESANAN ===================== */}
      <ChatWidget
        contextType="order"
        contextId={pesanan.id}
        title={kodePesanan(pesanan.id)}
        initialConversationId={chatConvId}
        initialMessages={chatMessages}
        isSignedIn
        currentUserId={user.id}
      />
    </div>
  );
}
