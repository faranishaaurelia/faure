import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/orders/StatusBadge";
import ReviewForm from "@/components/review/ReviewForm";
import CancelOrderForm from "@/components/orders/CancelOrderForm";
import RefundRequestButton from "@/components/orders/RefundRequestButton";
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
import {
  KOLOM_MESSAGE,
  type ChatMessage,
} from "@/lib/chat";

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

const kartu = "bg-white rounded-[24px] border border-black/5 shadow-sm p-6";

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
      <div className="max-w-[520px] text-center">
        <div className={kartu}>
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

  const subtotal = items.reduce((t, i) => t + i.harga * i.jumlah, 0);
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

  return (
    <div>
        {/* ===================== HEADER PESANAN ===================== */}
        <section className={`${kartu} mb-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-[-0.02em]">
                {kodePesanan(pesanan.id)}
              </h1>
              <p className="mt-1 text-xs text-[#8B8478]">
                {t("account.orderedOn", {
                  date: formatTanggalWaktu(pesanan.created_at, dateLocale(locale)),
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
            <ol className="mt-8 flex items-start" aria-label={t("account.orderProgress")}>
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

        <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
          {/* ===================== PRODUK ===================== */}
          <section className={kartu}>
            <h2 className="text-base font-semibold mb-5">{t("account.orderedProducts")}</h2>

            {selesai && items.length > 0 && (
              <p className="-mt-3 mb-5 text-sm text-[#6B655A]">
                {t("account.orderCompleteReviewHint")}
              </p>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-[#8B8478]">
                {t("account.noItemDetail")}
              </p>
            ) : (
              <ul className="divide-y divide-[#EFEDE8]">
                {items.map((item) => {
                  const produkId = produkIdPerItem.get(item.id);
                  const ulasan =
                    produkId != null
                      ? ulasanPerProduk.get(produkId)
                      : null;

                  return (
                    <li
                      key={item.id}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex gap-4">
                        <div className="w-16 aspect-[4/5] shrink-0 overflow-hidden rounded-lg bg-[#F3F1EC]">
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

                        <p className="text-sm font-medium">
                          {rupiah(item.harga * item.jumlah)}
                        </p>
                      </div>

                      {/* ULASAN — hanya saat pesanan sudah selesai */}
                      {selesai && produkId != null && (
                        <div className="mt-4 pt-4 border-t border-[#EFEDE8]">
                          {ulasan ? (
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="flex text-sm">
                                  {[1, 2, 3, 4, 5].map((bintang) => (
                                    <span
                                      key={bintang}
                                      className={
                                        bintang <= ulasan.rating
                                          ? "text-[#B18452]"
                                          : "text-[#D8D1CA]"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs text-[#8B8478]">
                                  {t("account.reviewedOn", {
                                    date: formatTanggal(
                                      ulasan.created_at,
                                      dateLocale(locale),
                                    ),
                                  })}
                                </span>
                              </div>

                              {ulasan.comment && (
                                <p className="mt-2 text-sm leading-6 text-[#706A63]">
                                  {ulasan.comment}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <p className="text-[12px] text-[#6BA06B] font-medium">
                                  {t("account.reviewedThanks")}
                                </p>
                                <Link
                                  href={`/produk/${produkId}`}
                                  className="text-xs text-[#8B6B5A] hover:text-[#1E1C18] underline underline-offset-4 transition"
                                >
                                  {t("account.seeReviewOnProduct")}
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <ReviewForm
                              orderItemId={item.id}
                              productName={item.nama}
                              variantLabel={item.detail || null}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            {/* ===================== PEMBAYARAN ===================== */}
            <section className={kartu}>
              <h2 className="text-base font-semibold mb-5">
                {t("account.paymentDetails")}
              </h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6B655A]">{t("account.productSubtotal")}</dt>
                  <dd>{rupiah(subtotal)}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#6B655A]">{t("account.shippingCost")}</dt>
                  <dd>{rupiah(ongkir)}</dd>
                </div>

                {diskon > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#6B655A]">
                      {t("account.discount")}
                      {pesanan.voucher_code ? ` (${pesanan.voucher_code})` : ""}
                    </dt>
                    <dd>-{rupiah(diskon)}</dd>
                  </div>
                )}

                <div className="flex justify-between gap-4 pt-3 border-t border-[#EFEDE8] font-semibold">
                  <dt>{t("account.total")}</dt>
                  <dd>{rupiah(total)}</dd>
                </div>
              </dl>

              <dl className="mt-5 pt-5 border-t border-[#EFEDE8] space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6B655A]">{t("account.method")}</dt>
                  <dd className="text-right">
                    {labelMetodeBayar(pesanan.payment_method)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#6B655A]">{t("account.status")}</dt>
                  <dd>
                    <StatusBadge label={bayar.label} tone={bayar.tone} />
                  </dd>
                </div>

                {pesanan.paid_at && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#6B655A]">
                      {t("account.paidOnLabel")}
                    </dt>
                    <dd className="text-right">
                      {formatTanggalWaktu(pesanan.paid_at, dateLocale(locale))}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* ===================== PENGIRIMAN ===================== */}
            <section className={kartu}>
              <h2 className="text-base font-semibold mb-5">
                {t("account.shippingSection")}
              </h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6B655A]">{t("account.method")}</dt>
                  <dd className="text-right">
                    {labelPengiriman(pesanan.shipping_method, t)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#6B655A]">
                    {t("account.trackingNumber")}
                  </dt>
                  <dd className="text-right">
                    {pesanan.tracking_number || t("account.notAvailable")}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 pt-5 border-t border-[#EFEDE8]">
                <p className="text-xs text-[#8B8478] mb-2">
                  {t("account.shippedTo")}
                </p>

                {alamat ? (
                  <address className="not-italic text-sm leading-6">
                    <p className="font-medium">
                      {alamat.recipient_name}
                      {alamat.label && (
                        <span className="ml-2 text-xs font-normal text-[#8B8478]">
                          {alamat.label}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#8B8478]">{alamat.phone}</p>
                    <p className="mt-2 text-[#4A463F]">{alamat.full_address}</p>
                    <p className="text-[#4A463F]">
                      {[alamat.city, alamat.province]
                        .filter(Boolean)
                        .join(", ")}{" "}
                      {alamat.postal_code}
                    </p>
                    {alamat.notes && (
                      <p className="mt-2 text-xs text-[#8B8478]">
                        {t("account.notes", { notes: alamat.notes })}
                      </p>
                    )}
                  </address>
                ) : (
                  <p className="text-sm text-[#8B8478]">
                    {t("account.addressNotAvailable")}
                  </p>
                )}
              </div>
            </section>

            {/* ===================== PENGAJUAN REFUND ===================== */}
            {dibatalkan && sudahBayar && (
              <section className={kartu}>
                <h2 className="text-base font-semibold mb-5">
                  {t("account.refundRequestedTitle")}
                </h2>

                {refund ? (
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[#6B655A]">
                        {t("account.refundStatusLabel")}
                      </dt>
                      <dd>
                        <StatusBadge
                          label={infoRefund(refund.status).label}
                          tone={infoRefund(refund.status).tone}
                        />
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-[#6B655A]">
                        {t("account.refundAmount")}
                      </dt>
                      <dd className="font-medium">
                        {rupiah(angka(refund.refund_amount ?? pesanan.total))}
                      </dd>
                    </div>

                    {refund.reason && (
                      <div>
                        <dt className="text-[#6B655A]">
                          {t("account.refundReasonLabel")}
                        </dt>
                        <dd className="mt-1 leading-6 text-[#4A463F]">
                          {refund.reason}
                        </dd>
                      </div>
                    )}

                    {refund.requested_at && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#6B655A]">
                          {t("account.refundRequestedOn", {
                            date: formatTanggal(
                              refund.requested_at,
                              dateLocale(locale),
                            ),
                          })}
                        </dt>
                      </div>
                    )}

                    <div>
                      {infoRefund(refund.status).key === "menunggu" && (
                        <p className="rounded-xl bg-[#FFF4DB] px-4 py-3 text-xs text-[#8A5A00]">
                          {t("account.refundPendingDesc")}
                        </p>
                      )}
                      {infoRefund(refund.status).key === "disetujui" && (
                        <p className="rounded-xl bg-[#E6F4EA] px-4 py-3 text-xs text-[#1E6B3A]">
                          {t("account.refundApprovedDesc")}
                        </p>
                      )}
                      {infoRefund(refund.status).key === "ditolak" && (
                        <p className="rounded-xl bg-[#FCE8E6] px-4 py-3 text-xs text-[#B3261E]">
                          {t("account.refundRejectedDesc")}
                        </p>
                      )}
                    </div>
                  </dl>
                ) : (
                  <RefundRequestButton orderId={pesanan.id} />
                )}
              </section>
            )}

            <Link
              href="/pesanan"
              className="inline-flex text-xs text-[#8B8478] underline underline-offset-4 hover:text-[#1E1C18] transition"
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
